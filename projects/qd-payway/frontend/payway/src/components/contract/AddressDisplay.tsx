'use client'

import { Button } from '@/components/ui/button'
import { Copy, ExternalLink } from 'lucide-react'
import { getAddressUrl } from '@/lib/contracts'
import { toast } from 'sonner'

interface AddressDisplayProps {
  address: string
  showFull?: boolean
}

export function AddressDisplay({ address, showFull = false }: AddressDisplayProps) {
  const displayAddress = showFull
    ? address
    : `${address.slice(0, 6)}...${address.slice(-4)}`

  const copyAddress = () => {
    navigator.clipboard.writeText(address)
    toast.success('地址已复制')
  }

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 rounded bg-gray-100 px-3 py-2 font-mono text-sm">
        {displayAddress}
      </code>
      <Button
        variant="ghost"
        size="sm"
        onClick={copyAddress}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        asChild
      >
        <a
          href={getAddressUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </Button>
    </div>
  )
}

