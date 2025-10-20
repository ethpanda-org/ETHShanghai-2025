import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = '加载中...', className }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

interface LoadingCardProps {
  title?: string;
  message?: string;
}

export function LoadingCard({ title = '加载中', message = '请稍候...' }: LoadingCardProps) {
  return (
    <Card className="text-center py-8">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <LoadingState message={message} />
      </CardContent>
    </Card>
  );
}
