/**
 * IPFS 工具库 - 使用 Pinata 服务
 * @description 用于上传和获取订单元数据到IPFS
 */

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

export interface OrderMetadata {
  orderId: string;
  description: string;
  buyerEmail?: string;
  createdAt: string;
  merchantAddress: string;
  additionalInfo?: Record<string, any>;
}

/**
 * 上传订单元数据到 IPFS
 * @param metadata 订单元数据对象
 * @returns IPFS CID (Content Identifier)
 */
export async function uploadOrderMetadataToIPFS(
  metadata: OrderMetadata
): Promise<string> {
  try {
    console.log('📤 Uploading metadata to IPFS via API proxy...');

    // ✅ 使用 Next.js API Route 代理上传（避免 CORS 问题）
    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: metadata,
        name: `order-${metadata.orderId}`,
        keyvalues: {
          orderId: metadata.orderId,
          type: 'order_metadata',
          timestamp: metadata.createdAt
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ IPFS upload API error:', errorData);
      throw new Error(`IPFS upload failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    const ipfsCID = data.ipfsHash;

    console.log('✅ Metadata uploaded to IPFS');
    console.log('📍 IPFS CID:', ipfsCID);
    console.log('🔗 Gateway URL:', `${PINATA_GATEWAY}${ipfsCID}`);

    return ipfsCID;
  } catch (error) {
    console.error('❌ Failed to upload to IPFS:', error);
    throw new Error(`IPFS upload failed: ${(error as Error).message}`);
  }
}

/**
 * 从 IPFS 获取订单元数据
 * @param cid IPFS CID
 * @returns 订单元数据对象
 */
export async function getOrderMetadataFromIPFS(
  cid: string
): Promise<OrderMetadata | null> {
  if (!cid || cid === '' || cid === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    console.warn('⚠️ Invalid or empty IPFS CID');
    return null;
  }

  try {
    console.log('📥 Fetching metadata from IPFS...');
    console.log('📍 IPFS CID:', cid);

    // 尝试多个IPFS网关（优先使用支持 CORS 的公共网关）
    const gateways = [
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://dweb.link/ipfs/${cid}`,
      `${PINATA_GATEWAY}${cid}`, // Pinata 放在最后作为备用
    ];

    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // 添加超时和缓存策略
          signal: AbortSignal.timeout(10000), // 10秒超时
          cache: 'force-cache',
        });

        if (!response.ok) {
          console.warn(`⚠️ Gateway ${gateway} failed: ${response.status}`);
          continue;
        }

        const metadata = await response.json();
        console.log('✅ Metadata fetched from IPFS');
        return metadata as OrderMetadata;
      } catch (gatewayError) {
        console.warn(`⚠️ Gateway ${gateway} error:`, gatewayError);
        continue;
      }
    }

    console.error('❌ All IPFS gateways failed');
    return null;
  } catch (error) {
    console.error('❌ Failed to fetch from IPFS:', error);
    return null;
  }
}

/**
 * 验证 IPFS CID 格式
 * @param cid IPFS CID
 * @returns 是否为有效的CID
 */
export function isValidIPFSCID(cid: string): boolean {
  if (!cid || typeof cid !== 'string') return false;

  // CIDv0: 以 Qm 开头，长度46
  const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

  // CIDv1: 以 bafy 或 bafk 开头
  const cidv1Regex = /^(bafy|bafk)[a-z2-7]{50,}$/;

  return cidv0Regex.test(cid) || cidv1Regex.test(cid);
}

/**
 * 生成 IPFS 网关 URL
 * @param cid IPFS CID
 * @param gateway 网关地址（可选）
 * @returns 完整的网关URL
 */
export function getIPFSGatewayURL(cid: string, gateway?: string): string {
  const selectedGateway = gateway || PINATA_GATEWAY;
  return `${selectedGateway}${cid}`;
}

/**
 * 测试 Pinata 连接
 * @returns 是否连接成功
 */
export async function testPinataConnection(): Promise<boolean> {
  if (!PINATA_JWT) {
    console.error('❌ PINATA_JWT not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.pinata.cloud/data/testAuthentication', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
    });

    if (!response.ok) {
      console.error('❌ Pinata authentication failed:', response.status);
      return false;
    }

    const data = await response.json();
    console.log('✅ Pinata connection successful:', data.message);
    return true;
  } catch (error) {
    console.error('❌ Pinata connection test failed:', error);
    return false;
  }
}
