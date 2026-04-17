"""
豆包大模型流式语音识别 (ASR)
文档：https://www.volcengine.com/docs/6561/1354869
接口：wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async（双向流式优化版）
"""

import asyncio
import gzip
import json
import logging
import struct
import uuid
from typing import Callable, Optional

import numpy as np
import sounddevice as sd
import websockets.exceptions
from websockets.client import connect as ws_connect

logger = logging.getLogger('asr')

# ─── 接口地址 ─────────────────────────────────────────────────────────────────
# 双向流式优化版（推荐，性能最优）
ASR_WS_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async'

# ─── 音频参数 ─────────────────────────────────────────────────────────────────
SAMPLE_RATE   = 16000
CHANNELS      = 1
CHUNK_MS      = 200   # 文档推荐双向流式用 200ms
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_MS / 1000)  # 3200 samples

# ─── 二进制协议常量 ───────────────────────────────────────────────────────────
PROTOCOL_VERSION    = 0b0001
HEADER_SIZE         = 0b0001   # 4 bytes
MSG_FULL_CLIENT_REQ = 0b0001
MSG_AUDIO_ONLY_REQ  = 0b0010
MSG_FULL_SERVER_RSP = 0b1001
MSG_ERROR           = 0b1111
FLAG_LAST_PACKAGE   = 0b0010
SERIAL_JSON         = 0b0001
SERIAL_NONE         = 0b0000
COMPRESS_GZIP       = 0b0001
COMPRESS_NONE       = 0b0000


def _make_header(msg_type: int, flags: int = 0,
                 serial: int = SERIAL_JSON,
                 compress: int = COMPRESS_GZIP) -> bytes:
    h = bytearray(4)
    h[0] = (PROTOCOL_VERSION << 4) | HEADER_SIZE
    h[1] = (msg_type << 4) | flags
    h[2] = (serial << 4) | compress
    h[3] = 0x00
    return bytes(h)


def _pack_json(payload: dict, msg_type: int = MSG_FULL_CLIENT_REQ) -> bytes:
    """打包 JSON payload（gzip 压缩）"""
    data = gzip.compress(json.dumps(payload, ensure_ascii=False).encode('utf-8'))
    return _make_header(msg_type) + struct.pack('>I', len(data)) + data


def _pack_audio(pcm_bytes: bytes, is_last: bool = False) -> bytes:
    """打包音频数据（不压缩）"""
    flags = FLAG_LAST_PACKAGE if is_last else 0
    header = _make_header(MSG_AUDIO_ONLY_REQ, flags=flags,
                          serial=SERIAL_NONE, compress=COMPRESS_NONE)
    return header + struct.pack('>I', len(pcm_bytes)) + pcm_bytes


def _parse_response(data: bytes) -> Optional[dict]:
    """解析服务端响应，返回 JSON dict 或 None"""
    if len(data) < 4:
        return None
    msg_type = (data[1] >> 4) & 0x0F
    compress  = data[2] & 0x0F

    # full server response：header(4) + sequence(4) + size(4) + payload
    # error response：header(4) + error_code(4) + size(4) + payload
    if msg_type in (MSG_FULL_SERVER_RSP, MSG_ERROR):
        payload = data[12:]   # 跳过 header + sequence/error_code + size
    else:
        payload = data[8:]    # 跳过 header + size

    if compress == COMPRESS_GZIP:
        try:
            payload = gzip.decompress(payload)
        except Exception:
            pass

    try:
        return json.loads(payload.decode('utf-8'))
    except Exception:
        return None


class ASRClient:
    def __init__(
        self,
        app_id: str,
        access_key: str,
        resource_id: str,
        on_interim: Callable[[str, float], None],
        on_final: Callable[[str], None],
        on_error: Callable[[str], None],
    ):
        self.app_id      = app_id
        self.access_key  = access_key
        self.resource_id = resource_id
        self.on_interim  = on_interim
        self.on_final    = on_final
        self.on_error    = on_error
        self.running     = False
        self._audio_queue: asyncio.Queue = asyncio.Queue()
        self._ws = None

    async def start(self):
        self.running = True
        try:
            await asyncio.gather(
                self._record_audio(),
                self._asr_session(),
            )
        except Exception as e:
            logger.error(f'ASR 启动异常: {e}')
            if self.running:
                self.on_error(str(e))

    async def stop(self):
        self.running = False
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass

    async def _record_audio(self):
        """从麦克风录制音频放入队列"""
        loop = asyncio.get_event_loop()

        def callback(indata, frames, time_info, status):
            if not self.running:
                return
            volume = float(min(1.0, np.sqrt(np.mean(indata ** 2)) * 6))
            pcm = (indata * 32767).astype(np.int16).tobytes()
            loop.call_soon_threadsafe(self._audio_queue.put_nowait, (pcm, volume))

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
        """建立 WebSocket 会话并收发数据"""
        connect_id = str(uuid.uuid4())

        # 文档要求的鉴权 Header
        headers = {
            'X-Api-App-Key':    self.app_id,
            'X-Api-Access-Key': self.access_key,
            'X-Api-Resource-Id': self.resource_id,
            'X-Api-Connect-Id': connect_id,
        }

        # Full client request payload
        init_payload = {
            'user': {
                'uid': str(uuid.uuid4()),
            },
            'audio': {
                'format':  'raw',
                'codec':   'raw',
                'rate':    SAMPLE_RATE,
                'bits':    16,
                'channel': CHANNELS,
            },
            'request': {
                'model_name':      'bigmodel',
                'enable_itn':      True,
                'enable_punc':     True,
                'enable_ddc':      True,
                'show_utterances': True,
                'result_type':     'single',  # 增量返回，适合实时显示
            },
        }

        logger.info(f'ASR 连接参数: app_id={self.app_id[:4]}**** resource_id={self.resource_id}')
        try:
            async with ws_connect(
                ASR_WS_URL,
                extra_headers=headers,
                ping_interval=20,
                open_timeout=10,
            ) as ws:
                self._ws = ws
                logger.info(f'豆包 ASR 已连接 [connect_id={connect_id}]')

                # 发送初始化请求
                await ws.send(_pack_json(init_payload))

                # 并发：发送音频 + 接收结果
                await asyncio.gather(
                    self._send_audio(ws),
                    self._recv_results(ws),
                )

        except websockets.exceptions.ConnectionClosed as e:
            if self.running:
                logger.warning(f'ASR 连接关闭: {e}')
        except Exception as e:
            if self.running:
                logger.error(f'ASR WebSocket 异常: {e}')
                self.on_error(f'ASR 连接异常: {e}')

    async def _send_audio(self, ws):
        """持续从队列取音频发送"""
        while self.running:
            try:
                pcm, volume = await asyncio.wait_for(
                    self._audio_queue.get(), timeout=0.5
                )
                await ws.send(_pack_audio(pcm))
                # 同步推送音量给前端（text 为空仅更新音量）
                self.on_interim('', volume)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                if self.running:
                    logger.error(f'发送音频异常: {e}')
                break

        # 停止时发送最后一包（空音频 + last flag）
        try:
            await ws.send(_pack_audio(b'', is_last=True))
        except Exception:
            pass

    async def _recv_results(self, ws):
        """接收并解析识别结果"""
        async for raw in ws:
            if not self.running:
                break
            data = raw if isinstance(raw, bytes) else raw.encode()
            result = _parse_response(data)
            if not result:
                continue

            # 检查错误码
            code = result.get('code', 0)
            if code != 0 and code != 20000000:
                msg = result.get('message', f'错误码 {code}')
                logger.error(f'ASR 服务错误: {code} - {msg}')
                if self.running:
                    self.on_error(f'ASR 错误: {msg}')
                continue

            try:
                utterances = result.get('result', {}).get('utterances', [])
                for utt in utterances:
                    text = utt.get('text', '').strip()
                    if not text:
                        continue
                    is_final = utt.get('definite', False)
                    if is_final:
                        self.on_final(text)
                    else:
                        self.on_interim(text, 0)
            except Exception as e:
                logger.debug(f'解析结果异常: {e}')
