#!/usr/bin/env node

/**
 * 验证脚本：检查所有 createOrder 调用是否已修复
 */

const fs = require('fs');
const path = require('path');

console.log("\n" + "=".repeat(70));
console.log("🔍 VERIFICATION: Checking createOrder Calls");
console.log("=".repeat(70) + "\n");

// 要检查的文件
const filesToCheck = [
  './scripts/test-payment-as-buyer.js',
  './scripts/fix-allowance-issue.js',
  './scripts/test-designated-payer.js',
  './scripts/quick-test-order.js'
];

let allCorrect = true;
let totalFiles = 0;
let correctFiles = 0;

filesToCheck.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  totalFiles++;
  console.log(`📄 Checking: ${filePath}`);

  const content = fs.readFileSync(fullPath, 'utf8');

  // 查找所有 createOrder 调用
  const createOrderRegex = /gateway\.(?:connect\([^)]*\)\.)?\s*createOrder\s*\([^)]*\)/g;
  const matches = content.match(createOrderRegex);

  if (!matches) {
    console.log("   No createOrder calls found\n");
    return;
  }

  console.log(`   Found ${matches.length} createOrder call(s)`);

  matches.forEach((match, index) => {
    // 计算参数数量（简化方法：计算逗号数量+1）
    const params = match.match(/createOrder\s*\(([\s\S]*)\)/);
    if (params && params[1]) {
      // 计算逗号数量（排除字符串内的逗号）
      const paramString = params[1];
      const commaCount = (paramString.match(/,/g) || []).length;
      const paramCount = commaCount + 1;

      console.log(`   Call #${index + 1}: ${paramCount} parameters`);

      if (paramCount === 7) {
        console.log(`   ✅ CORRECT: 7 parameters`);

        // 检查是否包含 designatedPayer 参数说明
        if (match.includes('ZeroAddress') || match.includes('0x0000')) {
          console.log(`   📌 Type: PUBLIC order (address(0))`);
        } else if (match.includes('designatedBuyer') || match.includes('buyer.address')) {
          console.log(`   📌 Type: DESIGNATED order (specific buyer)`);
        }
      } else if (paramCount === 6) {
        console.log(`   ❌ ERROR: Only 6 parameters - MISSING designatedPayer!`);
        allCorrect = false;
      } else {
        console.log(`   ⚠️  Unusual parameter count: ${paramCount}`);
      }
    }
  });

  if (allCorrect) {
    correctFiles++;
  }
  console.log("");
});

// 总结
console.log("=".repeat(70));
console.log("📊 VERIFICATION RESULTS");
console.log("=".repeat(70));
console.log(`Files checked: ${totalFiles}`);
console.log(`Files correct: ${correctFiles}`);
console.log(`Files with issues: ${totalFiles - correctFiles}`);

if (allCorrect) {
  console.log("\n✅ ALL FILES ARE CORRECTLY FIXED!");
  console.log("All createOrder calls now have 7 parameters.");
} else {
  console.log("\n❌ SOME FILES STILL NEED FIXING!");
  console.log("Make sure all createOrder calls have 7 parameters:");
  console.log("  1. orderIdString");
  console.log("  2. orderAmount");
  console.log("  3. paymentToken");
  console.log("  4. settlementToken");
  console.log("  5. metadataURI");
  console.log("  6. allowPartialPayment");
  console.log("  7. designatedPayer (address or address(0))");
}

console.log("\n🔑 KEY POINTS:");
console.log("• Use ethers.ZeroAddress for public orders (anyone can pay)");
console.log("• Use specific address for designated orders (only that address can pay)");
console.log("• NEVER omit the 7th parameter!");
console.log("=".repeat(70) + "\n");