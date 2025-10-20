import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

interface DeployRequest {
  tokenName: string;
  symbol: string;
  ownerAddress: string;
  riskAssessmentAddress: string;
  rpcUrl?: string;
  privateKey?: string;
  etherscanApiKey?: string;
  chain: string;
}

interface DeployResponse {
  success: boolean;
  transactionHash?: string;
  contractAddress?: string;
  output?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  const body: DeployRequest = await request.json();

  // 验证必需参数
  if (!body.tokenName || !body.symbol || !body.ownerAddress || !body.riskAssessmentAddress) {
    return Response.json(
      { success: false, error: 'Missing required parameters' } as DeployResponse,
      { status: 400 }
    );
  }

  // 验证地址格式
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!addressRegex.test(body.ownerAddress) || !addressRegex.test(body.riskAssessmentAddress)) {
    return Response.json(
      { success: false, error: 'Invalid address format' } as DeployResponse,
      { status: 400 }
    );
  }

  // 使用硬编码的参数（从deploy-cmd.txt中获取）
  const rpcUrl = "https://eth-sepolia.g.alchemy.com/v2/aCJ6h5b6OSIffC681c9fLBq0LlUqT1gr";
  const privateKey = "0xd622dc3961df2132861b6a312fbcb96448f9e37645dd63cfeb700c1a68193ae9";
  const etherscanApiKey = "5CINDW6Q7C1UM9JRW22786GCR1CHXSYJXN";

  // 构造部署命令
  const deployCommand = 'forge';
  const deployArgs = [
    'create',
    'src/uRWA.sol:uRWA',
    `--rpc-url`, rpcUrl,
    `--private-key`, privateKey,
    '--broadcast',
    `--etherscan-api-key`, etherscanApiKey,
    '--verify',
    '--verifier', 'etherscan',
    '--constructor-args',
    body.tokenName,
    body.symbol,
    body.ownerAddress,
    body.riskAssessmentAddress
  ];

  // 设置响应头以支持流式响应
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // 在新进程中执行命令
      const child = spawn(deployCommand, deployArgs, {
        cwd: '/Users/bi4o/Desktop/ETHshanghai/Fcontracts',
        env: { ...process.env },
      });

      let fullOutput = '';
      let transactionHash: string | undefined = undefined;
      let contractAddress: string | undefined = undefined;

      // 处理标准输出
      child.stdout.on('data', (data) => {
        const output = data.toString();
        fullOutput += output;

        // 解析交易哈希和合约地址
        if (!transactionHash) {
          const txMatch = output.match(/transaction hash:?\s*(0x[a-fA-F0-9]{64})/i);
          if (txMatch) transactionHash = txMatch[1];
        }
        if (!contractAddress) {
          const addrMatch = output.match(/deployed to:?\s*(0x[a-fA-F0-9]{40})/i);
          if (addrMatch) contractAddress = addrMatch[1];
        }

        // 发送输出数据到前端
        const message = `data: ${JSON.stringify({ type: 'output', output })}\n\n`;
        controller.enqueue(encoder.encode(message));
      });

      // 处理错误输出
      child.stderr.on('data', (data) => {
        const output = data.toString();
        fullOutput += output;

        // 发送错误数据到前端
        const message = `data: ${JSON.stringify({ type: 'error', output })}\n\n`;
        controller.enqueue(encoder.encode(message));
      });

      // 处理子进程关闭
      child.on('close', (code) => {
        if (code === 0) {
          // 发送成功信息
          const successMessage = {
            type: 'success',
            transactionHash,
            contractAddress,
            output: fullOutput
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(successMessage)}\n\n`));
        } else {
          // 发送错误信息
          const errorMessage = {
            type: 'error',
            output: `Deployment failed with exit code ${code}`,
            fullOutput
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
        }
        controller.close();
      });

      // 处理错误事件
      child.on('error', (error) => {
        const errorMessage = {
          type: 'error',
          output: `Failed to start deployment process: ${error.message}`,
          fullOutput
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function GET() {
  return Response.json({ message: 'Contract deployment API' });
}