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

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();

    this.contract = new ethers.Contract(
      contractAddress.DarkPool,
      DarkPoolABI.abi,
      this.signer
    );
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

  listenToOrders(callback: (orderId: string, trader: string, isBuy: boolean, amount: string, price: string) => void) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('OrderPlaced', (orderId, trader, isBuy, amount, price) => {
      callback(orderId, trader, isBuy, ethers.formatEther(amount), ethers.formatEther(price));
    });
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }
}

export const darkPoolService = new DarkPoolContractService();