-- Initial schema for Jan-Pulse
create extension if not exists vector;
create extension if not exists pg_trgm;

do $$ begin
  create type verdict_label as enum ('supported', 'contradicted', 'partly_supported', 'cannot_verify');
exception
  when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  preferred_language text default 'en',
  state_code text,
  saved_profile jsonb,
  created_at timestamptz default now()
);

create table if not exists queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_type text check (input_type in ('text','image','audio','url','pdf')),
  raw_text text,
  storage_path text,
  detected_lang text,
  created_at timestamptz default now()
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  query_id uuid references queries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text check (kind in ('forward','eligibility','notification','followup')),
  status text default 'running',
  graph_version text,
  iterations int default 0,
  tokens_in int, tokens_out int,
  started_at timestamptz default now(),
  finished_at timestamptz
);

create table if not exists trace_events (
  id bigserial primary key,
  run_id uuid not null references agent_runs(id) on delete cascade,
  seq int not null,
  node text, event_type text, tool text, url text,
  model text,
  http_status int, latency_ms int,
  detail jsonb,
  created_at timestamptz default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  url text unique not null,
  publisher text,
  source_type text,
  title text,
  http_status int,
  fetched_at timestamptz not null,
  ttl_seconds int default 3600,
  content_hash text,
  raw_text text
);

create table if not exists source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  chunk_index int,
  heading_path text,
  content text not null,
  lang text,
  embedding vector(768),
  tsv tsvector generated always as (to_tsvector('simple', content)) stored
);

create index if not exists source_chunks_vec_idx on source_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists source_chunks_fts_idx on source_chunks using gin (tsv);
create index if not exists sources_type_idx on sources (source_type);

create table if not exists scheme_facts (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete cascade,
  scheme_name text,
  criteria jsonb,
  documents jsonb,
  apply_steps jsonb,
  model text,
  extracted_at timestamptz default now()
);

create table if not exists claims (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs(id) on delete cascade,
  claim_text text not null,
  claim_text_en text,
  kind text
);

create table if not exists verdicts (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references claims(id) on delete cascade,
  run_id uuid not null references agent_runs(id) on delete cascade,
  label verdict_label not null,
  confidence numeric,
  confidence_reason text,
  explanation text,
  explanation_lang text,
  share_id text unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz default now()
);

create table if not exists citations (
  id uuid primary key default gen_random_uuid(),
  verdict_id uuid not null references verdicts(id) on delete cascade,
  source_id uuid not null references sources(id),
  chunk_id uuid references source_chunks(id),
  role text check (role in ('supports','contradicts','context')),
  span text,
  fetched_at timestamptz
);

create table if not exists eligibility_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references agent_runs(id) on delete cascade,
  scheme_source_id uuid references sources(id),
  answers jsonb,
  result text check (result in ('eligible','not_eligible','need_more_info')),
  missing_documents jsonb,
  created_at timestamptz default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  verdict_id uuid references verdicts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rating int, comment text,
  created_at timestamptz default now()
);

create table if not exists mcp_calls (
  id bigserial primary key,
  tool text, caller text, latency_ms int, ok boolean,
  created_at timestamptz default now()
);

-- Row-level security
alter table profiles enable row level security;
alter table queries enable row level security;
alter table agent_runs enable row level security;
alter table trace_events enable row level security;
alter table claims enable row level security;
alter table verdicts enable row level security;
alter table citations enable row level security;
alter table eligibility_sessions enable row level security;
alter table feedback enable row level security;
alter table sources enable row level security;
alter table source_chunks enable row level security;
alter table scheme_facts enable row level security;
alter table mcp_calls enable row level security;

-- Policies (drop if exists then recreate to allow safe reruns)
drop policy if exists own_profile on profiles;
create policy own_profile on profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists own_queries on queries;
create policy own_queries on queries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists own_runs on agent_runs;
create policy own_runs on agent_runs for select using (user_id = auth.uid());

drop policy if exists own_trace on trace_events;
create policy own_trace on trace_events for select
  using (exists (select 1 from agent_runs r where r.id = run_id and r.user_id = auth.uid()));

drop policy if exists own_claims on claims;
create policy own_claims on claims for select
  using (exists (select 1 from agent_runs r where r.id = run_id and r.user_id = auth.uid()));

drop policy if exists own_verdicts on verdicts;
create policy own_verdicts on verdicts for select
  using (exists (select 1 from agent_runs r where r.id = run_id and r.user_id = auth.uid()));

drop policy if exists own_citations on citations;
create policy own_citations on citations for select
  using (exists (select 1 from verdicts v join agent_runs r on r.id = v.run_id
                 where v.id = verdict_id and r.user_id = auth.uid()));

drop policy if exists own_elig on eligibility_sessions;
create policy own_elig on eligibility_sessions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists own_feedback on feedback;
create policy own_feedback on feedback for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists read_sources on sources;
create policy read_sources on sources for select using (true);

drop policy if exists read_chunks on source_chunks;
create policy read_chunks on source_chunks for select using (true);

drop policy if exists read_scheme_facts on scheme_facts;
create policy read_scheme_facts on scheme_facts for select using (true);

-- Hybrid Search Function
create or replace function hybrid_search(
  query_text text,
  query_embedding vector(768),
  match_count int default 12,
  source_types text[] default null
) returns table (chunk_id uuid, source_id uuid, content text, score float)
language sql stable as $$
  with vec as (
    select c.id, row_number() over (order by c.embedding <=> query_embedding) as rnk
    from source_chunks c join sources s on s.id = c.source_id
    where source_types is null or s.source_type = any(source_types)
    order by c.embedding <=> query_embedding
    limit 40
  ),
  fts as (
    select c.id,
           row_number() over (order by ts_rank(c.tsv, websearch_to_tsquery('simple', query_text)) desc) as rnk
    from source_chunks c join sources s on s.id = c.source_id
    where c.tsv @@ websearch_to_tsquery('simple', query_text)
      and (source_types is null or s.source_type = any(source_types))
    order by ts_rank(c.tsv, websearch_to_tsquery('simple', query_text)) desc
    limit 40
  )
  select c.id, c.source_id, c.content,
         coalesce(1.0 / (60 + vec.rnk), 0) + coalesce(1.0 / (60 + fts.rnk), 0) as score
  from source_chunks c
  left join vec on vec.id = c.id
  left join fts on fts.id = c.id
  where vec.id is not null or fts.id is not null
  order by score desc
  limit match_count;
$$;

