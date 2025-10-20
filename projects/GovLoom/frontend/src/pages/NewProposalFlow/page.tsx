import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { daoData } from '../../data/daos';
import type { DAOWithDetails } from '../../data/daos';
import './style.css';

type ModuleId = 'foundation' | 'generation' | 'refinement';

interface FoundationAgent {
  id: string;
  title: string;
  focus: string;
  description: string;
  outputs: string[];
}

interface WorkflowNode {
  name: string;
  role: string;
  actions: string[];
  deliverable: string;
}

interface WorkflowModule {
  id: ModuleId;
  label: string;
  summary: string;
  nodes: WorkflowNode[];
  takeaways: string[];
}

const foundationAgents: FoundationAgent[] = [
  {
    id: 'insight',
    title: '数据洞察 Agent · Data Insight',
    focus: '结构化关键指标',
    description:
      '整合 DefiLlama、CEX/DEX、CoinGecko 等多源数据，对 TVL、收入、交易量、国库资金以及价格波动进行趋势分析，形成项目的宏观画像。',
    outputs: [
      '项目核心指标快照',
      '增长/衰退趋势标记',
      '高风险指标提醒',
    ],
  },
  {
    id: 'context',
    title: '语境理解 Agent · Protocol Context',
    focus: '理解项目语境与阶段',
    description:
      '研读白皮书、官方文档与路线图，结合代币解锁、治理结构、战略目标，梳理当前的项目阶段与约束条件。',
    outputs: [
      '项目阶段画像（启动/增长/成熟）',
      '关键里程碑与即将发生的事件',
      '治理与代币经济限制因素',
    ],
  },
  {
    id: 'code',
    title: '代码洞察 Agent · Code Intelligence',
    focus: '审视技术演进',
    description:
      '追踪代码仓库提交、合约模块升级以及参数调整，评估技术落地的可行性与潜在风险点，为提案执行提供技术参考。',
    outputs: [
      '近期代码更新摘要',
      '重要参数或模块变更提示',
      '技术落地的可行性评估',
    ],
  },
  {
    id: 'rag',
    title: '提案检索 Agent · Governance RAG',
    focus: '借鉴历史智慧',
    description:
      '基于 RAG 技术检索 500+ 历史治理案例，筛选出与当前协议最相似的 10 条以内优秀提案，并整理结构化范式供下游引用。',
    outputs: [
      '高相似度提案清单（≤10 条）',
      '优秀提案的结构化拆解',
      '可复用的执行范式与参数区间',
    ],
  },
];

const workflowModules: WorkflowModule[] = [
  {
    id: 'generation',
    label: 'Module 1 · Generation & Ranking',
    summary:
      '生成与排序阶段以 Generator 与 Ranker 为核心，先发散创造，再将焦点聚合为 Top 3 候选提案，为后续审计与打磨提供清晰起点。',
    nodes: [
      {
        name: 'Agent 1 · Generator',
        role: '洞察引擎 · Insight Engine',
        actions: [
          '读取健康分析（TVL、收入、国库、情绪等）构建事实基线',
          '从激励、增长、安全、生态协作等维度发散生成治理想法',
          '以 JSON 模板输出 5 条结构化候选提案（标题/背景/动机/方案）',
        ],
        deliverable: '候选提案 JSON ×5 —— 进入优先级评估阶段',
      },
      {
        name: 'Agent 2 · Ranker',
        role: '优先级分析师 · Priority Analyst',
        actions: [
          '对比 5 份候选 JSON 与项目健康报告，复核数据一致性',
          '运用 Impact / Urgency / Feasibility 加权评分，挑选最具价值的方向',
          '撰写排序逻辑与折衷分析，形成 Top 3 排名报告',
        ],
        deliverable: 'Top 3 候选提案排名报告',
      },
    ],
    takeaways: [
      '筛除泛化建议，保留高影响、高契合的候选方案。',
      '生成排名报告，成为后续 Validator 审计的起点。',
    ],
  },
  {
    id: 'refinement',
    label: 'Module 2 · Validation & Publishing',
    summary:
      'Validator、Monitor 与 Reporter 接力，将 Top 3 提案打磨为执行蓝图，并产出面向社区的最终治理文稿。',
    nodes: [
      {
        name: 'Agent 3 · Validator',
        role: '协议守护者 · Protocol Guardian',
        actions: [
          '以白帽视角审视 Top 3 JSON，定位激励错配、操纵空间与公平性风险',
          '对每项提案给出 Approved / Approved with Revisions / Rejected 评级',
          '输出 Validation Report，为 Monitor 的机制加固提供依据',
        ],
        deliverable: '验证报告 · 风险清单与修正建议',
      },
      {
        name: 'Agent 4 · Monitor',
        role: '蓝图架构师 · Blueprint Architect',
        actions: [
          '吸收 Validator 的风险反馈，逐项补强方案逻辑',
          '在 options 中加入具体缓解机制（冷静期、二次方投票等）',
          '新增 risk_mitigation 字段，确保风险透明与责任明确',
        ],
        deliverable: '增强版提案 JSON 集合',
      },
      {
        name: 'Agent 5 · Reporter',
        role: '社区大使 · Community Ambassador',
        actions: [
          '将增强版 JSON 翻译成自然语言叙事，保持透明与号召力',
          '使用治理模板编排标题、TL;DR、核心行动、风险与缓解',
          '生成可直接粘贴到 Discourse / Snapshot 的最终 Markdown',
        ],
        deliverable: '最终治理提案文稿',
      },
    ],
    takeaways: [
      '确保提案不仅有创意，也经得起安全与公平性审视。',
      '形成可直接进入社区讨论与投票的最终提案文稿。',
    ],
  },
];

const topThreePreview = [
  {
    rank: 'Rank 1',
    title: 'Dynamic Fee Retention Model for Enhanced Protocol Sustainability',
    summary: '为国库引入 10%-15% 动态留存比例，用以支持增长计划与抗风险缓冲。',
  },
  {
    rank: 'Rank 2',
    title: 'Governance Enhancement through On-chain Voting Activation',
    summary: '激活链上 Governor 合约，提升治理透明度、安全性与社区信任度。',
  },
  {
    rank: 'Rank 3',
    title: 'Fraxlend Collateral Diversification Initiative',
    summary: '拓展 Fraxlend 抵押品范围（含 RWA），吸引更多借贷需求并提升 TVL。',
  },
];

const finalReportHighlights = [
  {
    title: 'Core Initiative 1：动态费用留存与护栏机制',
    detail: '初始保留 10% 费用，治理可调 5%-15%，并配套监控指标与资产用途约束。',
  },
  {
    title: 'Core Initiative 2：安全公平的链上治理激活',
    detail: '启用 Governor 合约，结合冷静期、投票权重与多签守护，保障执行安全。',
  },
  {
    title: 'Core Initiative 3：风险可控的 Fraxlend 抵押品多元化',
    detail: '引入新资产需通过风控白名单与参数模板，确保扩容与安全并行。',
  },
];

const NewProposalFlowPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const dao = daoData.find((item) => item.slug === slug) as DAOWithDetails | undefined;
  const [activeModuleId, setActiveModuleId] = React.useState<ModuleId>('generation');

  React.useEffect(() => {
    setActiveModuleId('generation');
  }, [slug]);

  if (!dao) {
    return (
      <div className="proposal-flow-page">
        <div className="proposal-flow-container">
          <div className="proposal-flow-empty">
            <h1>DAO not found</h1>
            <Link to="/explore" className="proposal-flow-back">
              Back to Explore
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeModule = workflowModules.find((module) => module.id === activeModuleId) ?? workflowModules[0];

  return (
    <div className="proposal-flow-page">
      <div className="proposal-flow-background" />
      <header className="proposal-flow-hero">
        <div className="proposal-flow-container">
          <Link to={`/dao/${dao.slug}`} className="proposal-flow-backlink">
            ← Back to {dao.name}
          </Link>
          <div className="proposal-flow-hero-content">
            <p className="proposal-flow-eyebrow">AI Governance Pipeline</p>
            <h1>How GovLoom Crafts Proposals for {dao.name}</h1>
            <p>
              我们通过多智能体协同，为协议生成有依据、可执行的治理提案。以下流程展示了从数据洞察到最终治理帖的完整旅程。
            </p>
          </div>
        </div>
      </header>

      <section className="proposal-flow-section">
        <div className="proposal-flow-container">
          <h2>基础洞察层 · Foundation Agents</h2>
          <p className="proposal-flow-section-intro">
            四个基础 Agent 负责构建事实基线与上下文，为后续的提案生成与审计提供扎实的原始材料。
          </p>
          <div className="foundation-grid">
            {foundationAgents.map((agent, index) => (
              <div key={agent.id} className="foundation-card">
                <div className="foundation-card-index">0{index + 1}</div>
                <div className="foundation-card-header">
                  <h3>{agent.title}</h3>
                  <span>{agent.focus}</span>
                </div>
                <p>{agent.description}</p>
                <ul>
                  {agent.outputs.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="proposal-flow-section alternate">
        <div className="proposal-flow-container">
          <h2>AI 提案工作流 · Multi-Agent Workflow</h2>
          <p className="proposal-flow-section-intro">
            自 {dao.name} 的最新分析结果进入流水线后，以下模块串联运作，从创意生成到最终治理文稿完全自动化。
          </p>
          <div className="workflow-layout">
            <div className="workflow-sidebar">
              {workflowModules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  className={`workflow-tab ${module.id === activeModuleId ? 'active' : ''}`}
                  onClick={() => setActiveModuleId(module.id)}
                >
                  {module.label}
                </button>
              ))}
            </div>
              <div className="workflow-detail">
                <p className="workflow-summary">{activeModule.summary}</p>
                <div className="workflow-nodes">
                  {activeModule.nodes.map((node) => (
                    <div key={node.name} className="workflow-node-card">
                      <div className="workflow-node-header">
                        <h3>{node.name}</h3>
                        <span>{node.role}</span>
                      </div>
                      <ul className="workflow-node-actions">
                        {node.actions.map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>
                      <div className="workflow-node-output">
                        <span>交付物 · Deliverable</span>
                        <p>{node.deliverable}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <ul className="workflow-takeaways">
                  {activeModule.takeaways.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="proposal-flow-section alternate">
        <div className="proposal-flow-container">
          <h2>阶段产出预览</h2>
          <p className="proposal-flow-section-intro">
            Generator 与 Ranker 的协作会产出 Top 3 候选提案排行，附带排名理由与数据引用，是后续审计的原始输入。
          </p>
          <div className="output-grid">
            {topThreePreview.map((item) => (
              <div key={item.title} className="output-card">
                <span className="output-badge">{item.rank}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="proposal-flow-section">
        <div className="proposal-flow-container">
          <h2>最终交付成果</h2>
          <p className="proposal-flow-section-intro">
            Validator、Monitor 与 Reporter 多轮迭代后，形成可直接发布的治理提案文稿，涵盖三项核心行动与执行路径。
          </p>
          <div className="output-grid final">
            {finalReportHighlights.map((item) => (
              <div key={item.title} className="output-card">
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="proposal-flow-cta">
        <div className="proposal-flow-container">
          <h2>准备好与 GovLoom 共创下一份提案了吗？</h2>
          <p>
            立即返回 {dao.name} 的治理主页，查看已有提案或为下一轮 AI 生成建议提供新线索。
          </p>
          <div className="proposal-flow-cta-actions">
            <Link to={`/dao/${dao.slug}`} className="proposal-flow-cta-primary">
              Back to {dao.name}
            </Link>
            <Link to="/explore" className="proposal-flow-cta-secondary">
              Explore other DAOs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NewProposalFlowPage;
