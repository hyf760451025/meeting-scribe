"""
HTTP Server（port 8766）
处理：Obsidian 同步、设置更新
"""

import asyncio
import json
import logging
from aiohttp import web
from obsidian import sync_to_obsidian
from config import config

logger = logging.getLogger('http')


async def handle_sync_obsidian(request: web.Request) -> web.Response:
    """POST /sync-obsidian — 将总结写入 Obsidian"""
    try:
        body = await request.json()
        summary = body.get('summary', '')
        if not summary:
            return web.json_response({'ok': False, 'error': '总结内容为空'}, status=400)

        filepath = sync_to_obsidian(summary, config.obsidian_vault_path)
        return web.json_response({'ok': True, 'filepath': filepath})
    except Exception as e:
        logger.error(f'同步 Obsidian 失败: {e}')
        return web.json_response({'ok': False, 'error': str(e)}, status=500)


async def handle_settings(request: web.Request) -> web.Response:
    """POST /settings — 更新配置"""
    try:
        data = await request.json()
        config.save(data)
        logger.info('配置已更新')
        return web.json_response({'ok': True})
    except Exception as e:
        logger.error(f'保存配置失败: {e}')
        return web.json_response({'ok': False, 'error': str(e)}, status=500)


async def handle_health(request: web.Request) -> web.Response:
    """GET /health — 健康检查"""
    return web.json_response({'ok': True, 'version': '1.0.0'})


async def start_http_server():
    """启动 HTTP 服务"""
    app = web.Application()

    # CORS 中间件（允许 Electron 前端访问）
    @web.middleware
    async def cors_middleware(request, handler):
        response = await handler(request)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    app = web.Application(middlewares=[cors_middleware])
    app.router.add_get('/health', handle_health)
    app.router.add_post('/sync-obsidian', handle_sync_obsidian)
    app.router.add_post('/settings', handle_settings)
    app.router.add_route('OPTIONS', '/{path_info:.*}', lambda r: web.Response())

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, 'localhost', 8766)
    await site.start()
    logger.info('HTTP 服务启动在 http://localhost:8766')
