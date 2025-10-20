import { create } from 'zustand';
import { chains, coins, defaultChain, defaultCoin } from './chainUtils/configs';

// Create Zustand store to manage global state related to chains and coins
export const useStore = create((set, get) => ({
  // Initialize state
  allChains: chains,
  allCoins: coins,
  currentChain: defaultChain,
  currentCoin: defaultCoin,
  mnemonic: null,
  
  // Derived state: available coins under the current chain
  // get availableCoins() {
  //   const { allCoins, currentChain } = get();
  //   console.log('availableCoins currentChain', currentChain)
  //   return allCoins.filter(coin => coin.chainId === currentChain.id);
  // },
  
  // Set current chain
  setCurrentChain: (chain) => {
    set({ currentChain: chain, currentCoin: null });
  },
  
  // Set current coin
  setCurrentCoin: (coin) => {
    set({ currentCoin: coin });
  },
  
  // Set mnemonic phrase
  setMnemonic: (mnemonic) => {
    set({ mnemonic });
  },

  // Add custom chain
  addCustomChain: (customChain) => {
    try {
      const { allChains } = get();
      // Check if chain with the same ID already exists
      const exists = allChains.some(chain => chain.id === customChain.id);
      if (exists) {
        throw new Error(`Chain ID ${customChain.id} already exists`);
      }
      
      // Add identifier to custom chain to indicate it was added by user
      const chainWithCustomFlag = {
        ...customChain,
        isCustom: true
      };
      
      // Add custom chain to allChains array
      const updatedChains = [...allChains, chainWithCustomFlag];
      set({ allChains: updatedChains });
      return true;
    } catch (error) {
      console.error('Failed to add custom chain:', error);
      throw error;
    }
  },
  
  // Add custom coin
  addCustomCoin: (customCoin) => {
    try {
      const { allCoins } = get();
      // Check if coin with the same address already exists
      const exists = allCoins.some(coin => coin.address === customCoin.address && coin.chainId === customCoin.chainId);
      if (exists) {
        throw new Error(`Token with address ${customCoin.address} already exists on this chain`);
      }
      
      // Add identifier to custom coin to indicate it was added by user
      const coinWithCustomFlag = {
        ...customCoin,
        isCustom: true
      };
      
      // Add custom coin to allCoins array
      const updatedCoins = [...allCoins, coinWithCustomFlag];
      set({ allCoins: updatedCoins });
      return true;
    } catch (error) {
      console.error('Failed to add custom coin:', error);
      throw error;
    }
  },
  
  // Remove custom chain
  removeCustomChain: (chainId) => {
    try {
      const { allChains, allCoins } = get();
      // Check if the chain to be deleted exists
      const chainIndex = allChains.findIndex(chain => chain.id === chainId);
      if (chainIndex === -1) {
        throw new Error(`Chain ID ${chainId} does not exist`);
      }
      
      const chainToRemove = allChains[chainIndex];
      
      // Check if it's a custom chain
      if (!chainToRemove.isCustom) {
        throw new Error('Only user-added custom chains can be deleted');
      }
      
      // Remove custom chain from allChains array
      const updatedChains = [...allChains];
      updatedChains.splice(chainIndex, 1);
      
      // Also remove all coins under this chain
      const updatedCoins = allCoins.filter(coin => coin.chainId !== chainId);
      
      // Check if the current chain is being deleted, if so clear current chain and coin
      const { currentChain } = get();
      
      if (currentChain && currentChain.id === chainId) {
        set({
          currentChain: defaultChain,
          currentCoin: defaultCoin
        })
      }
      
      set({ 
        allChains: updatedChains, 
        allCoins: updatedCoins
      });
      return true;
    } catch (error) {
      console.error('Failed to delete custom chain:', error);
      throw error;
    }
  },
  
  // Remove custom coin
  removeCustomCoin: (address, chainId) => {
    try {
      const { allCoins, currentCoin } = get();
      
      // Check if the coin to be deleted exists
      const coinIndex = allCoins.findIndex(coin => coin.address === address && coin.chainId === chainId);
      if (coinIndex === -1) {
        throw new Error(`Token with address ${address} does not exist on this chain`);
      }
      
      const coinToRemove = allCoins[coinIndex];
      
      // Check if it's a custom coin
      if (!coinToRemove.isCustom) {
        throw new Error('Only user-added custom coins can be deleted');
      }
      
      // Remove custom coin from allCoins array
      const updatedCoins = [...allCoins];
      updatedCoins.splice(coinIndex, 1);
      
      // If the currently selected coin is the one being deleted, clear the selection
      let newCurrentCoin = currentCoin;
      if (currentCoin && currentCoin.address === address && currentCoin.chainId === chainId) {
        newCurrentCoin = null;
      }
      
      set({ allCoins: updatedCoins, currentCoin: newCurrentCoin });
      return true;
    } catch (error) {
      console.error('Failed to delete custom coin:', error);
      throw error;
    }
  }
}));

export const setCurrentChain = (chain) => useStore.getState().setCurrentChain(chain);
export const setCurrentCoin = (coin) => useStore.getState().setCurrentCoin(coin);
export const addCustomChain = (chain) => useStore.getState().addCustomChain(chain);
export const addCustomCoin = (coin) => useStore.getState().addCustomCoin(coin);
export const removeCustomChain = (chainId) => useStore.getState().removeCustomChain(chainId);
export const removeCustomCoin = (address, chainId) => useStore.getState().removeCustomCoin(address, chainId);