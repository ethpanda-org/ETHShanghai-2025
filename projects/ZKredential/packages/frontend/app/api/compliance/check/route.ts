// API route for checking platform compliance

import { type NextRequest, NextResponse } from "next/server"
import { createPublicClient, http } from "viem"
import { sepolia } from "viem/chains"
import { ZKRWARegistryContract } from "@/lib/contracts/zkrwa-registry"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const platform = searchParams.get('platform')

    if (!address || !platform) {
      return NextResponse.json(
        { error: "缺少必需参数: address, platform" },
        { status: 400 }
      )
    }

    console.log('🔍 检查平台合规状态:', { address, platform })

    // 创建只读客户端
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY')
    })

    const registry = new ZKRWARegistryContract(publicClient, undefined, sepolia.id)

    // 检查用户是否满足平台要求
    const isCompliant = await registry.checkCompliance(
      address as `0x${string}`,
      platform
    )

    // 获取平台要求（模拟数据，因为合约中可能没有这个方法）
    const requirements = {
      minAge: 18,
      allowedCountry: 156,
      minAssets: 10000
    }

    console.log('✅ 合规检查完成:', {
      address,
      platform,
      isCompliant,
      requirements: {
        minAge: Number(requirements.minAge),
        allowedCountry: Number(requirements.allowedCountry),
        minAssets: Number(requirements.minAssets)
      }
    })

    return NextResponse.json({
      success: true,
      isCompliant,
      platform,
      requirements: {
        minAge: requirements.minAge,
        allowedCountry: requirements.allowedCountry,
        minAssets: requirements.minAssets
      }
    })

  } catch (error: any) {
    console.error('❌ 合规检查失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: "合规检查失败",
        details: error.message,
        isCompliant: false,
        requirements: {
          minAge: 18,
          allowedCountry: 156,
          minAssets: 10000
        }
      },
      { status: 500 }
    )
  }
}

// POST方法 - 批量检查多个平台
export async function POST(request: NextRequest) {
  try {
    const { address, platforms } = await request.json()

    if (!address || !platforms || !Array.isArray(platforms)) {
      return NextResponse.json(
        { error: "缺少必需参数: address, platforms (array)" },
        { status: 400 }
      )
    }

    console.log('🔍 批量检查平台合规状态:', { address, platforms })

    // 创建只读客户端
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY')
    })

    const registry = new ZKRWARegistryContract(publicClient, undefined, sepolia.id)

    // 批量检查合规状态
    const results = await Promise.all(
      platforms.map(async (platform: string) => {
        try {
          const isCompliant = await registry.checkCompliance(
            address as `0x${string}`,
            platform
          )

          const requirements = {
            minAge: 18,
            allowedCountry: 156,
            minAssets: 10000
          }

          return {
            platform,
            isCompliant,
            requirements: {
              minAge: requirements.minAge,
              allowedCountry: requirements.allowedCountry,
              minAssets: requirements.minAssets
            },
            error: null
          }
        } catch (error: any) {
          return {
            platform,
            isCompliant: false,
            requirements: {
              minAge: 18,
              allowedCountry: 156,
              minAssets: 10000
            },
            error: error.message
          }
        }
      })
    )

    console.log('✅ 批量合规检查完成:', results)

    return NextResponse.json({
      success: true,
      address,
      results
    })

  } catch (error: any) {
    console.error('❌ 批量合规检查失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: "批量合规检查失败",
        details: error.message
      },
      { status: 500 }
    )
  }
}









