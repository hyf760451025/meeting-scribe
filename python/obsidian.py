"""
Obsidian 同步：将会议总结写入 Obsidian Vault
"""

import logging
import os
from datetime import datetime
from pathlib import Path

logger = logging.getLogger('obsidian')


def sync_to_obsidian(summary: str, vault_path: str) -> str:
    """
    将总结写入 Obsidian Vault
    返回写入的文件路径
    """
    if not vault_path:
        raise ValueError('Obsidian Vault 路径未配置，请在设置中填写')

    vault = Path(vault_path)
    if not vault.exists():
        raise FileNotFoundError(f'Vault 路径不存在: {vault_path}')

    # 文件名：2026-04-17 会议记录.md
    date_str = datetime.now().strftime('%Y-%m-%d')
    filename = f'{date_str} 会议记录.md'
    filepath = vault / filename

    # 如果当天已有文件，追加序号
    counter = 1
    while filepath.exists():
        filename = f'{date_str} 会议记录 {counter}.md'
        filepath = vault / filename
        counter += 1

    # 写入文件
    filepath.write_text(summary, encoding='utf-8')
    logger.info(f'已写入 Obsidian: {filepath}')
    return str(filepath)
