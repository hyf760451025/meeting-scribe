#!/usr/bin/env python3
"""
MeetingScribe Python 后端
- WebSocket Server (port 8767): 与 Electron 前端通信，处理 ASR 流式转写
- HTTP Server (port 8766): 处理同步 Obsidian、设置更新等请求
"""

import asyncio
import json
import logging
import websockets
from http_server import start_http_server
from asr import ASRClient
from llm import generate_summary
from config import config

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s %(name)s: %(message)s',
    datefmt='%H:%M:%S',
)
logger = logging.getLogger('main')

# 当前活跃的 ASR 客户端
asr_client: ASRClient | None = None


async def handle_client(websocket):
    """处理前端 WebSocket 连接"""
    global asr_client
    client_addr = websocket.remote_address
    logger.info(f'前端已连接: {client_addr}')

    async def push(data: dict):
        """向前端推送消息"""
        try:
            await websocket.send(json.dumps(data, ensure_ascii=False))
        except Exception:
            pass

    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action = msg.get('action')

            if action == 'start':
                # 开始录音 + ASR
                if asr_client and asr_client.running:
                    continue
                logger.info('开始录音...')
                asr_client = ASRClient(
                    app_id=config.volcengine_app_id,
                    token=config.volcengine_token,
                    on_interim=lambda text, vol: asyncio.create_task(
                        push({'type': 'asr_interim', 'text': text, 'volume': vol})
                    ),
                    on_final=lambda text: asyncio.create_task(
                        push({'type': 'asr_final', 'text': text})
                    ),
                    on_error=lambda err: asyncio.create_task(
                        push({'type': 'error', 'message': err})
                    ),
                )
                asyncio.create_task(asr_client.start())

            elif action == 'stop':
                # 停止录音
                logger.info('停止录音')
                if asr_client:
                    await asr_client.stop()
                    asr_client = None

            elif action == 'summarize':
                # 生成智能总结
                transcript = msg.get('transcript', '')
                if not transcript.strip():
                    await push({'type': 'error', 'message': '逐字稿为空，无法生成总结'})
                    continue

                logger.info('开始生成总结...')
                try:
                    summary = await generate_summary(
                        transcript=transcript,
                        template=config.summary_template,
                        api_key=config.llm_api_key,
                        base_url=config.llm_base_url,
                        model=config.llm_model,
                    )
                    await push({'type': 'summary_result', 'text': summary})
                except Exception as e:
                    logger.error(f'总结生成失败: {e}')
                    await push({'type': 'error', 'message': f'总结生成失败: {e}'})

    except websockets.exceptions.ConnectionClosed:
        logger.info(f'前端断开连接: {client_addr}')
    except Exception as e:
        logger.error(f'WebSocket 处理异常: {e}')
    finally:
        if asr_client and asr_client.running:
            await asr_client.stop()


async def main():
    logger.info('MeetingScribe 后端启动中...')

    # 启动 HTTP server（处理 Obsidian 同步、设置）
    http_task = asyncio.create_task(start_http_server())

    # 启动 WebSocket server
    logger.info('WebSocket 服务启动在 ws://localhost:8767')
    async with websockets.serve(handle_client, 'localhost', 8767):
        await asyncio.Future()  # 永久运行


if __name__ == '__main__':
    asyncio.run(main())
