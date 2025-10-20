'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ContractStatus from '@/components/admin/contract-status'
import ContractConfigGuide from '@/components/admin/contract-config-guide'
import { Shield, Settings, FileText } from 'lucide-react'

export default function AdminPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">管理面板</h1>
        <p className="text-muted-foreground">
          管理 ZK-KYC 和 RWA 平台的合约配置
        </p>
        </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            合约状态
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            配置指南
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <ContractStatus />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                系统概览
              </CardTitle>
              <CardDescription>
                ZK-KYC 和 RWA 平台的整体状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <h4 className="font-medium">ZK-KYC 系统</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✅ 身份验证流程</li>
                    <li>✅ ZK 证明生成</li>
                    <li>✅ 链上注册</li>
                    <li>✅ 合规性检查</li>
                  </ul>
        </div>

                <div className="space-y-2">
                  <h4 className="font-medium">RWA 平台</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>🔧 资产工厂合约</li>
                    <li>🔧 代币化资产</li>
                    <li>🔧 投资流程</li>
                    <li>🔧 合规性集成</li>
                  </ul>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">前端功能</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✅ 用户界面</li>
                    <li>✅ 钱包连接</li>
                    <li>✅ 状态管理</li>
                    <li>✅ 错误处理</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <ContractConfigGuide />
        </TabsContent>
      </Tabs>
    </div>
  )
}