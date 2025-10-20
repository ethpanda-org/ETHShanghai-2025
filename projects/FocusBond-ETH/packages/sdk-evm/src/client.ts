import { 
  type PublicClient, 
  type WalletClient, 
  type Address,
  encodeFunctionData,
  parseAbi
} from 'viem';
import { FOCUSBOND_ABI, ERC20_ABI } from './abi';
import { 
  type Session, 
  type ContractConfig, 
  type FeeCalculation, 
  type FeeToken,
  type StartSessionParams,
  type BreakSessionParams,
  type TransactionRequest
} from './types';
import { 
  calculateBreakFee, 
  getElapsedMinutes, 
  addSlippage,
  isValidAddress 
} from './utils';

export class FocusBondClient {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private contractAddress: Address;

  constructor(
    publicClient: PublicClient,
    contractAddress: string,
    walletClient?: WalletClient
  ) {
    if (!isValidAddress(contractAddress)) {
      throw new Error('Invalid contract address');
    }
    
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.contractAddress = contractAddress as Address;
  }

  // Read functions
  async getSession(userAddress: Address): Promise<Session> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: FOCUSBOND_ABI,
      functionName: 'getSession',
      args: [userAddress]
    });

    return {
      startTs: result.startTs,
      lastHeartbeatTs: result.lastHeartbeatTs,
      depositWei: result.depositWei,
      targetMinutes: result.targetMinutes,
      isActive: result.isActive,
      watchdogClosed: result.watchdogClosed
    };
  }

  async isSessionActive(userAddress: Address): Promise<boolean> {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: FOCUSBOND_ABI,
      functionName: 'isSessionActive',
      args: [userAddress]
    });
  }

  async getSessionElapsedMinutes(userAddress: Address): Promise<number> {
    const result = await this.publicClient.readContract({
      address: this.contractAddress,
      abi: FOCUSBOND_ABI,
      functionName: 'getSessionElapsedMinutes',
      args: [userAddress]
    });
    
    return Number(result);
  }

  async calculateBreakFeeOnChain(userAddress: Address, feeToken: Address): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: FOCUSBOND_ABI,
      functionName: 'calculateBreakFee',
      args: [userAddress, feeToken]
    });
  }

  async getContractConfig(): Promise<ContractConfig> {
    const [
      usdc,
      focus,
      rewardTreasury,
      baseFeeUsdc,
      baseFeeFocus,
      minCompleteMinutes,
      heartbeatGraceSecs,
      watchdogSlashBps
    ] = await Promise.all([
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: FOCUSBOND_ABI,
        functionName: 'usdc'
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: FOCUSBOND_ABI,
        functionName: 'focus'
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: FOCUSBOND_ABI,
        functionName: 'rewardTreasury'
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: FOCUSBOND_ABI,
        functionName: 'baseFeeUsdc'
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: FOCUSBOND_ABI,
        functionName: 'baseFeeFocus'
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: FOCUSBOND_ABI,
        functionName: 'minCompleteMinutes'
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: FOCUSBOND_ABI,
        functionName: 'heartbeatGraceSecs'
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: FOCUSBOND_ABI,
        functionName: 'watchdogSlashBps'
      })
    ]);

    return {
      usdc,
      focus,
      rewardTreasury,
      baseFeeUsdc,
      baseFeeFocus,
      minCompleteMinutes,
      heartbeatGraceSecs,
      watchdogSlashBps
    };
  }

  // Token functions
  async getTokenBalance(tokenAddress: Address, userAddress: Address): Promise<bigint> {
    return await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    });
  }

  async getTokenAllowance(
    tokenAddress: Address, 
    owner: Address, 
    spender: Address
  ): Promise<bigint> {
    return await this.publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner, spender]
    });
  }

  // Fee calculation (off-chain)
  async calculateBreakFeeOffChain(
    userAddress: Address,
    feeToken: FeeToken
  ): Promise<FeeCalculation> {
    const [session, config] = await Promise.all([
      this.getSession(userAddress),
      this.getContractConfig()
    ]);

    if (!session.isActive) {
      throw new Error('No active session found');
    }

    const elapsedMinutes = getElapsedMinutes(session.startTs);
    const tokenAddress = feeToken === 'usdc' ? config.usdc : config.focus;
    
    const calculation = calculateBreakFee(
      elapsedMinutes,
      config.baseFeeUsdc,
      config.baseFeeFocus,
      feeToken
    );

    return {
      ...calculation,
      feeToken: tokenAddress
    };
  }

  // Write function helpers (return transaction requests)
  prepareStartSession(params: StartSessionParams): TransactionRequest {
    const data = encodeFunctionData({
      abi: FOCUSBOND_ABI,
      functionName: 'startSession',
      args: [params.targetMinutes]
    });

    return {
      to: this.contractAddress,
      data,
      value: params.depositWei
    };
  }

  prepareBreakSessionWithUsdc(maxFee: bigint): TransactionRequest {
    const data = encodeFunctionData({
      abi: FOCUSBOND_ABI,
      functionName: 'breakSessionWithUsdc',
      args: [maxFee]
    });

    return {
      to: this.contractAddress,
      data
    };
  }

  prepareBreakSessionWithUsdcPermit(params: BreakSessionParams): TransactionRequest {
    if (!params.permitData) {
      throw new Error('Permit data required for permit transaction');
    }

    const data = encodeFunctionData({
      abi: FOCUSBOND_ABI,
      functionName: 'breakSessionWithUsdcPermit',
      args: [
        params.maxFee,
        params.permitData.deadline,
        params.permitData.v,
        params.permitData.r,
        params.permitData.s
      ]
    });

    return {
      to: this.contractAddress,
      data
    };
  }

  prepareBreakSessionWithFocus(maxFee: bigint): TransactionRequest {
    const data = encodeFunctionData({
      abi: FOCUSBOND_ABI,
      functionName: 'breakSessionWithFocus',
      args: [maxFee]
    });

    return {
      to: this.contractAddress,
      data
    };
  }

  prepareCompleteSession(): TransactionRequest {
    const data = encodeFunctionData({
      abi: FOCUSBOND_ABI,
      functionName: 'completeSession',
      args: []
    });

    return {
      to: this.contractAddress,
      data
    };
  }

  prepareUpdateHeartbeat(): TransactionRequest {
    const data = encodeFunctionData({
      abi: FOCUSBOND_ABI,
      functionName: 'updateHeartbeat',
      args: []
    });

    return {
      to: this.contractAddress,
      data
    };
  }

  prepareWatchdogBreak(userAddress: Address): TransactionRequest {
    const data = encodeFunctionData({
      abi: FOCUSBOND_ABI,
      functionName: 'watchdogBreak',
      args: [userAddress]
    });

    return {
      to: this.contractAddress,
      data
    };
  }

  // Token approval helper
  prepareTokenApproval(tokenAddress: Address, amount: bigint): TransactionRequest {
    const data = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [this.contractAddress, amount]
    });

    return {
      to: tokenAddress,
      data
    };
  }

  // Convenience methods for common workflows
  async prepareBreakSession(
    userAddress: Address,
    feeToken: FeeToken,
    slippageBps: number = 100
  ): Promise<{
    feeCalculation: FeeCalculation;
    approvalTx?: TransactionRequest;
    breakTx: TransactionRequest;
  }> {
    const feeCalculation = await this.calculateBreakFeeOffChain(userAddress, feeToken);
    const maxFee = addSlippage(feeCalculation.fee, slippageBps);

    // Check if approval is needed
    const currentAllowance = await this.getTokenAllowance(
      feeCalculation.feeToken,
      userAddress,
      this.contractAddress
    );

    let approvalTx: TransactionRequest | undefined;
    if (currentAllowance < feeCalculation.fee) {
      approvalTx = this.prepareTokenApproval(feeCalculation.feeToken, maxFee);
    }

    const breakTx = feeToken === 'usdc' 
      ? this.prepareBreakSessionWithUsdc(maxFee)
      : this.prepareBreakSessionWithFocus(maxFee);

    return {
      feeCalculation,
      approvalTx,
      breakTx
    };
  }

  // Direct write functions (requires wallet client)
  async startSession(params: StartSessionParams): Promise<`0x${string}`> {
    if (!this.walletClient) {
      throw new Error('Wallet client required for write operations');
    }

    const { request } = await this.publicClient.simulateContract({
      address: this.contractAddress,
      abi: FOCUSBOND_ABI,
      functionName: 'startSession',
      args: [params.targetMinutes],
      value: params.depositWei,
      account: this.walletClient.account!
    });

    return await this.walletClient.writeContract(request);
  }

  async breakSessionWithUsdc(maxFee: bigint): Promise<`0x${string}`> {
    if (!this.walletClient) {
      throw new Error('Wallet client required for write operations');
    }

    const { request } = await this.publicClient.simulateContract({
      address: this.contractAddress,
      abi: FOCUSBOND_ABI,
      functionName: 'breakSessionWithUsdc',
      args: [maxFee],
      account: this.walletClient.account!
    });

    return await this.walletClient.writeContract(request);
  }

  async completeSession(): Promise<`0x${string}`> {
    if (!this.walletClient) {
      throw new Error('Wallet client required for write operations');
    }

    const { request } = await this.publicClient.simulateContract({
      address: this.contractAddress,
      abi: FOCUSBOND_ABI,
      functionName: 'completeSession',
      args: [],
      account: this.walletClient.account!
    });

    return await this.walletClient.writeContract(request);
  }

  async updateHeartbeat(): Promise<`0x${string}`> {
    if (!this.walletClient) {
      throw new Error('Wallet client required for write operations');
    }

    const { request } = await this.publicClient.simulateContract({
      address: this.contractAddress,
      abi: FOCUSBOND_ABI,
      functionName: 'updateHeartbeat',
      args: [],
      account: this.walletClient.account!
    });

    return await this.walletClient.writeContract(request);
  }
}
