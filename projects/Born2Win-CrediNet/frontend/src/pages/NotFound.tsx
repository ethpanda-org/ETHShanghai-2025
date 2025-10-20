import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {/* 404动画 */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-9xl font-bold text-gradient mb-6"
        >
          404
        </motion.div>

        {/* 提示信息 */}
        <h1 className="text-3xl font-bold text-white mb-4">
          页面未找到
        </h1>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          抱歉，您访问的页面不存在。可能已被移除或URL输入错误。
        </p>

        {/* 操作按钮 */}
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="btn-primary flex items-center gap-2"
          >
            <Home size={18} />
            <span>返回首页</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            <span>返回上一页</span>
          </button>
        </div>

        {/* 装饰元素 */}
        <div className="mt-12 text-gray-600">
          <p className="text-sm">或者尝试访问:</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-sm">
            <Link to="/dashboard" className="text-cyan-400 hover:text-cyan-300">
              Dashboard
            </Link>
            <span>•</span>
            <Link to="/data" className="text-cyan-400 hover:text-cyan-300">
              Data
            </Link>
            <span>•</span>
            <Link to="/marketplace" className="text-cyan-400 hover:text-cyan-300">
              Marketplace
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default NotFound

