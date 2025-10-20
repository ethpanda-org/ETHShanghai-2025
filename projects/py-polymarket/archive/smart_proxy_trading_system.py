#!/usr/bin/env python3
"""
智能代理交易系统
支持条件代理模式：
- CLOB/GraphQL官方API：直连模式
- 爬虫操作：代理模式
- 网络故障时自动暂停并报错分析
"""

import asyncio
import logging
import json
import time
import webbrowser
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict

# 导入智能代理数据获取器
from smart_proxy_data_fetcher import SmartProxyDataFetcher, MarketData, NetworkError, CrawlerProxyRequiredError

# 导入策略组件
try:
    from spike_detection_strategy import AdvancedSpikeDetector, SpikeDetectionTradingStrategy
    SPIKE_DETECTION_AVAILABLE = True
except ImportError:
    SPIKE_DETECTION_AVAILABLE = False
    logging.warning("Spike detection strategy not available")

try:
    from optimized_strategy import OptimizedTradingStrategy
    OPTIMIZED_STRATEGY_AVAILABLE = True
except ImportError:
    OPTIMIZED_STRATEGY_AVAILABLE = False
    logging.warning("Optimized strategy not available")

# 导入监控组件
try:
    from web_monitor import WebMonitor
    WEB_MONITOR_AVAILABLE = True
except ImportError:
    WEB_MONITOR_AVAILABLE = False
    logging.warning("Web monitor not available")

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('smart_proxy_trading.log')
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class SmartTrade:
    """智能交易记录"""
    trade_id: str
    market_id: str
    market_title: str
    strategy_type: str
    signal_strength: float
    confidence: float
    entry_price: float
    entry_time: datetime
    position_size: float
    direction: str  # 'BUY_YES' or 'BUY_NO'
    data_source: str  # 'CLOB', 'GraphQL', 'Crawler'
    connection_mode: str  # 'direct' or 'proxy'
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    exit_price: Optional[float] = None
    exit_time: Optional[datetime] = None
    pnl: Optional[float] = None
    status: str = "OPEN"  # OPEN, CLOSED, STOPPED
    reasoning: str = ""

class SmartTradingEngine:
    """智能交易引擎 - 支持直连和代理模式"""
    
    def __init__(self, initial_balance: float = 10000):
        self.initial_balance = initial_balance
        self.current_balance = initial_balance
        self.available_balance = initial_balance
        
        # 交易记录
        self.trades: List[SmartTrade] = []
        self.open_positions: Dict[str, SmartTrade] = {}
        
        # 性能统计
        self.total_pnl = 0.0
        self.win_count = 0
        
        # 连接模式统计
        self.connection_stats = {
            'direct': {'trades': 0, 'success': 0},
            'proxy': {'trades': 0, 'success': 0}
        }
        
        # 风险参数
        self.max_position_size = 0.08  # 单个仓位最大8%
        self.max_total_exposure = 0.4  # 总敞口最大40%
        
        # 策略组件初始化
        self._initialize_strategies()
        
    def _initialize_strategies(self):
        """初始化策略组件"""
        # Spike Detection策略
        if SPIKE_DETECTION_AVAILABLE:
            self.spike_detector = AdvancedSpikeDetector(
                spike_threshold=0.02,
                volume_surge_threshold=1.8,
                confidence_threshold=0.65
            )
            self.spike_strategy = SpikeDetectionTradingStrategy(self.spike_detector)
            logger.info("[STRATEGY] Spike detection strategy initialized")
        else:
            self.spike_detector = None
            self.spike_strategy = None
            
        # 优化策略
        if OPTIMIZED_STRATEGY_AVAILABLE:
            self.optimized_strategy = OptimizedTradingStrategy()
            logger.info("[STRATEGY] Optimized strategy initialized")
        else:
            self.optimized_strategy = None
    
    async def execute_trade(self, market_data: MarketData, signal_result: Dict) -> Optional[SmartTrade]:
        """执行交易"""
        try:
            market_id = market_data.market_id
            current_price = market_data.price
            
            # 检查是否已有该市场的仓位
            if market_id in self.open_positions:
                logger.debug(f"Market {market_id} already has position, skipping")
                return None
            
            # 提取信号信息
            signal_strength = signal_result.get('signal_strength', 0)
            confidence = signal_result.get('confidence', 0)
            strategy_type = signal_result.get('strategy_type', 'unknown')
            reasoning = signal_result.get('reasoning', '')
            
            # 确定交易方向
            if current_price > 0.75:
                direction = "BUY_NO"
            elif current_price < 0.25:
                direction = "BUY_YES"
            else:
                direction = "BUY_YES" if signal_strength > 0 else "BUY_NO"
            
            # 计算仓位大小
            position_size = self._calculate_position_size(
                signal_strength, confidence, market_data
            )
            
            if position_size < 50:
                logger.debug(f"Position too small ${position_size:.0f}, skipping trade")
                return None
            
            if position_size > self.available_balance:
                logger.warning(f"Insufficient funds, need ${position_size:.0f}, available ${self.available_balance:.0f}")
                return None
            
            # 创建交易记录
            trade = SmartTrade(
                trade_id=f"SM_{int(time.time() * 1000)}",
                market_id=market_id,
                market_title=market_data.title,
                strategy_type=strategy_type,
                signal_strength=signal_strength,
                confidence=confidence,
                entry_price=current_price,
                entry_time=datetime.now(),
                position_size=position_size,
                direction=direction,
                data_source=market_data.data_source,
                connection_mode=market_data.connection_mode,
                target_price=self._calculate_target_price(current_price, signal_strength),
                stop_loss=self._calculate_stop_loss(current_price, signal_strength),
                reasoning=reasoning
            )
            
            # 更新账户状态
            self.available_balance -= position_size
            self.open_positions[market_id] = trade
            self.trades.append(trade)
            
            # 更新连接统计
            self.connection_stats[market_data.connection_mode]['trades'] += 1
            
            logger.info(f"[TRADE] {direction} {market_data.title[:40]}...")
            logger.info(f"  Price: {current_price:.3f}, Size: ${position_size:.0f}, Conf: {confidence:.1%}")
            logger.info(f"  Source: {market_data.data_source} ({market_data.connection_mode})")
            
            return trade
            
        except Exception as e:
            logger.error(f"Trade execution error: {e}")
            return None
    
    def update_positions(self, market_data_list: List[MarketData]):
        """更新持仓状态"""
        market_prices = {m.market_id: m.price for m in market_data_list}
        
        positions_to_close = []
        
        for market_id, trade in self.open_positions.items():
            if market_id not in market_prices:
                continue
                
            current_price = market_prices[market_id]
            
            # 检查止盈止损条件
            should_close = False
            close_reason = ""
            
            if trade.target_price and trade.direction == "BUY_YES" and current_price >= trade.target_price:
                should_close = True
                close_reason = "YES token take profit"
            elif trade.target_price and trade.direction == "BUY_NO" and current_price <= trade.target_price:
                should_close = True
                close_reason = "NO token take profit"
            elif trade.stop_loss and trade.direction == "BUY_YES" and current_price <= trade.stop_loss:
                should_close = True
                close_reason = "YES token stop loss"
            elif trade.stop_loss and trade.direction == "BUY_NO" and current_price >= trade.stop_loss:
                should_close = True
                close_reason = "NO token stop loss"
            elif (datetime.now() - trade.entry_time).total_seconds() > 86400:
                should_close = True
                close_reason = "Time stop"
            
            if should_close:
                positions_to_close.append((market_id, current_price, close_reason))
        
        # 平仓
        for market_id, exit_price, reason in positions_to_close:
            self._close_position(market_id, exit_price, reason)
    
    def _close_position(self, market_id: str, exit_price: float, reason: str):
        """平仓"""
        if market_id not in self.open_positions:
            return
        
        trade = self.open_positions[market_id]
        
        # 计算盈亏
        if trade.direction == "BUY_YES":
            pnl = trade.position_size * (exit_price - trade.entry_price) / trade.entry_price
        elif trade.direction == "BUY_NO":
            pnl = trade.position_size * (trade.entry_price - exit_price) / trade.entry_price
        else:
            pnl = 0
        
        # 更新交易记录
        trade.exit_price = exit_price
        trade.exit_time = datetime.now()
        trade.pnl = pnl
        trade.status = "CLOSED"
        trade.reasoning += f" | Close: {reason}"
        
        # 更新账户
        self.available_balance += trade.position_size + pnl
        self.current_balance += pnl
        self.total_pnl += pnl
        
        if pnl > 0:
            self.win_count += 1
            self.connection_stats[trade.connection_mode]['success'] += 1
        
        # 移除持仓
        del self.open_positions[market_id]
        
        logger.info(f"[CLOSE] {trade.market_title[:30]} | {reason}")
        logger.info(f"  P&L: ${pnl:+.0f} | Balance: ${self.current_balance:.0f}")
    
    def _calculate_position_size(self, signal_strength: float, confidence: float, market_data: MarketData) -> float:
        """计算仓位大小"""
        # 基础仓位计算
        base_ratio = 0.04
        base_size = self.available_balance * abs(signal_strength) * confidence * base_ratio
        
        # 根据数据源和连接模式调整
        source_multiplier = 1.2 if market_data.data_source == 'CLOB' else 1.0
        connection_multiplier = 0.9 if market_data.connection_mode == 'proxy' else 1.0  # 代理模式稍微保守
        
        # 根据流动性调整
        liquidity_factor = min(1.5, market_data.liquidity / 5000) if market_data.liquidity > 0 else 0.5
        
        adjusted_size = base_size * source_multiplier * connection_multiplier * liquidity_factor
        
        # 应用限制
        max_size = self.available_balance * self.max_position_size
        final_size = min(adjusted_size, max_size)
        
        return max(50, final_size)
    
    def _calculate_target_price(self, entry_price: float, signal_strength: float) -> float:
        """计算目标价格"""
        target_return = abs(signal_strength) * 0.12
        
        if signal_strength > 0:
            target_price = entry_price * (1 + target_return)
        else:
            target_price = entry_price * (1 - target_return)
        
        return max(0.01, min(0.99, target_price))
    
    def _calculate_stop_loss(self, entry_price: float, signal_strength: float) -> float:
        """计算止损价格"""
        stop_loss_pct = 0.06
        
        if signal_strength > 0:
            stop_loss = entry_price * (1 - stop_loss_pct)
        else:
            stop_loss = entry_price * (1 + stop_loss_pct)
        
        return max(0.01, min(0.99, stop_loss))
    
    def get_performance_metrics(self) -> Dict:
        """获取性能指标"""
        if not self.trades:
            return {
                "total_trades": 0,
                "open_positions": 0,
                "current_balance": self.current_balance,
                "total_return": 0,
                "win_rate": 0,
                "connection_stats": self.connection_stats
            }
        
        closed_trades = [t for t in self.trades if t.status == "CLOSED"]
        
        # 基础指标
        total_return = (self.current_balance - self.initial_balance) / self.initial_balance
        win_rate = self.win_count / len(closed_trades) if closed_trades else 0
        
        return {
            "total_trades": len(self.trades),
            "closed_trades": len(closed_trades),
            "open_positions": len(self.open_positions),
            "current_balance": self.current_balance,
            "available_balance": self.available_balance,
            "initial_balance": self.initial_balance,
            "total_pnl": self.total_pnl,
            "total_return": total_return,
            "win_rate": win_rate,
            "connection_stats": self.connection_stats
        }

class SmartProxyTradingSystem:
    """智能代理交易系统"""
    
    def __init__(self, initial_balance: float = 10000, enable_crawler: bool = False, 
                 auto_monitor: bool = True, proxy_manager_port: int = 33335):
        """
        初始化智能代理交易系统
        
        Args:
            initial_balance: 初始资金
            enable_crawler: 是否启用爬虫功能（启用时强制使用代理）
            auto_monitor: 自动启动Web监控
            proxy_manager_port: 代理端口（仅爬虫时使用）
        """
        self.trading_engine = SmartTradingEngine(initial_balance)
        self.data_fetcher = None
        self.enable_crawler = enable_crawler
        self.auto_monitor = auto_monitor
        self.web_monitor = None
        self.proxy_manager_port = proxy_manager_port
        
        # 系统配置
        self.update_interval = 45
        self.max_concurrent_positions = 6
        
        logger.info("[INIT] Smart Proxy Trading System initialized")
        logger.info(f"[CONFIG] Initial balance: ${initial_balance:,.0f}")
        logger.info(f"[CONFIG] Crawler mode: {'Enabled' if enable_crawler else 'Disabled'}")
        logger.info(f"[CONFIG] Auto monitor: {auto_monitor}")
        
        if enable_crawler:
            logger.info(f"[CONFIG] Proxy port: {proxy_manager_port}")
            logger.info("[REQUIREMENT] Crawler mode requires proxy configuration")
        else:
            logger.info("[MODE] Direct connection mode for official APIs")
    
    async def run_smart_simulation(self, duration_hours: float = 8.0):
        """运行智能模拟交易"""
        logger.info(f"[START] Smart simulation for {duration_hours} hours")
        
        if self.enable_crawler:
            logger.info("[MODE] CLOB (direct) + GraphQL (direct) + Crawler (proxy)")
        else:
            logger.info("[MODE] CLOB (direct) + GraphQL (direct) only")
        
        # 启动Web监控
        if self.auto_monitor and WEB_MONITOR_AVAILABLE:
            self._start_web_monitor()
        
        try:
            async with SmartProxyDataFetcher(
                enable_crawler=self.enable_crawler,
                proxy_manager_port=self.proxy_manager_port
            ) as fetcher:
                self.data_fetcher = fetcher
                
                status = fetcher.get_current_status()
                logger.info(f"[NETWORK] Connection status: {status['network_health']}")
                logger.info(f"[SOURCES] Available: {status['available_sources']}")
                
                end_time = datetime.now() + timedelta(hours=duration_hours)
                cycle_count = 0
                
                while datetime.now() < end_time:
                    cycle_start = datetime.now()
                    cycle_count += 1
                    
                    try:
                        # 1. 获取市场数据（智能路由）
                        source_preference = ['CLOB', 'GraphQL']
                        if self.enable_crawler:
                            source_preference.append('Crawler')
                        
                        markets = await fetcher.fetch_market_data(
                            limit=25, 
                            source_preference=source_preference
                        )
                        
                        if not markets:
                            logger.warning("[DATA] No market data received, waiting...")
                            await asyncio.sleep(self.update_interval)
                            continue
                        
                        first_market = markets[0]
                        logger.info(f"[DATA] Fetched {len(markets)} markets from {first_market.data_source} ({first_market.connection_mode})")
                        
                        # 2. 更新现有持仓
                        self.trading_engine.update_positions(markets)
                        
                        # 3. 生成新的交易信号
                        await self._generate_and_execute_signals(markets)
                        
                        # 4. 定期报告
                        if cycle_count % 8 == 0:
                            self._print_status_report()
                            await self._save_simulation_report()
                        
                        # 5. 等待下次更新
                        cycle_time = (datetime.now() - cycle_start).total_seconds()
                        sleep_time = max(20, self.update_interval - cycle_time)
                        await asyncio.sleep(sleep_time)
                        
                    except NetworkError as e:
                        logger.error(f"[NETWORK] {e}")
                        logger.error("[PAUSE] System paused due to network failure")
                        logger.error("[ACTION] Check network configuration and data source availability")
                        break
                        
                    except Exception as e:
                        logger.error(f"[ERROR] Simulation cycle error: {e}")
                        await asyncio.sleep(60)
                
                # 生成最终报告
                await self._generate_final_report()
                
        except CrawlerProxyRequiredError as e:
            logger.error(f"[CRAWLER] {e}")
            logger.error("[REQUIREMENT] Crawler mode requires proxy configuration")
        except NetworkError as e:
            logger.error(f"[NETWORK] {e}")
            logger.error("[ANALYSIS] Network connection failed - check connectivity")
        except Exception as e:
            logger.error(f"[SYSTEM] Unexpected error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            if self.web_monitor:
                self._stop_web_monitor()
    
    async def _generate_and_execute_signals(self, markets: List[MarketData]):
        """生成并执行交易信号"""
        for market in markets:
            if len(self.trading_engine.open_positions) >= self.max_concurrent_positions:
                break
            
            try:
                signal_result = await self._analyze_market_multi_strategy(market)
                
                if (abs(signal_result.get('signal_strength', 0)) > 0.25 and 
                    signal_result.get('confidence', 0) > 0.55):
                    
                    trade = await self.trading_engine.execute_trade(market, signal_result)
                    
                    if trade:
                        logger.info(f"[NEW] Trade: {trade.trade_id}")
                        
            except Exception as e:
                logger.error(f"[ANALYSIS] Market analysis error for {market.market_id}: {e}")
    
    async def _analyze_market_multi_strategy(self, market: MarketData) -> Dict:
        """多策略市场分析"""
        signals = []
        
        # 1. Spike Detection策略
        if (self.trading_engine.spike_detector and 
            self.trading_engine.spike_strategy and 
            SPIKE_DETECTION_AVAILABLE):
            
            try:
                self.trading_engine.spike_detector.update_market_data(
                    market.market_id, market.price, market.volume_24h
                )
                
                spike_events = self.trading_engine.spike_detector.detect_spike_events(market.market_id)
                
                for event in spike_events:
                    market_dict = {
                        'price': market.price,
                        'volume': market.volume_24h,
                        'volatility': market.volatility
                    }
                    spike_signal = self.trading_engine.spike_strategy.analyze_spike_opportunity(event, market_dict)
                    if spike_signal:
                        signals.append((
                            spike_signal['signal_strength'],
                            spike_signal['confidence'],
                            f"spike_{spike_signal['strategy_type']}",
                            spike_signal.get('reasoning', '')
                        ))
            except Exception as e:
                logger.debug(f"Spike detection error: {e}")
        
        # 2. 优化策略
        if self.trading_engine.optimized_strategy and OPTIMIZED_STRATEGY_AVAILABLE:
            try:
                market_dict = {
                    'market_id': market.market_id,
                    'title': market.title,
                    'price': market.price,
                    'volume_24h': market.volume_24h,
                    'volatility': market.volatility,
                    'time_to_expiry': market.time_to_expiry,
                    'outcomes': market.outcomes
                }
                
                opt_signal = self.trading_engine.optimized_strategy.generate_combined_signal(market_dict)
                if opt_signal:
                    signals.append((
                        opt_signal['signal_strength'],
                        opt_signal['confidence'],
                        opt_signal['strategy_type'],
                        opt_signal.get('reasoning', '')
                    ))
            except Exception as e:
                logger.debug(f"Optimized strategy error: {e}")
        
        # 3. 基础策略（后备）
        if not signals:
            price = market.price
            if price > 0.8:
                signals.append((-0.6, 0.7, "mean_reversion_high", f"Price {price:.3f} > 0.8"))
            elif price < 0.2:
                signals.append((0.6, 0.7, "mean_reversion_low", f"Price {price:.3f} < 0.2"))
        
        # 聚合信号
        if signals:
            weights = [conf for _, conf, _, _ in signals]
            total_weight = sum(weights)
            
            if total_weight > 0:
                weighted_signal = sum(sig * weight for sig, weight, _, _ in signals) / total_weight
                avg_confidence = sum(weights) / len(weights)
                strategy_types = [name for _, _, name, _ in signals]
                reasonings = [reason for _, _, _, reason in signals if reason]
                
                return {
                    'signal_strength': weighted_signal,
                    'confidence': avg_confidence,
                    'strategy_type': "+".join(strategy_types),
                    'reasoning': " | ".join(reasonings)
                }
        
        return {
            'signal_strength': 0,
            'confidence': 0,
            'strategy_type': 'no_signal',
            'reasoning': 'No clear signal generated'
        }
    
    def _start_web_monitor(self):
        """启动Web监控"""
        if WEB_MONITOR_AVAILABLE:
            try:
                self.web_monitor = WebMonitor(port=8888)
                success = self.web_monitor.start_background()
                if success:
                    logger.info("[MONITOR] Web monitor started successfully")
                else:
                    logger.warning("[MONITOR] Web monitor startup failed")
            except Exception as e:
                logger.warning(f"[MONITOR] Web monitor error: {e}")
    
    def _stop_web_monitor(self):
        """停止Web监控"""
        if self.web_monitor:
            try:
                self.web_monitor.stop()
                logger.info("[MONITOR] Web monitor stopped")
            except Exception as e:
                logger.warning(f"[MONITOR] Web monitor stop error: {e}")
    
    def _print_status_report(self):
        """打印状态报告"""
        metrics = self.trading_engine.get_performance_metrics()
        
        logger.info("=" * 50)
        logger.info("Smart Proxy Trading Status Report")
        logger.info("=" * 50)
        logger.info(f"Current balance: ${metrics.get('current_balance', 0):,.0f}")
        logger.info(f"Available funds: ${metrics.get('available_balance', 0):,.0f}")
        logger.info(f"Total P&L: ${metrics.get('total_pnl', 0):+,.0f}")
        logger.info(f"Total return: {metrics.get('total_return', 0):+.1%}")
        logger.info(f"Total trades: {metrics.get('total_trades', 0)}")
        logger.info(f"Open positions: {metrics.get('open_positions', 0)}")
        logger.info(f"Win rate: {metrics.get('win_rate', 0):.1%}")
        
        # 连接模式统计
        conn_stats = metrics.get('connection_stats', {})
        logger.info(f"\nConnection mode statistics:")
        for mode, stats in conn_stats.items():
            success_rate = stats['success'] / stats['trades'] * 100 if stats['trades'] > 0 else 0
            logger.info(f"  {mode}: {stats['trades']} trades, {success_rate:.1f}% success")
        
        if self.trading_engine.open_positions:
            logger.info("\nCurrent positions:")
            for trade in self.trading_engine.open_positions.values():
                hold_time = (datetime.now() - trade.entry_time).total_seconds() / 3600
                logger.info(f"  {trade.market_title[:30]} | {trade.direction} | "
                          f"${trade.position_size:.0f} | {hold_time:.1f}h | "
                          f"{trade.data_source}({trade.connection_mode})")
    
    async def _save_simulation_report(self):
        """保存模拟报告"""
        try:
            trades_data = []
            for trade in self.trading_engine.trades:
                trade_dict = asdict(trade)
                for key, value in trade_dict.items():
                    if isinstance(value, datetime):
                        trade_dict[key] = value.isoformat()
                trades_data.append(trade_dict)
            
            metrics = self.trading_engine.get_performance_metrics()
            
            report_data = {
                "simulation_type": "smart_proxy_conditional",
                "crawler_enabled": self.enable_crawler,
                "simulation_summary": {
                    "start_time": self.trading_engine.trades[0].entry_time.isoformat() if self.trading_engine.trades else None,
                    "current_time": datetime.now().isoformat(),
                    "duration_hours": (datetime.now() - self.trading_engine.trades[0].entry_time).total_seconds() / 3600 if self.trading_engine.trades else 0,
                    "initial_balance": self.trading_engine.initial_balance,
                    "performance_metrics": metrics
                },
                "trades": trades_data,
                "connection_modes_used": list(set([t.connection_mode for t in self.trading_engine.trades])),
                "data_sources_used": list(set([t.data_source for t in self.trading_engine.trades])),
                "strategies_used": list(set([t.strategy_type for t in self.trading_engine.trades]))
            }
            
            filename = f"enhanced_simulation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, default=str, ensure_ascii=False)
            
            logger.debug(f"Report saved: {filename}")
            
        except Exception as e:
            logger.error(f"Save report error: {e}")
    
    async def _generate_final_report(self):
        """生成最终报告"""
        logger.info("\n" + "=" * 60)
        logger.info("Smart Proxy Trading Final Report")
        logger.info("=" * 60)
        
        metrics = self.trading_engine.get_performance_metrics()
        
        # 基础统计
        logger.info(f"Initial balance: ${self.trading_engine.initial_balance:,.0f}")
        logger.info(f"Final balance: ${metrics.get('current_balance', 0):,.0f}")
        logger.info(f"Total P&L: ${metrics.get('total_pnl', 0):+,.0f}")
        logger.info(f"Total return: {metrics.get('total_return', 0):+.1%}")
        
        # 交易统计
        logger.info(f"\nTrading statistics:")
        logger.info(f"  Total trades: {metrics.get('total_trades', 0)}")
        logger.info(f"  Closed trades: {metrics.get('closed_trades', 0)}")
        logger.info(f"  Open positions: {metrics.get('open_positions', 0)}")
        logger.info(f"  Win rate: {metrics.get('win_rate', 0):.1%}")
        
        # 连接模式分析
        conn_stats = metrics.get('connection_stats', {})
        logger.info(f"\nConnection mode analysis:")
        for mode, stats in conn_stats.items():
            success_rate = stats['success'] / stats['trades'] * 100 if stats['trades'] > 0 else 0
            logger.info(f"  {mode}: {stats['trades']} trades, {success_rate:.1f}% success rate")
        
        # 数据源统计
        data_sources = {}
        connection_modes = {}
        for trade in self.trading_engine.trades:
            data_sources[trade.data_source] = data_sources.get(trade.data_source, 0) + 1
            connection_modes[trade.connection_mode] = connection_modes.get(trade.connection_mode, 0) + 1
        
        if data_sources:
            logger.info(f"\nData source usage:")
            for source, count in data_sources.items():
                pct = count / len(self.trading_engine.trades) * 100
                logger.info(f"  {source}: {count} trades ({pct:.1f}%)")
        
        if connection_modes:
            logger.info(f"\nConnection mode usage:")
            for mode, count in connection_modes.items():
                pct = count / len(self.trading_engine.trades) * 100
                logger.info(f"  {mode}: {count} trades ({pct:.1f}%)")
        
        await self._save_simulation_report()
        logger.info(f"\nFinal report saved with {len(self.trading_engine.trades)} trades")

# 测试函数
async def test_smart_proxy_system():
    """测试智能代理交易系统"""
    print("=== Smart Proxy Trading System Test ===")
    print()
    
    try:
        # 测试直连模式
        print("[TEST 1] Direct connection mode (no crawler)...")
        system = SmartProxyTradingSystem(
            initial_balance=3000,
            enable_crawler=False,
            auto_monitor=False
        )
        
        print("[TEST] Running 5-minute direct mode test...")
        await system.run_smart_simulation(0.083)  # 5分钟
        
        print("[SUCCESS] Direct mode test completed!")
        
    except Exception as e:
        print(f"[ERROR] Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_smart_proxy_system())