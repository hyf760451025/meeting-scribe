"""
智能总结：调用 LLM API 生成结构化会议总结
兼容 OpenAI 格式（豆包 / DeepSeek / OpenAI 均可）
"""

import asyncio
import logging
from datetime import datetime
from openai import AsyncOpenAI

logger = logging.getLogger('llm')

SYSTEM_PROMPT = """你是一个专业的会议记录助手。
请根据用户提供的会议逐字稿，按照给定的 Markdown 模板生成结构化的会议总结。
要求：
1. 严格按照模板格式输出
2. 内容精炼，突出关键信息
3. 待办事项需要有明确的动作动词
4. 如果逐字稿中没有相关信息，对应部分写"（未提及）"
5. 直接输出 Markdown，不要有任何额外说明
"""


async def generate_summary(
    transcript: str,
    template: str,
    api_key: str,
    base_url: str,
    model: str,
) -> str:
    """调用 LLM 生成会议总结"""

    if not api_key:
        raise ValueError('LLM API Key 未配置，请在设置中填写')

    client = AsyncOpenAI(api_key=api_key, base_url=base_url)

    now = datetime.now()
    date_str = now.strftime('%Y年%m月%d日 %H:%M')

    user_prompt = f"""请根据以下会议逐字稿生成总结。

【总结模板】
{template.replace('{{date}}', date_str).replace('{{duration}}', '（请根据实际情况填写）')}

【会议逐字稿】
{transcript}

请严格按照上面的模板格式输出总结内容。"""

    logger.info(f'调用 LLM: {model} @ {base_url}')

    response = await client.chat.completions.create(
        model=model,
        messages=[
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_prompt},
        ],
        temperature=0.3,
        max_tokens=2000,
    )

    summary = response.choices[0].message.content or ''
    logger.info(f'总结生成完成，长度: {len(summary)} 字符')
    return summary
