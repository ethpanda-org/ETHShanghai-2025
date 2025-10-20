<script setup lang="ts">
    const { walletClient, wallet, initWallet, isLoading } = $(privyStore())
    import { showToast } from 'vant';
const signMessage = async () => {
        const message = `Hello, world! ${Date.now()}`
        const signature = await walletClient.signMessage({
            message,
        })
        showToast(`message: ${message}
sign signature: ${signature}`)
    }
</script>
<template>
    <div>
        <van-cell-group v-if="wallet">
            <van-cell :title="$t('Wallet')" :label="wallet?.address" />
            <div class="flex justify-evenly py-4">
                <van-button round type="primary" @click="signMessage" :loading="isLoading">
                    {{ $t('Sign Message') }}
                </van-button>
            </div>
        </van-cell-group>
        <div v-else class="p-4">
            <van-button round block type="primary" @click="initWallet" :loading="isLoading">
                {{ $t('Create wallet') }}
            </van-button>
        </div>
    </div>
</template>
