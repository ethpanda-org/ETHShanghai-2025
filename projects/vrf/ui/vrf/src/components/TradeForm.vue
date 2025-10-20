<script setup lang="ts">
import { ref } from 'vue'
import { useWeb3 } from '../composables/useWeb3'

const web3 = useWeb3()

const price = ref('')
const volume = ref('')
const tradeType = ref<'BUY' | 'SELL'>('BUY')
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function submitTrade() {
  const contract = web3.getContract()
  if (!contract) {
    errorMessage.value = 'Contract not initialized. Please check contract address.'
    return
  }

  if (!price.value || !volume.value) {
    errorMessage.value = 'Please fill in all fields'
    return
  }

  try {
    isSubmitting.value = true
    errorMessage.value = ''
    successMessage.value = ''

    const tradeTypeEnum = tradeType.value === 'BUY' ? 0 : 1
    
    // Parse values as BigInt for uint256
    const priceValue = BigInt(price.value)
    const volumeValue = BigInt(volume.value)
    
    console.log('Submitting trade:', { price: priceValue, volume: volumeValue, type: tradeTypeEnum })
    
    const tx = await contract.submitTrade(
      priceValue,
      volumeValue,
      tradeTypeEnum
    )

    console.log('Transaction sent:', tx.hash)
    successMessage.value = 'Transaction submitted. Waiting for confirmation...'
    
    const receipt = await tx.wait()
    console.log('Transaction confirmed:', receipt)
    
    successMessage.value = 'Trade submitted successfully!'
    
    // Reset form
    price.value = ''
    volume.value = ''
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error: any) {
    console.error('Error submitting trade:', error)
    
    // Better error messages
    if (error.code === 'ACTION_REJECTED') {
      errorMessage.value = 'Transaction rejected by user'
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage.value = 'Insufficient funds for transaction'
    } else if (error.reason) {
      errorMessage.value = error.reason
    } else {
      errorMessage.value = error.message || 'Failed to submit trade'
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="trade-form">
    <h2>Submit Trade</h2>
    
    <div class="form-group">
      <label for="price">Price:</label>
      <input
        id="price"
        v-model="price"
        type="number"
        placeholder="Enter price"
        :disabled="isSubmitting"
      />
    </div>

    <div class="form-group">
      <label for="volume">Volume:</label>
      <input
        id="volume"
        v-model="volume"
        type="number"
        placeholder="Enter volume"
        :disabled="isSubmitting"
      />
    </div>

    <div class="form-group">
      <label>Trade Type:</label>
      <div class="radio-group">
        <label>
          <input
            v-model="tradeType"
            type="radio"
            value="BUY"
            :disabled="isSubmitting"
          />
          Buy
        </label>
        <label>
          <input
            v-model="tradeType"
            type="radio"
            value="SELL"
            :disabled="isSubmitting"
          />
          Sell
        </label>
      </div>
    </div>

    <button
      @click="submitTrade"
      :disabled="isSubmitting || !web3.isConnected.value"
      class="submit-btn"
    >
      {{ isSubmitting ? 'Submitting...' : 'Submit Trade' }}
    </button>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>

    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>
  </div>
</template>

<style scoped>
.trade-form {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
  color: #555;
}

input[type="number"] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

input[type="number"]:focus {
  outline: none;
  border-color: #4CAF50;
}

.radio-group {
  display: flex;
  gap: 20px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: normal;
  cursor: pointer;
}

.radio-group input[type="radio"] {
  cursor: pointer;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: #45a049;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  margin-top: 15px;
  padding: 10px;
  background: #ffebee;
  color: #c62828;
  border-radius: 4px;
  font-size: 14px;
}

.success-message {
  margin-top: 15px;
  padding: 10px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 4px;
  font-size: 14px;
}
</style>
