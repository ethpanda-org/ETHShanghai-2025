import { defineStore } from "pinia";
import {
  createWalletClient,
  type WalletClient,
  type CustomTransport,
  publicActions,
  custom,
} from "viem";
import type { WalletProvider } from "@linenext/dapp-portal-sdk";

export type Transaction = {
  from: string;
  to: string;
  value: string;
  gas: string;
};

export const lineStore = defineStore(
  "lineStore",
  () => {
    const isEnable = useRuntimeConfig().public.kaia?.enabled === true;

    let address = $ref<string>();
    let connected = $ref(false);
    let walletProvider = $ref<WalletProvider>();
    let walletClient = $ref<WalletClient<CustomTransport>>();
    let userBalance = $ref(null);
    let userCapital = $ref({
      total: 0,
      balance: 0,
      freez: 0,
      frozen: 0,
      position: 0,
    });

    const getLineDapp = () => {

    };

    const getWalletProvider = () => {

    };

    const getPaymentProvider = () => {

    };

    const getCurrentNetwork = () => {
    };

    const initWalletClient = () => {

    };
    initWalletClient();

    // --- account ---
    const getAccount = async () => {
      const walletProvider = getWalletProvider();
      const accounts = (await walletProvider.request({
        method: "kaia_accounts",
      })) as string[];
      return accounts?.[0] || null;
    };

    const requestAccount = async () => {
    };

    // --- connect and sign ---
    const connectAndSign = async (msg: string) => {

    };

    // --- balance ---
    const getBalance = async (params: [string, "latest" | "earliest"]) => {

    };

    const updateBalance = async (account: string) => {

    };

    // --- send transaction ---
    const sendTransaction = async (transaction: Transaction) => {

    };

    const getErc20TokenBalance = async (
      contractAddress: string,
      account: string
    ) => {

    };

    // --- disconnect wallet ---
    const disconnect = async () => {

    };

    return $$({
      address,
      userBalance,
      userCapital,
      walletClient,
      isEnable,
      getLineDapp,
      getWalletProvider,
      getPaymentProvider,
      getCurrentNetwork,
      initWalletClient,
      getAccount,
      requestAccount,
      connectAndSign,
      getBalance,
      updateBalance,
      sendTransaction,
      getErc20TokenBalance,
      disconnect,
    });
  },
  {
    // @ts-ignore
    persist: {
      debug: true,
    },
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(lineStore, import.meta.hot));
}
