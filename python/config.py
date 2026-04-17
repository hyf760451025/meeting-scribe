"""
配置管理：优先读取项目根目录的 .env 文件
"""

import json
import os
from pathlib import Path

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
        # 豆包语音 ASR
        self.volcengine_app_id      = ''
        self.volcengine_access_key  = ''
        self.volcengine_resource_id = 'volc.bigasr.sauc.duration'

        # 豆包 LLM（火山方舟）
        self.ark_api_key  = ''
        self.ark_model    = ''
        self.ark_base_url = 'https://ark.cn-beijing.volces.com/api/v3'

        # Obsidian
        self.obsidian_vault_path = ''

        # 总结模板
        self.summary_template = DEFAULT_SUMMARY_TEMPLATE

        self._load()

    def _load(self):
        # 1. 从 .env 文件读
        env = _load_env_file(ENV_FILE)
        if env:
            print(f'[Config] 从 .env 加载配置')
            self.volcengine_app_id      = env.get('VOLCENGINE_APP_ID',      self.volcengine_app_id)
            self.volcengine_access_key  = env.get('VOLCENGINE_ACCESS_KEY',  self.volcengine_access_key)
            self.volcengine_resource_id = env.get('VOLCENGINE_RESOURCE_ID', self.volcengine_resource_id)
            self.ark_api_key  = env.get('ARK_API_KEY',  self.ark_api_key)
            self.ark_model    = env.get('ARK_MODEL',    self.ark_model)
            self.ark_base_url = env.get('ARK_BASE_URL', self.ark_base_url)
            self.obsidian_vault_path    = env.get('OBSIDIAN_VAULT_PATH',    self.obsidian_vault_path)

        # 2. 系统环境变量覆盖
        self.volcengine_app_id      = os.environ.get('VOLCENGINE_APP_ID',      self.volcengine_app_id)
        self.volcengine_access_key  = os.environ.get('VOLCENGINE_ACCESS_KEY',  self.volcengine_access_key)
        self.volcengine_resource_id = os.environ.get('VOLCENGINE_RESOURCE_ID', self.volcengine_resource_id)
        self.ark_api_key  = os.environ.get('ARK_API_KEY',  self.ark_api_key)
        self.ark_model    = os.environ.get('ARK_MODEL',    self.ark_model)
        self.ark_base_url = os.environ.get('ARK_BASE_URL', self.ark_base_url)
        self.obsidian_vault_path    = os.environ.get('OBSIDIAN_VAULT_PATH',    self.obsidian_vault_path)

        # 3. config.json 兜底（UI 设置保存的地方）
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
        ok = '[OK]'
        no = '[--]'
        print('[Config] 配置加载完成:')
        print(f'  VOLCENGINE_APP_ID      : {ok if self.volcengine_app_id else no + " 未配置"}')
        print(f'  VOLCENGINE_ACCESS_KEY  : {ok if self.volcengine_access_key else no + " 未配置"}')
        print(f'  VOLCENGINE_RESOURCE_ID : {self.volcengine_resource_id}')
        print(f'  ARK_API_KEY            : {ok if self.ark_api_key else no + " 未配置"}')
        print(f'  ARK_MODEL              : {self.ark_model or no + " 未配置"}')
        print(f'  ARK_BASE_URL           : {self.ark_base_url}')
        print(f'  OBSIDIAN_VAULT_PATH    : {self.obsidian_vault_path or no + " 未配置"}')

    def save(self, data: dict):
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        existing = {}
        if CONFIG_FILE.exists():
            try:
                existing = json.loads(CONFIG_FILE.read_text(encoding='utf-8'))
            except Exception:
                pass
        for k, v in data.items():
            snake_key = _camel_to_snake(k)
            existing[snake_key] = v
            if hasattr(self, snake_key):
                setattr(self, snake_key, v)
        CONFIG_FILE.write_text(
            json.dumps(existing, ensure_ascii=False, indent=2),
            encoding='utf-8',
        )


def _camel_to_snake(name: str) -> str:
    import re
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()


config = Config()
