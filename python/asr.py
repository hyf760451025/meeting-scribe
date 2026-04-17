"""
豆包 ASR 实时流式语音识别
使用火山引擎大模型流式语音识别 API（WebSocket）
文档：https://www.volcengine.com/docs/6561/xxx（大模型流式语音识别API）
"""

import asyncio
import json
import logging
import time
import uuid
import gzip
import struct
import numpy as np
import sounddevice as sd
from websockets.client import connect as ws_connect
import websockets.exceptions
from typing import Callable, Optional

logger = logging.getLogger('asr')

# ─── 豆包 ASR 配置 ────────────────────────────────────────────────────────────
ASR_WS_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel'
SAMPLE_RATE = 16000       # 采样率 16kHz
CHANNELS = 1              # 单声道
CHUNK_MS = 100            # 每次发送 100ms 音频
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_MS / 1000)  # = 1600 samples

# 协议常量（参考豆包 ASR 文档）
PROTOCOL_VERSION = 0b0001
DEFAULT_HEADER_SIZE = 0b0001
FULL_CLIENT_REQUEST = 0b0001
AUDIO_ONLY_REQUEST = 0b0010
FULL_SERVER_RESPONSE = 0b1001
LAST_MESSAGE_TYPE_SPECIFIC_FLAG = 0b0010
POSITIVE_SEQUENCE = 0b0000
NEG_SEQUENCE_WITH_TRANS = 0b0011
JSON_SERIALIZATION = 0b0001
GZIP_COMPRESSION = 0b0001
NO_COMPRESSION = 0b0000


def _build_header(
    msg_type: int,
    msg_type_specific_flags: int = 0,
    serial_method: int = JSON_SERIALIZATION,
    compression_type: int = GZIP_COMPRESSION,
    reserved_data: int = 0x00,
) -> bytes:
    """构建 4 字节消息头"""
    header = bytearray(4)
    header[0] = (PROTOCOL_VERSION << 4) | DEFAULT_HEADER_SIZE
    header[1] = (msg_type << 4) | msg_type_specific_flags
    header[2] = (serial_method << 4) | compression_type
    header[3] = reserved_data
    return bytes(header)


def _pack_request(payload: dict, msg_type: int = FULL_CLIENT_REQUEST) -> bytes:
    """打包 JSON 请求"""
    payload_bytes = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    compressed = gzip.compress(payload_bytes)
    header = _build_header(msg_type)
    size = struct.pack('>I', len(compressed))
    return header + size + compressed


def _pack_audio(audio_bytes: bytes) -> bytes:
    """打包音频数据"""
    header = _build_header(
        AUDIO_ONLY_REQUEST,
        compression_type=NO_COMPRESSION,
    )
    size = struct.pack('>I', len(audio_bytes))
    return header + size + audio_bytes


def _parse_response(data: bytes) -> dict:
    """解析服务端响应"""
    if len(data) < 4:
        return {}
    msg_type = (data[1] >> 4) & 0x0F
    compression = data[2] & 0x0F
    payload = data[8:]  # 跳过 4 字节头 + 4 字节长度

    if compression == GZIP_COMPRESSION:
        try:
            payload = gzip.decompress(payload)
        except Exception:
            pass

    try:
        return json.loads(payload.decode('utf-8'))
    except Exception:
        return {}


class ASRClient:
    def __init__(
        self,
        app_id: str,
        token: str,
        on_interim: Callable[[str, float], None],
        on_final: Callable[[str], None],
        on_error: Callable[[str], None],
    ):
        self.app_id = app_id
        self.token = token
        self.on_interim = on_interim
        self.on_final = on_final
        self.on_error = on_error
        self.running = False
        self._audio_queue: asyncio.Queue = asyncio.Queue()
        self._ws: Optional[websockets.WebSocketClientProtocol] = None

    async def start(self):
        """启动 ASR：开始录音 + 建立 WebSocket 连接"""
        self.running = True
        try:
            await asyncio.gather(
                self._record_audio(),
                self._asr_session(),
            )
        except Exception as e:
            logger.error(f'ASR 启动异常: {e}')
            self.on_error(str(e))

    async def stop(self):
        """停止 ASR"""
        self.running = False
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass

    async def _record_audio(self):
        """从麦克风录制音频，放入队列"""
        loop = asyncio.get_event_loop()

        def callback(indata, frames, time_info, status):
            if not self.running:
                return
            # 计算音量（0~1）
            volume = float(np.sqrt(np.mean(indata ** 2))) * 5
            volume = min(1.0, volume)
            # 转换为 16-bit PCM bytes
            audio_bytes = (indata * 32767).astype(np.int16).tobytes()
            loop.call_soon_threadsafe(
                self._audio_queue.put_nowait,
                (audio_bytes, volume),
            )

        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            dtype='float32',
            blocksize=CHUNK_SAMPLES,
            callback=callback,
        ):
            while self.running:
                await asyncio.sleep(0.05)

    async def _asr_session(self):
        """建立与豆包 ASR 的 WebSocket 会话"""
        uid = str(uuid.uuid4())
        headers = {
            'Authorization': f'Bearer; {self.token}',
        }

        # 初始请求 payload
        init_payload = {
            'app': {
                'appid': self.app_id,
                'token': self.token,
                'cluster': 'volcengine_streaming_common',
            },
            'user': {'uid': uid},
            'request': {
                'reqid': str(uuid.uuid4()),
                'sequence': 1,
                'nbest': 1,
                'show_utterances': True,
                'result_type': 'full',
            },
            'audio': {
                'format': 'raw',
                'codec': 'raw',
                'rate': SAMPLE_RATE,
                'bits': 16,
                'channel': CHANNELS,
                'language': 'zh-CN',
            },
        }

        try:
            async with ws_connect(
                ASR_WS_URL,
                additional_headers=headers,
                ping_interval=20,
            ) as ws:
                self._ws = ws
                logger.info('豆包 ASR WebSocket 已连接')

                # 发送初始化请求
                await ws.send(_pack_request(init_payload))

                # 并发：发送音频 + 接收结果
                await asyncio.gather(
                    self._send_audio(ws),
                    self._receive_results(ws),
                )
        except Exception as e:
            if self.running:
                logger.error(f'ASR WebSocket 异常: {e}')
                self.on_error(f'ASR 连接异常: {e}')

    async def _send_audio(self, ws):
        """持续从队列取音频并发送"""
        while self.running:
            try:
                audio_bytes, volume = await asyncio.wait_for(
                    self._audio_queue.get(), timeout=0.5
                )
                await ws.send(_pack_audio(audio_bytes))
                # 同时推送音量给前端（通过 on_interim 的 volume 参数）
                self.on_interim('', volume)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                if self.running:
                    logger.error(f'发送音频异常: {e}')
                break

    async def _receive_results(self, ws):
        """接收 ASR 识别结果"""
        current_utterance = ''

        async for raw in ws:
            if not self.running:
                break
            result = _parse_response(raw if isinstance(raw, bytes) else raw.encode())

            # 解析识别结果
            try:
                utterances = result.get('result', {}).get('utterances', [])
                for utt in utterances:
                    text = utt.get('text', '').strip()
                    is_final = utt.get('definite', False)

                    if not text:
                        continue

                    if is_final:
                        # 最终结果
                        if text != current_utterance:
                            self.on_final(text)
                            current_utterance = text
                    else:
                        # 中间结果（实时显示）
                        self.on_interim(text, 0)
                        current_utterance = text

            except Exception as e:
                logger.debug(f'解析结果异常: {e}, raw: {result}')
