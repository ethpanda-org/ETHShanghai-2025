import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, MessageCircle, BookOpen, Shield, Zap } from "lucide-react";

const FAQPage = () => {
  const faqData = [
    {
      category: "General",
      icon: <HelpCircle className="h-5 w-5 text-primary" />,
      questions: [
        {
          question: "What is AlphaBuilder?",
          answer: "AlphaBuilder is a comprehensive platform that provides real-time insights into cryptocurrency stability, airdrop opportunities, and quest management. We help users make informed decisions through unified stability scoring, spread analysis, and position duration metrics."
        },
        {
          question: "How does the stability scoring work?",
          answer: "Our stability scoring system analyzes multiple factors including price volatility, trading volume, market depth, and historical performance to provide a comprehensive stability rating for each cryptocurrency pair. The scoring ranges from 1-100, with higher scores indicating more stable assets."
        },
        {
          question: "Is AlphaBuilder free to use?",
          answer: "Yes, AlphaBuilder offers a free tier with access to basic stability insights and airdrop information. We also provide premium features for advanced analytics and real-time alerts."
        }
      ]
    },
    {
      category: "Quest & Airdrops",
      icon: <Zap className="h-5 w-5 text-emerald-500" />,
      questions: [
        {
          question: "How do I participate in quests?",
          answer: "Simply browse our Quest page to discover available quests. Click 'Join Quest' on any quest card to be redirected to the official quest page where you can complete the required quests to earn rewards."
        },
        {
          question: "Are the airdrop opportunities verified?",
          answer: "Yes, we carefully curate and verify all airdrop opportunities listed on our platform. We only feature legitimate projects with confirmed token distributions and clear participation requirements."
        },
        {
          question: "How often are new quests added?",
          answer: "We continuously monitor the ecosystem and add new quests as they become available. Our platform is updated in real-time to ensure you never miss out on the latest opportunities."
        },
        {
          question: "What types of rewards can I earn?",
          answer: "Rewards vary by quest and can include tokens, NFTs, points, OATs (On-chain Achievement Tokens), and other digital assets. Each quest clearly displays the reward type and amount."
        }
      ]
    },
    {
      category: "Account & Security",
      icon: <Shield className="h-5 w-5 text-blue-500" />,
      questions: [
        {
          question: "How do I create an account?",
          answer: "You can create an account by clicking the 'Sign Up' button in the navigation menu. We support email registration and social login options for your convenience."
        },
        {
          question: "Is my data secure?",
          answer: "Absolutely. We implement industry-standard security measures including encryption, secure authentication, and regular security audits to protect your personal information and trading data."
        },
        {
          question: "Can I connect my wallet?",
          answer: "Yes, you can connect your crypto wallet to track your holdings and receive personalized recommendations. We support major wallets including MetaMask, WalletConnect, and others."
        }
      ]
    },
    {
      category: "Technical Support",
      icon: <MessageCircle className="h-5 w-5 text-purple-500" />,
      questions: [
        {
          question: "How do I contact support?",
          answer: "You can reach our support team through the contact form on our website, or join our Discord community for real-time assistance. We typically respond within 24 hours."
        },
        {
          question: "What browsers are supported?",
          answer: "AlphaBuilder works on all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version of your preferred browser for the best experience."
        },
        {
          question: "Do you have a mobile app?",
          answer: "Currently, AlphaBuilder is optimized for web browsers and works great on mobile devices. We're developing dedicated mobile apps for iOS and Android, which will be available soon."
        }
      ]
    }
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6 lg:p-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          Frequently Asked Questions
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Find answers to common questions about AlphaBuilder, our features, and how to get the most out of our platform.
        </p>
      </div>

      <div className="space-y-8">
        {faqData.map((category, categoryIndex) => (
          <div key={categoryIndex} className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              {category.icon}
              <h2 className="text-3xl font-semibold text-foreground">
                {category.category}
              </h2>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              {category.questions.map((faq, faqIndex) => (
                <AccordionItem 
                  key={faqIndex} 
                  value={`${categoryIndex}-${faqIndex}`}
                  className="border border-border rounded-lg mb-4 bg-background/50"
                >
                  <AccordionTrigger className="px-6 py-4 text-left font-medium hover:no-underline text-lg">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 text-muted-foreground leading-relaxed text-base">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}
      </div>

      <div className="mt-12 p-8 rounded-2xl border border-border bg-gradient-to-r from-primary/5 via-secondary/5 to-transparent">
        <div className="text-center space-y-4">
          <BookOpen className="h-12 w-12 text-primary mx-auto" />
          <h3 className="text-3xl font-semibold text-foreground">
            Still have questions?
          </h3>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Can't find what you're looking for? Our support team is here to help you get the most out of AlphaBuilder.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
            <a
              href="/resources/contact"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Support
            </a>
            <a
              href="/resources/help-center"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 text-base font-medium transition-colors hover:bg-muted"
            >
              <BookOpen className="h-4 w-4" />
              Help Center
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQPage;
