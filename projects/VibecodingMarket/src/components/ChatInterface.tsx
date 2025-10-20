import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "@/hooks/use-toast";
import { Send, User, Paperclip, CheckCircle2, FileCode, Image, Smile } from "lucide-react";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

interface ChatInterfaceProps {
  taskId: string;
  taskTitle: string;
}

const ChatInterface = ({ taskId, taskTitle }: ChatInterfaceProps) => {
  const { address, formatAddress } = useWallet();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "0x1234...5678",
      content: "你好！感谢接单。我的登录功能一直报错，能帮我看看吗？",
      timestamp: new Date(Date.now() - 300000),
      isOwn: false,
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    setIsSending(true);
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: address || "You",
      content: inputMessage,
      timestamp: new Date(),
      isOwn: true,
    };

    setMessages([...messages, newMessage]);
    setInputMessage("");

    // Auto resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSending(false);

    // Show typing indicator
    setIsTyping(true);
    
    // Simulate response
    setTimeout(() => {
      setIsTyping(false);
      const response: Message = {
        id: (Date.now() + 1).toString(),
        sender: "0x1234...5678",
        content: "好的，我正在查看你的代码。我注意到你的状态管理可能有问题，让我详细看一下...",
        timestamp: new Date(),
        isOwn: false,
      };
      setMessages((prev) => [...prev, response]);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileAttachment = () => {
    toast({
      title: "即将推出",
      description: "文件附件功能正在开发中",
    });
  };

  const handleCompleteTask = () => {
    toast({
      title: "标记任务完成",
      description: "等待客户确认后预算将释放到你的地址",
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Chat Area */}
      <Card className="lg:col-span-2 flex flex-col h-[600px]">
        {/* Chat Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold truncate">{taskTitle}</h2>
              <p className="text-sm text-muted-foreground">任务 ID: {taskId}</p>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              在线
            </Badge>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.isOwn ? "flex-row-reverse" : ""}`}
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className={`flex-1 ${message.isOwn ? "items-end" : "items-start"} flex flex-col`}>
                  <div className="flex items-baseline gap-2 mb-1">
                   <span className="text-sm font-medium">
                      {message.isOwn ? "你" : formatAddress(message.sender)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center bg-muted rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleFileAttachment}
                title="附件"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleFileAttachment}
                title="图片"
              >
                <Image className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleFileAttachment}
                title="表情"
              >
                <Smile className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                placeholder="输入消息... (Shift + Enter 换行)"
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  // Auto resize
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] max-h-[120px] resize-none"
              />
              <Button 
                onClick={handleSendMessage} 
                variant="gradient"
                size="icon"
                className="h-[60px] w-[60px]"
                disabled={isSending || !inputMessage.trim()}
              >
                {isSending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Task Info Sidebar */}
      <div className="space-y-4">
        <Card className="p-6">
          <h3 className="font-semibold mb-4">任务状态</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-warning">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span className="text-sm">进行中</span>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">预算</span>
                <span className="font-semibold">0.05 ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">紧急程度</span>
                <span className="text-destructive">紧急</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">协作工具</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <FileCode className="w-4 h-4 mr-2" />
              查看项目代码
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Paperclip className="w-4 h-4 mr-2" />
              共享文件
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <Button 
            variant="gradient" 
            className="w-full" 
            size="lg"
            onClick={handleCompleteTask}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            标记任务完成
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            完成后客户确认才会释放预算
          </p>
        </Card>

        <Card className="p-6 bg-primary/5 border-primary/20">
          <h4 className="font-semibold text-primary mb-3">📝 注意事项</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• 及时回复客户消息</li>
            <li>• 保持专业沟通</li>
            <li>• 完成后请求客户确认</li>
            <li>• 问题随时反馈</li>
          </ul>
        </Card>
      </div>
    </div>
  );
};

export default ChatInterface;
