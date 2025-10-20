import { AlertCircle, RefreshCw, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';

interface ErrorStateProps {
  title?: string;
  message: string;
  suggestion?: string;
  onRetry?: () => void;
  variant?: 'default' | 'destructive' | 'warning';
}

export function ErrorState({
  title = '出错了',
  message,
  suggestion,
  onRetry,
  variant = 'destructive',
}: ErrorStateProps) {
  const iconColor = variant === 'destructive' ? 'text-red-600' : 'text-orange-600';
  const borderColor = variant === 'destructive' ? 'border-red-200' : 'border-orange-200';
  const bgColor = variant === 'destructive' ? 'bg-red-50' : 'bg-orange-50';
  const textColor = variant === 'destructive' ? 'text-red-800' : 'text-orange-800';

  return (
    <Card className={`${borderColor} ${bgColor} text-center py-8`}>
      <CardHeader>
        <AlertCircle className={`mx-auto h-10 w-10 mb-3 ${iconColor}`} />
        <CardTitle className={`text-xl ${textColor}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className={`${borderColor} ${bgColor}`}>
          <AlertCircle className={`h-4 w-4 ${iconColor}`} />
          <AlertDescription className={textColor}>
            {message}
            {suggestion && <p className="mt-1 text-sm">{suggestion}</p>}
          </AlertDescription>
        </Alert>
        {onRetry && (
          <Button onClick={onRetry} className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface WalletErrorProps {
  onRetry: () => void;
}

export function WalletError({ onRetry }: WalletErrorProps) {
  return (
    <Card className="text-center py-8">
      <CardContent>
        <h2 className="text-2xl font-bold mb-4">连接钱包开始验证</h2>
        <p className="text-muted-foreground mb-6">
          请连接您的Web3钱包以开始身份验证流程
        </p>
        <Button 
          onClick={onRetry}
          size="lg"
        >
          <Wallet className="mr-2 h-4 w-4" />
          连接钱包
        </Button>
      </CardContent>
    </Card>
  );
}
