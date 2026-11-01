from typing import Optional
from app.db import Database
from app.llm.router import router

def hybrid_search_chunks(query_text: str, match_count: int = 8, source_types: Optional[list[str]] = None) -> list[dict]:
    try:
        embedding = router.generate_embedding(query_text)
        results = Database.hybrid_search(
            query_text=query_text,
            query_embedding=embedding,
            match_count=match_count,
            source_types=source_types
        )
        return results
    except Exception as e:
        print(f"[Search] Hybrid search failed: {e}")
        # Fallback to simple ILIKE search if vector search fails
        fallback_query = """
            SELECT c.id as chunk_id, c.source_id, c.content, 0.5 as score
            FROM source_chunks c
            WHERE c.content ILIKE %s
            LIMIT %s;
        """
        return Database.execute_query(fallback_query, (f"%{query_text}%", match_count))

