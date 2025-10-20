"use client"

import * as React from "react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return twMerge(clsx(inputs))
}

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-gray-200",
        className
      )}
      {...props}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-200 ease-in-out"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  )
)
Progress.displayName = "Progress"

export { Progress }