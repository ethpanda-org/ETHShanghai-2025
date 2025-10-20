import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'glass' | 'gradient-border' | 'solid'
  hover?: boolean
  delay?: number
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'glass',
  hover = true,
  delay = 0
}) => {
  const baseClasses = 'rounded-2xl p-6 transition-all duration-300'
  
  const variantClasses = {
    glass: 'glass-card',
    'gradient-border': 'gradient-border-card',
    solid: 'bg-dark-card border border-dark-border'
  }

  const hoverClasses = hover
    ? 'hover:scale-[1.02] hover:shadow-xl'
    : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}
    >
      {children}
    </motion.div>
  )
}

export default Card

