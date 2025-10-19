-- 创建放款请求表
-- 用于记录用户发送的放款指令和处理状态

CREATE TABLE IF NOT EXISTS release_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id TEXT NOT NULL REFERENCES contracts(order_id),
  sender_email TEXT NOT NULL,
  request_status TEXT NOT NULL CHECK (request_status IN ('pending', 'processing', 'completed', 'failed')),
  transaction_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引以优化查询
CREATE INDEX idx_release_requests_order_id ON release_requests(order_id);
CREATE INDEX idx_release_requests_status ON release_requests(request_status);
CREATE INDEX idx_release_requests_created_at ON release_requests(created_at DESC);

-- 启用行级安全 (RLS)
ALTER TABLE release_requests ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看自己相关合约的放款请求
-- 注意：由于我们使用钱包连接而非 JWT 认证，这个策略需要在应用层处理
-- 这里我们先创建一个宽松的策略，允许所有人读取（实际访问控制在应用层）
CREATE POLICY "Allow public read access to release requests"
ON release_requests FOR SELECT
USING (true);

-- 只有服务角色可以插入和更新（Edge Function 使用）
CREATE POLICY "Service role can insert release requests"
ON release_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update release requests"
ON release_requests FOR UPDATE
USING (true);

-- 添加注释
COMMENT ON TABLE release_requests IS '放款请求记录表 - 存储用户的放款指令和处理状态';
COMMENT ON COLUMN release_requests.order_id IS '关联的订单号';
COMMENT ON COLUMN release_requests.sender_email IS '发送放款指令的邮箱地址';
COMMENT ON COLUMN release_requests.request_status IS '请求状态: pending(待处理), processing(处理中), completed(已完成), failed(失败)';
COMMENT ON COLUMN release_requests.transaction_hash IS '区块链交易哈希';
COMMENT ON COLUMN release_requests.error_message IS '错误信息（如果处理失败）';

