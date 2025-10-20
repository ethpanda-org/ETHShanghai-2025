/**
 * Next.js API Route - IPFS Upload Proxy
 * @description 代理前端的 IPFS 上传请求，避免 CORS 问题
 */

import { NextRequest, NextResponse } from 'next/server';

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

export async function POST(request: NextRequest) {
  // 验证 JWT 配置
  if (!PINATA_JWT) {
    console.error('❌ PINATA_JWT not configured');
    return NextResponse.json(
      { error: 'IPFS service not configured' },
      { status: 500 }
    );
  }

  try {
    // 解析请求体
    const metadata = await request.json();
    console.log('📤 Proxying IPFS upload request...');

    // 调用 Pinata API
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: metadata.content,
        pinataMetadata: {
          name: metadata.name || `order-${Date.now()}`,
          keyvalues: metadata.keyvalues || {}
        },
        pinataOptions: {
          cidVersion: 1
        }
      }),
    });

    // 检查响应
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Pinata API error:', errorText);
      return NextResponse.json(
        { error: `Pinata upload failed: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    // 返回成功结果
    const data = await response.json();
    console.log('✅ IPFS upload successful:', data.IpfsHash);

    return NextResponse.json({
      success: true,
      ipfsHash: data.IpfsHash,
      pinSize: data.PinSize,
      timestamp: data.Timestamp
    });

  } catch (error) {
    console.error('❌ IPFS upload proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 支持 OPTIONS 请求（CORS 预检）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

