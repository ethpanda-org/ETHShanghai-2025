'use client'

export function BasicWalletConnect() {
  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        // 请求连接账户
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        })
        
        if (accounts.length > 0) {
          alert(`钱包已连接: ${accounts[0]}`)
          
          // 检查网络
          const chainId = await window.ethereum.request({
            method: 'eth_chainId'
          })
          
          if (chainId !== '0x7a69') { // 31337 in hex
            // 尝试切换到Anvil网络
            try {
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x7a69' }]
              })
            } catch (switchError: any) {
              // 如果网络不存在，添加它
              if (switchError.code === 4902) {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: '0x7a69',
                    chainName: 'Anvil Local',
                    nativeCurrency: {
                      name: 'Ethereum',
                      symbol: 'ETH',
                      decimals: 18
                    },
                    rpcUrls: ['http://127.0.0.1:8545'],
                    blockExplorerUrls: null
                  }]
                })
              }
            }
          }
        }
      } else {
        alert('请安装MetaMask!')
      }
    } catch (error: any) {
      console.error('连接钱包失败:', error)
      alert(`连接失败: ${error.message}`)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-4 text-center">连接钱包</h3>
      
      <button
        onClick={connectWallet}
        className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold"
      >
        连接 MetaMask
      </button>
      
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
        <h4 className="font-semibold mb-2">📋 设置步骤:</h4>
        <ol className="space-y-1 text-gray-700">
          <li>1. 安装 MetaMask 浏览器扩展</li>
          <li>2. 点击上方按钮连接钱包</li>
          <li>3. 系统会自动添加 Anvil 网络</li>
          <li>4. 导入测试私钥（可选）</li>
        </ol>
      </div>
      
      <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm">
        <h4 className="font-semibold text-blue-900 mb-2">🔑 测试私钥:</h4>
        <div className="text-xs text-blue-800 font-mono break-all bg-white p-2 rounded border">
          0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
        </div>
        <p className="text-xs text-blue-700 mt-1">
          对应地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        </p>
      </div>
    </div>
  )
}

// 扩展window对象类型
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      isMetaMask?: boolean
    }
  }
}
