'use client';
import { clsx } from 'clsx';
export default function Button({ className='', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button 
      className={clsx(
        'px-6 py-3 rounded-lg font-medium text-sm',
        'bg-blue-600 text-white hover:bg-blue-700',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors duration-200',
        'shadow-sm hover:shadow-md',
        className
      )} 
      {...props} 
    />
  );
}
