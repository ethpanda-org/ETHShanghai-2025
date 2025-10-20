-- Supabase Table Setup for AetherPay Payment Orders
-- Execute this SQL in your Supabase Dashboard SQL Editor
-- URL: https://supabase.com/dashboard/project/mrmltmfxwtryntdmorod/sql/new

-- Create the payment_orders table
CREATE TABLE IF NOT EXISTS payment_orders (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  order_id_bytes32 TEXT NOT NULL,
  payer_address TEXT NOT NULL,
  merchant_address TEXT NOT NULL,
  amount DECIMAL(20,6) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  token_address TEXT NOT NULL,
  settlement_token TEXT,
  status INTEGER NOT NULL DEFAULT 1,
  transaction_hash TEXT,
  block_number BIGINT,
  metadata_uri TEXT,
  description TEXT,
  buyer_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX idx_payer_address ON payment_orders(payer_address);
CREATE INDEX idx_merchant_address ON payment_orders(merchant_address);
CREATE INDEX idx_order_id ON payment_orders(order_id);
CREATE INDEX idx_status ON payment_orders(status);
CREATE INDEX idx_created_at ON payment_orders(created_at);
CREATE INDEX idx_paid_at ON payment_orders(paid_at);

-- Enable Row Level Security (RLS)
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anonymous users to read all orders
CREATE POLICY "Allow anonymous read access" ON payment_orders
  FOR SELECT
  USING (true);

-- Create a policy that allows anonymous users to insert orders
CREATE POLICY "Allow anonymous insert access" ON payment_orders
  FOR INSERT
  WITH CHECK (true);

-- Create a policy that allows anonymous users to update orders
CREATE POLICY "Allow anonymous update access" ON payment_orders
  FOR UPDATE
  USING (true);

-- Add comment to table
COMMENT ON TABLE payment_orders IS 'Stores payment orders from AetherPay payment gateway';

-- Add comments to columns
COMMENT ON COLUMN payment_orders.order_id IS 'Human-readable order ID';
COMMENT ON COLUMN payment_orders.order_id_bytes32 IS 'Bytes32 hash of the order ID used on blockchain';
COMMENT ON COLUMN payment_orders.payer_address IS 'Ethereum address of the payer';
COMMENT ON COLUMN payment_orders.merchant_address IS 'Ethereum address of the merchant';
COMMENT ON COLUMN payment_orders.amount IS 'Payment amount in token units (6 decimals for USDC)';
COMMENT ON COLUMN payment_orders.token_symbol IS 'Symbol of the payment token (e.g., USDC)';
COMMENT ON COLUMN payment_orders.token_address IS 'Contract address of the payment token';
COMMENT ON COLUMN payment_orders.settlement_token IS 'Token address for settlement (if different from payment token)';
COMMENT ON COLUMN payment_orders.status IS 'Payment status: 1=pending, 2=paid, 3=cancelled';
COMMENT ON COLUMN payment_orders.transaction_hash IS 'Blockchain transaction hash of the payment';
COMMENT ON COLUMN payment_orders.block_number IS 'Block number when payment was made';
COMMENT ON COLUMN payment_orders.metadata_uri IS 'IPFS URI containing order metadata';
COMMENT ON COLUMN payment_orders.description IS 'Order description from metadata';
COMMENT ON COLUMN payment_orders.buyer_email IS 'Buyer email from metadata';
COMMENT ON COLUMN payment_orders.created_at IS 'Timestamp when order was created';
COMMENT ON COLUMN payment_orders.paid_at IS 'Timestamp when payment was completed';