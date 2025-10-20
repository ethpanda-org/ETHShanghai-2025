import Moralis from 'moralis';
import { useCallback } from 'react';

function useMoralis() {

    const getUserAssets = useCallback(
        async (chainId: string, address: string) => {
            if (!Moralis.Core.isStarted) {
                Moralis.start({
                    apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjY2Y2Y3Y2RlLWQyZjEtNDFmYS04ZDlmLWNiMTdjMmQxMjM3NyIsIm9yZ0lkIjoiNDY1Mjc4IiwidXNlcklkIjoiNDc4NjcyIiwidHlwZUlkIjoiOWUxYTBjNGYtYjNmZi00YmQ3LWJlNjctNWYyZDVlYmY0N2NiIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTUyNDg2MTYsImV4cCI6NDkxMTAwODYxNn0.VIqg__bt8bnvvoQGoN8Ub_OnVSLw_zm9HWx1Pyr6h54"
                });
            }

            if (!chainId || !address) {
                console.error('Chain ID or address is missing');
                return [];
            }

            try {
                const { response } = await Moralis.EvmApi.wallets.getWalletTokenBalancesPrice({
                    chain: chainId,
                    address: address,
                });
                return response.result;
            } catch (e) {
                console.error('Error fetching user token:', e);
                return [];
            }
        },
        []
    );

    return { getUserAssets };
}

export default useMoralis;
