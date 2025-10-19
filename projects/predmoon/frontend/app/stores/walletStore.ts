import { defineStore } from "pinia";
import { formatUnits, parseEther, parseUnits, erc20Abi } from "viem";
import {
  type SignTradeDataOptions,
  TYPEHASH_MERGE_SPLIT_ORDER,
  TYPEHASH_ORDER,
  TYPEHASH_PERMIT,
  TYPEHASH_REWARD,
  TYPEHASH_WITHDRAW,
} from "@/config/tradeTypes";
import { approveSign } from "@/api/userInfo";
import { market } from "@/config/abis";
import { shortenAddress } from "@/utils/processing";
import type { Web3Config } from "~/types";

export const walletStore = defineStore(
  "walletStore",
  () => {
    let walletConfig = $ref<Web3Config>();
    let userBalance = $ref<number>(0);
    let userCapital = $ref({
      total: 0,
      balance: 0,
      freez: 0,
      frozen: 0,
      position: 0,
    });

    const { walletClient: privyWalletClient, wallet } = $(privyStore());
    const { walletClient: lineWalletClient, address: lineAddress } = $(
      lineStore()
    );

    const walletClient = $computed(() => {
      return privyWalletClient
        ? privyWalletClient
        : lineWalletClient
        ? lineWalletClient
        : undefined;
    });

    const address = $computed(() => {
      return wallet ? wallet.address : lineAddress ? lineAddress : undefined;
    });

    const shortAddress = $computed(() => {
      return shortenAddress(wallet?.address || "", 4, 4);
    });

    // update web3 config by interface
    const updateWalletConfig = (data: Web3Config) => {
      walletConfig = data;
    };

    // transaction signature
    const signTradeData = async (options: SignTradeDataOptions) => {
    };

    /**
     * get wallet balance and update store
     */
    const updateWalletBalance = useDebounceFn(async () => {
    }, 2000);

    /**
     * Query the user's token authorization
     */
    const queryAllowance = async (coinType: any) => {
    };

    /**
     * Sign the permit
     */
    const signPermit = async (coinInfo: any, message: any) => {
    };

    /**
     * Inquiry on user token authorization and initiate authorization
     */
    const queryAllowanceAndPermit = async (
      coinType: any,
      allowanceAmount: string
    ) => {

    };

    const amountPermit = async () => {

    };

    const signWithdraw = async (message: any) => {

    };

    /**
     * Sign the payout
     */
    const signPayout = async (message: any) => {

    };

    const getTypedDomain = () => {
      return {
        name: walletConfig!.contract.name,
        version: walletConfig!.contract.version.toString(),
        chainId: walletConfig!.chain.id,
        verifyingContract: walletConfig!.contract.address,
      } as const;
    };

    return $$({
      walletConfig,
      userBalance,
      userCapital,
      walletClient,
      address,
      shortAddress,
      signWithdraw,
      updateWalletBalance,
      signTradeData,
      updateWalletConfig,
      queryAllowanceAndPermit,
      amountPermit,
      signPayout,
    });
  },
  {
    // @ts-ignore
    persist: {
      debug: true
    },
  }
);

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(walletStore, import.meta.hot));
}
