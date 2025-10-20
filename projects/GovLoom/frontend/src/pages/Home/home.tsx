import React from 'react';
import { useNavigate } from 'react-router-dom';
import './style.css';
import { ConnectButton } from '../../components/Wallet';

type Language = 'zh' | 'en';

interface NavLink {
  label: string;
  target: string;
}

interface SectionContent {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface PipelineStep {
  title: string;
  mission: string;
  flow: string[];
}

interface ValueBlock {
  title: string;
  items: { heading: string; text: string }[];
}

interface LandingCopy {
  navLinks: NavLink[];
  hero: {
    tag: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  vision: SectionContent;
  solution: SectionContent;
  pipeline: {
    title: string;
    intro: string;
    steps: PipelineStep[];
  };
  governance: SectionContent;
  value: {
    title: string;
    intro: string;
    blocks: ValueBlock[];
  };
  closing: {
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  languageToggle: {
    zh: string;
    en: string;
  };
}

const content: Record<Language, LandingCopy> = {
  zh: {
    navLinks: [
      { label: '愿景', target: '#vision' },
      { label: '方案', target: '#solution' },
      { label: '多智能体', target: '#pipeline' },
      { label: '治理设计', target: '#governance' },
      { label: '价值', target: '#value' },
    ],
    hero: {
      tag: 'AI 驱动的链上治理',
      title: '让以太坊治理生态重新蓬勃',
      subtitle:
        '我们以多智能体 AI 与数据洞察自动生成高质量治理提案，提升用户投票参与度，帮助协议与社区协同演进，重振以太坊治理活力。',
      primaryCta: '探索平台',
      secondaryCta: '了解愿景',
    },
    vision: {
      title: '为什么需要治理加速器',
      paragraphs: [
        '以太坊生态的治理提案数量正在逐年下滑，参与投票的用户逐渐集中于少数大户，长期质押也愈发集中，导致治理失去社区声音。',
        '我们观察到国库资金、TVL、LP 流动性、协议收入和 Coin Price 与提案数量存在显著正相关性。缺乏优质提案与广泛参与削弱了协议创新力、营收与用户参与度，也减慢了以太坊生态的迭代发展。',
      ],
      bullets: [
        '提案数量下降：多个成熟协议的治理论坛长期处于低活跃状态。',
        '投票参与集中：高净值地址逐渐主导治理，小额持仓者被边缘化。',
        '优质提案稀缺：项目方难以获得有洞察力的治理建议与执行路径。',
      ],
    },
    solution: {
      title: '我们的解决方案',
      paragraphs: [
        '我们打造链上治理优化平台，使用多智能体 AI 动态分析项目现状、历史提案与同类协议的治理经验，自动生成具备依据与可执行路径的治理提案，并直接在原协议链上发起投票。',
        '通过标准化的数据采集与洞察体系，我们既帮助项目方获取可落地的创新建议，也激励质押用户重回治理现场，形成「提案—讨论—执行」的正循环。',
      ],
    },
    pipeline: {
      title: '多智能体提案生成流程',
      intro: '五个自治 Agent 协同工作，从数据吸收到治理发布，完整覆盖提案的诞生旅程：',
      steps: [
        {
          title: 'Agent 1 · Generator — 洞察引擎',
          mission: '将碎片化的项目数据转化为富有创意的初步战略方案。',
          flow: [
            '读取 TVL、收入、代币模型、知识图谱与社区反馈等多维健康报告',
            '从激励设计、用户增长、协议安全、生态协作等角度发散构思',
            '生成 5 份结构化 JSON 提案（标题、描述、背景、动机、初步方案）'
          ],
        },
        {
          title: 'Agent 2 · Ranker — 优先级分析师',
          mission: '对候选提案进行收敛评估，聚焦最具价值的治理方向。',
          flow: [
            '同时审视 5 份提案 JSON 与原始项目健康报告',
            '基于 Impact / Urgency / Feasibility 加权打分形成排名',
            '在 ranked_proposals.md 中输出 Top 3 提案与详尽论证'
          ],
        },
        {
          title: 'Agent 3 · Validator — 协议守护者',
          mission: '以对抗性视角审计入围提案的激励、安全与公平性风险。',
          flow: [
            '逐条审阅 Top 3 提案 JSON，重点检查 options 等可被滥用的设计',
            '模拟各类恶意行为与利益相关者场景，识别潜在攻击向量',
            '生成包含评级与风险点的 Validation Report，指出需要修正的部分'
          ],
        },
        {
          title: 'Agent 4 · Monitor — 蓝图架构师',
          mission: '吸收审计反馈，将提案打磨为可落地的增强版蓝图。',
          flow: [
            '结合原始 JSON 与 Validation Report，逐条整合改进意见',
            '在 options 中补充具体的缓解机制（如二次方投票、冷静期）',
            '新增 risk_mitigation 字段，公开风险点与对应解决方案'
          ],
        },
        {
          title: 'Agent 5 · Reporter — 社区大使',
          mission: '将结构化蓝图转化为社区可读、可投票的治理提案。',
          flow: [
            '解读增强版 JSON 中的 background、motivation、options、risk_mitigation 字段',
            '套用治理帖模板（标题、执行摘要、核心行动、风险与缓解）完成叙事',
            '输出可直接发布到论坛或 Snapshot 的最终 Markdown 提案'
          ],
        },
      ],
    },
    governance: {
      title: '多元投票与身份设计',
      paragraphs: [
        '项目方可通过发行特定 NFT 或设置最低质押门槛，防止治理被滥用，并把投票权交付给真正的社区贡献者。',
        '对用户而言，参与投票既是链上活跃度的体现，也是链上身份与声誉的一部分。我们的合约支持冷静期与超级权限设置，确保高票通过的提案能在原协议端顺利进入正式流程并执行。',
      ],
    },
    value: {
      title: '为项目方与用户创造双赢',
      intro: 'AI 驱动的治理提案与激励机制同时服务协议与社区，形成持续正反馈。',
      blocks: [
        {
          title: '项目方收益',
          items: [
            {
              heading: '释放高质量提案产能',
              text: 'AI 洞察关键数据并提供可执行方案，帮助团队快速捕捉增长与优化机会。',
            },
            {
              heading: '灵活激励设计',
              text: '支持划拨部分投票 APY 或额外 token/NFT 激励，鼓励社区支持有价值的提案。',
            },
          ],
        },
        {
          title: '平台项目设计特性',
          items: [
            {
              heading: '治理热度回流',
              text: '多智能体生成的提案丰富治理议题，吸引更多用户回流讨论与投票。',
            },
            {
              heading: '安全的执行保障',
              text: '通过合约冷静期与执行权限设计，确保高票提案能够在原协议端落地。',
            },
          ],
        },
        {
          title: '用户价值',
          items: [
            {
              heading: '参与创新治理',
              text: '社区成员能第一时间接触基于数据与洞察的提案，共创协议未来。',
            },
            {
              heading: '获得额外激励',
              text: '参与投票即可获得项目方与平台提供的双重奖励，提升链上身份含金量。',
            },
          ],
        },
      ],
    },
    closing: {
      title: '现在就与我们一起重塑治理',
      subtitle:
        '多智能体 AI 与数据驱动的治理平台，帮助协议做出更好的决策，也让每一位用户的声音被听见。',
      primaryCta: '前往探索提案',
      secondaryCta: '联系团队',
    },
    languageToggle: {
      zh: '中文',
      en: 'English',
    },
  },
  en: {
    navLinks: [
      { label: 'Vision', target: '#vision' },
      { label: 'Platform', target: '#solution' },
      { label: 'Multi-Agent', target: '#pipeline' },
      { label: 'Governance', target: '#governance' },
      { label: 'Value', target: '#value' },
    ],
    hero: {
      tag: 'AI-Guided On-chain Governance',
      title: 'Revive Ethereum Governance Ecosystem',
      subtitle:
        'We combine multi-agent AI and data intelligence to auto-generate high-quality proposals, boost voter participation, and help protocols and communities evolve together.',
      primaryCta: 'Explore Platform',
      secondaryCta: 'See Vision',
    },
    vision: {
      title: 'Why a Governance Accelerator Matters',
      paragraphs: [
        'Across the Ethereum ecosystem, proposal volume is declining while voting power concentrates in a handful of whales—staking becomes siloed and everyday contributors are sidelined.',
        'Treasury size, TVL, LP liquidity, protocol revenue, and coin price all correlate strongly with proposal volume. When quality proposals and broad participation fade, protocols lose innovative edge, revenue momentum, and user engagement, slowing the entire Ethereum ecosystem\'s evolution.',
      ],
      bullets: [
        'Fewer proposals: governance forums at mature protocols remain quiet for long stretches.',
        'Participation concentration: high-value wallets dominate votes while small holders disengage.',
        'Shortage of actionable ideas: teams struggle to surface insight-driven recommendations.',
      ],
    },
    solution: {
      title: 'Our Approach',
      paragraphs: [
        'We built an on-chain governance accelerator that fuses multi-agent AI with project intelligence. The system analyses fundamentals, historic proposals, and peer protocols to create evidence-based proposals and launches the vote directly on the native contracts.',
        'A standardized data and insight pipeline delivers execution-ready suggestions for protocol teams, while nudging stakers back into the governance loop—restarting the cycle of proposal, deliberation, and implementation.',
      ],
    },
    pipeline: {
      title: 'Multi-Agent Proposal Pipeline',
      intro: 'Five specialized agents collaborate end-to-end, turning raw telemetry into governance-ready proposals:',
      steps: [
        {
          title: 'Agent 1 · Generator — Insight Engine',
          mission: 'Transform raw protocol data into creative strategic starting points.',
          flow: [
            'Ingest TVL, revenue, token models, knowledge graphs, and qualitative community intel',
            'Brainstorm across incentives, growth, security, and ecosystem collaborations',
            'Emit five structured JSON proposals covering title, description, background, motivation, and draft plan'
          ],
        },
        {
          title: 'Agent 2 · Ranker — Priority Analyst',
          mission: 'Converge on the most valuable governance directions for the DAO.',
          flow: [
            'Review all five JSON drafts alongside the original health diagnostics',
            'Score each proposal via weighted Impact / Urgency / Feasibility framework',
            'Produce ranked_proposals.md containing the Top 3 list with sourced reasoning'
          ],
        },
        {
          title: 'Agent 3 · Validator — Protocol Guardian',
          mission: 'Stress-test shortlisted ideas for incentive, security, and fairness risks.',
          flow: [
            'Inspect each Top 3 JSON (with emphasis on the options design) for exploit vectors',
            'Simulate adversarial and stakeholder scenarios to surface misaligned incentives',
            'Deliver a Validation Report with verdicts and risk annotations for every proposal'
          ],
        },
        {
          title: 'Agent 4 · Monitor — Blueprint Architect',
          mission: 'Upgrade proposals into execution-ready blueprints.',
          flow: [
            'Fuse original JSON with Validator feedback to address every flagged risk',
            'Embed mitigation mechanics inside options (TWAP voting, quadratic curves, cool-downs)',
            'Add a risk_mitigation field documenting risks and remediation strategies'
          ],
        },
        {
          title: 'Agent 5 · Reporter — Community Ambassador',
          mission: 'Bridge technical rigor with community clarity.',
          flow: [
            'Translate refined JSON fields (background, motivation, options, risk_mitigation) into narrative form',
            'Apply the governance post template with title, TL;DR, core initiatives, risks, mitigations',
            'Publish final_governance_report.md ready for Discourse, Snapshot, or on-chain proposals'
          ],
        },
      ],
    },
    governance: {
      title: 'Inclusive Voting & Identity Design',
      paragraphs: [
        'Teams can gate participation via curated NFTs or minimum staking thresholds, ensuring real contributors—not opportunistic actors—drive decisions.',
        'For users, voting becomes both an activity badge and a reputation layer. Our contracts support cooling-off periods and elevated execution permissions so approved proposals continue through native governance safely.',
      ],
    },
    value: {
      title: 'Mutual Value for Teams and Users',
      intro: 'AI-native proposals and incentive design create a continuous feedback loop for both sides of the protocol.',
      blocks: [
        {
          title: 'Protocol Benefits',
          items: [
            {
              heading: 'Consistent Proposal Throughput',
              text: 'AI surfaces data-backed, actionable improvements so teams can seize growth opportunities faster.',
            },
            {
              heading: 'Flexible Incentive Mix',
              text: 'Redirect part of voting APY or add token/NFT rewards to back community-endorsed innovation.',
            },
          ],
        },
        {
          title: 'Platform Design Features',
          items: [
            {
              heading: 'Renewed Governance Energy',
              text: 'Richer agendas and sharper insights pull stakeholders back into discussion and voting.',
            },
            {
              heading: 'Secure Execution Path',
              text: 'Cooling periods plus privileged execution ensure high-signal proposals reach native governance.',
            },
          ],
        },
        {
          title: 'Community Benefits',
          items: [
            {
              heading: 'Shape Cutting-Edge Ideas',
              text: 'Community members co-create futures using proposals grounded in data and precedent.',
            },
            {
              heading: 'Earn Layered Rewards',
              text: 'Participation unlocks incentives from both the protocol and our platform—building on-chain reputation.',
            },
          ],
        },
      ],
    },
    closing: {
      title: 'Co-create the Next Wave of Governance',
      subtitle:
        'A multi-agent, data-driven governance platform that helps protocols decide better and lets every voter’s voice travel further.',
      primaryCta: 'Browse Proposals',
      secondaryCta: 'Talk with Us',
    },
    languageToggle: {
      zh: '中文',
      en: 'English',
    },
  },
};

const TallyHomePage: React.FC = () => {
  const [language, setLanguage] = React.useState<Language>('zh');
  const navigate = useNavigate();

  const t = content[language];

  const handleExploreClick = React.useCallback(() => {
    navigate('/explore');
  }, [navigate]);

  return (
    <div className="tally-page-wrapper">
      <div className="tally-background-gradient" />
      <div className="tally-background-dots" />

      <nav className="tally-navbar">
        <div className="tally-container">
          <div className="tally-logo">GovLoom</div>
          <div className="tally-nav-links">
            {t.navLinks.map((link) => (
              <a key={link.target} href={link.target}>
                {link.label}
              </a>
            ))}
          </div>
          <div className="tally-nav-actions">
            <div className="language-toggle">
              <button
                type="button"
                className={`language-button ${language === 'zh' ? 'active' : ''}`}
                onClick={() => setLanguage('zh')}
              >
                {t.languageToggle.zh}
              </button>
              <button
                type="button"
                className={`language-button ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                {t.languageToggle.en}
              </button>
            </div>
            <div className="tally-wallet-button">
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <header className="tally-hero-section">
        <div className="tally-container">
          <p className="tally-hero-tagline">{t.hero.tag}</p>
          <h1 className="tally-hero-headline">{t.hero.title}</h1>
          <p className="tally-hero-subheadline">{t.hero.subtitle}</p>
          <div className="tally-hero-cta-group">
            <button
              type="button"
              className="tally-cta-button tally-cta-primary"
              onClick={handleExploreClick}
            >
              {t.hero.primaryCta}
            </button>
            <a className="tally-cta-button tally-cta-ghost" href="#vision">
              {t.hero.secondaryCta}
            </a>
          </div>
        </div>
      </header>

      <section id="vision" className="tally-section">
        <div className="tally-container">
          <h2 className="tally-section-title">{t.vision.title}</h2>
          {t.vision.paragraphs?.map((paragraph, index) => (
            <p className="tally-section-subtitle" key={index}>
              {paragraph}
            </p>
          ))}
          {t.vision.bullets && (
            <ul className="tally-bullet-list">
              {t.vision.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section id="solution" className="tally-section alternate">
        <div className="tally-container">
          <h2 className="tally-section-title">{t.solution.title}</h2>
          {t.solution.paragraphs?.map((paragraph, index) => (
            <p className="tally-section-subtitle" key={index}>
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section id="pipeline" className="tally-section">
        <div className="tally-container">
          <h2 className="tally-section-title">{t.pipeline.title}</h2>
          <p className="tally-section-subtitle">{t.pipeline.intro}</p>
          <div className="pipeline-grid">
            {t.pipeline.steps.map((step) => (
              <div key={step.title} className="pipeline-card">
                <span className="pipeline-card-label">{step.title}</span>
                <p className="pipeline-card-headline">{step.mission}</p>
                <div className="pipeline-card-section">
                  <span className="pipeline-card-section-title">流程 Flow</span>
                  <ul>
                    {step.flow.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="governance" className="tally-section alternate">
        <div className="tally-container">
          <h2 className="tally-section-title">{t.governance.title}</h2>
          {t.governance.paragraphs?.map((paragraph, index) => (
            <p className="tally-section-subtitle" key={index}>
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section id="value" className="tally-section">
        <div className="tally-container">
          <h2 className="tally-section-title">{t.value.title}</h2>
          <p className="tally-section-subtitle">{t.value.intro}</p>
          <div className="value-grid">
            {t.value.blocks.map((block) => (
              <div key={block.title} className="value-card">
                <h3>{block.title}</h3>
                <ul>
                  {block.items.map((item) => (
                    <li key={item.heading}>
                      <span className="value-heading">{item.heading}</span>
                      <span className="value-text">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tally-final-cta-section">
        <div className="tally-container">
          <h2>{t.closing.title}</h2>
          <p>{t.closing.subtitle}</p>
          <div className="tally-final-cta-group">
            <button
              type="button"
              className="tally-cta-button tally-cta-primary"
              onClick={handleExploreClick}
            >
              {t.closing.primaryCta}
            </button>
            <a className="tally-cta-button tally-cta-ghost" href="mailto:team@govloom.xyz">
              {t.closing.secondaryCta}
            </a>
          </div>
        </div>
      </section>

      <footer className="tally-footer">
        <div className="tally-container">
          <div className="tally-footer-top">
            <div className="tally-footer-logo">GovLoom</div>
            <div className="tally-footer-nav">
              <div className="tally-footer-column">
                <h4>Platform</h4>
                <a href="#solution">Overview</a>
                <a href="#pipeline">AI Pipeline</a>
              </div>
              <div className="tally-footer-column">
                <h4>Governance</h4>
                <a href="#governance">Voting Design</a>
                <a href="#value">Incentives</a>
              </div>
              <div className="tally-footer-column">
                <h4>Resources</h4>
                <a href="/explore">Explore DAOs</a>
                <a href="mailto:team@govloom.xyz">Contact</a>
              </div>
            </div>
          </div>
          <div className="tally-footer-bottom">
            <p>&copy; {new Date().getFullYear()} GovLoom. All rights reserved.</p>
            <div className="tally-footer-legal">
              <a href="#vision">Vision</a>
              <a href="#governance">Governance</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TallyHomePage;
