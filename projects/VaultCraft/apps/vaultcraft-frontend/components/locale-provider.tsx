"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

type Locale = "en" | "zh"

type TranslationRecord = Record<string, string>

const MESSAGES: Record<Locale, TranslationRecord> = {
  en: {},
  zh: {
    "nav.browse": "浏览金库",
    "nav.portfolio": "我的资产",
    "nav.manager": "经理控制台",
    "nav.about": "关于",
    "nav.docs": "文档",
    "nav.connect": "连接钱包",
    "nav.connectedSuffix": "（网络错误）",
    "hero.title": "可验证的人类交易员",
    "hero.titleHighlight": "金库平台",
    "hero.subtitle":
      "公募保持 Hyper 式透明，私募仅对白名单披露 NAV / PnL，结合 Hyper Testnet 实单演示，展示“比带单更规范安全”的交易体验。",
    "hero.cta.primary": "探索金库",
    "hero.cta.secondary": "经理入口",
    "hero.stats.aum": "管理规模",
    "hero.stats.vaults": "在营金库",
    "hero.stats.return": "平均收益",
    "discovery.title": "精选金库",
    "discovery.subtitle": "按收益、回撤、Sharpe 等指标排序，快速找到适合的策略。",
    "discovery.searchPlaceholder": "搜索金库或经理……",
    "discovery.filter.all": "全部",
    "discovery.filter.public": "公募",
    "discovery.filter.private": "私募",
    "discovery.sort.sharpe": "Sharpe",
    "discovery.sort.aum": "AUM",
    "discovery.sort.return": "收益",
    "discovery.card.aum": "管理规模",
    "discovery.card.nav": "单位净值",
    "discovery.card.return": "年化收益",
    "discovery.card.sharpe": "Sharpe",
    "discovery.card.drawdown": "最大回撤",
    "discovery.card.new": "新上线",
    "discovery.card.view": "查看详情",
    "vault.actions.deposit": "申购",
    "vault.actions.withdraw": "赎回",
    "vault.actions.exec": "仓位执行",
    "vault.actions.explorer": "浏览区块浏览器",
    "vault.actions.shock": "模拟 -10% 冲击",
    "vault.actions.shockHint": "用于演示告警/回撤处理流程",
    "vault.tabs.overview": "概览",
    "vault.tabs.holdings": "持仓/历史",
    "vault.tabs.transactions": "事件流",
    "vault.tabs.info": "参数信息",
    "vault.metric.aum": "管理规模",
    "vault.metric.nav": "单位净值",
    "vault.metric.return": "年化收益",
    "vault.metric.sharpe": "Sharpe",
    "vault.metric.volatility": "年化波动",
    "vault.metric.mdd": "最大回撤",
    "vault.metric.recovery": "恢复天数",
    "vault.lockInfo": "最短锁定期",
    "vault.fee.perf": "绩效费",
    "vault.fee.mgmt": "管理费",
    "vault.totalShares": "总份额",
    "vault.private.placeholder": "私募金库仅向通过白名单的地址开放明细。",
    "vault.private.joinTitle": "加入私募金库",
    "vault.private.placeholderInput": "邀请码",
    "vault.private.joinSuccess": "已通过邀请码（演示），申购前请确保链上白名单已配置。",
    "vault.private.joined": "已加入（演示）",
    "vault.placeholder.disabled": "当前为演示地址，请先部署或注册真实金库后再操作。",
    "vault.private.join": "输入邀请码",
    "vault.private.joinButton": "加入",
    "vault.private.joinHint": "邀请码仅用于演示，实际需要链上白名单。",
    "vault.events.title": "最近事件",
    "vault.holdings.title": "当前持仓",
    "vault.holdings.public": "公募金库实时展示持仓与历史（基于事件重建）。",
    "vault.status.risk": "执行风控参数",
    "vault.banner.drawdown": "警告：触发回撤阈值，请检查仓位风险。",
    "vault.banner.reduceOnly": "已进入 Reduce-Only 模式，仅允许减仓。",
    "status.mode.dryrun": "干运行",
    "status.mode.live": "实盘",
    "status.mode.label": "模式",
    "status.enabled": "开启",
    "status.disabled": "关闭",
    "status.listener.title": "Listener",
    "status.listener.off": "关闭",
    "status.listener.noFill": "无成交",
    "status.listener.last": "最近",
    "status.listener.running": "运行中",
    "status.listener.idle": "已就绪",
    "status.listener.disabled": "未启用",
    "status.listener.recent": "running · 最近成交",
    "status.snapshot.title": "Snapshot",
    "status.snapshot.running": "运行中",
    "status.snapshot.idle": "已就绪",
    "status.snapshot.disabled": "未启用",
    "status.chain": "网络",
    "status.block": "区块",
    "status.symbols": "标的",
    "status.leverage": "杠杆",
    "status.minNotional": "最小名义",
    "events.empty": "暂时没有事件。测试网订单较稀疏，可稍后再试或查看 Listener 状态。",
    "events.filter.exec": "执行",
    "events.filter.fill": "成交",
    "events.filter.other": "其他",
    "events.autoscroll": "自动滚动",
    "events.attempts": "尝试次数",
    "common.cancel": "取消",
    "common.processing": "处理中…",
    "portfolio.title": "我的资产组合",
    "portfolio.subtitle": "查看持有份额、估算收益与锁定状态。",
    "portfolio.summary.value": "资产估值",
    "portfolio.summary.cost": "投入成本",
    "portfolio.summary.pnl": "估算盈亏",
    "portfolio.card.shares": "份额",
    "portfolio.card.value": "当前价值",
    "portfolio.card.status": "状态",
    "portfolio.card.locked": "锁定中",
    "portfolio.card.unlocked": "可赎回",
    "portfolio.card.view": "查看金库",
    "portfolio.card.withdraw": "赎回",
    "portfolio.empty": "暂无持仓。到金库页完成首次申购即可在此查看。",
    "manager.tabs.launch": "创建金库",
    "manager.tabs.execute": "仓位执行",
    "manager.tabs.settings": "金库管理",
    "manager.launch.asset": "资产地址（ERC20）",
    "manager.launch.assetHint": "推荐填写 Hyper Testnet USDC，若缺失可临时部署 MockERC20。",
    "manager.launch.balance": "我的余额",
    "manager.launch.private": "创建私募金库（默认公开）",
    "manager.launch.perf": "绩效费 (bps)",
    "manager.launch.lock": "最短锁定期 (天)",
    "manager.launch.advanced": "高级参数",
    "manager.launch.deploy": "部署金库",
    "manager.launch.deploying": "部署进行中…",
    "manager.launch.deployed": "部署成功：",
    "manager.launch.error.backend": "无法访问后端 API。请确认 FastAPI 服务运行中，并检查 NEXT_PUBLIC_BACKEND_URL。",
    "manager.manage.placeholder": "选择一个已部署的金库",
    "manager.manage.pause": "暂停",
    "manager.manage.unpause": "恢复",
    "manager.manage.whitelist": "白名单地址",
    "manager.manage.allow": "允许",
    "manager.manage.revoke": "移除",
    "manager.manage.perf": "绩效费 (bps)",
    "manager.manage.lock": "最短锁定期 (天)",
    "manager.manage.adapter": "适配器地址",
    "manager.manage.manager": "新经理地址",
    "manager.manage.guardian": "新守护者地址",
    "manager.execute.title": "受控执行",
    "manager.execute.subtitle": "先进行风险预检，再发送 Hyper SDK 实单（默认干运行）。",
    "manager.execute.recent": "最近金库",
    "manager.execute.symbol": "交易对",
    "manager.execute.side": "方向",
    "manager.execute.size": "合约数量",
    "manager.execute.leverage": "杠杆",
    "manager.execute.reduceOnly": "Reduce Only",
    "manager.execute.open": "开仓",
    "manager.execute.close": "平仓",
    "manager.execute.pretradeError": "预检失败：",
    "manager.execute.success": "执行成功",
    "deposit.title": "申购",
    "deposit.asset": "申购资产",
    "deposit.balance": "我的余额",
    "deposit.amount": "申购金额",
    "deposit.cta": "确认申购",
    "deposit.hint": "交易会先执行 ERC20 授权，再调用 vault.deposit。",
    "deposit.modalTitle": "申购进入",
    "deposit.description": "请输入申购金额，按当前净值折算份额。",
    "deposit.amountLabel": "申购金额 (USDC)",
    "deposit.currentNav": "当前净值",
    "deposit.estimatedShares": "预计份额",
    "deposit.lockLabel": "锁定期",
    "deposit.lockHint": "申购后需持有 {days} 天方可赎回。",
    "deposit.status.approving": "授权中…",
    "deposit.status.submitting": "申购交易发送中…",
    "deposit.status.confirmed": "申购成功",
    "deposit.toast.success": "申购成功",
    "deposit.toast.error": "申购失败",
    "deposit.status.approvingShort": "授权",
    "deposit.status.submittingShort": "申购",
    "withdraw.title": "赎回",
    "withdraw.amount": "赎回份额",
    "withdraw.cta": "确认赎回",
    "withdraw.hint": "赎回后资金会直接回到钱包地址。",
    "language.switcher.label": "语言",
    "language.switcher.zh": "中文",
    "language.switcher.en": "English",
    "common.refresh": "刷新",
  },
}

const STORAGE_KEY = "vaultcraft:locale"

type LocaleContextValue = {
  locale: Locale
  setLocale: (next: Locale) => void
  t: (key: string, fallback: string) => string
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: (_, fallback) => fallback,
})

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en")

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
    if (stored === "en" || stored === "zh") {
      setLocale(stored)
      return
    }
    const browser = navigator.language.startsWith("zh") ? "zh" : "en"
    setLocale(browser)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, fallback) => {
        const table = MESSAGES[locale]
        return table[key] ?? fallback
      },
    }),
    [locale]
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  return useContext(LocaleContext)
}

export const SUPPORTED_LOCALES: { code: Locale; label: string }[] = [
  { code: "zh", label: "中文" },
  { code: "en", label: "EN" },
]
