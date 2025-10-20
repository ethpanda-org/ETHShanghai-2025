"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Steps } from "@/components/ui/steps";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { FileUp, Loader2, MessageCircle, Paperclip, Send, Bot, User, RotateCcw } from "lucide-react";
import { v4 as uuid } from "uuid";
import { JurisdictionSelector } from "@/components/compliance/jurisdiction-selector";

// ChatBot API 配置
const CHATBOT_API_BASE = "http://localhost:8000";

// 聊天消息类型
interface ChatBotMessage {
  role: "user" | "assistant";
  content: string;
  section?: number;
  timestamp?: string;
}

interface ChatBotResponse {
  session_id: string;
  message: string;
  current_section: number;
  section_title: string;
  section_complete: boolean;
  conversation_history: ChatBotMessage[];
  document_state: any;
  last_completed_section?: number;
}

const COMPLIANCE_STEPS = [
  { title: "Executive Summary", description: "Token symbol, contract address, basic info" },
  { title: "Issuer & Governance", description: "Corporate structure, core team responsibilities" },
  { title: "Token Overview & Classification", description: "Token utility, legal classification" },
  { title: "Legal & Regulatory", description: "Offering routes, KYC/AML compliance" },
  { title: "Tokenomics", description: "Supply, allocation, unlock, treasury" },
  { title: "Fundraising & Use of Proceeds", description: "Past rounds, current funding usage" },
  { title: "Technology & Security", description: "Blockchain & contract info, security audits" },
  { title: "Listing & Trading", description: "Exchange platforms, trading pairs setup" },
  { title: "Market Integrity & Disclosure", description: "Insider policy, disclosure requirements" },
  { title: "Key Risks", description: "Legal, technical, market risk assessment" },
  { title: "Incident Response & Delisting", description: "Emergency procedures, delisting triggers" },
  { title: "Declarations & Signatures", description: "Authenticity statements, risk disclosures" },
];

type ConversationMessage = ChatBotMessage & { id: string };

export function DocumentWorkbench() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: uuid(),
      role: "assistant",
      content:
        "Welcome to the RWA Token Listing Memo Assistant! I will help you complete 12 sections of compliance documentation. Please tell me your token basic information, or say 'start generation' to let me guide you through the entire process.",
    },
  ]);
  const [draft, setDraft] = useState("Waiting to start generating RWA Token Listing Memo...");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionTitle, setSectionTitle] = useState("Executive Summary");
  const [mounted, setMounted] = useState(false);
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string | null>(null);

  // DOC export function
  const handleExportPDF = useCallback(async () => {
    try {
      // 下载 public 目录下的 CloudComputer Real World AssetToken Listing Memo.docx 文件
      const response = await fetch('/CloudComputer%20Real%20World%20AssetToken%20Listing%20Memo.docx');

      if (!response.ok) {
        // 如果文件不存在，使用当前的 draft 内容作为fallback，保存为 .md 文件
        const blob = new Blob([draft], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'CloudComputer_RWA_Listing_Memo.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // 读取文件内容 (作为二进制数据)
      const blob = await response.blob();

      // 创建下载
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CloudComputer Real World AssetToken Listing Memo.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      // 如果出错，使用当前的 draft 内容作为fallback，保存为 .md 文件
      const blob = new Blob([draft], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CloudComputer_RWA_Listing_Memo.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [draft]);

  // 修复hydration问题
  useEffect(() => {
    setMounted(true);
  }, []);

  // localStorage持久化功能
  useEffect(() => {
    if (mounted) {
      // 尝试从localStorage恢复对话历史
      try {
        const savedData = localStorage.getItem('rwa-compliance-chat');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (parsed.messages && parsed.messages.length > 0) {
            setMessages(parsed.messages);
            setCurrentSection(parsed.currentSection || 0);
            setSectionTitle(parsed.sectionTitle || "Executive Summary");
            setDraft(parsed.draft || "Waiting to start generating RWA Token Listing Memo...");
            setSessionId(parsed.sessionId || null);
          }
        }
      } catch (error) {
        console.error('Failed to restore chat from localStorage:', error);
      }
    }
  }, [mounted]);

  // 保存到localStorage的函数
  const saveToLocalStorage = useCallback((messages: ConversationMessage[], currentSection: number, sectionTitle: string, draft: string, sessionId: string | null) => {
    try {
      const dataToSave = {
        messages,
        currentSection,
        sectionTitle,
        draft,
        sessionId,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('rwa-compliance-chat', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Failed to save chat to localStorage:', error);
    }
  }, []);

  // New Chat功能
  const handleNewChat = useCallback(() => {
    // 清空localStorage
    localStorage.removeItem('rwa-compliance-chat');

    // 重置所有状态
    setMessages([{
      id: uuid(),
      role: "assistant",
      content: "Welcome to the RWA Token Listing Memo Assistant! I will help you complete 12 sections of compliance documentation. Please tell me your token basic information, or say 'start generation' to let me guide you through the entire process.",
    }]);
    setDraft("Waiting to start generating RWA Token Listing Memo...");
    setCurrentSection(0);
    setSectionTitle("Executive Summary");
    setSessionId(null);
    setUploadedFiles([]);
  }, []);

  // 创建ChatBot会话
  const createSession = useCallback(async (retryCount = 0) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
      
      const response = await fetch(`${CHATBOT_API_BASE}/session/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: "ChainLex.ai User",
          project_name: "RWA Token Listing Memo"
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSessionId(data.session_id);
      console.log("ChatBot session created successfully:", data.session_id);
      return data.session_id;
    } catch (error) {
      console.error(`ChatBot service connection attempt ${retryCount + 1} failed:`, error);
      
      // 重试最多5次，每次延迟递增但不阻塞渲染
      if (retryCount < 5) {
        const delay = Math.min((retryCount + 1) * 1000, 5000); // 1s, 2s, 3s, 4s, 5s
        console.log(`Retrying in ${delay}ms...`);
        return new Promise(resolve => {
          setTimeout(async () => {
            const result = await createSession(retryCount + 1);
            resolve(result);
          }, delay);
        });
      }
      
      // 所有重试失败后设置离线模式
      console.log("All connection attempts failed, switching to offline mode");
      setSessionId("offline-mode");
      return "offline-mode";
    }
  }, []);

  // 手动重连功能
  const reconnectToChatBot = useCallback(async () => {
    setSessionId(null);
    setMessages([
      {
        id: uuid(),
        role: "assistant",
        content: "Attempting to reconnect to ChatBot service...",
      },
    ]);
    await createSession();
  }, [createSession]);

  // 初始化会话
  // 移除自动创建会话的useEffect，改为懒加载
  // useEffect(() => {
  //   if (mounted && !sessionId) {
  //     createSession();
  //   }
  // }, [mounted, sessionId, createSession]);

  // 自动滚动到底部功能
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, []);

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const buildDraft = useCallback(() => {
    return "# Compliance summary\n\n_Auto-generated via AI co-pilot._";
  }, []);

  const summaryBlurb = useMemo(() => {
    return `Processing section ${currentSection + 1}/12: ${sectionTitle}. Collaborate with the AI assistant to generate RWA Token Listing Memo.`;
  }, [currentSection, sectionTitle]);

  const sendMessage = useCallback(
    async (input: string) => {
      // 先显示用户消息，无论是否有session ID
      const userMessage: ConversationMessage = { id: uuid(), role: "user", content: input };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // 如果没有session ID，先创建一个
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        console.log("No session ID available, creating one...");
        currentSessionId = await createSession();
      }

      // 如果创建失败或处于离线模式
      if (!currentSessionId || currentSessionId === "offline-mode") {
        setTimeout(() => {
          const assistantMessage: ConversationMessage = {
            id: uuid(),
            role: "assistant",
            content: "ChatBot service is not available. This is a simulated response. Please click 'Try to reconnect' above or ensure the ChatBot service is running at http://localhost:8000.",
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
        }, 1000);
        return;
      }

      try {
        const response = await fetch(`${CHATBOT_API_BASE}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: input,
            session_id: currentSessionId
          }),
        });

        if (!response.ok) {
          throw new Error("ChatBot request failed");
        }

        const data: ChatBotResponse = await response.json();

        // 调试日志
        console.log("ChatBot Response:", {
          current_section: data.current_section,
          section_title: data.section_title,
          section_complete: data.section_complete,
          last_completed_section: data.last_completed_section
        });

        const assistantMessage: ConversationMessage = {
          id: uuid(),
          role: "assistant",
          content: data.message,
          section: data.current_section,
          timestamp: new Date().toISOString()
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // 正确处理章节进度指示器
        // 如果有刚完成的章节，暂时显示该章节为激活状态
        if (data.last_completed_section !== undefined && data.last_completed_section !== null) {
          // 显示刚完成的章节，给用户一个视觉反馈
          setCurrentSection(data.last_completed_section);
          // 然后延迟切换到新章节
          setTimeout(() => {
            setCurrentSection(data.current_section);
          }, 1500); // 1.5秒后切换到新章节
        } else {
          setCurrentSection(data.current_section);
        }

        setSectionTitle(data.section_title);

        // 更新草稿内容
        const newDraft = `# ${data.section_title}\n\n${data.message}\n\n---\n\n**Current Section**: ${data.current_section + 1}/12\n**Status**: ${data.section_complete ? 'Completed' : 'In Progress'}`;
        setDraft(newDraft);

        // 保存到localStorage
        saveToLocalStorage(
          [...messages, userMessage, assistantMessage],
          data.current_section,
          data.section_title,
          newDraft,
          currentSessionId
        );
        
      } catch (error) {
        console.error("ChatBot error:", error);
        const errorMessage: ConversationMessage = {
          id: uuid(),
          role: "assistant",
          content: "Sorry, unable to connect to ChatBot service. Please ensure the service is running at http://localhost:8000",
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId],
  );

  const onUpload = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      const next = Array.from(files);
      setUploadedFiles(next);
      setMessages((prev) => [
        ...prev,
        {
          id: uuid(),
          role: "assistant",
          content: `${next.length} file(s) received. I will extract covenants and risk factors for review.`,
        },
      ]);
    },
    [],
  );

  
  // Enter键触发发送功能
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // 阻止默认换行
        const textarea = event.currentTarget;
        const message = textarea.value.trim();
        if (message && !isLoading) {
          void sendMessage(message);
          textarea.value = ''; // 清空输入框
        }
      }
    },
    [sendMessage, isLoading],
  );

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const note = formData.get("message");
      if (typeof note === "string" && note.trim().length > 0) {
        void sendMessage(note);
        form.reset();
      }
    },
    [sendMessage],
  );

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-10">
        <aside className="order-2 flex flex-col gap-6 xl:order-1 xl:col-span-2">
          <div className="rounded-2xl border-2 border-dashed border-border bg-muted/40 p-6 text-center shadow-sm">
            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground/70">
                <FileUp className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Drag and drop files here</p>
                <p className="text-sm">Supported: PDFs, DOCX, XLSX. Max 25MB.</p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-2 w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse files
              </Button>
              <Input
                ref={fileInputRef}
                id="compliance-documents"
                type="file"
                multiple
                className="hidden"
                onChange={(event) => onUpload(event.target.files)}
              />
            </div>
          </div>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Uploaded evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadedFiles.length ? (
                uploadedFiles.map((file) => (
                  <div key={file.name} className="rounded-xl border border-border/60 bg-background px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                        <Paperclip className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground break-words">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB - {file.type || "Unlabelled"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                  No files uploaded yet. Drop issuer disclosures or underwriting memos to kick off extraction.
                </div>
              )}
            </CardContent>
          </Card>
          <JurisdictionSelector
            selectedJurisdiction={selectedJurisdiction}
            onJurisdictionChange={setSelectedJurisdiction}
          />
        </aside>
        <section className="order-1 flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-xl xl:order-2 xl:col-span-5 h-[800px]">
          <div className="border-b border-border/60 bg-card/60 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">RWA AI Compliance Assistant</h2>
                <p className="text-sm text-muted-foreground">Interactive document generation workspace</p>
              </div>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                Section {currentSection + 1}/12
              </Badge>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={handleNewChat}>
                <RotateCcw className="mr-2 h-4 w-4" />
                New Chat
              </Button>
              {sessionId === "offline-mode" && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  ChatBot service offline
                  <button
                    onClick={reconnectToChatBot}
                    className="ml-2 text-xs text-primary hover:text-primary/80 underline"
                  >
                    Try to reconnect
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-1 flex-col min-h-0">
            <ScrollArea ref={scrollAreaRef} className="flex-1 h-[500px]">
              <div className="space-y-4 px-6 py-4">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center ${
                          isUser
                            ? "bg-gradient-to-br from-green-400 to-blue-500"
                            : "bg-gradient-to-br from-blue-400 to-purple-500"
                        }`}
                      >
                        {isUser ? (
                          <User className="h-5 w-5 text-white" />
                        ) : (
                          <Bot className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div className={`flex max-w-[75%] flex-col gap-1 ${isUser ? "items-end text-right" : ""}`}>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {isUser ? "You" : "AI Assistant"}
                        </p>
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                            isUser
                              ? "rounded-br-none bg-primary text-primary-foreground"
                              : "rounded-tl-none bg-muted/70 text-foreground"
                          }`}
                        >
                          {isUser ? (
                            <span className="whitespace-pre-wrap">{message.content}</span>
                          ) : (
                            <MarkdownRenderer content={message.content} className="text-sm" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isLoading && (
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex max-w-[75%] flex-col gap-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Assistant</p>
                      <div className="rounded-tl-none rounded-2xl bg-muted/70 px-4 py-3 text-sm text-foreground shadow-sm">
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Generating response...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="border-t border-border/60 bg-muted/30 px-6 py-4">
              <form onSubmit={onSubmit} className="flex flex-col gap-3 md:flex-row md:items-end">
                <Textarea
                  name="message"
                  placeholder="Enter your requirements, e.g.: 'I want to create a token called CCT', or say 'you decide' to let the assistant auto-fill..."
                  disabled={isLoading}
                  className="min-h-[72px] flex-1 rounded-xl border-border bg-background"
                  onKeyDown={handleKeyDown}
                />
                <Button type="submit" disabled={isLoading} className="h-auto min-w-[140px] self-stretch rounded-xl">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </section>
        <aside className="order-3 flex flex-col xl:col-span-3 h-[800px]">
          <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/80 shadow-lg">
            <div className="border-b border-border/60 px-6 py-3">
              <Button variant="secondary" size="sm" className="rounded-full px-4 py-2 text-xs font-semibold uppercase">
                Compliance Manual
              </Button>
            </div>
            <ScrollArea className="flex-1 h-[400px] px-6 py-3">
              <MarkdownRenderer content={draft} className="prose prose-sm max-w-none text-foreground dark:prose-invert" />
            </ScrollArea>
            <div className="border-t border-border/60 px-6 py-4">
              <div className="space-y-4">
                <Steps
                  current={currentSection}
                  direction="vertical"
                  progressDot
                  items={COMPLIANCE_STEPS}
                  className="max-h-96 overflow-y-auto"
                />
                <Button 
                  variant="secondary" 
                  className="w-full rounded-lg"
                  onClick={handleExportPDF}
                >
                  Export DOC
                </Button>
              </div>
            </div>
            <div className="border-t border-border/60 px-6 py-4">
              <Button className="w-full rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                Next: Generate Contract
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
