import httpx
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from typing import Optional

CHROME_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
}

def fetch_pib_latest(language: str = "en", limit: int = 10) -> list[dict]:
    # Lang=1 for English, Lang=2 for Hindi
    lang_code = "1" if language == "en" else "2"
    url = f"https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang={lang_code}&Regid=3"
    
    with httpx.Client(headers=CHROME_HEADERS, follow_redirects=True, timeout=12.0) as client:
        resp = client.get(url)
        if resp.status_code != 200:
            raise RuntimeError(f"PIB RSS returned status {resp.status_code}")
        
        root = ET.fromstring(resp.content)
        items = root.findall(".//item")
        results = []
        for item in items[:limit]:
            title = item.find("title").text if item.find("title") is not None else ""
            link = item.find("link").text if item.find("link") is not None else ""
            pub_date = item.find("pubDate").text if item.find("pubDate") is not None else ""
            results.append({
                "title": title.strip(),
                "url": link.strip(),
                "published_at": pub_date.strip(),
                "publisher": "Press Information Bureau (PIB)"
            })
        return results

def fetch_pib_article(url: str) -> dict:
    with httpx.Client(headers=CHROME_HEADERS, follow_redirects=True, timeout=12.0) as client:
        resp = client.get(url)
        if resp.status_code != 200:
            raise RuntimeError(f"PIB article returned status {resp.status_code}")
        
        soup = BeautifulSoup(resp.text, "html.parser")
        # Extract title
        title_tag = soup.find("h2") or soup.find("h1") or soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else "PIB Press Release"
        
        # Remove script and style tags
        for s in soup(["script", "style", "noscript"]):
            s.decompose()
            
        # PIB press release text usually lives in release-content or main container
        content_div = soup.find("div", class_="innner-page-main-about-us-content-right") or soup.find("div", id="content") or soup.body
        body_text = content_div.get_text(separator="\n", strip=True) if content_div else ""
        
        return {
            "title": title,
            "url": url,
            "publisher": "Press Information Bureau (PIB)",
            "source_type": "pib",
            "content": body_text,
            "http_status": resp.status_code
        }

def search_pib(query: str, limit: int = 4) -> list[dict]:
    # Fetch latest releases and filter/match by keywords
    feed_items = fetch_pib_latest(language="en", limit=15)
    query_words = set(query.lower().split())
    
    scored = []
    for item in feed_items:
        score = sum(1 for word in query_words if word in item["title"].lower())
        scored.append((score, item))
    
    scored.sort(key=lambda x: x[0], reverse=True)
    top_items = [item for score, item in scored[:limit] if score > 0]
    if not top_items and feed_items:
        top_items = feed_items[:2]

    # Fetch full content for top matching articles
    detailed = []
    for it in top_items:
        try:
            art = fetch_pib_article(it["url"])
            detailed.append(art)
        except Exception as e:
            print(f"Error fetching PIB article {it['url']}: {e}")
    return detailed

