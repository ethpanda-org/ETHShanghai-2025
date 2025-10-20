import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface ExpiringSoonBannerProps {
  daysUntilExpiry: number;
  onRenewEarly: () => void;
}

export function ExpiringSoonBanner({ daysUntilExpiry, onRenewEarly }: ExpiringSoonBannerProps) {
  const isUrgent = daysUntilExpiry <= 3;
  
  return (
    <Alert className={`mb-6 ${isUrgent ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
      <Clock className={`h-4 w-4 ${isUrgent ? 'text-red-600' : 'text-orange-600'}`} />
      <AlertDescription className={`flex items-center justify-between ${isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
        <div>
          <div className="font-medium">
            {isUrgent ? '⚠️ 身份验证即将过期' : '🔔 身份验证即将过期'}
          </div>
          <div className="text-sm mt-1">
            您的身份验证将在 {daysUntilExpiry} 天后过期，建议提前续期以避免服务中断。
          </div>
        </div>
        <Button 
          onClick={onRenewEarly}
          variant={isUrgent ? "destructive" : "default"}
          size="sm"
          className="ml-4 shrink-0"
        >
          提前续期
        </Button>
      </AlertDescription>
    </Alert>
  );
}
