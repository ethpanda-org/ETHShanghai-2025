import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ChatInterface from "@/components/ChatInterface";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/hooks/use-toast";
import { 
  Clock, 
  DollarSign, 
  User, 
  Link2, 
  FileCode, 
  Tag,
  ArrowLeft,
  MessageSquare,
  ShieldCheck
} from "lucide-react";

// Mock data - replace with real data fetching
const mockTask = {
  id: "1",
  title: "React 登录功能无法正常工作，需要紧急修复",
  description: `我正在开发一个 React 应用，登录功能出现了问题。具体情况如下：

1. **问题描述**：用户输入账号密码后点击登录，页面没有任何响应
2. **期望行为**：应该跳转到用户仪表盘
3. **错误信息**：控制台显示 "Cannot read property 'token' of undefined"
4. **已尝试方案**：
   - 检查了 API 端点，确认后端正常
   - 尝试使用 console.log 调试，发现数据返回正常
   - 怀疑是状态管理的问题

需要有经验的工程师帮忙快速定位和修复这个问题。`,
  budget: "0.05",
  urgency: "high",
  tags: ["React", "Bug Fix", "Authentication", "Urgent"],
  client: {
    address: "0x1234...5678",
    rating: 4.8,
    tasksPosted: 12
  },
  githubLink: "https://github.com/example/project",
  lovableLink: "https://lovable.app/projects/abc123",
  status: "open",
  postedAt: "2024-01-20T10:30:00Z",
};

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { address, formatAddress } = useWallet();
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);

  const task = mockTask; // Replace with actual data fetching

  const handleAcceptTask = async () => {
    if (!address) {
      toast({
        title: "需要连接钱包",
        description: "请先连接 MetaMask 钱包后再接单",
        variant: "destructive",
      });
      return;
    }

    setShowAcceptDialog(false);
    setIsAccepting(true);
    
    // Simulate accepting task with contract interaction
    setTimeout(() => {
      setHasAccepted(true);
      setIsAccepting(false);
      toast({
        title: "🎉 接单成功！",
        description: "预算已托管，现在可以开始与客户沟通了",
      });
    }, 1500);
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

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "紧急";
      case "medium":
        return "一般";
      case "low":
        return "不急";
      default:
        return urgency;
    }
  };

  if (hasAccepted) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-20 pb-8">
          <div className="container mx-auto px-4">
            <Button
              variant="ghost"
              onClick={() => setHasAccepted(false)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回任务详情
            </Button>
            <ChatInterface taskId={id!} taskTitle={task.title} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title and Tags */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <h1 className="text-3xl font-bold">{task.title}</h1>
                    <Badge variant={getUrgencyColor(task.urgency)}>
                      {getUrgencyText(task.urgency)}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Description */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">任务描述</h2>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </div>
              </Card>

              {/* Project Links */}
              {(task.githubLink || task.lovableLink) && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">项目链接</h2>
                  <div className="space-y-3">
                    {task.githubLink && (
                      <a
                        href={task.githubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                      >
                        <Link2 className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm">GitHub 仓库</span>
                      </a>
                    )}
                    {task.lovableLink && (
                      <a
                        href={task.lovableLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                      >
                        <FileCode className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm">Lovable 项目</span>
                      </a>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Budget and Action */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">任务预算</p>
                    <div className="flex items-baseline gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="text-3xl font-bold">{task.budget}</span>
                      <span className="text-muted-foreground">ETH</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>发布于 {new Date(task.postedAt).toLocaleString("zh-CN")}</span>
                  </div>

                  <Button 
                    className="w-full" 
                    variant="gradient" 
                    size="lg"
                    onClick={() => setShowAcceptDialog(true)}
                    disabled={isAccepting}
                  >
                    {isAccepting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        接单中...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        接单并开始沟通
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Client Info */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">发布者信息</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.client.address}</p>
                      <p className="text-sm text-muted-foreground">
                        ⭐ {task.client.rating} · {task.client.tasksPosted} 个任务
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tips */}
              <Card className="p-6 bg-primary/5 border-primary/20">
                <h4 className="font-semibold text-primary mb-3">💡 接单提示</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>• 仔细阅读任务需求</li>
                  <li>• 检查项目链接是否可访问</li>
                  <li>• 接单后及时与客户沟通</li>
                  <li>• 预算已托管在智能合约</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Accept Task Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              确认接单
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>你即将接受以下任务：</p>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-semibold text-foreground">{task.title}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">预算</span>
                  <span className="font-semibold text-foreground">{task.budget} ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">客户地址</span>
                  <span className="font-mono text-foreground">{formatAddress(task.client.address)}</span>
                </div>
              </div>
              <div className="text-sm space-y-1">
                <p className="font-semibold text-foreground">接单须知：</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>预算将被智能合约托管</li>
                  <li>完成任务后客户确认才会释放预算</li>
                  <li>请及时与客户保持沟通</li>
                  <li>确保高质量完成任务</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptTask}>
              确认接单
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TaskDetail;
