-- 创建 contracts 表
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  sender_address TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  amount TEXT NOT NULL,
  token_address TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
  verification_method TEXT NOT NULL,
  verification_email TEXT,
  transaction_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_contracts_order_id ON contracts(order_id);
CREATE INDEX IF NOT EXISTS idx_contracts_sender ON contracts(sender_address);
CREATE INDEX IF NOT EXISTS idx_contracts_receiver ON contracts(receiver_address);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);

-- 创建更新时间戳触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 添加注释
COMMENT ON TABLE contracts IS 'PayWay托管合约信息表';
COMMENT ON COLUMN contracts.order_id IS '订单编号（12位数字）';
COMMENT ON COLUMN contracts.sender_address IS '付款方地址';
COMMENT ON COLUMN contracts.receiver_address IS '收款方地址';
COMMENT ON COLUMN contracts.amount IS '托管金额';
COMMENT ON COLUMN contracts.token_address IS '代币合约地址';
COMMENT ON COLUMN contracts.status IS '合约状态：PENDING-托管中, PAID-已完成, CANCELLED-已取消';
COMMENT ON COLUMN contracts.verification_method IS '验证方式：email-邮箱, enterprise_sign-企业签名';
COMMENT ON COLUMN contracts.verification_email IS '验证邮箱地址';
COMMENT ON COLUMN contracts.transaction_hash IS '交易哈希';

