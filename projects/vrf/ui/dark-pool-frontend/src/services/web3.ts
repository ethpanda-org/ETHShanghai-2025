import { ethers } from 'ethers';
import DarkPoolArtifact from '../contracts/DarkPool.json';
import contractAddress from '../contracts/contract-address.json';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface Web3Order {
  id: string;
  trader: string;
  isBuy: boolean;
  amount: string;
  price: string;
  timestamp: number;
  executed: boolean;
}

export class Web3Service {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string;

  constructor() {
    this.contractAddress = (contractAddress as any).DarkPool || '';
  }

  // Initialize contract with proper error handling
  private async initializeContract(): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer not available');
    }

    if (!this.contractAddress) {
      throw new Error('Contract address not available');
    }

    try {
      this.contract = new ethers.Contract(
        this.contractAddress,
        DarkPoolArtifact.abi,
        this.signer
      );

      // Test contract connection by checking if it exists
      const code = await this.signer.provider!.getCode(this.contractAddress);
      if (code === '0x') {
        throw new Error('No contract deployed at the specified address');
      }

      console.log('Contract initialized successfully at:', this.contractAddress);
    } catch (error) {
      console.error('Failed to initialize contract:', error);
      this.contract = null;
      throw error;
    }
  }
  async connectWallet(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      // Connect to Hardhat local network
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x7a69', // 31337 in hex
            chainName: 'Hardhat Local',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['http://127.0.0.1:8545'],
            blockExplorerUrls: null,
          },
        ],
      });

      this.provider = new ethers.BrowserProvider(window.ethereum, {
        chainId: 31337,
        name: 'hardhat'
      });

      this.signer = await this.provider.getSigner();

      // Initialize contract using the new method
      await this.initializeContract();

      return await this.signer.getAddress();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  // Get current wallet address
  async getCurrentAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return await this.signer.getAddress();
  }

  // Place order on blockchain
  async placeOrder(isBuy: boolean, amount: string, price: string): Promise<string> {
    if (!this.contract) {
      console.log('Contract not initialized, attempting to initialize...');
      // Try to initialize contract if wallet is connected
      if (!this.signer && window.ethereum) {
        try {
          await this.connectWallet();
        } catch (error) {
          console.error('Failed to auto-connect wallet:', error);
          throw new Error('Contract not initialized - please connect wallet first');
        }
      }

      if (!this.signer) {
        throw new Error('Contract not initialized - please connect wallet first');
      }

      try {
        await this.initializeContract();
      } catch (error) {
        console.error('Failed to initialize contract:', error);
        throw new Error('Contract not initialized - please connect wallet first');
      }
    }

    try {
      // Convert amount and price to wei (assuming 18 decimals)
      const amountWei = ethers.parseEther(amount);
      const priceWei = ethers.parseUnits(price, 18); // Price in ETH units

      console.log('Placing order on blockchain:', { isBuy, amountWei: amountWei.toString(), priceWei: priceWei.toString() });

      const tx = await this.contract.placeOrder(isBuy, amountWei, priceWei);

      console.log('Transaction submitted:', tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Get order ID from transaction logs
      const event = receipt?.events?.find((e: any) => e.event === 'OrderPlaced');
      const orderId = event?.args?.orderId;

      return orderId || tx.hash;
    } catch (error) {
      console.error('Failed to place order:', error);
      throw error;
    }
  }

  // Get all orders from blockchain
  async getAllOrders(): Promise<Web3Order[]> {
    if (!this.contract) {
      console.log('Contract not initialized, attempting to initialize...');
      // Try to initialize contract if wallet is connected
      if (!this.signer && window.ethereum) {
        try {
          await this.connectWallet();
        } catch (error) {
          console.error('Failed to auto-connect wallet:', error);
          throw new Error('Contract not initialized - please connect wallet first');
        }
      }

      if (!this.signer) {
        throw new Error('Contract not initialized - please connect wallet first');
      }

      try {
        await this.initializeContract();
      } catch (error) {
        console.error('Failed to initialize contract:', error);
        throw new Error('Contract not initialized - please connect wallet first');
      }
    }

    try {
      const orders = await this.contract.getAllOrders();
      return orders.map((order: any) => ({
        id: order.id,
        trader: order.trader,
        isBuy: order.isBuy,
        amount: ethers.formatEther(order.amount),
        price: ethers.formatUnits(order.price, 18),
        timestamp: Number(order.timestamp),
        executed: order.executed
      }));
    } catch (error) {
      console.error('Failed to get orders:', error);
      return [];
    }
  }

  // Get single order from blockchain
  async getOrder(orderId: string): Promise<Web3Order | null> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const order = await this.contract.getOrder(orderId);
      return {
        id: order.id,
        trader: order.trader,
        isBuy: order.isBuy,
        amount: ethers.formatEther(order.amount),
        price: ethers.formatUnits(order.price, 18),
        timestamp: Number(order.timestamp),
        executed: order.executed
      };
    } catch (error) {
      console.error('Failed to get order:', error);
      return null;
    }
  }

  // Get order count from blockchain
  async getOrderCount(): Promise<number> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const count = await this.contract.getOrderCount();
      return Number(count);
    } catch (error) {
      console.error('Failed to get order count:', error);
      return 0;
    }
  }

  // Match orders on blockchain
  public async matchOrders(): Promise<{buyOrderId: string, sellOrderId: string, amount: string, price: string}> {
    await this.initializeContract();
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.matchOrders();
      const receipt = await tx.wait();

      // Find the OrderMatched event
      const event = receipt.events?.find((e: any) => e.event === 'OrderMatched');
      if (event) {
        return {
          buyOrderId: event.args.buyOrderId,
          sellOrderId: event.args.sellOrderId,
          amount: ethers.formatEther(event.args.amount),
          price: ethers.formatUnits(event.args.price, 18)
        };
      }

      throw new Error('OrderMatched event not found');
    } catch (error) {
      console.error('Failed to match orders:', error);
      throw error;
    }
  }

  // Listen to order events
  onOrderPlaced(callback: (orderId: string, trader: string, isBuy: boolean, amount: string, price: string) => void) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('OrderPlaced', (orderId, trader, isBuy, amount, price) => {
      const formattedAmount = ethers.formatEther(amount);
      const formattedPrice = ethers.formatUnits(price, 18);
      callback(orderId, trader, isBuy, formattedAmount, formattedPrice);
    });
  }

  // Listen to order matched events
  onOrderMatched(callback: (buyOrderId: string, sellOrderId: string, amount: string, price: string) => void) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('OrderMatched', (buyOrderId, sellOrderId, amount, price) => {
      const formattedAmount = ethers.formatEther(amount);
      const formattedPrice = ethers.formatUnits(price, 18);
      callback(buyOrderId, sellOrderId, formattedAmount, formattedPrice);
    });
  }

  // Stop listening to events
  removeAllListeners() {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }

  // Check if connected to Hardhat network
  async isCorrectNetwork(): Promise<boolean> {
    if (!this.provider) return false;

    try {
      const network = await this.provider.getNetwork();
      return Number(network.chainId) === 31337;
    } catch {
      return false;
    }
  }

  // Get contract instance
  getContract(): ethers.Contract | null {
    return this.contract;
  }

  // Get provider instance
  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  // Get signer instance
  getSigner(): ethers.JsonRpcSigner | null {
    return this.signer;
  }
}

// Singleton instance
export const web3Service = new Web3Service();