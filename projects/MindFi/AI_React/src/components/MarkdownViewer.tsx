// src/components/MarkdownViewer.tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

type Props = { source: string }

export default function MarkdownViewer({ source }: Props) {
    return (
        <div className='prose max-w-none'>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                    code({ inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '')
                        if (!inline && match) {
                            return (
                                <SyntaxHighlighter
                                    language={match[1]}
                                    style={oneDark}
                                    PreTag='div'
                                    {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                            )
                        }
                        return (
                            <code className='px-1 py-0.5 rounded bg-gray-100' {...props}>
                                {children}
                            </code>
                        )
                    },
                }}
            >
                {source}
            </ReactMarkdown>
        </div>
    )
}
