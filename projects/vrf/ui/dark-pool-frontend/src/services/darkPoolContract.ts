import { ethers } from 'ethers';
import DarkPoolABI from '../contracts/DarkPool.json';
import contractAddress from '../contracts/contract-address.json';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class DarkPoolContractService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private contract: ethers.Contract | null = null;

  async initialize() {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    // Check if connected to the correct network
    const network = await window.ethereum.request({ method: 'eth_chainId' });
    if (network !== '0x7a69') { // 31337 in hex
      throw new Error('Please connect to Hardhat local network (Chain ID: 31337)');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();

    this.contract = new ethers.Contract(
      contractAddress.DarkPool,
      DarkPoolABI.abi,
      this.signer
    );

    console.log('DarkPool contract initialized at:', contractAddress.DarkPool);
  }

  async placeOrder(isBuy: boolean, amount: string, price: string) {
    if (!this.contract) {
      await this.initialize();
    }

    const amountWei = ethers.parseEther(amount);
    const priceWei = ethers.parseEther(price);

    const tx = await this.contract.placeOrder(isBuy, amountWei, priceWei);
    const receipt = await tx.wait();

    return receipt;
  }

  async getOrder(orderId: string) {
    if (!this.contract) {
      await this.initialize();
    }

    const order = await this.contract.getOrder(orderId);
    return order;
  }

  async getAllOrders() {
    if (!this.contract) {
      await this.initialize();
    }

    const orders = await this.contract.getAllOrders();
    return orders;
  }

  async getOrderCount() {
    if (!this.contract) {
      await this.initialize();
    }

    const count = await this.contract.getOrderCount();
    return count.toNumber();
  }

  async getAllMatches() {
    if (!this.contract) {
      await this.initialize();
    }

    const matches = await this.contract.getAllMatches();
    return matches;
  }

  async getMatchCount() {
    if (!this.contract) {
      await this.initialize();
    }

    const count = await this.contract.getMatchCount();
    return count.toNumber();
  }

  listenToOrders(callback: (orderId: string, trader: string, isBuy: boolean, amount: string, price: string) => void) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('OrderPlaced', (orderId, trader, isBuy, amount, price) => {
      try {
        callback(orderId, trader, isBuy, ethers.formatEther(amount), ethers.formatEther(price));
      } catch (error) {
        console.error('Error processing OrderPlaced event:', error);
      }
    });
  }

  listenToMatches(callback: (buyOrderId: string, sellOrderId: string, amount: string, price: string) => void) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('OrderMatched', (matchId, buyOrderId, sellOrderId, amount, price) => {
      console.log('🤝 Order matched event received:', { matchId, buyOrderId, sellOrderId, amount, price });
      try {
        callback(buyOrderId, sellOrderId, ethers.formatEther(amount), ethers.formatEther(price));
      } catch (error) {
        console.error('Error processing OrderMatched event:', error);
      }
    });
  }

  async matchOrders() {
    if (!this.contract) {
      await this.initialize();
    }

    try {
      console.log('🔄 Triggering order matching...');
      const tx = await this.contract.matchOrders();
      console.log('📝 Match transaction submitted:', tx.hash);

      // Wait for transaction to be mined and get receipt
      const receipt = await tx.wait();
      console.log('✅ Match transaction confirmed:', receipt);

      // Look for OrderMatched event in the receipt
      const matchEvent = receipt.events?.find(event => event.event === 'OrderMatched');

      if (matchEvent) {
        console.log('🤝 Match found in transaction receipt:', matchEvent.args);
        return {
          matchId: matchEvent.args.matchId,
          buyOrderId: matchEvent.args.buyOrderId,
          sellOrderId: matchEvent.args.sellOrderId,
          amount: ethers.formatEther(matchEvent.args.amount),
          price: ethers.formatEther(matchEvent.args.price)
        };
      } else {
        console.log('ℹ️ No match found in this transaction');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to match orders:', error);
      throw error;
    }
  }

  getContractAddress(): string {
    return contractAddress.DarkPool;
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }
}

export const darkPoolService = new DarkPoolContractService();