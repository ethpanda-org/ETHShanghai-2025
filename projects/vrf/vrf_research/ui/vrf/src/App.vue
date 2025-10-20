<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWeb3 } from './composables/useWeb3'
import TradeForm from './components/TradeForm.vue'
import TradeList from './components/TradeList.vue'

const web3 = useWeb3()
const contractAddress = ref('')
const isInitialized = ref(false)
const errorMessage = ref('')

// Import contract ABI
import TradeBookABI from '../artifacts/contracts/TradeBook.sol/TradeBook.json'

async function connectWallet() {
  try {
    await web3.connectWallet()
  } catch (error: any) {
    console.error('Failed to connect wallet:', error)
    errorMessage.value = error.message || 'Failed to connect wallet'
  }
}

function initializeContract() {
  if (!contractAddress.value) {
    errorMessage.value = 'Please enter a contract address'
    return
  }

  try {
    web3.setContract(contractAddress.value, TradeBookABI)
    isInitialized.value = true
    errorMessage.value = ''
  } catch (error: any) {
    console.error('Failed to initialize contract:', error)
    errorMessage.value = error.message || 'Failed to initialize contract'
  }
}

onMounted(() => {
  // Auto-connect if previously connected
  if (window.ethereum && window.ethereum.selectedAddress) {
    connectWallet()
  }
})
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>Trade Book DApp</h1>
      <div class="wallet-section">
        <button v-if="!web3.isConnected.value" @click="connectWallet" class="connect-btn">
          Connect Wallet
        </button>
        <div v-else class="wallet-info">
          <span class="account">{{ web3.account.value.substring(0, 6) }}...{{ web3.account.value.substring(38) }}</span>
          <span class="chain-id">Chain: {{ web3.chainId.value }}</span>
        </div>
      </div>
    </header>

    <div v-if="!isInitialized" class="contract-setup">
      <h2>Contract Setup</h2>
      <p>Enter the deployed TradeBook contract address:</p>
      <div class="input-group">
        <input
          v-model="contractAddress"
          type="text"
          placeholder="0x..."
          :disabled="!web3.isConnected.value"
        />
        <button
          @click="initializeContract"
          :disabled="!web3.isConnected.value || !contractAddress"
        >
          Initialize
        </button>
      </div>
      <p v-if="!web3.isConnected.value" class="warning">
        Please connect your wallet first
      </p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>

    <main v-else class="main-content">
      <div class="left-panel">
        <TradeForm />
      </div>
      <div class="right-panel">
        <TradeList />
      </div>
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #e9ecef;
}

#app {
  min-height: 100vh;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #2c3e50;
  color: white;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 24px;
  font-weight: 600;
}

.wallet-section {
  display: flex;
  align-items: center;
}

.connect-btn {
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.connect-btn:hover {
  background: #45a049;
}

.wallet-info {
  display: flex;
  gap: 15px;
  align-items: center;
  font-size: 14px;
}

.account {
  background: rgba(255, 255, 255, 0.1);
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
}

.chain-id {
  color: #ecf0f1;
}

.contract-setup {
  max-width: 600px;
  margin: 60px auto;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.contract-setup h2 {
  margin-bottom: 15px;
  color: #2c3e50;
}

.contract-setup p {
  margin-bottom: 20px;
  color: #666;
}

.input-group {
  display: flex;
  gap: 10px;
}

.input-group input {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: monospace;
}

.input-group input:focus {
  outline: none;
  border-color: #4CAF50;
}

.input-group button {
  padding: 12px 24px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.input-group button:hover:not(:disabled) {
  background: #45a049;
}

.input-group button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.warning {
  color: #ff9800;
  font-size: 14px;
  margin-top: 15px;
}

.error {
  color: #f44336;
  font-size: 14px;
  margin-top: 15px;
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 20px;
  padding: 20px 40px;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
}

.left-panel,
.right-panel {
  min-height: calc(100vh - 140px);
}

@media (max-width: 1024px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .left-panel,
  .right-panel {
    min-height: auto;
  }
}
</style>
