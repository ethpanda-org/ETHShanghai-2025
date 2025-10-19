import { motion } from 'framer-motion'
import { cx } from '../../utils/helpers'

function PreviewBox({ title, value, warn = false, subtle = false, tokenType = null }) {
  // Extract token type from title if not provided
  const extractedTokenType = tokenType || (title.includes(' P') ? 'P' : title.includes(' C') ? 'C' : title.includes(' S') ? 'S' : null)

  const getTokenStyles = (type) => {
    switch (type) {
      case 'P':
        return {
          bg: "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50",
          border: "border-emerald-200",
          shadow: "hover:shadow-emerald-100",
          textColor: "text-emerald-800",
          titleColor: "text-emerald-600",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          ),
          accent: "bg-emerald-500"
        }
      case 'C':
        return {
          bg: "bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50",
          border: "border-blue-200",
          shadow: "hover:shadow-blue-100",
          textColor: "text-blue-800",
          titleColor: "text-blue-600",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
          accent: "bg-blue-500"
        }
      case 'S':
        return {
          bg: "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50",
          border: "border-amber-200",
          shadow: "hover:shadow-amber-100",
          textColor: "text-amber-800",
          titleColor: "text-amber-600",
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
          accent: "bg-amber-500"
        }
      default:
        return null
    }
  }

  const tokenStyles = getTokenStyles(extractedTokenType)

  if (warn && tokenStyles) {
    return (
      <motion.div
        className="rounded-2xl border border-red-300 bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 hover:shadow-red-100 p-4 transition-all duration-300 hover:shadow-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-red-600 uppercase tracking-wide">
            {title}
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cx("p-1 rounded-lg bg-red-100 text-red-600")}>
            {tokenStyles.icon}
          </div>
          <motion.div
            className="text-sm font-semibold text-red-800"
            key={value}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {value}
          </motion.div>
        </div>
      </motion.div>
    )
  }

  if (warn) {
    return (
      <motion.div
        className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-amber-100 p-4 transition-all duration-300 hover:shadow-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
      >
        <div className="text-xs font-medium text-amber-600 uppercase tracking-wide">{title}</div>
        <motion.div
          className="mt-2 text-sm font-semibold text-amber-800"
          key={value}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {value}
        </motion.div>
      </motion.div>
    )
  }

  if (subtle) {
    return (
      <motion.div
        className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 hover:shadow-slate-100 p-4 transition-all duration-300 hover:shadow-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
      >
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</div>
        <motion.div
          className="mt-2 text-sm font-semibold text-slate-800"
          key={value}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {value}
        </motion.div>
      </motion.div>
    )
  }

  if (tokenStyles) {
    return (
      <motion.div
        className={cx(
          "rounded-2xl border p-4 transition-all duration-300 hover:shadow-md",
          tokenStyles.bg,
          tokenStyles.border,
          tokenStyles.shadow
        )}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className={cx("text-xs font-medium uppercase tracking-wide", tokenStyles.titleColor)}>
            {title}
          </div>
          <div className={cx("w-2 h-2 rounded-full", tokenStyles.accent)}></div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cx("p-1 rounded-lg", tokenStyles.bg, tokenStyles.titleColor)}>
            {tokenStyles.icon}
          </div>
          <motion.div
            className={cx("text-sm font-semibold", tokenStyles.textColor)}
            key={value}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {value}
          </motion.div>
        </div>
      </motion.div>
    )
  }

  // Default styling
  return (
    <motion.div
      className="rounded-2xl border bg-gradient-to-br from-white to-slate-50 border-slate-200 hover:shadow-slate-100 p-4 transition-all duration-300 hover:shadow-md"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
    >
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</div>
      <motion.div
        className="mt-2 text-sm font-semibold text-slate-800"
        key={value}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {value}
      </motion.div>
    </motion.div>
  )
}

export default PreviewBox