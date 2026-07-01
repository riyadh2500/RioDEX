-- ============================================================
--  DEX DApp — Supabase Database Setup
--  Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  EXTENSIONS
-- ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";


-- ────────────────────────────────────────────────────────────
--  TOKENS
--  One row per ERC-20 token deployed via TokenFactory (or
--  manually indexed).
-- ────────────────────────────────────────────────────────────
create table if not exists tokens (
  id            uuid          primary key default uuid_generate_v4(),
  address       text          not null unique,   -- lowercase checksummed address
  name          text          not null,
  symbol        text          not null,
  decimals      smallint      not null default 18,
  logo_url      text,                            -- IPFS / CDN URL
  chain_id      integer       not null default 31337,
  created_by    text,                            -- creator wallet address
  total_supply  text,                            -- raw BigInt string
  created_at    timestamptz   not null default now()
);

create index if not exists tokens_created_by_idx on tokens (created_by);
create index if not exists tokens_chain_id_idx   on tokens (chain_id);


-- ────────────────────────────────────────────────────────────
--  PAIRS
--  One row per DEXPair contract (AMM pool).
-- ────────────────────────────────────────────────────────────
create table if not exists pairs (
  id              uuid        primary key default uuid_generate_v4(),
  pair_address    text        not null unique,
  token0_address  text        not null references tokens (address),
  token1_address  text        not null references tokens (address),
  chain_id        integer     not null default 31337,
  reserve0        text        not null default '0',  -- raw BigInt string
  reserve1        text        not null default '0',
  total_supply    text        not null default '0',
  tvl_usd         numeric,
  volume_24h_usd  numeric     default 0,
  fee_tier        numeric     not null default 0.003, -- 0.3 %
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists pairs_token0_idx  on pairs (token0_address);
create index if not exists pairs_token1_idx  on pairs (token1_address);
create index if not exists pairs_chain_id_idx on pairs (chain_id);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pairs_updated_at on pairs;
create trigger pairs_updated_at
  before update on pairs
  for each row execute function set_updated_at();


-- ────────────────────────────────────────────────────────────
--  SWAP EVENTS
--  One row per Swap event emitted by a DEXPair.
-- ────────────────────────────────────────────────────────────
create table if not exists swap_events (
  id              uuid        primary key default uuid_generate_v4(),
  tx_hash         text        not null,
  pair_address    text        not null,
  sender          text        not null,           -- msg.sender (router)
  recipient       text        not null,           -- "to" address
  token_in        text        not null,           -- address
  token_out       text        not null,           -- address
  amount_in       text        not null,           -- raw BigInt string
  amount_out      text        not null,
  value_usd       numeric,
  block_number    bigint,
  chain_id        integer     not null default 31337,
  created_at      timestamptz not null default now()
);

create index if not exists swap_events_sender_idx       on swap_events (sender);
create index if not exists swap_events_pair_idx         on swap_events (pair_address);
create index if not exists swap_events_token_in_idx     on swap_events (token_in);
create index if not exists swap_events_created_at_idx   on swap_events (created_at desc);


-- ────────────────────────────────────────────────────────────
--  LIQUIDITY EVENTS
--  Tracks Mint (add) and Burn (remove) events.
-- ────────────────────────────────────────────────────────────
create table if not exists liquidity_events (
  id              uuid        primary key default uuid_generate_v4(),
  tx_hash         text        not null,
  event_type      text        not null check (event_type in ('mint', 'burn')),
  pair_address    text        not null,
  sender          text        not null,
  amount0         text        not null,           -- raw BigInt string
  amount1         text        not null,
  liquidity       text,                           -- LP tokens minted/burned
  value_usd       numeric,
  block_number    bigint,
  chain_id        integer     not null default 31337,
  created_at      timestamptz not null default now()
);

create index if not exists liq_events_sender_idx  on liquidity_events (sender);
create index if not exists liq_events_pair_idx    on liquidity_events (pair_address);
create index if not exists liq_events_type_idx    on liquidity_events (event_type);


-- ────────────────────────────────────────────────────────────
--  ROW LEVEL SECURITY
--  All tables are readable by anyone (public DEX data).
--  Inserts/updates are restricted to the service role key
--  (used by the Next.js API routes server-side).
-- ────────────────────────────────────────────────────────────
alter table tokens          enable row level security;
alter table pairs           enable row level security;
alter table swap_events     enable row level security;
alter table liquidity_events enable row level security;

-- Public SELECT
create policy "Public read tokens"           on tokens           for select using (true);
create policy "Public read pairs"            on pairs            for select using (true);
create policy "Public read swap_events"      on swap_events      for select using (true);
create policy "Public read liquidity_events" on liquidity_events for select using (true);

-- Service-role INSERT / UPDATE (API routes use SUPABASE_SERVICE_ROLE_KEY)
create policy "Service insert tokens"            on tokens            for insert with check (true);
create policy "Service update tokens"            on tokens            for update using (true);
create policy "Service insert pairs"             on pairs             for insert with check (true);
create policy "Service update pairs"             on pairs             for update using (true);
create policy "Service insert swap_events"       on swap_events       for insert with check (true);
create policy "Service insert liquidity_events"  on liquidity_events  for insert with check (true);


-- ────────────────────────────────────────────────────────────
--  SEED DATA (optional dev tokens — remove for production)
-- ────────────────────────────────────────────────────────────
insert into tokens (address, name, symbol, decimals, logo_url, chain_id)
values
  ('native',  'Ether',     'ETH',  18, '/tokens/eth.svg',  31337),
  ('0xweth',  'Wrapped Ether', 'WETH', 18, '/tokens/eth.svg', 31337),
  ('0xusdc',  'USD Coin',  'USDC',  6, '/tokens/usdc.svg', 31337),
  ('0xusdt',  'Tether USD','USDT',  6, '/tokens/usdt.svg', 31337)
on conflict (address) do nothing;
