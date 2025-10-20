<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useWeb3 } from '../composables/useWeb3'

interface Trade {
  trader: string
  price: bigint
  volume: bigint
  tradeType: number
  blockNumber: bigint
  timestamp: bigint
}

interface EpochGroup {
  epochNumber: number
  startBlock: number
  endBlock: number
  trades: Trade[]
  isExpanded: boolean
}

const web3 = useWeb3()
const trades = ref<Trade[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const expandedEpochs = ref<Set<number>>(new Set())

const epochGroups = computed(() => {
  if (trades.value.length === 0) return []

  const groups: Map<number, Trade[]> = new Map()

  trades.value.forEach(trade => {
    const blockNum = Number(trade.blockNumber)
    const epochNum = Math.floor(blockNum / 5)
    
    if (!groups.has(epochNum)) {
      groups.set(epochNum, [])
    }
    groups.get(epochNum)!.push(trade)
  })

  const result: EpochGroup[] = Array.from(groups.entries())
    .map(([epochNum, epochTrades]) => {
      // Auto-expand new epochs
      if (!expandedEpochs.value.has(epochNum)) {
        expandedEpochs.value.add(epochNum)
      }
      return {
        epochNumber: epochNum,
        startBlock: epochNum * 5,
        endBlock: epochNum * 5 + 4,
        trades: epochTrades,
        isExpanded: expandedEpochs.value.has(epochNum)
      }
    })
    .sort((a, b) => b.epochNumber - a.epochNumber)

  return result
})

async function loadTrades() {
  const contract = web3.getContract()
  if (!contract) {
    errorMessage.value = 'Contract not initialized'
    return
  }

  try {
    isLoading.value = true
    errorMessage.value = ''

    const allTrades = await contract.getAllTrades()
    trades.value = allTrades

  } catch (error: any) {
    console.error('Error loading trades:', error)
    errorMessage.value = error.message || 'Failed to load trades'
  } finally {
    isLoading.value = false
  }
}

function toggleEpoch(epochNumber: number) {
  if (expandedEpochs.value.has(epochNumber)) {
    expandedEpochs.value.delete(epochNumber)
  } else {
    expandedEpochs.value.add(epochNumber)
  }
}

function formatAddress(address: string): string {
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

function formatTimestamp(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000)
  return date.toLocaleString()
}

onMounted(() => {
  loadTrades()
  
  // Set up event listener for new trades
  const contract = web3.getContract()
  if (contract) {
    contract.on('TradeSubmitted', () => {
      loadTrades()
    })
  }
})
</script>

<template>
  <div class="trade-list">
    <div class="header">
      <h2>Trade History</h2>
      <button @click="loadTrades" :disabled="isLoading" class="refresh-btn">
        {{ isLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <div v-if="isLoading && trades.length === 0" class="loading">
      Loading trades...
    </div>

    <div v-else-if="epochGroups.length === 0" class="no-trades">
      No trades yet. Submit your first trade!
    </div>

    <div v-else class="epochs">
      <div
        v-for="epoch in epochGroups"
        :key="epoch.epochNumber"
        class="epoch-panel"
      >
        <div class="epoch-header" @click="toggleEpoch(epoch.epochNumber)">
          <div class="epoch-info">
            <span class="epoch-title">Epoch {{ epoch.epochNumber }}</span>
            <span class="epoch-blocks">
              Blocks {{ epoch.startBlock }} - {{ epoch.endBlock }}
            </span>
            <span class="epoch-count">
              {{ epoch.trades.length }} trade{{ epoch.trades.length !== 1 ? 's' : '' }}
            </span>
          </div>
          <span class="toggle-icon">
            {{ epoch.isExpanded ? '▼' : '▶' }}
          </span>
        </div>

        <div v-if="epoch.isExpanded" class="epoch-content">
          <div class="trade-table">
            <div class="trade-header-row">
              <div class="trade-cell">Type</div>
              <div class="trade-cell">Price</div>
              <div class="trade-cell">Volume</div>
              <div class="trade-cell">Block</div>
              <div class="trade-cell">Time</div>
              <div class="trade-cell">Status</div>
            </div>
            <div
              v-for="(trade, index) in epoch.trades"
              :key="index"
              class="trade-row"
              :class="trade.tradeType === 0 ? 'buy' : 'sell'"
            >
              <div class="trade-cell">
                <span class="trade-type" :class="trade.tradeType === 0 ? 'buy-badge' : 'sell-badge'">
                  {{ trade.tradeType === 0 ? 'BUY' : 'SELL' }}
                </span>
              </div>
              <div class="trade-cell">{{ trade.price.toString() }}</div>
              <div class="trade-cell">{{ trade.volume.toString() }}</div>
              <div class="trade-cell">{{ trade.blockNumber.toString() }}</div>
              <div class="trade-cell">{{ formatTimestamp(trade.timestamp) }}</div>
              <div class="trade-cell">
                <span class="verified-badge">✓ Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trade-list {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  height: 100%;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h2 {
  margin: 0;
  color: #333;
}

.refresh-btn {
  padding: 8px 16px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  background: #1976D2;
}

.refresh-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  padding: 10px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  margin-bottom: 15px;
  font-size: 14px;
}

.loading,
.no-trades {
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
}

.epochs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.epoch-panel {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.epoch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #fff;
  cursor: pointer;
  transition: background 0.2s;
}

.epoch-header:hover {
  background: #f9f9f9;
}

.epoch-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.epoch-title {
  font-weight: 600;
  font-size: 16px;
  color: #333;
}

.epoch-blocks {
  font-size: 13px;
  color: #666;
}

.epoch-count {
  font-size: 12px;
  color: #999;
}

.toggle-icon {
  font-size: 12px;
  color: #666;
}

.epoch-content {
  padding: 15px;
  background: #fafafa;
  border-top: 1px solid #eee;
}

.trade-table {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.trade-header-row {
  display: grid;
  grid-template-columns: 80px 120px 120px 80px 180px 100px;
  gap: 15px;
  padding: 12px 15px;
  background: #f5f5f5;
  font-weight: 600;
  font-size: 13px;
  color: #555;
  border-bottom: 2px solid #e0e0e0;
}

.trade-row {
  display: grid;
  grid-template-columns: 80px 120px 120px 80px 180px 100px;
  gap: 15px;
  padding: 12px 15px;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
  align-items: center;
}

.trade-row:hover {
  background: #f9f9f9;
}

.trade-row:last-child {
  border-bottom: none;
}

.trade-cell {
  color: #333;
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trade-header-row .trade-cell {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.trade-type {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.buy-badge {
  background: #e8f5e9;
  color: #2e7d32;
}

.sell-badge {
  background: #ffebee;
  color: #c62828;
}

.verified-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

@media (max-width: 1024px) {
  .trade-header-row,
  .trade-row {
    grid-template-columns: 70px 100px 100px 70px 150px 90px;
    gap: 10px;
    padding: 10px 12px;
    font-size: 12px;
  }
}
</style>
