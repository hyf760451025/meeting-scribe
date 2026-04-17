"""
配置管理：从本地文件读取 API Key 等配置
配置文件路径：~/.meeting-scribe/config.json
"""

import json
import os
from pathlib import Path
from dataclasses import dataclass, field

CONFIG_PATH = Path.home() / '.meeting-scribe' / 'config.json'

DEFAULT_SUMMARY_TEMPLATE = """## 📅 会议信息
- 时间：{{date}}
- 时长：{{duration}}

## 🎯 会议主题
（请根据逐字稿填写）

## 👥 参会人员
（请根据逐字稿填写）

## 📌 关键决策

## ✅ 待办事项
- [ ] 

## 💬 其他备注

## 📎 下次会议
"""


@dataclass
class Config:
    # 豆包 ASR
    volcengine_app_id: str = ''
    volcengine_token: str = ''

    # LLM
    llm_api_key: str = ''
    llm_base_url: str = 'https://ark.cn-beijing.volces.com/api/v3'
    llm_model: str = 'doubao-pro-32k'

    # Obsidian
    obsidian_vault_path: str = ''

    # 总结模板
    summary_template: str = DEFAULT_SUMMARY_TEMPLATE

    def load(self):
        """从配置文件加载"""
        if CONFIG_PATH.exists():
            try:
                data = json.loads(CONFIG_PATH.read_text(encoding='utf-8'))
                for k, v in data.items():
                    if hasattr(self, k):
                        setattr(self, k, v)
            except Exception as e:
                print(f'[Config] 读取配置失败: {e}')
        return self

    def save(self, data: dict):
        """更新并保存配置"""
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        for k, v in data.items():
            snake_key = _camel_to_snake(k)
            if hasattr(self, snake_key):
                setattr(self, snake_key, v)
        CONFIG_PATH.write_text(
            json.dumps(self.__dict__, ensure_ascii=False, indent=2),
            encoding='utf-8',
        )


def _camel_to_snake(name: str) -> str:
    """将前端传来的 camelCase 转换为 snake_case"""
    import re
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


# 全局单例
config = Config().load()
