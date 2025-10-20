import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import { motion } from 'framer-motion'
import 'highlight.js/styles/github-dark.css'

interface DocViewerProps {
  docPath: string
  title: string
}

const DocViewer = ({ docPath, title }: DocViewerProps) => {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch(docPath)
        if (!response.ok) {
          throw new Error('Failed to load document')
        }
        const text = await response.text()
        setContent(text)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchDoc()
  }, [docPath])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">加载文档中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="text-red-400 text-5xl mb-4">⚠️</div>
        <h3 className="text-xl font-bold text-white mb-2">加载失败</h3>
        <p className="text-gray-400">{error}</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card"
    >
      <div className="border-b border-dark-border pb-4 mb-6">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
      </div>
      
      <div className="prose prose-invert prose-cyan max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
          components={{
            // 自定义渲染组件
            h1: ({ children }) => (
              <h1 className="text-4xl font-bold text-gradient mb-6 mt-8 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-3xl font-bold text-white mb-4 mt-8 pb-2 border-b border-dark-border">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-2xl font-bold text-white mb-3 mt-6">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-xl font-bold text-cyan-400 mb-2 mt-4">
                {children}
              </h4>
            ),
            p: ({ children }) => (
              <p className="text-gray-300 leading-relaxed mb-4">
                {children}
              </p>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-cyan-400 hover:text-cyan-300 underline transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-4 space-y-2 text-gray-300">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-300">
                {children}
              </ol>
            ),
            li: ({ children }) => {
              // @ts-ignore - li is properly wrapped by ul/ol in markdown context
              return <li className="ml-4">{children}</li>
            },
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-cyan-400 pl-4 py-2 my-4 bg-dark-card/30 rounded-r">
                {children}
              </blockquote>
            ),
            code: ({ inline, children, ...props }: any) => {
              return inline ? (
                <code className="bg-dark-card px-2 py-1 rounded text-cyan-400 text-sm font-mono" {...props}>
                  {children}
                </code>
              ) : (
                <code className="block bg-dark-card p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props}>
                  {children}
                </code>
              )
            },
            pre: ({ children }) => (
              <pre className="bg-dark-card rounded-lg overflow-hidden mb-4">
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full border border-dark-border rounded-lg">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-dark-card/50">
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="px-4 py-3 text-left text-white font-semibold border-b border-dark-border">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-gray-300 border-b border-dark-border">
                {children}
              </td>
            ),
            hr: () => (
              <hr className="border-dark-border my-8" />
            ),
            img: ({ src, alt }) => (
              <img
                src={src}
                alt={alt}
                className="rounded-lg max-w-full h-auto my-4"
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </motion.div>
  )
}

export default DocViewer

