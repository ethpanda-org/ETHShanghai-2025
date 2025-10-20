import Navigation from "@/components/Navigation";
import TaskCard from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";

const mockTasks = [
  {
    id: "1",
    title: "React 项目登录功能无法正常工作",
    description: "使用 Supabase Auth 实现的登录功能，提交表单后没有反应，控制台也没有错误信息。需要帮助排查问题。",
    budget: "50",
    urgency: "high" as const,
    timePosted: "5分钟前",
    tags: ["React", "Supabase", "Authentication"],
    rating: 4.8
  },
  {
    id: "2",
    title: "Next.js 网站部署到 Vercel 失败",
    description: "本地运行正常，但部署到 Vercel 时出现构建错误。错误信息显示 'Module not found'，但本地没问题。",
    budget: "80",
    urgency: "high" as const,
    timePosted: "15分钟前",
    tags: ["Next.js", "Vercel", "Deployment"],
    rating: 4.9
  },
  {
    id: "3",
    title: "优化数据库查询性能",
    description: "PostgreSQL 数据库查询速度很慢，需要帮助优化 SQL 查询和添加索引。有大约 10万条数据。",
    budget: "120",
    urgency: "medium" as const,
    timePosted: "1小时前",
    tags: ["PostgreSQL", "Performance", "SQL"],
    rating: 4.7
  },
  {
    id: "4",
    title: "移动端适配问题修复",
    description: "PC 端显示正常，但在移动设备上布局错乱。需要修复响应式布局和一些交互问题。",
    budget: "60",
    urgency: "medium" as const,
    timePosted: "2小时前",
    tags: ["CSS", "Responsive", "Mobile"],
  },
  {
    id: "5",
    title: "实现 Stripe 支付集成",
    description: "需要在现有项目中集成 Stripe 支付功能，包括支付页面、回调处理和订单管理。",
    budget: "150",
    urgency: "low" as const,
    timePosted: "3小时前",
    tags: ["Stripe", "Payment", "Integration"],
    rating: 5.0
  },
  {
    id: "6",
    title: "修复 API 跨域问题",
    description: "前端调用后端 API 时遇到 CORS 错误，需要配置正确的跨域设置。后端使用 Express.js。",
    budget: "40",
    urgency: "high" as const,
    timePosted: "4小时前",
    tags: ["CORS", "Express", "API"],
  }
];

const Marketplace = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                任务市场
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              浏览并接取 Debug 任务，帮助其他开发者解决问题
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 p-6 rounded-xl bg-card border border-border">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="搜索任务、技术栈..." 
                    className="pl-10"
                  />
                </div>
              </div>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="紧急程度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="high">紧急</SelectItem>
                  <SelectItem value="medium">一般</SelectItem>
                  <SelectItem value="low">不急</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="latest">
                <SelectTrigger>
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">最新发布</SelectItem>
                  <SelectItem value="budget-high">预算最高</SelectItem>
                  <SelectItem value="budget-low">预算最低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="w-4 h-4" />
                高级筛选
              </Button>
            </div>
          </div>

          {/* Task List */}
          <div className="grid gap-4">
            {mockTasks.map((task, index) => (
              <TaskCard key={index} {...task} />
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">上一页</Button>
              <Button variant="default" size="sm">1</Button>
              <Button variant="ghost" size="sm">2</Button>
              <Button variant="ghost" size="sm">3</Button>
              <Button variant="outline" size="sm">下一页</Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Marketplace;
