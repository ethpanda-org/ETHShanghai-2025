export async function retryAsyncFn(fn: Function, retries = 3, delay = 0) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay * i));
      }
    }
  }
}

// export async function _initWallet($PrivySDK: any, session: any, $privy: any, createWalletClient: any, createPublicClient: any, custom: any, networks: any) {
//   try {
//     let theWallet = $PrivySDK.getUserEmbeddedWallet(session!.user);
//     console.log("theWallet", theWallet);
//     if (!theWallet) {
//       theWallet = await $privy.embeddedWallet.create({});
//       console.log("theWallet create success", theWallet);
//       session = await $privy.user.get();
//     }

//     const wallet = session?.user?.linked_accounts?.find(
//       (item: any) => item.type === "wallet"
//     ) || null;

//     if (!wallet) {
//       throw new Error("wallet not found");
//     }

//     const { entropyId, entropyIdVerifier } =
//       $PrivySDK.getEntropyDetailsFromUser(session!.user);
//     console.log('xxx', {
//       wallet,
//       entropyId,
//       entropyIdVerifier,
//     }, session)

//     const provider = await $privy.embeddedWallet.getEthereumProvider({
//       wallet,
//       entropyId,
//       entropyIdVerifier,
//     });

//     const walletClient = createWalletClient({
//       account: wallet.address,
//       chain: networks[0],
//       transport: custom(provider),
//     });
//     const publicClient = createPublicClient({
//       chain: networks[0],
//       transport: custom(provider),
//     });
//     return { walletClient, publicClient, session };
//   } catch (error: Error | any) {
//     throw error;
//   }
// }
