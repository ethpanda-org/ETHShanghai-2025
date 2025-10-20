'use client';
import { clsx } from 'clsx';
export default function Input({ className='', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input 
      className={clsx(
        'w-full px-4 py-3 border border-gray-300 rounded-lg',
        'bg-white text-gray-900 placeholder-gray-500',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
        'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed',
        'transition-colors duration-200',
        className
      )} 
      {...props} 
    />
  );
}
