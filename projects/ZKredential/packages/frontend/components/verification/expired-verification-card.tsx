import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { VerificationStatusResult } from '@/lib/types/verification-status';
import { useRouter } from 'next/navigation';

interface ExpiredVerificationCardProps {
  verificationStatus: VerificationStatusResult;
  onRenew: () => void;
}

export function ExpiredVerificationCard({ verificationStatus, onRenew }: ExpiredVerificationCardProps) {
  const router = useRouter();
  const { expiredDays, identityInfo } = verificationStatus;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-600" />
        </div>
        <CardTitle className="text-orange-800">身份验证已过期</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-orange-200 bg-orange-100">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700">
            您的身份验证已过期 {expiredDays} 天，需要重新验证才能继续使用RWA平台服务。
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
                <div className="text-gray-500">过期时间</div>
                <div>{new Date(identityInfo.expiresAt * 1000).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">重新验证说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 重新验证将更新您的身份证明</li>
            <li>• 新的验证将延长有效期</li>
            <li>• 验证完成后可继续使用所有RWA平台</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button onClick={onRenew} className="flex-1">
            <RefreshCw className="mr-2 h-4 w-4" />
            重新验证
          </Button>
          <Button onClick={() => router.push('/dashboard')} variant="outline" className="flex-1">
            返回仪表板
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
