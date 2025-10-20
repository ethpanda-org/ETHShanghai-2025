import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, ArrowRight, Copy, ExternalLink } from 'lucide-react';
import { VerificationStatusResult } from '@/lib/types/verification-status';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ValidVerificationCardProps {
  verificationStatus: VerificationStatusResult;
}

export function ValidVerificationCard({ verificationStatus }: ValidVerificationCardProps) {
  const router = useRouter();
  const { identityInfo, daysUntilExpiry } = verificationStatus;
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle className="text-green-800">身份验证有效</CardTitle>
        <div className="flex justify-center gap-2 mt-2">
          <Badge className="bg-green-100 text-green-800">已验证</Badge>
          {daysUntilExpiry && daysUntilExpiry <= 7 && (
            <Badge variant="outline" className="border-orange-300 text-orange-700">
              {daysUntilExpiry} 天后过期
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {identityInfo && (
          <div className="bg-white rounded-lg p-4 space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              验证详情
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">验证提供商</div>
                <div>{identityInfo.provider}</div>
              </div>
              <div>
                <div className="text-gray-500">验证时间</div>
                <div>{new Date(identityInfo.timestamp * 1000).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-gray-500">有效期至</div>
                <div>{new Date(identityInfo.expiresAt * 1000).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-gray-500">状态</div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-green-600">有效</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {identityInfo && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-gray-900">技术详情</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Commitment:</span>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-2 py-1 rounded font-mono">
                    {identityInfo.commitment.substring(0, 10)}...{identityInfo.commitment.substring(-6)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(identityInfo.commitment, 'commitment')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Nullifier:</span>
                <div className="flex items-center gap-2">
                  <code className="bg-white px-2 py-1 rounded font-mono">
                    {identityInfo.nullifierHash.substring(0, 10)}...{identityInfo.nullifierHash.substring(-6)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(identityInfo.nullifierHash, 'nullifier')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            {copiedField && (
              <div className="text-xs text-green-600">
                ✓ {copiedField === 'commitment' ? 'Commitment' : 'Nullifier'} 已复制
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 您现在可以访问所有支持的RWA投资平台</li>
            <li>• 无需重复验证，一次验证全网通用</li>
            <li>• 您的隐私受到零知识证明技术保护</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => router.push('/dashboard')} className="flex-1">
            <ArrowRight className="mr-2 h-4 w-4" />
            查看仪表板
          </Button>
          <Button onClick={() => router.push('/rwa-platforms')} variant="outline" className="flex-1">
            <ExternalLink className="mr-2 h-4 w-4" />
            浏览RWA平台
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
