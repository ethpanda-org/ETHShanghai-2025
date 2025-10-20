// WalletBar.tsx
import { useState } from 'react'
import { Button, Modal, List, Alert } from 'antd'
import { useConnect, useDisconnect, useAccount, useSwitchChain } from 'wagmi'
import type { Connector } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { useChatStore } from '@/stores/chatStore'
import { hiddenMiddle } from '@/utils/addressUtils'

export default function WalletBar() {
    const { connectors, connectAsync, status, error, isPending } = useConnect()
    const { switchChainAsync } = useSwitchChain()
    const { disconnect } = useDisconnect()
    const { address, isConnected } = useAccount()
    const [open, setOpen] = useState(false)
    const [selecting, setSelecting] = useState<string | null>(null)
    const { clear } = useChatStore()

    const handlePick = async (connector: Connector) => {
        const key = (connector as any).uid ?? connector.id
        try {
            setSelecting(key)
            // 1) 连接用户选择的钱包
            const res = await connectAsync({ connector })
            // 2) 如果当前链不是 sepolia，尝试切链
            if (res.chainId !== sepolia.id) {
                try {
                    await switchChainAsync({ chainId: sepolia.id })
                } catch {
                    // 某些钱包不支持自动切链，允许用户手动切
                }
            }
            setOpen(false)
        } catch (e) {
            // 失败时保持弹窗打开，便于重试
            console.error('connect error:', e)
        } finally {
            setSelecting(null)
        }
    }

    const onDisconnect = () => {
        disconnect()
        clear()
    }

    return (
        <div className="relative flex justify-between items-center p-4 bg-white shadow">
            <h1 className="text-xl font-bold">ChainChat</h1>

            {isConnected ? (
                <div className="flex gap-2 items-center">
                    <span className="text-sm">{hiddenMiddle(address as string)}</span>
                    <Button size="small" onClick={onDisconnect}>
                        Disconnect
                    </Button>
                </div>
            ) : (
                <>
                    <Button
                        type="primary"
                        onClick={() => setOpen(true)}
                        loading={(status as string) === 'connecting'}
                    >
                        连接钱包
                    </Button>

                    <Modal
                        title="选择一个钱包"
                        open={open}
                        onCancel={() => setOpen(false)}
                        footer={null}
                        centered
                    >
                        {connectors.length === 0 && (
                            <Alert type="info" message="未发现可用钱包" showIcon />
                        )}

                        <List
                            dataSource={connectors}
                            renderItem={(c) => {
                                const key = (c as any).uid ?? c.id
                                const disabled = !c.ready || isPending
                                const connectingThis = selecting === key && (status as string) === 'connecting'
                                return (
                                    <List.Item>
                                        <Button
                                            block
                                            onClick={() => handlePick(c as Connector)}
                                        >
                                            {c.name === 'Injected' ? '默认（浏览器注入）' : c.name}
                                            {connectingThis ? ' · 连接中' : ''}
                                        </Button>
                                    </List.Item>
                                )
                            }}
                        />

                        {error && (
                            <Alert
                                className="mt-3"
                                type="error"
                                message={error.shortMessage ?? error.message}
                                showIcon
                            />
                        )}
                    </Modal>
                </>
            )}
        </div>
    )
}
