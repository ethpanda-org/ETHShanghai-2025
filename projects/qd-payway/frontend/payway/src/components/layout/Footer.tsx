import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Brand */}
          <div className="text-sm text-gray-600">
            © 2025 PayWay. 让区块链支付更简单.
          </div>

          {/* Links */}
          <div className="flex space-x-6">
            <Link
              href="https://github.com/your-repo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
            >
              GitHub
            </Link>
            <Link
              href="/docs"
              className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
            >
              文档
            </Link>
            <Link
              href="/about"
              className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
            >
              关于我们
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

