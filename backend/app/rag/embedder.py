from app.db import Database
from app.rag.chunker import chunk_document, DocumentChunk
from app.llm.router import router

def index_source_document(source_id: str, title: str, content: str, lang: str = "en") -> list[dict]:
    chunks = chunk_document(content, heading_prefix=title, max_chunks=8)
    indexed_records = []

    for c in chunks:
        try:
            # Generate Gemini embedding (768 dim)
            embedding = router.generate_embedding(c.content)
            res = Database.save_chunk(
                source_id=source_id,
                chunk_index=c.index,
                heading_path=c.heading_path,
                content=c.content,
                lang=lang,
                embedding=embedding
            )
            if res:
                indexed_records.append({
                    "chunk_id": str(res["id"]),
                    "source_id": source_id,
                    "heading_path": c.heading_path,
                    "content": c.content
                })
        except Exception as e:
            print(f"[Embedder] Failed to embed/index chunk {c.index} of source {source_id}: {e}")
            
    return indexed_records

