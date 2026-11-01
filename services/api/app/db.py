import asyncio
from typing import Any, Optional
import psycopg
from psycopg.rows import dict_row
from app.config import settings

def get_connection():
    if not settings.SUPABASE_URI:
        raise ValueError("SUPABASE_URI is not set")
    return psycopg.connect(settings.SUPABASE_URI, row_factory=dict_row)

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

