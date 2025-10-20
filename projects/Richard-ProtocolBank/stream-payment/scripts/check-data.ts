import { drizzle } from "drizzle-orm/mysql2";
import { suppliers, payments } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function checkData() {
  console.log("📊 检查数据库数据...\n");

  const supplierList = await db.select().from(suppliers);
  const paymentList = await db.select().from(payments);

  console.log(`供应商数量: ${supplierList.length}`);
  console.log(`支付记录数量: ${paymentList.length}\n`);

  if (supplierList.length > 0) {
    console.log("示例供应商:");
    console.log(JSON.stringify(supplierList[0], null, 2));
  }

  if (paymentList.length > 0) {
    console.log("\n示例支付:");
    console.log(JSON.stringify(paymentList[0], null, 2));
  }
}

checkData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("错误:", error);
    process.exit(1);
  });

