'use client';
import { clsx } from 'clsx';
export default function Textarea({ className='', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx('w-full bg-transparent border border-white/20 rounded-xl px-3 py-2 outline-none focus:border-white/40 min-h-[90px]', className)} {...props} />;
}
