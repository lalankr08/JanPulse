import time
import hashlib
from typing import Any
from app.db import Database
from app.tools.pib import fetch_pib_latest, search_pib, fetch_pib_article
from app.tools.myscheme import fetch_myscheme, find_myscheme_candidates
from app.tools.egazette import fetch_and_parse_pdf
from app.tools.datagov import query_datagov

class ToolRegistry:
    @staticmethod
    def execute_tool(tool_name: str, query: str, language: str = "en", run_id: str = None, seq: int = 1) -> dict:
        start_time = time.time()
        http_status = 200
        url = None
        source_record = None
        error_msg = None

        try:
            if tool_name == "pib_latest":
                items = fetch_pib_latest(language=language, limit=5)
                content = "\n\n".join([f"Title: {i['title']}\nURL: {i['url']}\nDate: {i['published_at']}" for i in items])
                url = "https://www.pib.gov.in/RssMain.aspx"
                source_record = {
                    "url": url,
                    "publisher": "Press Information Bureau (PIB)",
                    "source_type": "pib",
                    "title": "Latest PIB Press Releases Feed",
                    "content": content,
                    "http_status": 200
                }
            elif tool_name == "pib_search":
                articles = search_pib(query=query, limit=3)
                if articles:
                    art = articles[0]
                    url = art["url"]
                    source_record = art
                else:
                    url = "https://www.pib.gov.in/allRel.aspx"
                    source_record = {
                        "url": "https://www.pib.gov.in/allRel.aspx",
                        "publisher": "Press Information Bureau (PIB)",
                        "source_type": "pib",
                        "title": "PIB Press Releases Archive",
                        "content": f"No direct release matched '{query}' in latest feeds.",
                        "http_status": 200
                    }
            elif tool_name == "myscheme_fetch":
                source_record = fetch_myscheme(query, lang=language)
                url = source_record["url"]
            elif tool_name == "myscheme_candidates":
                candidates = find_myscheme_candidates(query, limit=3)
                # Fetch details for the top candidate directly
                if candidates:
                    top_slug = candidates[0]["slug"]
                    source_record = fetch_myscheme(top_slug, lang=language)
                    url = source_record["url"]
                else:
                    url = "https://www.myscheme.gov.in"
                    source_record = {
                        "url": "https://www.myscheme.gov.in/find-scheme",
                        "publisher": "myScheme",
                        "source_type": "myscheme",
                        "title": "myScheme Discovery",
                        "content": "No candidate schemes matched query.",
                        "http_status": 404
                    }
            elif tool_name in ["egazette_search", "pdf_fetch"]:
                source_record = fetch_and_parse_pdf(query)
                url = source_record["url"]
            elif tool_name == "datagov_query":
                source_record = query_datagov(query)
                url = source_record["url"]
            else:
                raise ValueError(f"Unknown tool name: {tool_name}")

        except Exception as e:
            http_status = 500
            error_msg = str(e)
            print(f"[ToolRegistry] Error executing {tool_name} with '{query}': {e}")
            url = url or f"urn:tool:{tool_name}:{query}"
            source_record = {
                "url": url,
                "publisher": "Government Official Source",
                "source_type": "other",
                "title": f"Failed request: {tool_name}",
                "content": f"Source was unreachable: {e}",
                "http_status": 500
            }

        latency_ms = int((time.time() - start_time) * 1000)

        # Save to sources table in Supabase
        db_source_id = None
        if source_record and source_record.get("content"):
            try:
                content_hash = hashlib.sha256(source_record["content"].encode("utf-8")).hexdigest()
                saved = Database.save_source(
                    url=source_record["url"],
                    publisher=source_record.get("publisher", "Government Source"),
                    source_type=source_record.get("source_type", "other"),
                    title=source_record.get("title", tool_name),
                    http_status=source_record.get("http_status", http_status),
                    raw_text=source_record["content"],
                    content_hash=content_hash
                )
                if saved:
                    db_source_id = str(saved["id"])
                    source_record["db_source_id"] = db_source_id
                    source_record["fetched_at"] = saved["fetched_at"]
            except Exception as e:
                print(f"[ToolRegistry] Failed to save source to DB: {e}")

        # Record trace event if run_id provided
        if run_id:
            try:
                Database.insert_trace_event(
                    run_id=run_id,
                    seq=seq,
                    node="retrieve",
                    event_type="tool_execution",
                    tool=tool_name,
                    url=url,
                    http_status=http_status,
                    latency_ms=latency_ms,
                    detail={"query": query, "error": error_msg, "chars": len(source_record.get("content", ""))}
                )
            except Exception as te:
                print(f"[ToolRegistry] Failed to write trace event: {te}")

        return source_record

