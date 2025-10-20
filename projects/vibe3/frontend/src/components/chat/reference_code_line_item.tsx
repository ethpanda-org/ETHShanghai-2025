import { FiX } from 'react-icons/fi';

interface ReferenceCodeLineItemProps {
  referenceCodeLine: string;
  onRemove: () => void;
}

export function ReferenceCodeLineItem({ referenceCodeLine, onRemove }: ReferenceCodeLineItemProps) {
  return (
    <div className='flex bg-green-800 items-center gap-1  px-2 py-1 rounded text-sm relative overflow-hidden'>
      <div className='relative z-10 flex items-center gap-1 w-full'>
        <span className={`text-xs text-green-100 flex-1 truncate`}>
          {referenceCodeLine}
        </span>
        <button
          onClick={onRemove}
          className={`text-green-100 hover:opacity-80 transition-opacity flex-shrink-0`}
          title='Remove'
        >
          <FiX size={12} />
        </button>
      </div>
    </div>
  );
}
