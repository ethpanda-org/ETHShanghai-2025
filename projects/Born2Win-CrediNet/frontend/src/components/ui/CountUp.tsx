import { useEffect, useState } from 'react'

interface CountUpProps {
  end: number
  duration?: number
  decimals?: number
  className?: string
}

const CountUp: React.FC<CountUpProps> = ({
  end,
  duration = 1500,
  decimals = 0,
  className = ''
}) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = (currentTime - startTime) / duration

      if (progress < 1) {
        setCount(end * progress)
        animationFrame = requestAnimationFrame(animate)
      } else {
        setCount(end)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration])

  return <span className={className}>{count.toFixed(decimals)}</span>
}

export default CountUp

