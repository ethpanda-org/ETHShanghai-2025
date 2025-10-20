import logging
import random
import threading
import time
from typing import List, Optional

from config import settings

logger = logging.getLogger(__name__)


class ProxyManager:
    def __init__(self, proxy_file: str = 'config/proxies.txt'):
        self.proxy_file = proxy_file
        self.proxies: List[dict] = []
        self.bad_proxies = set()
        self._lock = threading.Lock()

        self._load_proxies()
        # 完全跳过健康检查，直接使用所有加载的代理
        logger.info(f"跳过代理健康检查，保留 {len(self.proxies)} 个代理")

        # 后台自动刷新 bad_proxies
        thread = threading.Thread(target=self._auto_refresh, daemon=True)
        thread.start()

    def _load_proxies(self):
        """从配置文件加载代理列表（忽略注释行）"""
        try:
            with open(self.proxy_file) as f:
                lines = [line.strip() for line in f if line.strip() and not line.strip().startswith('#')]
        except FileNotFoundError:
            lines = []

        with self._lock:
            self.proxies = [{'url': url, 'success_rate': 1.0} for url in lines]
        logger.info(f"加载了 {len(self.proxies)} 个代理")

    def get_proxy(self) -> Optional[str]:
        """基于成功率权重随机返回一个可用代理 URL"""
        with self._lock:
            candidates = [p for p in self.proxies if p['url'] not in self.bad_proxies]
        if not candidates:
            return None
        weights = [p['success_rate'] for p in candidates]
        chosen = random.choices(candidates, weights=weights, k=1)[0]['url']
        return chosen

    def mark_bad(self, proxy: str):
        """将一个失效代理降权并加入 bad_proxies 集合"""
        with self._lock:
            for p in self.proxies:
                if p['url'] == proxy:
                    p['success_rate'] = max(0.0, p['success_rate'] - 0.2)
            self.bad_proxies.add(proxy)
        logger.info(f"代理 {proxy} 被标记为 BAD")

    def refresh(self):
        """清空 bad_proxies，让所有代理重新参与调度"""
        with self._lock:
            self.bad_proxies.clear()
        logger.info("已刷新所有 bad_proxies")

    def _auto_refresh(self):
        """后台线程定期调用 refresh()，间隔秒数由配置决定"""
        interval = settings.PROXY_CONFIG.get('refresh_interval', 600)
        while True:
            time.sleep(interval)
            self.refresh()