/*
  # Meme Community Platform Schema
  
  1. New Tables
    - `communities`
      - Basic community information (name, avatar, telegram info)
      - Performance metrics (win rates, signal counts, trading volume)
    - `campaigns`
      - Campaign details (meme token, prize pool, dates)
      - Status tracking (live/past)
    - `meme_tokens`
      - Token information (symbol, contract, chain, market data)
    - `community_signals`
      - Trading signals from community leaders
      - Buy/sell signals with pricing
    - `user_wallets`
      - User wallet connections
      - Balance tracking
    - `campaign_registrations`
      - Community registrations for campaigns
    - `commissions`
      - Commission tracking for group owners
    - `withdrawals`
      - Withdrawal history
      
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Communities table
CREATE TABLE IF NOT EXISTS communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  telegram_group_id text UNIQUE,
  telegram_group_name text,
  owner_telegram_id text,
  owner_telegram_username text,
  owner_avatar_url text,
  member_count integer DEFAULT 0,
  win_rate_10m numeric DEFAULT 0,
  win_rate_1h numeric DEFAULT 0,
  win_rate_24h numeric DEFAULT 0,
  signal_count_24h integer DEFAULT 0,
  trading_volume numeric DEFAULT 0,
  top_tokens jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Meme tokens table
CREATE TABLE IF NOT EXISTS meme_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  name text,
  contract_address text UNIQUE NOT NULL,
  chain text DEFAULT 'base',
  logo_url text,
  description text,
  market_cap numeric DEFAULT 0,
  price numeric DEFAULT 0,
  liquidity numeric DEFAULT 0,
  volume_24h numeric DEFAULT 0,
  volume_1h numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meme_token_id uuid REFERENCES meme_tokens(id),
  prize_pool numeric NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text DEFAULT 'live' CHECK (status IN ('live', 'past')),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Campaign registrations
CREATE TABLE IF NOT EXISTS campaign_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id),
  community_id uuid REFERENCES communities(id),
  mindshare numeric DEFAULT 0,
  mindshare_1h_change numeric DEFAULT 0,
  registered_at timestamptz DEFAULT now(),
  UNIQUE(campaign_id, community_id)
);

-- Community signals (trading signals)
CREATE TABLE IF NOT EXISTS community_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id),
  meme_token_id uuid REFERENCES meme_tokens(id),
  signal_type text NOT NULL CHECK (signal_type IN ('leader_buy', 'member_follow')),
  initiator_name text NOT NULL,
  initiator_avatar text,
  initiator_wallet text,
  price numeric NOT NULL,
  amount numeric NOT NULL,
  signal_time timestamptz DEFAULT now(),
  relative_time_minutes integer
);

-- User wallets
CREATE TABLE IF NOT EXISTS user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address text UNIQUE NOT NULL,
  is_connected boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- User holdings
CREATE TABLE IF NOT EXISTS user_holdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meme_token_id uuid REFERENCES meme_tokens(id),
  balance numeric DEFAULT 0,
  avg_buy_price numeric DEFAULT 0,
  total_bought numeric DEFAULT 0,
  total_sold numeric DEFAULT 0,
  realized_profit numeric DEFAULT 0,
  unrealized_profit numeric DEFAULT 0,
  last_buy_time timestamptz,
  holding_duration_hours integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Commissions
CREATE TABLE IF NOT EXISTS commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id),
  amount numeric NOT NULL,
  source_type text CHECK (source_type IN ('trading_fee', 'campaign_reward')),
  is_withdrawn boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id),
  amount numeric NOT NULL,
  wallet_address text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  transaction_hash text,
  created_at timestamptz DEFAULT now()
);

-- Community discussions (AI summaries)
CREATE TABLE IF NOT EXISTS community_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid REFERENCES communities(id),
  meme_token_id uuid REFERENCES meme_tokens(id),
  campaign_id uuid REFERENCES campaigns(id),
  ai_summary text NOT NULL,
  engagement_score integer DEFAULT 0,
  discussion_time timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE meme_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_discussions ENABLE ROW LEVEL SECURITY;

-- Public read policies for communities
CREATE POLICY "Communities are viewable by everyone"
  ON communities FOR SELECT
  TO authenticated, anon
  USING (true);

-- Public read policies for meme_tokens
CREATE POLICY "Meme tokens are viewable by everyone"
  ON meme_tokens FOR SELECT
  TO authenticated, anon
  USING (true);

-- Public read policies for campaigns
CREATE POLICY "Campaigns are viewable by everyone"
  ON campaigns FOR SELECT
  TO authenticated, anon
  USING (true);

-- Public read policies for campaign registrations
CREATE POLICY "Campaign registrations are viewable by everyone"
  ON campaign_registrations FOR SELECT
  TO authenticated, anon
  USING (true);

-- Public read policies for signals
CREATE POLICY "Community signals are viewable by everyone"
  ON community_signals FOR SELECT
  TO authenticated, anon
  USING (true);

-- Public read policies for discussions
CREATE POLICY "Community discussions are viewable by everyone"
  ON community_discussions FOR SELECT
  TO authenticated, anon
  USING (true);

-- User wallet policies
CREATE POLICY "Users can view own wallets"
  ON user_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON user_wallets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User holdings policies
CREATE POLICY "Users can view own holdings"
  ON user_holdings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Commission policies
CREATE POLICY "Community owners can view their commissions"
  ON commissions FOR SELECT
  TO authenticated
  USING (true);

-- Withdrawal policies
CREATE POLICY "Community owners can view their withdrawals"
  ON withdrawals FOR SELECT
  TO authenticated
  USING (true);
