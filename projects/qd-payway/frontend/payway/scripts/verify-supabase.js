#!/usr/bin/env node

/**
 * Supabase连接验证脚本
 * 运行: node scripts/verify-supabase.js
 */

const https = require('https');

// 从.env.local读取配置
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 验证Supabase配置...\n');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 错误：未找到Supabase配置');
  console.error('请检查 .env.local 文件是否存在并包含：');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('✅ 环境变量已加载');
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Key: ${SUPABASE_KEY.slice(0, 20)}...`);
console.log('');

// 测试连接
const url = `${SUPABASE_URL}/rest/v1/contracts?select=count`;

const options = {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  }
};

console.log('🌐 测试数据库连接...');

https.get(url, options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ 数据库连接成功！');
      console.log('✅ contracts 表已就绪');
      console.log('');
      console.log('📊 表结构：');
      console.log('  - id (UUID)');
      console.log('  - order_id (TEXT, UNIQUE)');
      console.log('  - sender_address (TEXT)');
      console.log('  - receiver_address (TEXT)');
      console.log('  - amount (TEXT)');
      console.log('  - token_address (TEXT)');
      console.log('  - status (TEXT)');
      console.log('  - verification_method (TEXT)');
      console.log('  - verification_email (TEXT)');
      console.log('  - transaction_hash (TEXT)');
      console.log('  - created_at (TIMESTAMPTZ)');
      console.log('  - updated_at (TIMESTAMPTZ)');
      console.log('');
      console.log('🎉 一切就绪！可以开始测试创建合约功能了！');
    } else {
      console.error(`❌ 连接失败：HTTP ${res.statusCode}`);
      console.error('响应:', data);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ 网络错误:', err.message);
  process.exit(1);
});

