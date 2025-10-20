import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import {
  Wallet,
  FileText,
  Search,
  MessageSquare,
  CheckCircle2,
  Star,
  Shield,
  Zap,
  DollarSign,
  ArrowRight,
  Lock,
  Users,
  Clock,
} from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      title: "连接钱包",
      description: "使用 MetaMask 连接 Sepolia 测试网络，完成身份验证即可开始使用平台",
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      number: "02",
      title: "发布任务",
      description: "详细描述你的需求，设置合理预算，预算将自动托管在智能合约中",
      icon: FileText,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      number: "03",
      title: "工程师接单",
      description: "认证工程师浏览任务并接单，平均响应时间少于 10 分钟",
      icon: Search,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      number: "04",
      title: "实时协作",
      description: "通过内置聊天系统沟通需求，工程师远程协助解决问题",
      icon: MessageSquare,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      number: "05",
      title: "验收确认",
      description: "问题解决后，客户确认任务完成，智能合约自动释放托管预算",
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      number: "06",
      title: "互评反馈",
      description: "双方互相评价，建立信用体系，帮助未来更好的匹配",
      icon: Star,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  const features = [
    {
      icon: Shield,
      title: "智能合约托管",
      description: "预算托管在 Sepolia 测试网，任务完成后自动释放，保障双方权益",
      color: "text-primary",
    },
    {
      icon: Zap,
      title: "快速响应",
      description: "平均 10 分钟内获得工程师响应，紧急任务可优先处理",
      color: "text-warning",
    },
    {
      icon: Lock,
      title: "安全可靠",
      description: "基于区块链技术，所有交易透明可追溯，资金安全有保障",
      color: "text-success",
    },
    {
      icon: Users,
      title: "认证工程师",
      description: "所有工程师均通过技能认证，平均评分 4.5+ 星",
      color: "text-accent",
    },
  ];

  const roles = [
    {
      title: "对于客户",
      icon: FileText,
      benefits: [
        "遇到技术问题时快速获得专业帮助",
        "只为结果付费，任务完成前预算安全托管",
        "透明的价格和工程师评价系统",
        "7x24 小时随时发布任务",
      ],
      action: "发布任务",
      link: "/post-task",
      gradient: "from-primary to-accent",
    },
    {
      title: "对于工程师",
      icon: Search,
      benefits: [
        "灵活的工作时间，自由选择接单",
        "通过技能获得报酬，积累口碑",
        "接触不同项目，提升技术能力",
        "预算已托管，收入有保障",
      ],
      action: "浏览任务",
      link: "/marketplace",
      gradient: "from-accent to-success",
    },
  ];

  const faqs = [
    {
      question: "预算如何托管？",
      answer:
        "发布任务时，预算会自动托管在 Sepolia 测试网的智能合约中。只有在任务完成并经客户确认后，预算才会释放给工程师。这保证了双方的权益。",
    },
    {
      question: "如果任务无法完成怎么办？",
      answer:
        "如果工程师无法完成任务，客户可以发起争议。平台会介入调解，根据实际情况决定预算的分配。未完成的任务，预算会退还给客户。",
    },
    {
      question: "工程师需要什么资格？",
      answer:
        "工程师需要连接钱包并完成技能认证。我们会审核工程师的技术背景和项目经验。通过认证后即可开始接单。",
    },
    {
      question: "平台收取多少费用？",
      answer:
        "目前测试阶段，平台不收取任何服务费用。未来可能会收取少量手续费用于维护平台运营。",
    },
    {
      question: "支持哪些技术栈？",
      answer:
        "支持所有主流技术栈，包括但不限于：React、Vue、Node.js、Python、Java、Go、数据库、DevOps、Web3 等。",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-20">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <Badge variant="outline" className="mb-4">
              <Zap className="w-3 h-3 mr-1" />
              简单、快速、安全
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                如何运作
              </span>
            </h1>
            <p className="text-xl text-muted-foreground">
              从发布任务到完成交付，只需 6 个简单步骤
            </p>
          </div>
        </section>

        {/* Steps Section */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {steps.map((step, index) => (
                <Card
                  key={index}
                  className="p-6 hover:shadow-card transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${step.bgColor}`}>
                        <step.icon className={`w-6 h-6 ${step.color}`} />
                      </div>
                      <span className="text-4xl font-bold text-muted-foreground/20">
                        {step.number}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                      <p className="text-muted-foreground text-sm">{step.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">平台核心优势</h2>
              <p className="text-muted-foreground text-lg">
                基于区块链技术，打造可信赖的技术服务平台
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="p-6 text-center">
                  <div className={`inline-flex p-4 rounded-full bg-accent/10 mb-4`}>
                    <feature.icon className={`w-8 h-8 ${feature.color}`} />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Roles Section */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {roles.map((role, index) => (
                <Card key={index} className="p-8 relative overflow-hidden">
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${role.gradient} opacity-10 rounded-full -translate-y-16 translate-x-16`}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 rounded-lg bg-accent/10">
                        <role.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold">{role.title}</h3>
                    </div>
                    <ul className="space-y-3 mb-6">
                      {role.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to={role.link}>
                      <Button variant="gradient" className="w-full">
                        {role.action}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Payment Flow Section */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <div className="text-center mb-8">
                <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-2">资金托管流程</h2>
                <p className="text-muted-foreground">
                  基于智能合约的安全支付系统
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="bg-background rounded-lg p-4 mb-3">
                    <Lock className="w-8 h-8 text-primary mx-auto mb-2" />
                    <h4 className="font-semibold mb-1">发布时托管</h4>
                    <p className="text-sm text-muted-foreground">
                      预算锁定在智能合约
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-background rounded-lg p-4 mb-3">
                    <Clock className="w-8 h-8 text-warning mx-auto mb-2" />
                    <h4 className="font-semibold mb-1">任务进行中</h4>
                    <p className="text-sm text-muted-foreground">
                      资金安全锁定不可动用
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-background rounded-lg p-4 mb-3">
                    <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                    <h4 className="font-semibold mb-1">确认后释放</h4>
                    <p className="text-sm text-muted-foreground">
                      自动转账给工程师
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">常见问题</h2>
              <p className="text-muted-foreground text-lg">
                关于平台运作的更多信息
              </p>
            </div>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="p-6">
                  <h3 className="font-semibold text-lg mb-3 flex items-start gap-2">
                    <span className="text-primary">Q:</span>
                    {faq.question}
                  </h3>
                  <p className="text-muted-foreground pl-6">{faq.answer}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto p-12 text-center bg-gradient-to-br from-primary/10 via-accent/10 to-success/10 border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              准备好开始了吗？
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              无论是需要技术支持的客户，还是希望接单赚取收入的工程师，
              现在就开始使用 VibeCoding Market
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/post-task">
                <Button variant="gradient" size="lg">
                  <FileText className="w-5 h-5 mr-2" />
                  发布任务
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="outline" size="lg">
                  <Search className="w-5 h-5 mr-2" />
                  浏览任务市场
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default HowItWorks;
