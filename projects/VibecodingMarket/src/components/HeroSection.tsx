import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background" />
        <div className="absolute inset-0 bg-gradient-glow" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">vibe coding卡住了？找技术专家立刻debug</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              代码卡住了？
            </span>
            <br />
            <span className="text-foreground">
              找工程师实时帮你修
            </span>
          </h1>

          {/* Description */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            从 Debug 到部署上线，专业工程师 10 分钟内响应。
            基于 Web3 托管支付，任务完成再付款。
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/post-task">
              <Button variant="gradient" size="lg" className="w-full sm:w-auto">
                立即发布任务
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                浏览任务市场
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-12 max-w-2xl mx-auto">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                <div className="text-3xl font-bold text-foreground">&lt;10分钟</div>
              </div>
              <div className="text-sm text-muted-foreground">平均响应时间</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 text-success" />
                <div className="text-3xl font-bold text-foreground">85%+</div>
              </div>
              <div className="text-sm text-muted-foreground">任务成功率</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Zap className="w-5 h-5 text-warning" />
                <div className="text-3xl font-bold text-foreground">500+</div>
              </div>
              <div className="text-sm text-muted-foreground">认证工程师</div>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Grid Background */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '4rem 4rem'
        }} />
      </div>
    </section>
  );
};

export default HeroSection;
