import { ProvidersEVM } from '../providers-evm'

export default function DashboardEVMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProvidersEVM>{children}</ProvidersEVM>
}

