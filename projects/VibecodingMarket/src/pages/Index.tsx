import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import CTASection from "@/components/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      
      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-muted-foreground text-sm">
              © 2024 VibeCoding Market. 让每个 AI Demo 都能运行起来
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">关于我们</a>
              <a href="#" className="hover:text-primary transition-colors">条款</a>
              <a href="#" className="hover:text-primary transition-colors">隐私</a>
              <a href="#" className="hover:text-primary transition-colors">联系</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
