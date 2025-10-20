import { useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Activity,
  Anchor,
  CheckCircle,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  Loader,
  Lock,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Zap,
} from 'lucide-react';
import { useCAIRegistry, useAHINAnchor, useERC8004Agent } from '@/hooks/useContract';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';

type Section = 'dashboard' | 'demo' | 'audit';

interface StatCard {
  id: keyof Stats;
  title: string;
  icon: React.ElementType;
  accent: string;
  trend?: string;
}

interface Stats {
  registeredDIDs: number;
  issuedCredentials: number;
  ahinBlocks: number;
  totalTransactions: number;
}

interface DemoStep {
  id: number;
  title: string;
  description: string;
  accent: string;
  content: React.ReactNode;
}

const activityData = [
  { name: 'Mon', value: 12 },
  { name: 'Tue', value: 19 },
  { name: 'Wed', value: 15 },
  { name: 'Thu', value: 25 },
  { name: 'Fri', value: 22 },
  { name: 'Sat', value: 18 },
  { name: 'Sun', value: 20 },
];

const recentActivities = [
  { type: 'Transaction Complete', id: '0x1a2b3c4d', amount: '10 DAI', time: '1 min ago' },
  { type: 'VC Issued', id: '0x5e6f7g8h', amount: '—', time: '3 mins ago' },
  { type: 'DID Registered', id: '0x9i0j1k2l', amount: '—', time: '5 mins ago' },
  { type: 'Transaction Complete', id: '0x3m4n5o6p', amount: '25 DAI', time: '8 mins ago' },
  { type: 'Transaction Complete', id: '0x7q8r9s0t', amount: '15 DAI', time: '12 mins ago' },
];

const timelineSteps = [
  {
    title: 'Mandate VC Issuance',
    description: 'User authorizes AI agent with spending budget and merchant whitelist.',
  },
  {
    title: 'Cart Construction',
    description: 'Agent composes shopping cart and produces ERC-8004 Cart VC.',
  },
  {
    title: 'On-chain Verification',
    description: 'Smart contracts verify DID, VC integrity, and spending limits.',
  },
  {
    title: 'Completion & Receipt',
    description: 'Payment gateway signs receipt; transaction marked complete.',
  },
  {
    title: 'AHIN Anchoring',
    description: 'Batch hash committed to Ethereum via AHIN anchor contract.',
  },
];

const integrations = ['Lens SDK', 'Metamask Snaps', 'Chainlink', 'Lit Protocol', 'IPFS', 'OpenZeppelin'];

export default function Home() {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [activeTimelineStep, setActiveTimelineStep] = useState(0);
  const [activeDemoStep, setActiveDemoStep] = useState<number | null>(null);
  const [auditInput, setAuditInput] = useState('');
  const [showAuditResult, setShowAuditResult] = useState(false);
  const [stats, setStats] = useState<Stats>({
    registeredDIDs: 127,
    issuedCredentials: 342,
    ahinBlocks: 45,
    totalTransactions: 1847,
  });

  const { totalDIDs, totalCredentials } = useCAIRegistry();
  const { currentBlock } = useAHINAnchor();
  const { totalTransactions } = useERC8004Agent();

  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      ...(totalDIDs ? { registeredDIDs: Number(totalDIDs) } : {}),
      ...(totalCredentials ? { issuedCredentials: Number(totalCredentials) } : {}),
      ...(currentBlock ? { ahinBlocks: Number(currentBlock) } : {}),
      ...(totalTransactions ? { totalTransactions: Number(totalTransactions) } : {}),
    }));
  }, [totalDIDs, totalCredentials, currentBlock, totalTransactions]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        registeredDIDs: prev.registeredDIDs + Math.floor(Math.random() * 3),
        issuedCredentials: prev.issuedCredentials + Math.floor(Math.random() * 5),
        ahinBlocks: prev.ahinBlocks + (Math.random() > 0.9 ? 1 : 0),
        totalTransactions: prev.totalTransactions + Math.floor(Math.random() * 7),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setActiveTimelineStep(0);
    setActiveDemoStep(null);
    setShowAuditResult(false);
  }, [activeSection]);

  const statCards: StatCard[] = useMemo(
    () => [
      { id: 'registeredDIDs', title: 'Registered DIDs', icon: ShieldCheck, accent: 'from-blue-500/30 to-blue-500/10', trend: '↑ 12%' },
      { id: 'issuedCredentials', title: 'Issued Credentials', icon: FileCheck, accent: 'from-purple-500/30 to-purple-500/10', trend: '↑ 8%' },
      { id: 'ahinBlocks', title: 'AHIN Blocks', icon: Anchor, accent: 'from-green-500/30 to-green-500/10' },
      { id: 'totalTransactions', title: 'Total Transactions', icon: Activity, accent: 'from-yellow-500/30 to-yellow-500/10', trend: '↑ 15%' },
    ],
    []
  );

  const demoSteps: DemoStep[] = useMemo(
    () => [
      {
        id: 1,
        title: 'User Issues Mandate VC',
        description: 'Budget: 100 DAI | Validity: 24h | Authorize Agent',
        accent: 'bg-blue-500',
        content: (
          <div className="animate-fadeInUp space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500 animate-pulse-slow">
                <FileCheck className="h-10 w-10" />
              </div>
              <h4 className="text-2xl font-bold">User Issues Mandate VC</h4>
            </div>
            <div className="space-y-3 rounded-lg bg-white/10 p-6">
              <DetailRow label="Authorized Agent" value="0xabcd...efgh" />
              <DetailRow label="Budget Limit" value="100 DAI" accent />
              <DetailRow label="Validity" value="24 hours" />
              <DetailRow label="Whitelist" value="merchant1.eth, merchant2.eth" />
            </div>
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span>VC Signed Successfully</span>
              </div>
              <p className="mt-2 text-xs text-gray-400 font-mono">Hash: 0x7f3e8b9a2c1d...</p>
            </div>
          </div>
        ),
      },
      {
        id: 2,
        title: 'Agent Creates Shopping Cart',
        description: 'Item 1: AI Training Data 50 DAI | Item 2: GPU Compute 45 DAI',
        accent: 'bg-purple-500',
        content: (
          <div className="animate-fadeInUp space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple-500 animate-pulse-slow">
                <ShoppingCart className="h-10 w-10" />
              </div>
              <h4 className="text-2xl font-bold">Agent Creates Shopping Cart</h4>
            </div>
            <div className="space-y-3">
              <CartItem title="AI Training Dataset" description="10GB high-quality labeled data" amount="50 DAI" />
              <CartItem title="GPU Compute Hours" description="10 hours A100 GPU" amount="45 DAI" />
            </div>
            <div className="rounded-lg border border-blue-500/50 bg-blue-500/20 p-4">
              <div className="flex items-center justify-between">
                <span className="font-bold">Total:</span>
                <span className="text-2xl font-bold text-green-400">95 DAI</span>
              </div>
              <p className="mt-1 text-xs text-gray-300">✓ Within budget (100 DAI)</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span>Cart VC Generated</span>
              </div>
              <p className="mt-2 text-xs text-gray-400 font-mono">Cart Hash: 0x9a8b7c6d...</p>
            </div>
          </div>
        ),
      },
      {
        id: 3,
        title: 'On-Chain Transaction Init',
        description: 'Verify DID → Verify VC → Generate Transaction ID',
        accent: 'bg-green-500',
        content: (
          <div className="animate-fadeInUp space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500 animate-pulse-slow">
                <Zap className="h-10 w-10" />
              </div>
              <h4 className="text-2xl font-bold">On-chain Transaction Initialization</h4>
            </div>
            <div className="space-y-4">
              <VerificationChecklist label="Verify Agent DID" description="DID registered and active" />
              <VerificationChecklist label="Verify Mandate VC" description="Signature valid, not expired" />
              <VerificationChecklist label="Verify Budget" description="95 DAI ≤ 100 DAI ✓" />
              <VerificationChecklist
                label="Generate Transaction ID"
                description="Creating on-chain record..."
                pending
              />
            </div>
            <div className="rounded-lg border border-blue-500/50 bg-blue-500/20 p-4">
              <p className="text-sm">Transaction ID:</p>
              <p className="mt-1 break-all font-mono text-xs">
                0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b
              </p>
              <a className="mt-2 inline-block text-xs text-blue-300 hover:text-blue-200" href="#">
                View on Etherscan →
              </a>
            </div>
          </div>
        ),
      },
      {
        id: 4,
        title: 'Payment Completed',
        description: 'Gateway Returns Signed Receipt → Update Status',
        accent: 'bg-yellow-500',
        content: (
          <div className="animate-fadeInUp space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500 animate-pulse-slow">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h4 className="text-2xl font-bold">Payment Completed</h4>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Gateway Status</span>
                <span className="font-semibold text-green-400">Successful</span>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Signed receipt confirmed. Agent and merchant received authenticated record.
              </p>
            </div>
            <div className="rounded-lg border border-green-500/50 bg-green-500/20 p-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                <span className="text-sm">Generating signed receipt...</span>
              </div>
            </div>
            <div className="rounded-lg border border-green-500/50 bg-green-500/20 p-4">
              <p className="font-bold text-green-400">Payment Successful</p>
              <div className="mt-3 space-y-1 text-sm text-gray-200">
                <DetailRow label="Receipt Hash" value="0xfedcba09..." monospace />
                <DetailRow label="Time" value="2025-10-19 14:32:15" />
                <DetailRow label="Gas Fee" value="0.002 ETH" />
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 5,
        title: 'AHIN Anchoring',
        description: 'Batch Generate Merkle Root → Submit to Ethereum',
        accent: 'bg-red-500',
        content: (
          <div className="animate-fadeInUp space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500 animate-pulse-slow">
                <Anchor className="h-10 w-10" />
              </div>
              <h4 className="text-2xl font-bold">AHIN Anchoring</h4>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <h5 className="mb-3 font-semibold">Merkle Tree Construction</h5>
              <div className="text-center font-mono text-xs text-gray-200">
                <div>Root: 0x9f8b...</div>
                <div className="text-gray-400">/ \</div>
                <div>H12&nbsp;&nbsp;&nbsp; H34</div>
                <div className="text-gray-400">/ \ &nbsp;&nbsp; / \</div>
                <div>H1 H2 H3 H4</div>
              </div>
              <p className="mt-3 text-center text-sm text-gray-300">Current batch: 23 transactions</p>
            </div>
            <div className="rounded-lg border border-blue-500/50 bg-blue-500/20 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold">Anchoring Progress</span>
                <span className="text-sm text-gray-300">Awaiting next batch</span>
              </div>
              <div className="mb-2 h-2 w-full rounded-full bg-gray-700">
                <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: '23%' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-300">
                <span>23 / 100 transactions</span>
                <span>Next anchor: ~3 mins</span>
              </div>
            </div>
            <p className="text-center text-sm text-gray-300">
              Will submit to Sepolia testnet after anchoring. Estimated gas fee: 0.0015 ETH.
            </p>
          </div>
        ),
      },
    ],
    []
  );

  const handleSearch = () => {
    if (!auditInput.startsWith('0x')) {
      alert('Please enter a valid Transaction ID (starting with 0x)');
      return;
    }
    setShowAuditResult(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <nav className="sticky top-0 z-40 border-b border-white/10 bg-white/5 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 shadow-lg shadow-blue-500/40">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">CAI Framework</h1>
              <p className="text-xs text-gray-300">Verifiable AI-Agent Commerce</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {(['dashboard', 'demo', 'audit'] as Section[]).map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setActiveSection(section)}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  activeSection === section
                    ? 'bg-white/20 font-semibold text-white shadow-md'
                    : 'hover:bg-white/10 text-gray-200'
                }`}
              >
                {section === 'dashboard' ? 'Dashboard' : section === 'demo' ? 'Demo' : 'Audit'}
              </button>
            ))}
            <div className="hidden md:block">
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {activeSection === 'dashboard' && (
          <section className="space-y-10">
            <header className="text-center">
              <h2 className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
                AI Agent Commerce Security Framework
              </h2>
              <p className="mt-4 text-lg text-gray-300">
                End-to-End Verifiable Payment Protocol Based on ERC-8004
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Pill>● Deployed on Sepolia Testnet</Pill>
                <Pill>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                  93.7% Test Coverage
                </Pill>
                <Pill>
                  <ShieldCheck className="mr-2 h-4 w-4 text-blue-300" />
                  Agent Risk Monitoring
                </Pill>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {statCards.map((card, index) => (
                <div
                  key={card.id}
                  className="rounded-xl border border-white/10 bg-white/10 p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${card.accent}`}>
                      <card.icon className="h-6 w-6 text-white" />
                    </div>
                    {card.trend && <span className="text-xs text-green-300">{card.trend}</span>}
                  </div>
                  <p className="text-sm text-gray-300">{card.title}</p>
                  <p className="mt-2 text-3xl font-bold">
                    {stats[card.id].toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/10 p-6 lg:col-span-2">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Transaction Activity Trends</h3>
                  <span className="text-xs text-gray-300">Last 7 days</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#a855f7" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#d1d5db" />
                      <Tooltip
                        cursor={{ fill: 'rgba(148, 163, 184, 0.2)' }}
                        contentStyle={{ backgroundColor: '#111827', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      />
                      <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-6">
                <h3 className="text-xl font-semibold">Agent Reputation Score</h3>
                <div className="my-6 flex justify-center">
                  <div className="relative">
                    <svg className="h-32 w-32 -rotate-90">
                      <circle cx="64" cy="64" r="52" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                      <circle
                        cx="64"
                        cy="64"
                        r="52"
                        stroke="url(#scoreGradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray="326.73"
                        strokeDashoffset="32.67"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-blue-300">95</span>
                      <span className="text-sm text-gray-300">/ 100</span>
                    </div>
                  </div>
                </div>
                <InfoRow label="Agent" value="0x1234...7890" monospace />
                <InfoRow label="Total Txs" value="847" />
                <InfoRow label="Success Rate" value="98%" accent />
                <div className="mt-6 h-2 w-full rounded-full bg-gray-700">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500" style={{ width: '95%' }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/10 p-6 lg:col-span-2">
                <h3 className="text-xl font-semibold">On-chain Verification Pipeline</h3>
                <p className="mt-2 text-sm text-gray-300">
                  Each agent transaction undergoes a deterministic verification pipeline before payment execution.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    {
                      title: 'Identity Resolution',
                      description: 'Cross-verify DID ownership and status from CAI Registry contract.',
                      icon: ShieldCheck,
                    },
                    {
                      title: 'Credential Integrity',
                      description: 'Check ERC-8004 VC signature, expiry, and budget safeguards.',
                      icon: Lock,
                    },
                    {
                      title: 'Budget Enforcement',
                      description: 'Enforce per-transaction and cumulative budget limits on-chain.',
                      icon: Activity,
                    },
                    {
                      title: 'Receipt Binding',
                      description: 'Cryptographically binds payment receipt hash to cart VC proof.',
                      icon: FileCheck,
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <div className="mb-3 flex items-center space-x-3">
                        <item.icon className="h-5 w-5 text-blue-300" />
                        <h4 className="font-semibold">{item.title}</h4>
                      </div>
                      <p className="text-sm text-gray-300">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-6">
                <h3 className="text-xl font-semibold">Ecosystem Integrations</h3>
                <p className="mt-2 text-sm text-gray-300">Composable tooling layered around ERC-8004 agents.</p>
                <div className="mt-4 grid gap-3">
                  {integrations.map((integration) => (
                    <div
                      key={integration}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <span>{integration}</span>
                      <span className="text-xs text-blue-300">Enabled</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 p-6">
              <h3 className="text-xl font-semibold">Execution Timeline</h3>
              <p className="mt-2 text-sm text-gray-300">Visualize every signed artifact produced during a complete purchase.</p>
              <div className="mt-6 space-y-6">
                {timelineSteps.map((step, index) => (
                  <div key={step.title} className="flex items-start space-x-4">
                    <button
                      type="button"
                      onClick={() => setActiveTimelineStep(index)}
                      className={`flex-shrink-0 rounded-full p-3 transition ${
                        activeTimelineStep === index ? 'bg-blue-500 shadow-lg' : 'bg-white/10'
                      }`}
                    >
                      <span className="text-sm font-semibold">{index + 1}</span>
                    </button>
                    <div>
                      <h4 className="text-lg font-semibold">{step.title}</h4>
                      <p className="mt-1 text-sm text-gray-300">{step.description}</p>
                      {activeTimelineStep === index && (
                        <div className="mt-3 rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-sm text-blue-100">
                          Latest status: All checkpoints validated. Proof bundle ready for anchoring.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 p-6">
              <h3 className="text-xl font-semibold">Recent Activity</h3>
              <div className="mt-6 space-y-4">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4 transition hover:bg-white/10"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                        <Activity className="h-5 w-5 text-blue-300" />
                      </div>
                      <div>
                        <p className="font-medium">{activity.type}</p>
                        <p className="font-mono text-sm text-gray-300">{activity.id}...</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{activity.amount}</p>
                      <p className="text-sm text-gray-300">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeSection === 'demo' && (
          <section className="space-y-10">
            <header className="text-center">
              <h2 className="text-4xl font-bold">Complete Transaction Flow Demo</h2>
              <p className="mt-2 text-gray-300">
                Step through each artifact generated by ERC-8004 compliant agents.
              </p>
            </header>
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                {demoSteps.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveDemoStep(index)}
                    className="w-full text-left"
                  >
                    <div
                      className={`rounded-xl border border-white/10 bg-white/10 p-6 transition hover:bg-white/20 ${
                        activeDemoStep === index ? 'ring-2 ring-blue-400' : ''
                      }`}
                    >
                      <div className="mb-3 flex items-center space-x-4">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step.accent}`}>
                          <span className="text-sm font-bold">{index + 1}</span>
                        </div>
                        <h4 className="text-lg font-semibold">{step.title}</h4>
                      </div>
                      <p className="ml-12 text-sm text-gray-300">{step.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 p-8">
                <h3 className="text-center text-xl font-semibold text-white">Real-time Visualization</h3>
                <div className="mt-6">
                  {activeDemoStep === null ? (
                    <div className="py-20 text-center text-gray-300">
                      Select a step on the left to view animated details.
                    </div>
                  ) : (
                    demoSteps[activeDemoStep].content
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'audit' && (
          <section className="space-y-8">
            <header className="text-center">
              <h2 className="text-4xl font-bold">Transaction Audit Query</h2>
              <p className="mt-2 text-gray-300">
                Replay every credential, receipt, and AHIN proof for a given transaction hash.
              </p>
            </header>

            <div className="rounded-xl border border-white/10 bg-white/10 p-6">
              <label className="mb-3 block text-sm font-medium">Transaction ID</label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  value={auditInput}
                  onChange={(event) => setAuditInput(event.target.value)}
                  placeholder="0x..."
                  className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex items-center justify-center space-x-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold transition hover:bg-blue-500"
                >
                  <Activity className="h-4 w-4" />
                  <span>Search</span>
                </button>
              </div>
            </div>

            {showAuditResult && (
              <div className="space-y-8">
                <div className="rounded-xl border border-white/10 bg-white/10 p-6">
                  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-xl font-semibold">Verification Chain</h3>
                    <button
                      type="button"
                      className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold transition hover:bg-blue-500"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Report</span>
                    </button>
                  </div>
                  <div className="space-y-4">
                    {[
                      {
                        title: '1. Mandate VC',
                        description: 'User authorization verified ✓',
                        meta: 'Signature: 0xabcd...ef12',
                        icon: CheckCircle,
                        accent: 'border-green-500',
                      },
                      {
                        title: '2. Cart VC',
                        description: 'Shopping cart hash matched ✓',
                        meta: 'Hash: 0x7f3e...8e9f',
                        icon: CheckCircle,
                        accent: 'border-green-500',
                      },
                      {
                        title: '3. Payment',
                        description: 'Transaction completed ✓',
                        meta: 'Amount: 95 DAI',
                        icon: CheckCircle,
                        accent: 'border-green-500',
                      },
                      {
                        title: '4. Receipt',
                        description: 'Vendor signed receipt ✓',
                        meta: 'Hash: 0x9a2b...cd3e',
                        icon: CheckCircle,
                        accent: 'border-green-500',
                      },
                      {
                        title: '5. AHIN Anchor',
                        description: 'Awaiting batch anchoring',
                        meta: 'Will be anchored in the next batch',
                        icon: Clock,
                        accent: 'border-blue-500',
                      },
                    ].map((item) => (
                      <div key={item.title} className={`border-l-4 ${item.accent} pl-6`}>
                        <div className="mb-2 flex items-center space-x-3">
                          <item.icon className="h-5 w-5 text-green-300" />
                          <h4 className="font-semibold">{item.title}</h4>
                        </div>
                        <p className="text-sm text-gray-200">{item.description}</p>
                        <p className="mt-1 text-xs text-gray-400 font-mono">{item.meta}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/10 p-6">
                  <h3 className="text-xl font-semibold">Transaction Details</h3>
                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <InfoCard label="Agent Address" value="0x1234...7890" monospace />
                    <InfoCard label="Merchant Address" value="0xabcd...efgh" monospace />
                    <InfoCard label="Amount" value="95 DAI" />
                    <InfoCard label="Timestamp" value="2025-10-19 14:32:15" />
                    <InfoCard
                      label="Cart Hash"
                      value="0x7f3e8b9a2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f"
                      monospace
                      fullWidth
                    />
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function DetailRow({
  label,
  value,
  accent = false,
  monospace = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  monospace?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-300">{label}:</span>
      <span className={`${accent ? 'text-green-400 font-semibold' : 'text-white'} ${monospace ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function CartItem({ title, description, amount }: { title: string; description: string; amount: string }) {
  return (
    <div className="rounded-lg bg-white/10 p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{title}</span>
        <span className="text-green-300">{amount}</span>
      </div>
      <p className="mt-2 text-xs text-gray-300">{description}</p>
    </div>
  );
}

function VerificationChecklist({
  label,
  description,
  pending,
}: {
  label: string;
  description: string;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center space-x-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${pending ? 'bg-green-500/40 animate-pulse' : 'bg-green-500'}`}>
        {pending ? <Loader className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
      </div>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-gray-300">{description}</p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  accent,
  monospace,
}: {
  label: string;
  value: string;
  accent?: boolean;
  monospace?: boolean;
}) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-200">
      <span>{label}</span>
      <span className={`${accent ? 'text-green-300 font-semibold' : ''} ${monospace ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

function InfoCard({
  label,
  value,
  monospace,
  fullWidth,
}: {
  label: string;
  value: string;
  monospace?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? 'md:col-span-2' : undefined}>
      <p className="mb-2 text-sm text-gray-300">{label}</p>
      <p className={`rounded-lg bg-white/10 p-3 text-sm ${monospace ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-5 py-2 text-sm text-white shadow">
      {children}
    </div>
  );
}
