import { useState } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/hooks/use-toast";
import { 
  Briefcase, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Star, 
  TrendingUp,
  Award,
  MessageSquare,
  Search,
  Filter,
  Eye,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Tag,
  ArrowUpRight,
  TrendingDown
} from "lucide-react";

const Dashboard = () => {
  const { address, formatAddress } = useWallet();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline");

  const stats = [
    {
      icon: Briefcase,
      label: "进行中任务",
      value: "3",
      color: "text-primary",
      trend: "+2",
      trendUp: true
    },
    {
      icon: CheckCircle,
      label: "已完成",
      value: "47",
      color: "text-success",
      trend: "+5",
      trendUp: true
    },
    {
      icon: DollarSign,
      label: "本月收入",
      value: "2.85 ETH",
      color: "text-accent",
      trend: "+12%",
      trendUp: true
    },
    {
      icon: Star,
      label: "平均评分",
      value: "4.9",
      color: "text-warning",
      trend: "+0.2",
      trendUp: true
    }
  ];

  const activeGigs = [
    {
      id: "1",
      title: "React 登录功能无法正常工作，需要紧急修复",
      client: { address: "0x1234...5678", rating: 4.8 },
      budget: "0.05",
      deadline: "2小时内",
      status: "进行中",
      progress: 60,
      tags: ["React", "Bug Fix", "Urgent"],
      urgency: "high",
      startedAt: "2024-01-20T08:00:00Z",
      messages: 5
    },
    {
      id: "2",
      title: "Next.js 应用部署到 Vercel 出现错误",
      client: { address: "0xabcd...ef01", rating: 4.5 },
      budget: "0.08",
      deadline: "4小时内",
      status: "等待反馈",
      progress: 80,
      tags: ["Next.js", "Deployment"],
      urgency: "medium",
      startedAt: "2024-01-20T06:00:00Z",
      messages: 12
    },
    {
      id: "3",
      title: "数据库查询性能优化",
      client: { address: "0x9876...5432", rating: 5.0 },
      budget: "0.12",
      deadline: "明天",
      status: "进行中",
      progress: 30,
      tags: ["Database", "Performance"],
      urgency: "low",
      startedAt: "2024-01-19T10:00:00Z",
      messages: 3
    }
  ];

  const completedTasks = [
    {
      id: "101",
      title: "修复 TypeScript 类型错误",
      client: { address: "0xdef1...2345", rating: 4.9 },
      budget: "0.03",
      completedAt: "2024-01-19",
      rating: 5,
      tags: ["TypeScript"]
    },
    {
      id: "102",
      title: "API 接口优化",
      client: { address: "0x5678...9abc", rating: 4.7 },
      budget: "0.06",
      completedAt: "2024-01-18",
      rating: 5,
      tags: ["API", "Backend"]
    },
    {
      id: "103",
      title: "前端响应式布局调整",
      client: { address: "0x1111...2222", rating: 4.6 },
      budget: "0.04",
      completedAt: "2024-01-17",
      rating: 4,
      tags: ["CSS", "Responsive"]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "进行中":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "等待反馈":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "已暂停":
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const handleCompleteTask = (taskId: string) => {
    toast({
      title: "标记任务完成",
      description: "等待客户确认后预算将释放",
    });
  };

  const filteredTasks = activeGigs.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
                  <Award className="w-8 h-8 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">
                    <span className="bg-gradient-primary bg-clip-text text-transparent">
                      接单中心
                    </span>
                  </h1>
                  <p className="text-muted-foreground">
                    {address ? formatAddress(address) : "欢迎回来，专业工程师"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  认证工程师
                </Badge>
                <Link to="/marketplace">
                  <Button variant="gradient">
                    <Search className="w-4 h-4 mr-2" />
                    浏览任务
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const TrendIcon = stat.trendUp ? ArrowUpRight : TrendingDown;
              return (
                <Card key={index} className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-300">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-lg bg-gradient-glow flex items-center justify-center">
                        <Icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${stat.trendUp ? 'text-success' : 'text-destructive'}`}>
                        <TrendIcon className="w-3 h-3" />
                        {stat.trend}
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Main Content */}
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full md:w-auto grid-cols-3 bg-card border border-border">
              <TabsTrigger value="active">进行中</TabsTrigger>
              <TabsTrigger value="available">可接任务</TabsTrigger>
              <TabsTrigger value="history">历史记录</TabsTrigger>
            </TabsList>

            {/* Active Tasks */}
            <TabsContent value="active" className="space-y-6">
              {/* Filters */}
              <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索任务..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="进行中">进行中</SelectItem>
                        <SelectItem value="等待反馈">等待反馈</SelectItem>
                        <SelectItem value="已暂停">已暂停</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="排序" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deadline">截止时间</SelectItem>
                        <SelectItem value="budget">预算</SelectItem>
                        <SelectItem value="progress">进度</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Task List */}
              <div className="space-y-4">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((gig) => (
                    <Card key={gig.id} className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-300">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start gap-3">
                              <h3 className="text-lg font-semibold text-foreground flex-1">
                                {gig.title}
                              </h3>
                              <Badge variant="outline" className={getStatusColor(gig.status)}>
                                {gig.status}
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {formatAddress(gig.client.address)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-warning text-warning" />
                                {gig.client.rating}
                              </div>
                              <Separator orientation="vertical" className="h-4" />
                              <div className="flex items-center gap-1 text-destructive">
                                <Clock className="w-4 h-4" />
                                {gig.deadline}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(gig.startedAt).toLocaleDateString("zh-CN")}
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="w-4 h-4" />
                                {gig.messages} 条消息
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {gig.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">任务进度</span>
                            <span className="text-primary font-semibold">{gig.progress}%</span>
                          </div>
                          <Progress value={gig.progress} className="h-2" />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-accent" />
                            <span className="text-xl font-bold text-accent">{gig.budget} ETH</span>
                          </div>
                          <div className="flex gap-2">
                            <Link to={`/task/${gig.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4 mr-2" />
                                查看详情
                              </Button>
                            </Link>
                            <Link to={`/task/${gig.id}`}>
                              <Button variant="ghost" size="sm">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                聊天
                              </Button>
                            </Link>
                            {gig.progress >= 80 && (
                              <Button 
                                variant="gradient" 
                                size="sm"
                                onClick={() => handleCompleteTask(gig.id)}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                标记完成
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-12 text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">没有找到任务</h3>
                    <p className="text-muted-foreground">
                      尝试调整搜索条件或前往任务市场接取新任务
                    </p>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Available Tasks */}
            <TabsContent value="available">
              <Card className="p-12 text-center bg-card border-border">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">浏览任务市场</h3>
                <p className="text-muted-foreground mb-6">
                  查看所有可接取的任务，找到适合你的项目
                </p>
                <Link to="/marketplace">
                  <Button variant="gradient" size="lg">
                    <Search className="w-4 h-4 mr-2" />
                    前往任务市场
                  </Button>
                </Link>
              </Card>
            </TabsContent>

            {/* History */}
            <TabsContent value="history" className="space-y-4">
              <Card className="p-6 bg-gradient-to-r from-success/10 to-primary/10 border-success/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-1">
                      已完成 {completedTasks.length} 个任务
                    </h3>
                    <p className="text-muted-foreground">
                      累计收入 2.85 ETH · 平均评分 4.9 ⭐
                    </p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-success" />
                </div>
              </Card>

              <div className="space-y-4">
                {completedTasks.map((task) => (
                  <Card key={task.id} className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-300">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <h3 className="text-lg font-semibold text-foreground">
                            {task.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {formatAddress(task.client.address)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              完成于 {task.completedAt}
                            </div>
                            <div className="flex items-center gap-1 text-warning">
                              {[...Array(task.rating)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-current" />
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {task.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                          <span className="text-success font-semibold">已完成</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-accent" />
                          <span className="text-xl font-bold text-accent">{task.budget} ETH</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
