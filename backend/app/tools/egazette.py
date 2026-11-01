import io
import os
import re
import httpx
from bs4 import BeautifulSoup
from pypdf import PdfReader
from app.llm.guardrails import is_safe_government_url

CHROME_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml,application/pdf;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
}

def extract_text_from_html(html_bytes_or_str: bytes | str) -> str:
    """Extracts clean plain text from HTML content, removing scripts and styles."""
    if isinstance(html_bytes_or_str, bytes):
        try:
            content_str = html_bytes_or_str.decode("utf-8", errors="replace")
        except Exception:
            content_str = str(html_bytes_or_str)
    else:
        content_str = html_bytes_or_str

    try:
        soup = BeautifulSoup(content_str, "html.parser")
        for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav"]):
            tag.decompose()
        text = soup.get_text(separator="\n")
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return "\n".join(lines)
    except Exception:
        clean = re.sub(r"<[^>]+>", " ", content_str)
        return re.sub(r"\s+", " ", clean).strip()

def extract_text_from_pdf_bytes(pdf_bytes: bytes, max_pages: int = 25) -> tuple[str, int]:
    """
    Safely extracts selectable text from PDF bytes using pypdf.
    If the PDF is a scanned image (minimal selectable text), falls back to Gemini Vision OCR.
    """
    num_pages = 1
    extracted_text = []
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes), strict=False)
        num_pages = len(reader.pages)
        pages_to_read = min(num_pages, max_pages)
        for i in range(pages_to_read):
            try:
                page_text = reader.pages[i].extract_text() or ""
                if page_text.strip():
                    extracted_text.append(f"--- Page {i + 1} ---\n{page_text.strip()}")
            except Exception as page_err:
                extracted_text.append(f"--- Page {i + 1} (text extraction skipped: {page_err}) ---")
    except Exception as pdf_err:
        print(f"[eGazette] pypdf parsing error: {pdf_err}")

    full_content = "\n\n".join(extracted_text)

    # If PDF yielded meaningful selectable text (>= 60 characters), return it
    if len(full_content.strip()) >= 60:
        return full_content, num_pages

    # Fallback 1: Attempt Gemini Multimodal Vision OCR for scanned PDF
    try:
        from app.llm.router import router
        ocr_text = router.extract_image_text(pdf_bytes, mime_type="application/pdf")
        if ocr_text and len(ocr_text.strip()) >= 40:
            return f"--- Scanned Document (OCR Verified) ---\n{ocr_text.strip()}", num_pages
    except Exception as ocr_err:
        print(f"[eGazette] PDF OCR fallback note: {ocr_err}")

    # Fallback 2: regex extract ascii strings from binary stream
    try:
        strings = re.findall(rb"[\x20-\x7E\r\n]{6,}", pdf_bytes)
        decoded = [s.decode("latin-1", errors="ignore").strip() for s in strings if s.strip()]
        filtered = [s for s in decoded if len(s) > 10 and not s.startswith(("/Filter", "/Type", "/Font", "obj", "endobj"))]
        if filtered:
            return "\n".join(filtered[:120]), num_pages
    except Exception:
        pass

    return "Document contains scanned imagery without selectable text.", num_pages

def extract_text_from_docx_bytes(docx_bytes: bytes) -> tuple[str, int]:
    """Extracts clean text and tabular sections from Microsoft Word (.docx) files using python-docx."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(docx_bytes))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        
        tables_text = []
        for table in doc.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text.strip()]
                if cells:
                    tables_text.append(" | ".join(cells))
                    
        full_content = "\n\n".join(paragraphs + tables_text)
        approx_pages = max(1, len(full_content) // 2500)
        return full_content if full_content.strip() else "Document contains no text.", approx_pages
    except Exception as docx_err:
        print(f"[eGazette] docx parsing note: {docx_err}")
        return extract_text_from_doc_bytes(docx_bytes)

def extract_text_from_doc_bytes(doc_bytes: bytes) -> tuple[str, int]:
    """Extracts printable text runs from legacy binary Word (.doc) files."""
    try:
        # Match printable ASCII / Latin runs
        strings = re.findall(rb"[\x20-\x7E\r\n]{5,}", doc_bytes)
        decoded = [s.decode("latin-1", errors="ignore").strip() for s in strings if s.strip()]
        filtered = [
            s for s in decoded 
            if len(s) > 8 and not s.startswith(("\\", "Normal", "Default Font", "Times New Roman", "Courier"))
        ]
        text = "\n".join(filtered)
        approx_pages = max(1, len(text) // 2500)
        return text if text.strip() else "Legacy document could not be decoded.", approx_pages
    except Exception as doc_err:
        return f"Could not parse document: {doc_err}", 1

def extract_document_text(file_bytes: bytes, filename: str = "") -> tuple[str, int, str]:
    """
    Unified extractor for government gazettes, circulars, and official orders.
    Supports PDF (.pdf), Microsoft Word (.docx, .doc), plain text (.txt), and HTML.
    Returns (content_text, page_count, doc_type).
    """
    fn_lower = filename.lower()
    
    # 1. PDF
    if b"%PDF-" in file_bytes[:1024] or fn_lower.endswith(".pdf"):
        text, pages = extract_text_from_pdf_bytes(file_bytes)
        return text, pages, "pdf"

    # 2. DOCX (OpenXML zip format starts with PK\x03\x04)
    if file_bytes[:4] == b"PK\x03\x04" or fn_lower.endswith(".docx"):
        text, pages = extract_text_from_docx_bytes(file_bytes)
        return text, pages, "docx"

    # 3. Legacy DOC (.doc)
    if fn_lower.endswith(".doc") or b"\xd0\xcf\x11\xe0" in file_bytes[:8]:
        text, pages = extract_text_from_docx_bytes(file_bytes)
        return text, pages, "doc"

    # 4. Text / HTML / Markdown
    try:
        content_str = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = file_bytes.decode("latin-1", errors="ignore")

    if "<html" in content_str.lower() or "<body" in content_str.lower():
        text = extract_text_from_html(content_str)
        return text, 1, "html"

    clean_text = content_str.strip()
    return clean_text, max(1, len(clean_text) // 2500), "text"

def fetch_and_parse_pdf(url_or_path: str, max_pages: int = 25) -> dict:
    url_or_path = (url_or_path or "").strip()
    if not url_or_path:
        return {
            "title": "Empty Notification Input",
            "url": "input:empty",
            "publisher": "Official Notice",
            "source_type": "text",
            "total_pages": 0,
            "pages_processed": 0,
            "content": "No notification text provided.",
            "http_status": 400
        }

    # Case 1: HTTP / HTTPS URL
    if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
        safe, reason = is_safe_government_url(url_or_path)
        if not safe and ("forbidden" in reason.lower() or "localhost" in reason.lower()):
            raise ValueError(f"Security check failed: {reason}")

        try:
            with httpx.Client(headers=CHROME_HEADERS, follow_redirects=True, timeout=25.0, verify=False) as client:
                resp = client.get(url_or_path)
                if resp.status_code != 200:
                    raise RuntimeError(f"Government server returned HTTP {resp.status_code} for {url_or_path}")
                content_bytes = resp.content
                content_type = resp.headers.get("content-type", "").lower()
        except Exception as net_err:
            raise RuntimeError(f"Unable to connect to {url_or_path}: {net_err}")

        is_pdf = (
            b"%PDF-" in content_bytes[:1024]
            or "application/pdf" in content_type
            or url_or_path.lower().endswith(".pdf")
        )

        if is_pdf:
            full_content, num_pages = extract_text_from_pdf_bytes(content_bytes, max_pages=max_pages)
            pages_processed = min(num_pages, max_pages)
            return {
                "title": f"The Gazette of India / Notification ({pages_processed} pages)",
                "url": url_or_path,
                "publisher": "The Gazette of India (e-Gazette)",
                "source_type": "egazette",
                "total_pages": num_pages,
                "pages_processed": pages_processed,
                "content": full_content,
                "http_status": 200
            }
        else:
            html_text = extract_text_from_html(content_bytes)
            return {
                "title": "Government Gazette / Official Web Notification",
                "url": url_or_path,
                "publisher": "Official Government Portal",
                "source_type": "web_notice",
                "total_pages": 1,
                "pages_processed": 1,
                "content": html_text[:20000] if html_text else "Web notice retrieved (empty text body).",
                "http_status": 200
            }

    # Case 2: Check if it's an existing file on the local file system
    is_local_file = False
    try:
        if os.path.exists(url_or_path) and os.path.isfile(url_or_path):
            is_local_file = True
    except (OSError, ValueError):
        is_local_file = False

    if is_local_file:
        try:
            with open(url_or_path, "rb") as f:
                file_bytes = f.read()

            text, num_pages, doc_type = extract_document_text(file_bytes, filename=os.path.basename(url_or_path))
            pages_processed = min(num_pages, max_pages)
            return {
                "title": f"Official Document ({os.path.basename(url_or_path)})",
                "url": url_or_path,
                "publisher": "The Gazette of India (e-Gazette)",
                "source_type": doc_type,
                "total_pages": num_pages,
                "pages_processed": pages_processed,
                "content": text,
                "http_status": 200
            }
        except Exception as file_err:
            print(f"[eGazette] Failed reading file {url_or_path}: {file_err}")

    # Case 3: Raw Text or Query (user pasted notification text directly)
    return {
        "title": "Government Gazette / Circular Text",
        "url": "input:user_text",
        "publisher": "Official Notification Input",
        "source_type": "text",
        "total_pages": 1,
        "pages_processed": 1,
        "content": url_or_path,
        "http_status": 200
    }
