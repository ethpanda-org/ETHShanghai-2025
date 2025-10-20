import { Card } from "@/components/ui/card";
import { FileCode, Users, MessageCircle, CheckCircle, Star } from "lucide-react";

const steps = [
  {
    icon: FileCode,
    step: "01",
    title: "发布任务",
    description: "描述你的问题，上传项目链接（GitHub/Lovable），设置预算"
  },
  {
    icon: Users,
    step: "02",
    title: "工程师接单",
    description: "专业工程师查看需求，快速响应并开始协作"
  },
  {
    icon: MessageCircle,
    step: "03",
    title: "实时修复",
    description: "通过聊天沟通，工程师远程 Debug 和优化代码"
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "确认完成",
    description: "验证结果，智能合约自动释放付款"
  },
  {
    icon: Star,
    step: "05",
    title: "互相评价",
    description: "双方留下评价，建立信用体系"
  }
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 relative bg-gradient-glow">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">
            如何运作
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            5 个简单步骤，从卡住到上线
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-5 gap-4 relative">
            {/* Connection Lines */}
            <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-primary opacity-30" style={{ top: '4rem' }} />
            
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card 
                  key={index}
                  className="relative p-6 bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-card text-center group"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <div className="text-4xl font-bold text-primary/20 mb-2">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
