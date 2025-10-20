"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useCallback, useMemo } from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const preprocessContent = useCallback((text: string) => {
    // 处理换行符，确保 markdown 正常工作
    return text.replace(/\n\n+/g, '\n\n');
  }, []);

  const processedContent = useMemo(() => preprocessContent(content), [content, preprocessContent]);

  return (
    <div className={`prose prose-sm prose-neutral dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // 自定义组件以更好地控制样式
          h1: ({ children, ...props }) => (
            <h1 className="text-lg font-bold mt-2 mb-2 text-foreground" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-base font-semibold mt-3 mb-2 text-foreground" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-sm font-medium mt-2 mb-1 text-foreground" {...props}>
              {children}
            </h3>
          ),
          p: ({ children, ...props }) => (
            <p className="mb-2 leading-relaxed text-foreground/90" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="mb-2 ml-4 list-disc space-y-1 text-foreground/90" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="mb-2 ml-4 list-decimal space-y-1 text-foreground/90" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-sm" {...props}>
              {children}
            </li>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-foreground" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic text-foreground/95" {...props}>
              {children}
            </em>
          ),
          code: (props: any) => {
            const { inline, children, ...restProps } = props;
            const CodeComponent = inline ? (
              <span className="font-mono text-xs bg-muted px-1 rounded text-primary/80" {...restProps}>
                {children}
              </span>
            ) : (
              <code className="block font-mono text-xs bg-muted p-2 rounded text-foreground overflow-x-auto" {...restProps}>
                {children}
              </code>
            );
            return CodeComponent;
          },
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-4 border-primary pl-3 py-1 my-2 bg-muted/20 rounded-r" {...props}>
              {children}
            </blockquote>
          ),
          hr: ({ ...props }) => (
            <hr className="my-3 border-border/40" {...props} />
          ),
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="text-primary hover:text-primary/80 underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}