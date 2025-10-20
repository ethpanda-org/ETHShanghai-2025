'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-red-200 bg-red-50 text-red-800 max-w-md mx-auto mt-10">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-600 mb-3" />
            <CardTitle className="text-xl">出错了！</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm">
              应用程序发生了一个意料之外的错误。
            </p>
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新页面
            </Button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs text-red-700 mt-4 text-left bg-red-100 p-3 rounded-md">
                <summary className="cursor-pointer">错误详情</summary>
                <pre className="whitespace-pre-wrap break-all mt-2">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
