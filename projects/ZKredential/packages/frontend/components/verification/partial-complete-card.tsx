import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Shield, ArrowRight, FileText } from 'lucide-react';
import { VerificationStatusResult } from '@/lib/types/verification-status';

interface PartialCompleteCardProps {
  verificationStatus: VerificationStatusResult;
  onContinue: () => void;
}

export function PartialCompleteCard({ verificationStatus, onContinue }: PartialCompleteCardProps) {
  const { vcInfo } = verificationStatus;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className="text-blue-800">验证进行中</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-blue-200 bg-blue-100">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            您已完成KYC身份验证，但还需要生成零知识证明并注册到区块链。
          </AlertDescription>
        </Alert>

        <div className="bg-white rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-gray-900">已完成步骤</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium">钱包连接</div>
                <div className="text-sm text-gray-500">Web3钱包已成功连接</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium">KYC身份验证</div>
                <div className="text-sm text-gray-500">
                  {vcInfo?.hasVC ? `已通过 ${vcInfo.provider} 验证` : '身份验证已完成'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-2">待完成步骤</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-yellow-500 flex items-center justify-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              </div>
              <div>
                <div className="font-medium text-yellow-900">生成零知识证明</div>
                <div className="text-sm text-yellow-700">基于您的身份信息生成隐私保护证明</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
              <div>
                <div className="font-medium text-gray-600">区块链注册</div>
                <div className="text-sm text-gray-500">将身份证明注册到区块链</div>
              </div>
            </div>
          </div>
        </div>

        {vcInfo && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-gray-900">验证凭证信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {vcInfo.provider && (
                <div>
                  <div className="text-gray-500">验证提供商</div>
                  <div>{vcInfo.provider}</div>
                </div>
              )}
              {vcInfo.timestamp && (
                <div>
                  <div className="text-gray-500">验证时间</div>
                  <div>{new Date(vcInfo.timestamp * 1000).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={onContinue} className="flex-1">
            <ArrowRight className="mr-2 h-4 w-4" />
            继续完成验证
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
