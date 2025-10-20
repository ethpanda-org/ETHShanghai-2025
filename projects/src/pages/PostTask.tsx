import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileCode, Link2, DollarSign, Clock, X, Wallet } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTaskContract } from "@/hooks/useTaskContract";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema, TaskFormData } from "@/lib/validations/task";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const PostTask = () => {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { address } = useWallet();
  const { createTask } = useTaskContract();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      githubLink: "",
      lovableLink: "",
      budget: "",
      urgency: "medium",
    },
  });

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = async (data: TaskFormData) => {
    if (!address) {
      toast({
        title: "需要连接钱包",
        description: "请先在右上角连接 MetaMask 钱包后再发布任务",
        variant: "destructive",
      });
      return;
    }

    if (tags.length === 0) {
      toast({
        title: "请添加技术标签",
        description: "至少需要添加一个技术标签",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const urgencyMap = { low: 0, medium: 1, high: 2 };
      
      const result = await createTask(
        data.title,
        data.description,
        tags,
        urgencyMap[data.urgency],
        data.budget
      );

      if (result.success) {
        toast({
          title: "任务发布成功！",
          description: `交易哈希: ${result.txHash?.slice(0, 10)}...`,
        });
        
        // Reset form
        form.reset();
        setTags([]);
      }
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                发布任务
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              详细描述你的需求，让工程师能够快速理解并帮助你
            </p>
          </div>

          <Card className="p-8 bg-card border-border">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">
                        任务标题 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例如：React 登录功能无法正常工作，需要紧急修复"
                          className="text-base"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        用一句话清晰描述你的问题
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">
                        详细描述 <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="请详细描述问题：&#10;1. 期望的功能是什么？&#10;2. 目前遇到什么问题？&#10;3. 已经尝试过哪些方案？&#10;4. 有什么错误信息？"
                          rows={8}
                          className="text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Project Links */}
                <div className="space-y-4">
                  <Label className="text-base font-semibold">项目链接</Label>
                  <FormField
                    control={form.control}
                    name="githubLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              placeholder="GitHub 仓库链接 (可选)"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lovableLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <FileCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              placeholder="Lovable 项目链接 (可选)"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    提供项目链接可以让工程师更快理解你的代码
                  </p>
                </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  技术标签
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {tag}
                      <button 
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="添加技术标签，例如：React, TypeScript"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    添加
                  </Button>
                </div>
              </div>

                {/* Budget and Urgency */}
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">
                          预算 (ETH) <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                              type="number"
                              step="0.001"
                              placeholder="0.05"
                              className="pl-10"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Sepolia 测试网 ETH（最低 0.001 ETH）
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="urgency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">
                          紧急程度 <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-success" />
                                <span>不急（1-2天）</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="medium">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-warning" />
                                <span>一般急（几小时）</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="high">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-destructive" />
                                <span>紧急（立即）</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Info Box */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold text-primary mb-2">💡 温馨提示</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 预算将托管在 Sepolia 测试网，任务完成后释放</li>
                    <li>• 详细的描述和错误信息能帮助工程师更快定位问题</li>
                    <li>• 提供项目访问权限可以大大提升解决效率</li>
                    <li>• 请确保钱包有足够的 Sepolia ETH 用于 Gas 费</li>
                  </ul>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    variant="gradient" 
                    size="lg" 
                    className="flex-1"
                    disabled={!address || isSubmitting}
                  >
                    {isSubmitting ? "发布中..." : "发布任务并托管预算"}
                  </Button>
                  <Button type="button" variant="outline" size="lg" disabled={isSubmitting}>
                    保存草稿
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PostTask;
