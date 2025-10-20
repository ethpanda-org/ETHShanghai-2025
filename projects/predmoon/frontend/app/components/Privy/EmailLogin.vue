<script setup lang="ts">
    const { email, hasSend, oneTimePassword, isLoading, doLogin } = $(privyStore())
</script>
<template>
    <van-form @submit="doLogin">
        <van-cell-group inset>
            <van-field v-model="email" name="email" :label="$t('Email')" :placeholder="$t('Email')"
                :rules="[{ required: true, message: $t('Please enter email') }]" />
            <van-field v-if="hasSend" v-model="oneTimePassword" type="text" name="oneTimePassword" :label="$t('OTP')"
                :placeholder="$t('One Time Password')"
                :rules="[{ required: true, message: $t('Please enter one time password') }]" />
        </van-cell-group>
        <div style="margin: 16px;">
            <van-button round block type="primary" native-type="submit" :loading="isLoading">
                {{ $t('Submit') }}
            </van-button>
        </div>
    </van-form>
</template>
