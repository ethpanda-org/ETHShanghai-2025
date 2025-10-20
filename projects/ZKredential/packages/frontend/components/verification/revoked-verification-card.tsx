import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { XCircle } from 'lucide-react';
import { VerificationStatusResult } from '@/lib/types/verification-status';

interface RevokedVerificationCardProps {
  verificationStatus: VerificationStatusResult;
  onReapply: () => void;
}

export function RevokedVerificationCard({ verificationStatus, onReapply }: RevokedVerificationCardProps) {
  const { identityInfo } = verificationStatus;

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <CardTitle className="text-red-800">身份验证已撤销</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-red-200 bg-red-100">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            您的身份验证已被撤销，无法继续使用RWA平台服务。请重新申请验证。
          </AlertDescription>
        </Alert>

        {identityInfo && (
          <div className="bg-white rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-gray-900">原验证信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">验证提供商</div>
                <div>{identityInfo.provider}</div>
              </div>
              <div>
                <div className="text-gray-500">撤销时间</div>
                <div>{new Date(identityInfo.timestamp * 1000).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-2">可能的撤销原因</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• 身份信息发生变更</li>
            <li>• 不符合平台合规要求</li>
            <li>• 系统安全检查发现异常</li>
            <li>• 用户主动申请撤销</li>
          </ul>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">重新申请说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 您可以重新提交身份验证申请</li>
            <li>• 请确保提供准确的身份信息</li>
            <li>• 如有疑问，请联系技术支持</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button onClick={onReapply} className="flex-1">
            重新申请验证
          </Button>
          <Button variant="outline" className="flex-1">
            联系支持
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
