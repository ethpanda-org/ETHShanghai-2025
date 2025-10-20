import { Card } from "@/components/ui/card";
import { Rocket, MessageSquare, Shield, Code, Star, DollarSign } from "lucide-react";

const features = [
  {
    icon: Rocket,
    title: "快速响应",
    description: "专业工程师平均 10 分钟内响应，不让你的项目停滞",
    color: "text-accent"
  },
  {
    icon: Code,
    title: "远程协作",
    description: "通过 Lovable Remix，工程师可直接查看和调试你的代码",
    color: "text-primary"
  },
  {
    icon: MessageSquare,
    title: "实时沟通",
    description: "内置聊天系统，支持文字、文件和错误截图快速交流",
    color: "text-warning"
  },
  {
    icon: Shield,
    title: "安全托管",
    description: "基于 Web3 智能合约，任务完成确认后才释放付款",
    color: "text-success"
  },
  {
    icon: Star,
    title: "信用体系",
    description: "工程师评分系统，帮你快速找到靠谱的专业人士",
    color: "text-primary-glow"
  },
  {
    icon: DollarSign,
    title: "透明定价",
    description: "支持 USDT/USDC 支付，价格透明，按任务结算",
    color: "text-accent"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">
            <span className="text-foreground">为什么选择 </span>
            <span className="bg-gradient-primary bg-clip-text text-transparent">VibeCoding</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            专为 AI 时代开发者打造的 Debug 和上线协作平台
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className="p-6 bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 hover:shadow-card group"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-glow flex items-center justify-center mb-4 group-hover:shadow-glow transition-all duration-300`}>
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
