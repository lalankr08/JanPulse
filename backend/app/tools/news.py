import io
import re
import html
import urllib.parse
from typing import List, Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup

CHROME_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
}

def clean_snippet(text: str) -> str:
    """Removes HTML entities and normalizes whitespace."""
    if not text:
        return ""
    unescaped = html.unescape(text)
    clean = re.sub(r"<[^>]+>", " ", unescaped)
    return re.sub(r"\s+", " ", clean).strip()

def search_news(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Retrieves live news articles, fact-checks, and public event records from verified news sources.
    Combines DuckDuckGo News / Web and Google News RSS feeds.
    Returns list of dicts with:
      - title
      - url
      - publisher
      - snippet
      - content
    """
    clean_q = re.sub(r"[^\w\s-]", " ", query).strip()
    if not clean_q:
        return []

    results: List[Dict[str, Any]] = []
    seen_urls = set()

    # 1. Primary: DuckDuckGo HTML Search
    try:
        with httpx.Client(headers=CHROME_HEADERS, follow_redirects=True, timeout=12.0) as client:
            resp = client.post(
                "https://html.duckduckgo.com/html/",
                data={"q": clean_q},
            )
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                result_blocks = soup.find_all(class_="result")
                
                for block in result_blocks:
                    if len(results) >= limit:
                        break
                    
                    title_elem = block.find(class_="result__title")
                    snippet_elem = block.find(class_="result__snippet")
                    
                    if not title_elem or not snippet_elem:
                        continue
                        
                    raw_title = title_elem.get_text().strip()
                    raw_snippet = snippet_elem.get_text().strip()
                    
                    # Extract URL
                    link_elem = block.find("a", class_="result__snippet") or title_elem.find("a")
                    raw_url = link_elem.get("href", "") if link_elem else ""
                    
                    # If DuckDuckGo wrapper URL (e.g. //duckduckgo.com/l/?uddg=...), unwrap it
                    if "uddg=" in raw_url:
                        try:
                            parsed_qs = urllib.parse.parse_qs(urllib.parse.urlparse(raw_url).query)
                            if "uddg" in parsed_qs:
                                raw_url = parsed_qs["uddg"][0]
                        except Exception:
                            pass
                            
                    if not raw_url.startswith("http"):
                        continue
                        
                    if raw_url in seen_urls:
                        continue
                    seen_urls.add(raw_url)
                    
                    # Deduce publisher
                    publisher = "News Wire"
                    try:
                        domain = urllib.parse.urlparse(raw_url).netloc.lower()
                        domain = re.sub(r"^www\.", "", domain)
                        publisher = domain.split(".")[0].capitalize()
                        if "hindustantimes" in domain:
                            publisher = "Hindustan Times"
                        elif "indianexpress" in domain:
                            publisher = "The Indian Express"
                        elif "thehindu" in domain:
                            publisher = "The Hindu"
                        elif "cnn" in domain:
                            publisher = "CNN"
                        elif "bbc" in domain:
                            publisher = "BBC News"
                        elif "reuters" in domain:
                            publisher = "Reuters"
                        elif "wikipedia" in domain:
                            publisher = "Wikipedia Fact Archive"
                    except Exception:
                        pass
                        
                    results.append({
                        "title": clean_snippet(raw_title),
                        "url": raw_url,
                        "publisher": publisher,
                        "snippet": clean_snippet(raw_snippet),
                        "content": f"{clean_snippet(raw_title)}\n\n{clean_snippet(raw_snippet)}"
                    })
    except Exception as ddg_err:
        print(f"[News] DuckDuckGo search error: {ddg_err}")

    # 2. Secondary: Google News RSS Search (if more results needed)
    if len(results) < limit:
        try:
            import xml.etree.ElementTree as ET
            rss_url = f"https://news.google.com/rss/search?q={urllib.parse.quote(clean_q)}&hl=en-IN&gl=IN&ceid=IN:en"
            with httpx.Client(headers=CHROME_HEADERS, follow_redirects=True, timeout=10.0) as client:
                rss_resp = client.get(rss_url)
                if rss_resp.status_code == 200:
                    root = ET.fromstring(rss_resp.content)
                    items = root.findall(".//item")
                    
                    for item in items:
                        if len(results) >= limit:
                            break
                            
                        item_title = item.find("title")
                        item_link = item.find("link")
                        item_source = item.find("source")
                        
                        title_text = item_title.text if item_title is not None else ""
                        link_text = item_link.text if item_link is not None else ""
                        source_text = item_source.text if item_source is not None else "Google News Source"
                        
                        if not title_text or link_text in seen_urls:
                            continue
                        seen_urls.add(link_text)
                        
                        results.append({
                            "title": clean_snippet(title_text),
                            "url": link_text,
                            "publisher": source_text,
                            "snippet": clean_snippet(title_text),
                            "content": f"{clean_snippet(title_text)}\nReported by: {source_text}"
                        })
        except Exception as rss_err:
            print(f"[News] Google News RSS fallback error: {rss_err}")

    return results

