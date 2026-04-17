"""
配置管理：优先读取项目根目录的 .env 文件，其次读取 ~/.meeting-scribe/config.json
"""

import json
import os
from pathlib import Path

# 项目根目录（python/ 的上一级）
PROJECT_ROOT = Path(__file__).parent.parent
ENV_FILE = PROJECT_ROOT / '.env'
CONFIG_FILE = Path.home() / '.meeting-scribe' / 'config.json'

DEFAULT_SUMMARY_TEMPLATE = """## 📅 会议信息
- 时间：{{date}}
- 时长：{{duration}}

## 🎯 会议主题


## 👥 参会人员


## 📌 关键决策


## ✅ 待办事项
- [ ] 

## 💬 其他备注


## 📎 下次会议
"""


def _load_env_file(path: Path) -> dict:
    """解析 .env 文件，返回 key-value 字典"""
    result = {}
    if not path.exists():
        return result
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' in line:
            key, _, val = line.partition('=')
            result[key.strip()] = val.strip()
    return result


class Config:
    def __init__(self):
        # 默认值
        self.volcengine_app_id = ''
        self.volcengine_token = ''
        self.llm_api_key = ''
        self.llm_base_url = 'https://ark.cn-beijing.volces.com/api/v3'
        self.llm_model = 'doubao-pro-32k'
        self.obsidian_vault_path = ''
        self.summary_template = DEFAULT_SUMMARY_TEMPLATE

        self._load()

    def _load(self):
        # 1. 先从 .env 文件读（优先级最高）
        env = _load_env_file(ENV_FILE)
        if env:
            print(f'[Config] 从 .env 文件加载配置: {ENV_FILE}')
            self.volcengine_app_id  = env.get('VOLCENGINE_APP_ID', self.volcengine_app_id)
            self.volcengine_token   = env.get('VOLCENGINE_TOKEN', self.volcengine_token)
            self.llm_api_key        = env.get('LLM_API_KEY', self.llm_api_key)
            self.llm_base_url       = env.get('LLM_BASE_URL', self.llm_base_url)
            self.llm_model          = env.get('LLM_MODEL', self.llm_model)
            self.obsidian_vault_path = env.get('OBSIDIAN_VAULT_PATH', self.obsidian_vault_path)

        # 2. 再从系统环境变量读（CI/生产环境用）
        self.volcengine_app_id  = os.environ.get('VOLCENGINE_APP_ID', self.volcengine_app_id)
        self.volcengine_token   = os.environ.get('VOLCENGINE_TOKEN', self.volcengine_token)
        self.llm_api_key        = os.environ.get('LLM_API_KEY', self.llm_api_key)
        self.llm_base_url       = os.environ.get('LLM_BASE_URL', self.llm_base_url)
        self.llm_model          = os.environ.get('LLM_MODEL', self.llm_model)
        self.obsidian_vault_path = os.environ.get('OBSIDIAN_VAULT_PATH', self.obsidian_vault_path)

        # 3. 最后从 config.json 读（UI 设置保存的地方，可覆盖 .env）
        if CONFIG_FILE.exists():
            try:
                data = json.loads(CONFIG_FILE.read_text(encoding='utf-8'))
                for k, v in data.items():
                    if hasattr(self, k) and v:
                        setattr(self, k, v)
            except Exception as e:
                print(f'[Config] 读取 config.json 失败: {e}')

        self._print_status()

    def _print_status(self):
        """启动时打印配置状态，方便排查问题"""
        print('[Config] 配置加载完成:')
        print(f'  VOLCENGINE_APP_ID  : {"✓ 已配置" if self.volcengine_app_id else "✗ 未配置"}')
        print(f'  VOLCENGINE_TOKEN   : {"✓ 已配置" if self.volcengine_token else "✗ 未配置"}')
        print(f'  LLM_API_KEY        : {"✓ 已配置" if self.llm_api_key else "✗ 未配置"}')
        print(f'  LLM_BASE_URL       : {self.llm_base_url}')
        print(f'  LLM_MODEL          : {self.llm_model}')
        print(f'  OBSIDIAN_VAULT_PATH: {self.obsidian_vault_path or "✗ 未配置"}')

    def save(self, data: dict):
        """从 UI 设置页保存配置到 config.json"""
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        # 读取已有内容合并
        existing = {}
        if CONFIG_FILE.exists():
            try:
                existing = json.loads(CONFIG_FILE.read_text(encoding='utf-8'))
            except Exception:
                pass
        # key 转换：前端 camelCase → snake_case
        for k, v in data.items():
            snake_key = _camel_to_snake(k)
            existing[snake_key] = v
            if hasattr(self, snake_key):
                setattr(self, snake_key, v)
        CONFIG_FILE.write_text(
            json.dumps(existing, ensure_ascii=False, indent=2),
            encoding='utf-8',
        )
        print(f'[Config] 已保存到 {CONFIG_FILE}')


def _camel_to_snake(name: str) -> str:
    import re
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


# 全局单例
config = Config()
