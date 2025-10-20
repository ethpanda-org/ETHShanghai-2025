import { createPublicClient, createWalletClient, http, fallback, parseAbi, encodeFunctionData, encodePacked, parseGwei } from 'viem';
import { getWalletAddress, getStoreState } from '../utils.js';
import { toSimple7702SmartAccount, createBundlerClient } from 'viem/account-abstraction';
import { signPermit } from './permit.js';
import { mnemonicToAccount } from 'viem/accounts';

// 合约ABI
export const abi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)'
]);

/**
 * Get public client (singleton pattern)
 * @returns {Promise<any>} Public client instance
 */
export const getPublicClient = async () => {
  // 创建新实例
  const currentChain = getStoreState().currentChain
  return createPublicClient({
    chain: currentChain,
    transport: fallback(currentChain.rpcUrls.default.http.map(url => http(url))),
  });
};

/**
 * Get wallet client (singleton pattern)
 * @returns {Promise<any>} Wallet client instance
 */
export const getWalletClient = async () => {
  // 获取账户
  const account = await getEthAccount();
  const currentChain = getStoreState().currentChain;

  // 创建新实例
  return createWalletClient({
    account,
    chain: currentChain,
    transport: fallback(currentChain.rpcUrls.default.http.map(url => http(url))),
  });
};

/**
 * Get or create wallet account
 * @returns {Promise<{account: any, walletAddress: string}>} Account and address
 */
export const getEthAccount = async () => {
  // Get mnemonic phrase
  const mnemonic = getStoreState().mnemonic;
  if (!mnemonic) {
    throw new Error('Mnemonic not detected, please create wallet on welcome page first');
  }

  // Create account from mnemonic
  const account = mnemonicToAccount(mnemonic.trim());

  return account;
};

/**
 * Query balance
 * @returns {Promise<BigInt>} Balance (BigInt)
 */
export const fetchBalance = async () => {
  try {
    // 使用Utils.js中的单例函数获取公共客户端和钱包地址
    const publicClient = await getPublicClient();
    const walletAddress = await getWalletAddress();

    // 获取当前币种配置
    const currentCoin = getStoreState().currentCoin;

    // 判断是查询ERC20代币余额还是原生代币余额
    if (currentCoin && currentCoin.address) {
      // 调用合约查询ERC20代币余额
      const balance = await publicClient.readContract({
        address: currentCoin.address,
        abi: abi,
        functionName: 'balanceOf',
        args: [walletAddress]
      });

      return balance;
    } else {
      // 查询原生代币余额
      const balance = await publicClient.getBalance({ address: walletAddress });

      return balance;
    }
  } catch (error) {
    console.error('Failed to query balance:', error);
    throw new Error('Query failed: ' + error.message);
  }
};


/**
 * Validate transfer input
 * @param {string} recipientAddress - Recipient address
 * @param {string} transferAmount - Transfer amount
 * @param {BigInt|null} currentBalance - Current balance
 * @returns {string|null} Error message, or null if validation passes
 */
export const validateTransferInput = (recipientAddress, transferAmount) => {
  // 验证输入
  if (!recipientAddress || !transferAmount) {
    return '请输入收款地址和转账金额';
  }

  // 验证金额格式
  const amount = parseFloat(transferAmount);
  if (isNaN(amount) || amount <= 0) {
    return '请输入有效的转账金额';
  }

  // 验证地址格式 (简单验证)
  if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
    return '请输入有效的以太坊地址';
  }

  return null;
};

/**
 * Process transfer
 * @param {string} recipientAddress - Recipient address
 * @param {string} transferAmount - Transfer amount
 * @returns {Promise<{success: boolean, hash: string, error: string|null}>} Transfer result
 */
export const transfer = async (
  recipientAddress,
  transferAmount
) => {
  try {
    // 使用Utils.js中的单例函数获取公共客户端、钱包客户端和钱包地址
    const publicClient = await getPublicClient();
    const walletClient = await getWalletClient();
    const walletAddress = await getWalletAddress();

    // 验证输入
    const validationError = validateTransferInput(recipientAddress, transferAmount);
    if (validationError) {
      throw new Error(validationError);
    }

    // 获取当前币种和链配置
    const currentCoin = getStoreState().currentCoin;
    const currentChain = getStoreState().currentChain;
    const chain = currentChain;

    // 获取nonce
    const nonce = await publicClient.getTransactionCount({ address: walletAddress });

    // 准备交易
    let tx;

    // 转换金额
    const amount = parseFloat(transferAmount);

    // 判断是转账ERC20代币还是原生代币
    if (currentCoin && currentCoin.address) {
      // ERC20代币转账逻辑
      const contractAddress = currentCoin.address;

      // 使用代币的decimals转换金额
      const decimals = currentCoin.decimals || 6;
      const amountInWei = BigInt(Math.round(amount * (10 ** decimals)));

      // 编码交易数据
      const data = encodeFunctionData({
        abi,
        functionName: 'transfer',
        args: [recipientAddress, amountInWei],
      });

      tx = {
        to: contractAddress,
        data,
        nonce,
        chain,
      };
    } else {
      // 原生代币转账逻辑
      // 使用链的本地货币decimals转换金额
      const decimals = currentChain.nativeCurrency?.decimals || 18;
      const amountInWei = BigInt(Math.round(amount * (10 ** decimals)));

      tx = {
        to: recipientAddress,
        value: amountInWei,
        nonce,
        chain,
      };
    }

    // 发送交易
    const hash = await walletClient.sendTransaction(tx);

    // 等待交易确认
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === 'success') {
      return {
        success: true,
        hash,
        error: null
      };
    } else {
      return {
        success: false,
        hash: null,
        error: '转账失败: 交易未确认'
      };
    }
  } catch (error) {
    console.error('Transfer failed:', error);
    return {
      success: false,
      hash: null,
      error: '转账失败: ' + error.message
    };
  }
};

/**
 * Use Paymaster to handle gasless transfer
 * @param {string} recipientAddress - Recipient address
 * @param {string} transferAmount - Transfer amount
 * @returns {Promise<{success: boolean, hash: string, error: string|null}>} Transfer result
 */
export const transferWithPaymaster = async (
  recipientAddress,
  transferAmount
) => {
  try {
    // 使用Utils.js中的单例函数获取公共客户端和钱包地址
    const publicClient = await getPublicClient();
    const owner = await getEthAccount();

    // 验证输入
    const validationError = validateTransferInput(recipientAddress, transferAmount);
    if (validationError) {
      throw new Error(validationError);
    }

    // 获取当前币种和链配置
    const currentCoin = getStoreState().currentCoin;
    const currentChain = getStoreState().currentChain;

    // 使用默认值
    const contractAddress = currentCoin.address;
    const paymasterAddress = currentCoin.paymasterAddress;

    // 转换金额为最小单位
    const amount = parseFloat(transferAmount);
    const decimals = currentCoin.decimals || 6;
    const amountInWei = BigInt(Math.round(amount * (10 ** decimals)));

    // 创建simple 7702智能账户
    const account = await toSimple7702SmartAccount({ client: publicClient, owner });

    // 生成授权
    const authorization = await owner.signAuthorization({
      chainId: publicClient.chain.id,
      nonce: await publicClient.getTransactionCount({ address: owner.address }),
      contractAddress: account.authorization.address,
    });

    // 构建用户操作
    const userOperation = {
      account,
      calls: [
        {
          to: contractAddress,
          abi,
          functionName: "transfer",
          args: [recipientAddress, amountInWei],
        },
      ],
      authorization: authorization,
    };

    const permitAmount = await fetchBalance();

    const dummyPaymaster = {
      async getPaymasterData(parameters) {
        // Dummy Signature
        const permitSignature = '0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c'

        const paymasterData = encodePacked(
          ["uint8", "address", "uint256", "bytes"],
          [0, contractAddress, permitAmount, permitSignature],
        );

        return {
          paymaster: paymasterAddress,
          paymasterData,
          paymasterVerificationGasLimit: 200000n,
          paymasterPostOpGasLimit: 100000n,
          isFinal: true
        };
      }
    }

    // 创建临时bundler客户端用于估算gas
    const bundlerUrl = `https://public.pimlico.io/v2/${publicClient.chain.id}/rpc`;
    const tempBundlerClient = createBundlerClient({
      account,
      client: publicClient,
      paymaster: dummyPaymaster,
      transport: http(bundlerUrl),
    });

    // 估算gas
    const estimatedGas = await tempBundlerClient.estimateUserOperationGas(userOperation);

    // 创建Paymaster
    const paymaster = {
      async getPaymasterData(parameters) {
        // 生成permit签名
        const permitSignature = await signPermit({
          tokenAddress: contractAddress,
          account,
          client: publicClient,
          spenderAddress: paymasterAddress,
          permitAmount: permitAmount,
        });

        // 编码paymaster数据
        const paymasterData = encodePacked(
          ["uint8", "address", "uint256", "bytes"],
          [0, contractAddress, permitAmount, permitSignature],
        );

        // 获取缓冲gas限制的函数
        const getBufferedGasLimit = (gasLimit, minGasLimit) => {
          return gasLimit === undefined || gasLimit === 0n
            ? minGasLimit
            : gasLimit * 5n / 4n;
        };

        return {
          paymaster: paymasterAddress,
          paymasterData,
          paymasterVerificationGasLimit: getBufferedGasLimit(estimatedGas.paymasterVerificationGasLimit, 200000n),
          paymasterPostOpGasLimit: getBufferedGasLimit(estimatedGas.paymasterPostOpGasLimit, 100000n),
          isFinal: true
        };
      },
    };

    // 创建正式的bundler客户端
    const bundlerClient = createBundlerClient({
      account,
      client: publicClient,
      paymaster,
      userOperation: {
        estimateFeesPerGas: async ({ account, bundlerClient, userOperation }) => {
          const [baseFee, maxPriorityFeePerGas] = await Promise.all([
            publicClient.request({ method: "eth_gasPrice" }),
            publicClient.request({ method: "eth_maxPriorityFeePerGas" }),
          ]);

          // 设置最小优先级费用
          const minPriorityFee = parseGwei("0.02"); // 0.02 Gwei

          // 如果返回值小于最小值，使用最小值
          const adjustedPriorityFee = BigInt(maxPriorityFeePerGas) < minPriorityFee
            ? `0x${minPriorityFee.toString(16)}`
            : maxPriorityFeePerGas;

          const addHexNumbers = (a, b) => {
            return `0x${(BigInt(a) + BigInt(b)).toString(16)}`;
          };

          // EIP-1559 交易的最大费用 = 基础费用 + 优先级费用
          const maxFeePerGas = addHexNumbers(baseFee, adjustedPriorityFee);
          return { maxFeePerGas, maxPriorityFeePerGas: adjustedPriorityFee };
        },
      },
      transport: http(bundlerUrl),
    });

    // 发送用户操作
    const hash = await bundlerClient.sendUserOperation(userOperation);
    console.log("UserOperation hash", hash);

    // 等待用户操作收据
    const receipt = await bundlerClient.waitForUserOperationReceipt({ hash });

    if (receipt.success) {
      return {
        success: true,
        hash,
        error: null
      };
    } else {
      return {
        success: false,
        hash: null,
        error: '转账失败: 交易未确认'
      };
    }
  } catch (error) {
    console.error('Gasless transfer failed:', error);
    return {
      success: false,
      hash: null,
      error: '无Gas转账失败: ' + error.message
    };
  }
}
