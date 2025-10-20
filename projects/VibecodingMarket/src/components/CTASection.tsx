import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-primary opacity-10" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* User CTA */}
            <div className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-card space-y-6">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                <ArrowRight className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-foreground">
                  项目卡住了？
                </h3>
                <p className="text-muted-foreground">
                  立即发布任务，让专业工程师帮你解决 Bug、优化代码、快速上线
                </p>
              </div>
              <Link to="/post-task">
                <Button variant="gradient" size="lg" className="w-full">
                  发布任务
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>

            {/* Engineer CTA */}
            <div className="p-8 rounded-2xl bg-card border border-border hover:border-accent/50 transition-all duration-300 hover:shadow-card space-y-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-success flex items-center justify-center shadow-glow">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-foreground">
                  你是工程师？
                </h3>
                <p className="text-muted-foreground">
                  利用碎片时间接单，帮助其他开发者解决问题，赚取收入
                </p>
              </div>
              <Link to="/dashboard">
                <Button variant="outline" size="lg" className="w-full">
                  开始接单
                  <Briefcase className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
