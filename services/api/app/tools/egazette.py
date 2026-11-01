import io
import httpx
from pypdf import PdfReader
from app.llm.guardrails import is_safe_government_url

CHROME_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36"
}

def fetch_and_parse_pdf(url_or_path: str, max_pages: int = 15) -> dict:
    if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
        safe, reason = is_safe_government_url(url_or_path)
        if not safe:
            raise ValueError(f"Security check failed: {reason}")
            
        with httpx.Client(headers=CHROME_HEADERS, follow_redirects=True, timeout=20.0) as client:
            resp = client.get(url_or_path)
            if resp.status_code != 200:
                raise RuntimeError(f"Failed to download PDF from {url_or_path}, status: {resp.status_code}")
            pdf_bytes = resp.content
    else:
        # Local file
        with open(url_or_path, "rb") as f:
            pdf_bytes = f.read()

    reader = PdfReader(io.BytesIO(pdf_bytes))
    num_pages = len(reader.pages)
    extracted_text = []
    
    pages_to_read = min(num_pages, max_pages)
    for i in range(pages_to_read):
        page = reader.pages[i]
        page_text = page.extract_text() or ""
        extracted_text.append(f"--- Page {i + 1} ---\n{page_text}")
        
    full_content = "\n\n".join(extracted_text)
    
    return {
        "title": f"Government Gazette / Notification ({pages_to_read} pages)",
        "url": url_or_path,
        "publisher": "The Gazette of India (e-Gazette)",
        "source_type": "egazette",
        "total_pages": num_pages,
        "pages_processed": pages_to_read,
        "content": full_content,
        "http_status": 200
    }

