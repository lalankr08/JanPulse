import asyncio
from typing import Any, Optional
import psycopg
from psycopg.rows import dict_row
from app.config import settings

def get_connection():
    if not settings.SUPABASE_URI:
        raise ValueError("SUPABASE_URI is not set")
    return psycopg.connect(settings.SUPABASE_URI, row_factory=dict_row, connect_timeout=5)

class Database:
    @staticmethod
    def execute_query(query: str, params: Optional[tuple | list | dict] = None) -> list[dict]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params or ())
                if cur.description:
                    return cur.fetchall()
            conn.commit()
        return []

    @staticmethod
    def execute_one(query: str, params: Optional[tuple | list | dict] = None) -> Optional[dict]:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params or ())
                if cur.description:
                    return cur.fetchone()
            conn.commit()
        return None

    @staticmethod
    def insert_trace_event(run_id: str, seq: int, node: str, event_type: str,
                           tool: Optional[str] = None, url: Optional[str] = None,
                           model: Optional[str] = None, http_status: Optional[int] = None,
                           latency_ms: Optional[int] = None, detail: Optional[dict] = None) -> dict:
        import json
        query = """
            INSERT INTO trace_events (run_id, seq, node, event_type, tool, url, model, http_status, latency_ms, detail)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at;
        """
        detail_json = json.dumps(detail) if detail is not None else None
        return Database.execute_one(query, (run_id, seq, node, event_type, tool, url, model, http_status, latency_ms, detail_json))

    @staticmethod
    def save_source(url: str, publisher: str, source_type: str, title: str,
                    http_status: int, raw_text: str, content_hash: Optional[str] = None,
                    ttl_seconds: int = 3600) -> dict:
        query = """
            INSERT INTO sources (url, publisher, source_type, title, http_status, fetched_at, ttl_seconds, content_hash, raw_text)
            VALUES (%s, %s, %s, %s, %s, NOW(), %s, %s, %s)
            ON CONFLICT (url) DO UPDATE SET
                title = EXCLUDED.title,
                http_status = EXCLUDED.http_status,
                fetched_at = EXCLUDED.fetched_at,
                raw_text = EXCLUDED.raw_text,
                content_hash = EXCLUDED.content_hash
            RETURNING id, fetched_at;
        """
        return Database.execute_one(query, (url, publisher, source_type, title, http_status, ttl_seconds, content_hash, raw_text))

    @staticmethod
    def save_chunk(source_id: str, chunk_index: int, heading_path: str, content: str,
                   lang: str, embedding: list[float]) -> dict:
        import json
        query = """
            INSERT INTO source_chunks (source_id, chunk_index, heading_path, content, lang, embedding)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id;
        """
        embedding_str = "[" + ",".join(str(x) for x in embedding) + "]"
        return Database.execute_one(query, (source_id, chunk_index, heading_path, content, lang, embedding_str))

    @staticmethod
    def hybrid_search(query_text: str, query_embedding: list[float], match_count: int = 8,
                      source_types: Optional[list[str]] = None) -> list[dict]:
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"
        query = """
            SELECT * FROM hybrid_search(%s, %s::vector, %s, %s);
        """
        return Database.execute_query(query, (query_text, embedding_str, match_count, source_types))

    @staticmethod
    def ensure_public_shares_table():
        try:
            query = """
                CREATE TABLE IF NOT EXISTS public_share_cards (
                    share_id text PRIMARY KEY,
                    claim_text text,
                    kind text DEFAULT 'forward',
                    label text,
                    confidence numeric,
                    confidence_reason text,
                    explanation text,
                    explanation_lang text,
                    citations jsonb DEFAULT '[]'::jsonb,
                    created_at timestamptz DEFAULT now()
                );
                CREATE INDEX IF NOT EXISTS idx_public_share_cards_created ON public_share_cards (created_at DESC);
            """
            Database.execute_query(query)
        except Exception as e:
            print(f"[DB] Table public_share_cards check note: {e}", flush=True)

    @staticmethod
    def ensure_knowledge_base_tables():
        try:
            import os
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            mig_path = os.path.join(base_dir, "migrations", "002_civic_knowledge_base.sql")
            if os.path.exists(mig_path):
                with open(mig_path, "r", encoding="utf-8") as f:
                    sql = f.read()
                Database.execute_query(sql)
                print("[DB] Civic knowledge base tables verified.", flush=True)
        except Exception as e:
            print(f"[DB] Civic knowledge base check note: {e}", flush=True)

    @staticmethod
    def save_public_share_card(card: dict) -> bool:
        try:
            import json
            share_id = card.get("share_id") or card.get("id")
            if not share_id:
                return False
            query = """
                INSERT INTO public_share_cards (
                    share_id, claim_text, kind, label, confidence, confidence_reason,
                    explanation, explanation_lang, citations
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (share_id) DO UPDATE SET
                    claim_text = EXCLUDED.claim_text,
                    label = EXCLUDED.label,
                    confidence = EXCLUDED.confidence,
                    confidence_reason = EXCLUDED.confidence_reason,
                    explanation = EXCLUDED.explanation,
                    explanation_lang = EXCLUDED.explanation_lang,
                    citations = EXCLUDED.citations;
            """
            citations = card.get("citations", [])
            citations_json = json.dumps(citations) if not isinstance(citations, str) else citations
            Database.execute_query(
                query,
                (
                    share_id,
                    card.get("claim_text", ""),
                    card.get("kind", "forward"),
                    card.get("label", "cannot_verify"),
                    float(card.get("confidence") or 0.8),
                    card.get("confidence_reason", ""),
                    card.get("explanation", ""),
                    card.get("explanation_lang", "en"),
                    citations_json
                )
            )
            return True
        except Exception as e:
            print(f"[DB] Failed to save public share card {card.get('share_id')}: {e}", flush=True)
            try:
                Database.ensure_public_shares_table()
            except Exception:
                pass
            return False

    @staticmethod
    def get_public_share_card(share_id: str) -> Optional[dict]:
        try:
            row = Database.execute_one(
                """SELECT share_id as id, share_id, claim_text, kind, label, confidence, confidence_reason,
                          explanation, explanation_lang, citations, created_at
                   FROM public_share_cards
                   WHERE share_id = %s""",
                (share_id,)
            )
            if row:
                if isinstance(row.get("citations"), str):
                    import json
                    try:
                        row["citations"] = json.loads(row["citations"])
                    except Exception:
                        row["citations"] = []
                elif row.get("citations") is None:
                    row["citations"] = []
                return row
        except Exception as e:
            print(f"[DB] Error querying public_share_cards for {share_id}: {e}", flush=True)
        return None

    @staticmethod
    def get_cached_verdict(query_text: str, language: str = "en") -> Optional[dict]:
        try:
            import hashlib
            q_hash = hashlib.md5(query_text.lower().strip().encode("utf-8")).hexdigest()
            row = Database.execute_one(
                """SELECT verdicts, sources, language
                   FROM verdict_cache
                   WHERE query_hash = %s AND expires_at > NOW()
                   LIMIT 1""",
                (q_hash,)
            )
            if row:
                try:
                    Database.execute_query(
                        "UPDATE verdict_cache SET hit_count = hit_count + 1, last_hit_at = NOW() WHERE query_hash = %s",
                        (q_hash,)
                    )
                except Exception:
                    pass
                verdicts = row.get("verdicts")
                sources = row.get("sources")
                if isinstance(verdicts, str):
                    import json
                    verdicts = json.loads(verdicts)
                if isinstance(sources, str):
                    import json
                    sources = json.loads(sources)
                return {
                    "verdicts": verdicts,
                    "sources": sources,
                    "language": row.get("language", language)
                }
        except Exception as e:
            print(f"[DB] Cache lookup note: {e}", flush=True)
        return None

    @staticmethod
    def save_cached_verdict(query_text: str, verdicts: list, sources: list, language: str = "en") -> bool:
        try:
            import hashlib
            import json
            q_hash = hashlib.md5(query_text.lower().strip().encode("utf-8")).hexdigest()
            v_json = json.dumps(verdicts) if not isinstance(verdicts, str) else verdicts
            s_json = json.dumps(sources) if not isinstance(sources, str) else sources
            Database.execute_query(
                """INSERT INTO verdict_cache (query_hash, raw_query, verdicts, sources, language, last_hit_at, expires_at)
                   VALUES (%s, %s, %s, %s, %s, NOW(), NOW() + INTERVAL '14 days')
                   ON CONFLICT (query_hash) DO UPDATE SET
                       verdicts = EXCLUDED.verdicts,
                       sources = EXCLUDED.sources,
                       hit_count = verdict_cache.hit_count + 1,
                       last_hit_at = NOW(),
                       expires_at = NOW() + INTERVAL '14 days'""",
                (q_hash, query_text.strip(), v_json, s_json, language)
            )
            return True
        except Exception as e:
            print(f"[DB] Cache save note: {e}", flush=True)
            return False

    @staticmethod
    def match_pib_debunk(query_text: str, min_similarity: float = 0.40) -> Optional[dict]:
        try:
            row = Database.execute_one(
                """SELECT claim_text, debunk_verdict, official_explanation, official_explanation_hi,
                          correct_fact, source_url, publisher,
                          similarity(claim_text, %s)::float as sim
                   FROM pib_debunks_kb
                   WHERE similarity(claim_text, %s) >= %s
                      OR tsv @@ plainto_tsquery('simple', %s)
                   ORDER BY sim DESC
                   LIMIT 1""",
                (query_text, query_text, min_similarity, query_text)
            )
            if row and float(row.get("sim") or 0) >= min_similarity:
                return row
        except Exception as e:
            print(f"[DB] PIB debunk match note: {e}", flush=True)
        return None

    @staticmethod
    def search_schemes_kb(query_text: str, limit: int = 3) -> list[dict]:
        try:
            rows = Database.execute_query(
                """SELECT slug, name, name_hi, category, ministry, benefit_summary, benefit_summary_hi,
                          eligibility_criteria, exclusions, documents_required, application_url,
                          (similarity(name, %s) * 2.0 + coalesce(ts_rank(tsv, plainto_tsquery('simple', %s)), 0.0))::float as score
                   FROM civic_schemes_kb
                   WHERE similarity(name, %s) > 0.18
                      OR tsv @@ plainto_tsquery('simple', %s)
                      OR EXISTS (
                          SELECT 1 FROM unnest(common_misconceptions) m
                          WHERE similarity(m, %s) > 0.28
                      )
                   ORDER BY score DESC
                   LIMIT %s""",
                (query_text, query_text, query_text, query_text, query_text, limit)
            )
            import json
            for r in rows:
                if isinstance(r.get("eligibility_criteria"), str):
                    try:
                        r["eligibility_criteria"] = json.loads(r["eligibility_criteria"])
                    except Exception:
                        pass
                if isinstance(r.get("exclusions"), str):
                    try:
                        r["exclusions"] = json.loads(r["exclusions"])
                    except Exception:
                        pass
                if isinstance(r.get("documents_required"), str):
                    try:
                        r["documents_required"] = json.loads(r["documents_required"])
                    except Exception:
                        pass
            return rows
        except Exception as e:
            print(f"[DB] Scheme KB search note: {e}", flush=True)
            return []


