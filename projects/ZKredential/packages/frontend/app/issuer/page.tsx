"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n-context"
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Hash,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccount } from "wagmi"

// Mock data for issued credentials
const mockCredentials = [
  {
    id: "CRED-001",
    userId: "user-123",
    userName: "John Doe",
    type: "KYC Verification",
    status: "active",
    issuedDate: "2024-01-15",
    expiryDate: "2025-01-15",
    attributes: ["age", "nationality", "kycLevel"],
    commitment: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
    onChainStatus: "confirmed",
    txHash: "0xabc123def456789012345678901234567890123456789012345678901234567890",
    blockNumber: 12345678,
  },
  {
    id: "CRED-002",
    userId: "user-456",
    userName: "Jane Smith",
    type: "Accredited Investor",
    status: "active",
    issuedDate: "2024-02-20",
    expiryDate: "2025-02-20",
    attributes: ["netWorth", "annualIncome", "investmentExperience"],
    commitment: "0x9876543210fedcba0987654321fedcba0987654321fedcba0987654321fedcba",
    onChainStatus: "confirmed",
    txHash: "0xdef456abc789012345678901234567890123456789012345678901234567890abc",
    blockNumber: 12345680,
  },
  {
    id: "CRED-003",
    userId: "user-789",
    userName: "Bob Johnson",
    type: "KYC Verification",
    status: "revoked",
    issuedDate: "2024-01-10",
    expiryDate: "2025-01-10",
    attributes: ["age", "nationality"],
    commitment: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    onChainStatus: "confirmed",
    txHash: "0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012",
    blockNumber: 12345670,
  },
  {
    id: "CRED-004",
    userId: "user-321",
    userName: "Alice Williams",
    type: "Accredited Investor",
    status: "pending",
    issuedDate: "2024-03-05",
    expiryDate: "2025-03-05",
    attributes: ["netWorth", "annualIncome"],
    commitment: null,
    onChainStatus: "not_uploaded",
    txHash: null,
    blockNumber: null,
  },
]

const stats = [
  {
    label: "Total Issued",
    value: "1,234",
    change: "+12%",
    icon: FileText,
    color: "text-blue-400",
  },
  {
    label: "Active Credentials",
    value: "987",
    change: "+8%",
    icon: CheckCircle2,
    color: "text-green-400",
  },
  {
    label: "Pending Review",
    value: "45",
    change: "-5%",
    icon: Clock,
    color: "text-yellow-400",
  },
  {
    label: "Revoked",
    value: "23",
    change: "+2%",
    icon: XCircle,
    color: "text-red-400",
  },
]

export default function IssuerDashboardPage() {
  const { t } = useI18n()
  const { address, isConnected } = useAccount()
  const [searchQuery, setSearchQuery] = useState("")
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<any>(null)
  const [isGeneratingCommitment, setIsGeneratingCommitment] = useState<string | null>(null)
  const [isUploadingToChain, setIsUploadingToChain] = useState<string | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const filteredCredentials = mockCredentials.filter(
    (cred) =>
      cred.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.type.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400"
      case "revoked":
        return "bg-red-500/20 text-red-400"
      default:
        return "bg-gray-500/20 text-gray-400"
    }
  }

  const getOnChainStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/20 text-green-400"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400"
      case "not_uploaded":
        return "bg-gray-500/20 text-gray-400"
      default:
        return "bg-gray-500/20 text-gray-400"
    }
  }

  const handleGenerateCommitment = async (credId: string) => {
    setIsGeneratingCommitment(credId)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const credIndex = mockCredentials.findIndex((c) => c.id === credId)
    if (credIndex !== -1) {
      mockCredentials[credIndex].commitment =
        `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`
    }
    setIsGeneratingCommitment(null)
  }

  const handleUploadToChain = async (credId: string) => {
    if (!isConnected) {
      alert(t("Please connect your wallet first", "请先连接钱包"))
      return
    }

    setIsUploadingToChain(credId)
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const credIndex = mockCredentials.findIndex((c) => c.id === credId)
    if (credIndex !== -1) {
      mockCredentials[credIndex].onChainStatus = "confirmed"
      mockCredentials[credIndex].txHash =
        `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`
      mockCredentials[credIndex].blockNumber = Math.floor(Math.random() * 1000000) + 12000000
    }
    setIsUploadingToChain(null)
  }

  const handleViewDetails = (cred: any) => {
    setSelectedCredential(cred)
    setIsDetailDialogOpen(true)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-7xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {t("Issuer Dashboard", "签发机构仪表板")}
            </h1>
            <p className="text-muted-foreground">
              {t("Manage credential issuance and verification", "管理凭证签发和验证")}
            </p>
          </div>
          <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-500 hover:bg-blue-600">
                <Plus className="mr-2 w-4 h-4" />
                {t("Issue Credential", "签发凭证")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t("Issue New Credential", "签发新凭证")}</DialogTitle>
                <DialogDescription>
                  {t("Create and issue a new credential to a user", "为用户创建并签发新凭证")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="userId">{t("User ID", "用户ID")}</Label>
                  <Input id="userId" placeholder="user-123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="credType">{t("Credential Type", "凭证类型")}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t("Select type", "选择类型")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kyc">KYC Verification</SelectItem>
                      <SelectItem value="accredited">Accredited Investor</SelectItem>
                      <SelectItem value="aml">AML Compliance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attributes">{t("Attributes", "属性")}</Label>
                  <Input id="attributes" placeholder="age, nationality, kycLevel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry">{t("Expiry Date", "过期日期")}</Label>
                  <Input id="expiry" type="date" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsIssueDialogOpen(false)}>
                  {t("Cancel", "取消")}
                </Button>
                <Button
                  className="bg-blue-500 hover:bg-blue-600"
                  onClick={() => {
                    setIsIssueDialogOpen(false)
                    // Handle credential issuance
                  }}
                >
                  {t("Issue Credential", "签发凭证")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-6 bg-card/50 backdrop-blur border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg bg-${stat.color.split("-")[1]}-500/20 flex items-center justify-center`}
                >
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <Badge
                  variant="secondary"
                  className={
                    stat.change.startsWith("+") ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }
                >
                  {stat.change}
                </Badge>
              </div>
              <div>
                <p className="text-2xl font-bold mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="all">{t("All", "全部")}</TabsTrigger>
                <TabsTrigger value="active">{t("Active", "活跃")}</TabsTrigger>
                <TabsTrigger value="pending">{t("Pending", "待处理")}</TabsTrigger>
                <TabsTrigger value="revoked">{t("Revoked", "已撤销")}</TabsTrigger>
              </TabsList>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t("Search credentials...", "搜索凭证...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <TabsContent value="all" className="space-y-4">
              {filteredCredentials.map((cred) => (
                <Card
                  key={cred.id}
                  className="p-4 bg-muted/50 border-border/50 hover:border-blue-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-semibold">{cred.id}</h3>
                          <Badge variant="secondary" className={getStatusColor(cred.status)}>
                            {cred.status}
                          </Badge>
                          <Badge variant="secondary" className={getOnChainStatusColor(cred.onChainStatus)}>
                            {cred.onChainStatus === "confirmed" && t("On-Chain", "已上链")}
                            {cred.onChainStatus === "pending" && t("Pending", "待确认")}
                            {cred.onChainStatus === "not_uploaded" && t("Not Uploaded", "未上链")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {cred.userName} • {cred.type}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>
                            {t("Issued", "签发")}: {cred.issuedDate}
                          </span>
                          <span>
                            {t("Expires", "过期")}: {cred.expiryDate}
                          </span>
                          <span>
                            {cred.attributes.length} {t("attributes", "属性")}
                          </span>
                        </div>

                        {cred.commitment && (
                          <div className="mt-3 p-2 bg-background/50 rounded border border-border/50">
                            <div className="flex items-center gap-2 mb-1">
                              <Hash className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs font-medium">{t("Commitment", "承诺值")}</span>
                            </div>
                            <p className="text-xs font-mono text-muted-foreground break-all">{cred.commitment}</p>
                          </div>
                        )}

                        {cred.txHash && (
                          <div className="mt-2 p-2 bg-background/50 rounded border border-border/50">
                            <div className="flex items-center gap-2 mb-1">
                              <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs font-medium">{t("Transaction Hash", "交易哈希")}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-mono text-muted-foreground break-all flex-1">{cred.txHash}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => window.open(`https://etherscan.io/tx/${cred.txHash}`, "_blank")}
                              >
                                {t("View", "查看")}
                              </Button>
                            </div>
                            {cred.blockNumber && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {t("Block", "区块")}: {cred.blockNumber}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3">
                          {!cred.commitment && cred.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateCommitment(cred.id)}
                              disabled={isGeneratingCommitment === cred.id}
                              className="h-8 text-xs"
                            >
                              {isGeneratingCommitment === cred.id ? (
                                <>
                                  <Loader2 className="mr-2 w-3 h-3 animate-spin" />
                                  {t("Generating...", "生成中...")}
                                </>
                              ) : (
                                <>
                                  <Hash className="mr-2 w-3 h-3" />
                                  {t("Generate Commitment", "生成承诺值")}
                                </>
                              )}
                            </Button>
                          )}

                          {cred.commitment && cred.onChainStatus === "not_uploaded" && (
                            <Button
                              size="sm"
                              onClick={() => handleUploadToChain(cred.id)}
                              disabled={isUploadingToChain === cred.id}
                              className="h-8 text-xs bg-blue-500 hover:bg-blue-600"
                            >
                              {isUploadingToChain === cred.id ? (
                                <>
                                  <Loader2 className="mr-2 w-3 h-3 animate-spin" />
                                  {t("Uploading...", "上传中...")}
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 w-3 h-3" />
                                  {t("Upload to Chain", "上传到链上")}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(cred)}>
                          {t("View Details", "查看详情")}
                        </DropdownMenuItem>
                        <DropdownMenuItem>{t("Download", "下载")}</DropdownMenuItem>
                        {cred.status === "active" && (
                          <DropdownMenuItem className="text-red-400">{t("Revoke", "撤销")}</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="active">
              {filteredCredentials
                .filter((c) => c.status === "active")
                .map((cred) => (
                  <Card key={cred.id} className="p-4 mb-4 bg-muted/50 border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="w-6 h-6 text-blue-400" />
                        <div>
                          <h3 className="font-semibold">{cred.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {cred.userName} • {cred.type}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={getStatusColor(cred.status)}>
                        {cred.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
            </TabsContent>

            <TabsContent value="pending">
              {filteredCredentials
                .filter((c) => c.status === "pending")
                .map((cred) => (
                  <Card key={cred.id} className="p-4 mb-4 bg-muted/50 border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="w-6 h-6 text-yellow-400" />
                        <div>
                          <h3 className="font-semibold">{cred.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {cred.userName} • {cred.type}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={getStatusColor(cred.status)}>
                        {cred.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
            </TabsContent>

            <TabsContent value="revoked">
              {filteredCredentials
                .filter((c) => c.status === "revoked")
                .map((cred) => (
                  <Card key={cred.id} className="p-4 mb-4 bg-muted/50 border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="w-6 h-6 text-red-400" />
                        <div>
                          <h3 className="font-semibold">{cred.id}</h3>
                          <p className="text-sm text-muted-foreground">
                            {cred.userName} • {cred.type}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={getStatusColor(cred.status)}>
                        {cred.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Credential Detail Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t("Credential Details", "凭证详情")}</DialogTitle>
              <DialogDescription>
                {t("Complete information about this credential", "该凭证的完整信息")}
              </DialogDescription>
            </DialogHeader>
            {selectedCredential && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("Credential ID", "凭证ID")}</Label>
                    <p className="font-mono text-sm mt-1">{selectedCredential.id}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("Status", "状态")}</Label>
                    <div className="mt-1">
                      <Badge variant="secondary" className={getStatusColor(selectedCredential.status)}>
                        {selectedCredential.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("User Name", "用户名")}</Label>
                    <p className="text-sm mt-1">{selectedCredential.userName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("User ID", "用户ID")}</Label>
                    <p className="font-mono text-sm mt-1">{selectedCredential.userId}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("Type", "类型")}</Label>
                    <p className="text-sm mt-1">{selectedCredential.type}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("On-Chain Status", "上链状态")}</Label>
                    <div className="mt-1">
                      <Badge variant="secondary" className={getOnChainStatusColor(selectedCredential.onChainStatus)}>
                        {selectedCredential.onChainStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">{t("Attributes", "属性")}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCredential.attributes.map((attr: string) => (
                      <Badge key={attr} variant="outline">
                        {attr}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedCredential.commitment && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("Commitment", "承诺值")}</Label>
                    <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">
                      {selectedCredential.commitment}
                    </p>
                  </div>
                )}

                {selectedCredential.txHash && (
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("Transaction Hash", "交易哈希")}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-mono text-xs bg-muted p-2 rounded flex-1 break-all">
                        {selectedCredential.txHash}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://etherscan.io/tx/${selectedCredential.txHash}`, "_blank")}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                    {selectedCredential.blockNumber && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {t("Block Number", "区块号")}: {selectedCredential.blockNumber}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("Issued Date", "签发日期")}</Label>
                    <p className="text-sm mt-1">{selectedCredential.issuedDate}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{t("Expiry Date", "过期日期")}</Label>
                    <p className="text-sm mt-1">{selectedCredential.expiryDate}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                {t("Close", "关闭")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  )
}
