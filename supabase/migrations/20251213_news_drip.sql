-- News Intelligence + Drip Engine v1
-- supabase/migrations/20251213_news_drip.sql

-- 1. News Sources
create table if not exists news_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null, -- null = global/system source
  name text not null,
  type text not null, -- 'rss' | 'api'
  url text not null,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_news_sources_user on news_sources(user_id);
create index if not exists idx_news_sources_active on news_sources(active) where active = true;

-- 2. News Articles Cache
create table if not exists news_articles_cache (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text not null,
  source text,
  published_at timestamptz,
  author text,
  content_text text,
  summary text,
  key_points jsonb, -- ["...", "..."]
  topics jsonb, -- ["rates", "cre", "labor"]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_news_articles_cache_url on news_articles_cache(url);
create index if not exists idx_news_articles_cache_published on news_articles_cache(published_at desc);
create index if not exists idx_news_articles_cache_topics on news_articles_cache using gin(topics);

-- 3. Contact News Preferences
create table if not exists contact_news_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  enabled boolean default true,
  frequency text default 'weekly', -- 'daily' | 'weekly' | 'monthly'
  max_per_week int default 1,
  keywords jsonb, -- ["construction", "CRE", "labor"]
  exclude_keywords jsonb, -- ["politics", "sports"]
  preferred_sources jsonb, -- ["source1", "source2"]
  last_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, contact_id)
);

create index if not exists idx_contact_news_prefs_user on contact_news_preferences(user_id);
create index if not exists idx_contact_news_prefs_contact on contact_news_preferences(contact_id);
create index if not exists idx_contact_news_prefs_enabled on contact_news_preferences(user_id, enabled) where enabled = true;

-- 4. News Recommendations
create table if not exists news_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  article_url text not null,
  score numeric default 0,
  reason text, -- why matched
  status text default 'suggested', -- 'suggested' | 'drafted' | 'sent' | 'dismissed'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_news_recommendations_user on news_recommendations(user_id);
create index if not exists idx_news_recommendations_contact on news_recommendations(contact_id);
create index if not exists idx_news_recommendations_status on news_recommendations(user_id, status);
create index if not exists idx_news_recommendations_article on news_recommendations(article_url);

-- 5. News Email Drafts
create table if not exists news_email_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  contact_id uuid not null references crm_contacts(id) on delete cascade,
  article_url text not null,
  recommendation_id uuid references news_recommendations(id) on delete set null,
  subject text not null,
  body text not null,
  status text default 'draft', -- 'draft' | 'approved' | 'sent' | 'discarded'
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_news_email_drafts_user on news_email_drafts(user_id);
create index if not exists idx_news_email_drafts_contact on news_email_drafts(contact_id);
create index if not exists idx_news_email_drafts_status on news_email_drafts(user_id, status);
create index if not exists idx_news_email_drafts_article on news_email_drafts(article_url);

-- Seed some default RSS sources (user_id = null = global)
insert into news_sources (name, type, url, active) values
  ('WSJ Business', 'rss', 'https://feeds.a.dj.com/rss/RSSOpinion.xml', true),
  ('WSJ Markets', 'rss', 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', true),
  ('Reuters Business', 'rss', 'https://feeds.reuters.com/reuters/businessNews', true),
  ('Bloomberg', 'rss', 'https://feeds.bloomberg.com/markets/news.rss', true)
on conflict do nothing;

