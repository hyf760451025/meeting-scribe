"""
智能总结：调用豆包 Responses API 生成结构化会议总结
接口文档：https://www.volcengine.com/docs/82379/
"""

import asyncio
import logging
from datetime import datetime
import httpx

logger = logging.getLogger('llm')

SYSTEM_PROMPT = """你是一个专业的会议记录助手。
请根据用户提供的会议逐字稿，按照给定的 Markdown 模板生成结构化的会议总结。
要求：
1. 严格按照模板格式输出
2. 内容精炼，突出关键信息
3. 待办事项需要有明确的动作动词
4. 如果逐字稿中没有相关信息，对应部分写「未提及」
5. 直接输出 Markdown，不要有任何额外说明
"""


async def generate_summary(
    transcript: str,
    template: str,
    api_key: str,      # ARK_API_KEY
    base_url: str,     # ARK_BASE_URL
    model: str,        # ARK_ENDPOINT_ID
) -> str:
    """调用豆包 Responses API 生成会议总结"""

    if not api_key:
        raise ValueError('LLM API Key 未配置，请在 .env 文件中填写 LLM_API_KEY')

    now = datetime.now()
    date_str = now.strftime('%Y年%m月%d日 %H:%M')

    filled_template = template.replace('{{date}}', date_str).replace(
        '{{duration}}', '（请根据实际情况填写）'
    )

    user_content = f"""请根据以下会议逐字稿生成总结。

【总结模板】
{filled_template}

【会议逐字稿】
{transcript}

请严格按照上面的模板格式输出总结内容。"""

    # 构造请求 payload（豆包 Responses API 格式）
    payload = {
        'model': model,
        'input': [
            {
                'role': 'system',
                'content': [
                    {
                        'type': 'input_text',
                        'text': SYSTEM_PROMPT,
                    }
                ],
            },
            {
                'role': 'user',
                'content': [
                    {
                        'type': 'input_text',
                        'text': user_content,
                    }
                ],
            },
        ],
    }

    # 确保 base_url 末尾没有多余的斜杠
    base = base_url.rstrip('/')
    url = f'{base}/responses'

    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }

    logger.info(f'调用豆包 LLM: {model} @ {url}')

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json=payload, headers=headers)

        if resp.status_code != 200:
            raise RuntimeError(
                f'LLM API 请求失败: HTTP {resp.status_code} - {resp.text}'
            )

        data = resp.json()

    # 解析响应：Responses API 返回格式
    # data.output 是一个列表，找 type=message 的项
    summary = _extract_text(data)
    if not summary:
        raise RuntimeError(f'LLM 返回结果解析失败，原始响应: {data}')

    logger.info(f'总结生成完成，长度: {len(summary)} 字符')
    return summary


def _extract_text(data: dict) -> str:
    """从 Responses API 响应中提取文本内容"""
    # 新版 Responses API 响应结构：
    # { "output": [ { "type": "message", "content": [ { "type": "output_text", "text": "..." } ] } ] }
    try:
        for item in data.get('output', []):
            if item.get('type') == 'message':
                for content in item.get('content', []):
                    if content.get('type') == 'output_text':
                        return content.get('text', '').strip()
    except Exception:
        pass

    # 兼容旧版 chat/completions 格式（OpenAI 格式）
    try:
        return data['choices'][0]['message']['content'].strip()
    except Exception:
        pass

    return ''
