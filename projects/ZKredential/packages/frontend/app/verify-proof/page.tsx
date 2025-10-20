"use client"

import type React from "react"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n-context"
import { Upload, CheckCircle2, XCircle, Shield, FileText, Loader2, AlertCircle } from "lucide-react"

export default function VerifyProofPage() {
  const { t } = useI18n()
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (file.type === "application/json" || file.name.endsWith(".json")) {
      setProofFile(file)
      setVerificationResult(null)
    } else {
      alert(t("Please upload a valid JSON proof file", "请上传有效的 JSON 证明文件"))
    }
  }

  const handleVerify = async () => {
    if (!proofFile) return

    setIsVerifying(true)

    // Simulate verification process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Mock verification result (randomly succeed or fail for demo)
    const isValid = Math.random() > 0.2 // 80% success rate

    setVerificationResult({
      isValid,
      timestamp: new Date().toISOString(),
      proofId: `proof-${Date.now()}`,
      attributes: [
        { name: "Age Over 18", verified: true },
        { name: "Accredited Investor", verified: true },
        { name: "KYC Verified", verified: true },
      ],
      issuer: "Global Compliance Corp",
      verificationDetails: {
        zkProofValid: isValid,
        signatureValid: isValid,
        credentialNotRevoked: isValid,
        timestampValid: isValid,
      },
    })

    setIsVerifying(false)
  }

  const handleReset = () => {
    setProofFile(null)
    setVerificationResult(null)
    setIsVerifying(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {t("Verify ZK Proof", "验证零知识证明")}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("Verify the authenticity and validity of zero-knowledge proofs", "验证零知识证明的真实性和有效性")}
          </p>
        </div>

        {/* Upload Section */}
        {!verificationResult && (
          <Card className="p-8 bg-card/50 backdrop-blur border-border/50">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragActive ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-blue-500/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {!proofFile ? (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
                    <Upload className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t("Upload Proof File", "上传证明文件")}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t(
                        "Drag and drop your proof file here, or click to browse",
                        "拖放您的证明文件到此处，或点击浏览",
                      )}
                    </p>
                  </div>
                  <label htmlFor="file-upload">
                    <Button variant="outline" className="cursor-pointer bg-transparent" asChild>
                      <span>{t("Browse Files", "浏览文件")}</span>
                    </Button>
                  </label>
                  <input id="file-upload" type="file" accept=".json" className="hidden" onChange={handleFileInput} />
                  <p className="text-xs text-muted-foreground">{t("Supported format: JSON", "支持格式：JSON")}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{proofFile.name}</h3>
                    <p className="text-sm text-muted-foreground">{(proofFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                  <div className="flex gap-4 justify-center">
                    <Button onClick={handleVerify} disabled={isVerifying} className="bg-blue-500 hover:bg-blue-600">
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                          {t("Verifying...", "验证中...")}
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 w-4 h-4" />
                          {t("Verify Proof", "验证证明")}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleReset} disabled={isVerifying}>
                      {t("Cancel", "取消")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Verification Result */}
        {verificationResult && (
          <div className="space-y-6">
            <Card
              className={`p-8 ${
                verificationResult.isValid ? "bg-green-500/10 border-green-500/50" : "bg-red-500/10 border-red-500/50"
              }`}
            >
              <div className="text-center space-y-4">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
                    verificationResult.isValid ? "bg-green-500/20" : "bg-red-500/20"
                  }`}
                >
                  {verificationResult.isValid ? (
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                  ) : (
                    <XCircle className="w-10 h-10 text-red-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    {verificationResult.isValid
                      ? t("Proof Verified Successfully", "证明验证成功")
                      : t("Proof Verification Failed", "证明验证失败")}
                  </h2>
                  <p className="text-muted-foreground">
                    {verificationResult.isValid
                      ? t("The zero-knowledge proof is valid and authentic", "零知识证明有效且真实")
                      : t(
                          "The proof could not be verified. It may be invalid or tampered with.",
                          "无法验证证明。它可能无效或已被篡改。",
                        )}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    verificationResult.isValid ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }
                >
                  {verificationResult.isValid ? t("VALID", "有效") : t("INVALID", "无效")}
                </Badge>
              </div>
            </Card>

            {/* Verification Details */}
            <Card className="p-6 bg-card/50 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4">{t("Verification Details", "验证详情")}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("Proof ID", "证明ID")}:</span>
                    <p className="font-mono mt-1">{verificationResult.proofId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("Timestamp", "时间戳")}:</span>
                    <p className="font-mono mt-1">{verificationResult.timestamp}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("Issuer", "签发机构")}:</span>
                    <p className="mt-1">{verificationResult.issuer}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold mb-3">{t("Verified Attributes", "已验证属性")}</h4>
                  <div className="space-y-2">
                    {verificationResult.attributes.map((attr: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <span>{attr.name}</span>
                        {attr.verified ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="font-semibold mb-3">{t("Technical Verification", "技术验证")}</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(verificationResult.verificationDetails).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        {value ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {!verificationResult.isValid && (
              <Card className="p-4 bg-yellow-500/10 border-yellow-500/50">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-yellow-400 mb-1">{t("Security Warning", "安全警告")}</p>
                    <p className="text-muted-foreground">
                      {t(
                        "This proof failed verification. Do not accept it as valid credentials. Contact the issuer if you believe this is an error.",
                        "此证明验证失败。请勿将其作为有效凭证接受。如果您认为这是错误，请联系签发机构。",
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex justify-center">
              <Button onClick={handleReset} variant="outline">
                {t("Verify Another Proof", "验证其他证明")}
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
