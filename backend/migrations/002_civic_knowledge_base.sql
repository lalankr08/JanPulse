-- Migration 002: Civic Knowledge Base & Zero-Token Fast Path
create extension if not exists pg_trgm;
create extension if not exists vector;

-- 1. Central & State Civic Schemes Knowledge Base
create table if not exists civic_schemes_kb (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null,
    name text not null,
    name_hi text,
    category text not null,
    ministry text,
    level text default 'central',
    benefit_summary text not null,
    benefit_summary_hi text,
    eligibility_criteria jsonb not null default '[]'::jsonb,
    exclusions jsonb not null default '[]'::jsonb,
    documents_required jsonb not null default '[]'::jsonb,
    application_url text not null,
    common_misconceptions text[] default '{}',
    embedding vector(768),
    tsv tsvector generated always as (
        to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(benefit_summary, '') || ' ' || coalesce(name_hi, '') || ' ' || coalesce(category, ''))
    ) stored,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_schemes_kb_vec on civic_schemes_kb using hnsw (embedding vector_cosine_ops);
create index if not exists idx_schemes_kb_fts on civic_schemes_kb using gin (tsv);
create index if not exists idx_schemes_kb_trgm on civic_schemes_kb using gin (name gin_trgm_ops);
create index if not exists idx_schemes_kb_slug on civic_schemes_kb (slug);

-- 2. PIB Fact-Check & Viral Rumor Registry
create table if not exists pib_debunks_kb (
    id uuid primary key default gen_random_uuid(),
    claim_text text not null,
    debunk_verdict text not null default 'contradicted',
    official_explanation text not null,
    official_explanation_hi text,
    correct_fact text not null,
    source_url text not null,
    publisher text default 'PIB Fact Check Unit',
    published_date date default current_date,
    embedding vector(768),
    tsv tsvector generated always as (
        to_tsvector('simple', coalesce(claim_text, '') || ' ' || coalesce(correct_fact, '') || ' ' || coalesce(official_explanation, ''))
    ) stored,
    created_at timestamptz default now()
);

create index if not exists idx_pib_debunks_trgm on pib_debunks_kb using gin (claim_text gin_trgm_ops);
create index if not exists idx_pib_debunks_fts on pib_debunks_kb using gin (tsv);
create index if not exists idx_pib_debunks_vec on pib_debunks_kb using hnsw (embedding vector_cosine_ops);

-- 3. Exact and Semantic Verdict Cache (Zero-Token Returns for Repeated Queries)
create table if not exists verdict_cache (
    query_hash text primary key,
    raw_query text not null,
    verdicts jsonb not null,
    sources jsonb not null,
    language text default 'en',
    hit_count int default 1,
    created_at timestamptz default now(),
    last_hit_at timestamptz default now(),
    expires_at timestamptz default (now() + interval '14 days')
);

create index if not exists idx_verdict_cache_hash on verdict_cache (query_hash);
create index if not exists idx_verdict_cache_expires on verdict_cache (expires_at);

-- 4. Standalone Public Share Cards Table
create table if not exists public_share_cards (
    share_id text primary key,
    claim_text text,
    kind text default 'forward',
    label text,
    confidence numeric,
    confidence_reason text,
    explanation text,
    explanation_lang text,
    citations jsonb default '[]'::jsonb,
    created_at timestamptz default now()
);

create index if not exists idx_public_share_cards_created on public_share_cards (created_at desc);

-- 5. Fast Matching Stored Procedures
-- A. Fast Trigram Match for PIB Debunks (Sub-10ms match for viral claims)
create or replace function match_pib_debunk(
    p_query text,
    p_min_sim float default 0.45
)
returns table (
    id uuid,
    claim_text text,
    debunk_verdict text,
    official_explanation text,
    official_explanation_hi text,
    correct_fact text,
    source_url text,
    publisher text,
    similarity float
)
language sql stable as $$
    select
        d.id,
        d.claim_text,
        d.debunk_verdict,
        d.official_explanation,
        d.official_explanation_hi,
        d.correct_fact,
        d.source_url,
        d.publisher,
        similarity(d.claim_text, p_query)::float as similarity
    from pib_debunks_kb d
    where similarity(d.claim_text, p_query) >= p_min_sim
       or d.tsv @@ plainto_tsquery('simple', p_query)
    order by similarity desc
    limit 1;
$$;

-- B. Fast Search for Schemes Knowledge Base
create or replace function search_schemes_kb(
    p_query text,
    p_limit int default 3
)
returns table (
    id uuid,
    slug text,
    name text,
    name_hi text,
    category text,
    benefit_summary text,
    benefit_summary_hi text,
    eligibility_criteria jsonb,
    exclusions jsonb,
    documents_required jsonb,
    application_url text,
    score float
)
language sql stable as $$
    select
        s.id,
        s.slug,
        s.name,
        s.name_hi,
        s.category,
        s.benefit_summary,
        s.benefit_summary_hi,
        s.eligibility_criteria,
        s.exclusions,
        s.documents_required,
        s.application_url,
        (similarity(s.name, p_query) * 2.0 + coalesce(ts_rank(s.tsv, plainto_tsquery('simple', p_query)), 0.0))::float as score
    from civic_schemes_kb s
    where similarity(s.name, p_query) > 0.25
       or s.tsv @@ plainto_tsquery('simple', p_query)
       or exists (
           select 1 from unnest(s.common_misconceptions) m
           where similarity(m, p_query) > 0.35
       )
    order by score desc
    limit p_limit;
$$;

-- RLS Public Read Access
alter table civic_schemes_kb enable row level security;
alter table pib_debunks_kb enable row level security;
alter table verdict_cache enable row level security;
alter table public_share_cards enable row level security;

drop policy if exists read_civic_schemes_kb on civic_schemes_kb;
create policy read_civic_schemes_kb on civic_schemes_kb for select using (true);

drop policy if exists read_pib_debunks_kb on pib_debunks_kb;
create policy read_pib_debunks_kb on pib_debunks_kb for select using (true);

drop policy if exists read_verdict_cache on verdict_cache;
create policy read_verdict_cache on verdict_cache for select using (true);

drop policy if exists read_public_share_cards on public_share_cards;
create policy read_public_share_cards on public_share_cards for select using (true);
