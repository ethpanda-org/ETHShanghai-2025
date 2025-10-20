import { drizzle } from "drizzle-orm/mysql2";
import { suppliers, payments } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seedData() {
  console.log("🌱 开始生成测试数据...");

  // 清空现有数据
  console.log("清空现有数据...");
  await db.delete(payments);
  await db.delete(suppliers);

  // 创建测试供应商
  const testSuppliers = [
    {
      address: "0x1234567890123456789012345678901234567890",
      name: "科技供应商 A",
      brand: "TechBrand",
      category: "技术服务",
      profitMargin: 1500, // 15%
      totalReceived: "5000000000000000000", // 5 ETH
      isActive: true,
    },
    {
      address: "0x2345678901234567890123456789012345678901",
      name: "原材料供应商 B",
      brand: "MaterialCo",
      category: "原材料",
      profitMargin: 1200, // 12%
      totalReceived: "3000000000000000000", // 3 ETH
      isActive: true,
    },
    {
      address: "0x3456789012345678901234567890123456789012",
      name: "物流服务商 C",
      brand: "LogisticsPro",
      category: "物流运输",
      profitMargin: 800, // 8%
      totalReceived: "2000000000000000000", // 2 ETH
      isActive: true,
    },
    {
      address: "0x4567890123456789012345678901234567890123",
      name: "设计咨询公司 D",
      brand: "DesignHub",
      category: "咨询服务",
      profitMargin: 2000, // 20%
      totalReceived: "1500000000000000000", // 1.5 ETH
      isActive: true,
    },
    {
      address: "0x5678901234567890123456789012345678901234",
      name: "云服务提供商 E",
      brand: "CloudServe",
      category: "云计算",
      profitMargin: 1800, // 18%
      totalReceived: "4000000000000000000", // 4 ETH
      isActive: true,
    },
  ];

  console.log("插入供应商数据...");
  for (const supplier of testSuppliers) {
    await db.insert(suppliers).values(supplier);
  }

  // 创建测试支付记录
  const testPayments = [
    {
      paymentId: "1",
      fromAddress: "0x0000000000000000000000000000000000000001",
      toAddress: testSuppliers[0].address,
      amount: "2000000000000000000", // 2 ETH
      category: "技术服务",
      status: "Completed" as const,
      txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      blockNumber: 1000000,
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7天前
    },
    {
      paymentId: "2",
      fromAddress: "0x0000000000000000000000000000000000000001",
      toAddress: testSuppliers[1].address,
      amount: "1500000000000000000", // 1.5 ETH
      category: "原材料",
      status: "Completed" as const,
      txHash: "0xbcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678901",
      blockNumber: 1000100,
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6天前
    },
    {
      paymentId: "3",
      fromAddress: "0x0000000000000000000000000000000000000001",
      toAddress: testSuppliers[2].address,
      amount: "1000000000000000000", // 1 ETH
      category: "物流运输",
      status: "Completed" as const,
      txHash: "0xcdef1234567890abcdef1234567890abcdef1234567890abcdef123456789012",
      blockNumber: 1000200,
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5天前
    },
    {
      paymentId: "4",
      fromAddress: "0x0000000000000000000000000000000000000001",
      toAddress: testSuppliers[3].address,
      amount: "800000000000000000", // 0.8 ETH
      category: "咨询服务",
      status: "Completed" as const,
      txHash: "0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890123",
      blockNumber: 1000300,
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4天前
    },
    {
      paymentId: "5",
      fromAddress: "0x0000000000000000000000000000000000000001",
      toAddress: testSuppliers[4].address,
      amount: "2500000000000000000", // 2.5 ETH
      category: "云计算",
      status: "Completed" as const,
      txHash: "0xef1234567890abcdef1234567890abcdef1234567890abcdef12345678901234",
      blockNumber: 1000400,
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
    },
    {
      paymentId: "6",
      fromAddress: "0x0000000000000000000000000000000000000001",
      toAddress: testSuppliers[0].address,
      amount: "3000000000000000000", // 3 ETH
      category: "技术服务",
      status: "Completed" as const,
      txHash: "0xf1234567890abcdef1234567890abcdef1234567890abcdef123456789012345",
      blockNumber: 1000500,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
    },
    {
      paymentId: "7",
      fromAddress: "0x0000000000000000000000000000000000000001",
      toAddress: testSuppliers[1].address,
      amount: "1500000000000000000", // 1.5 ETH
      category: "原材料",
      status: "Completed" as const,
      txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      blockNumber: 1000600,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
    },
    {
      paymentId: "8",
      fromAddress: "0x0000000000000000000000000000000000000001",
      toAddress: testSuppliers[2].address,
      amount: "1000000000000000000", // 1 ETH
      category: "物流运输",
      status: "Completed" as const,
      txHash: "0x234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1",
      blockNumber: 1000700,
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12小时前
    },
    {
      paymentId: "9",
      fromAddress: "0x0000000000000000000000000000000000000001",
      toAddress: testSuppliers[3].address,
      amount: "700000000000000000", // 0.7 ETH
      category: "咨询服务",
      status: "Completed" as const,
      txHash: "0x34567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
      blockNumber: 1000800,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6小时前
    },
    {
      paymentId: "10",
      fromAddress: "0x0000000000000000000000000000000000000001",
      toAddress: testSuppliers[4].address,
      amount: "1500000000000000000", // 1.5 ETH
      category: "云计算",
      status: "Completed" as const,
      txHash: "0x4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123",
      blockNumber: 1000900,
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1小时前
    },
  ];

  console.log("插入支付记录...");
  for (const payment of testPayments) {
    await db.insert(payments).values(payment);
  }

  console.log("✅ 测试数据生成完成!");
  console.log(`   - 供应商: ${testSuppliers.length} 个`);
  console.log(`   - 支付记录: ${testPayments.length} 笔`);
  console.log(`   - 总金额: 15.5 ETH`);
}

seedData()
  .then(() => {
    console.log("🎉 数据库填充成功!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ 数据库填充失败:", error);
    process.exit(1);
  });

