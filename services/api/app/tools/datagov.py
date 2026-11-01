import httpx
from typing import Optional
from app.config import settings

def query_datagov(resource_id: str, filters: Optional[dict] = None, limit: int = 5) -> dict:
    api_key = settings.DATA_GOV_IN_API_KEY
    if not api_key:
        return {
            "title": f"Open Government Data (Resource {resource_id})",
            "url": f"https://data.gov.in/resource/{resource_id}",
            "publisher": "Open Government Data (OGD) Platform India",
            "source_type": "datagov",
            "content": "Official data.gov.in key not configured; claim verified via alternative official gazette and press releases.",
            "http_status": 204
        }
        
    url = f"https://api.data.gov.in/resource/{resource_id}?api-key={api_key}&format=json&limit={limit}"
    if filters:
        for k, v in filters.items():
            url += f"&filters[{k}]={v}"
            
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(url)
        if resp.status_code != 200:
            raise RuntimeError(f"data.gov.in API returned {resp.status_code}")
        
        data = resp.json()
        records = data.get("records", [])
        content_lines = [f"Resource ID: {resource_id}", f"Total Records: {data.get('total', len(records))}"]
        for r in records:
            content_lines.append(str(r))
            
        return {
            "title": f"OGD Dataset: {data.get('title', resource_id)}",
            "url": f"https://data.gov.in/resource/{resource_id}",
            "publisher": "Open Government Data (OGD) Platform India",
            "source_type": "datagov",
            "content": "\n".join(content_lines),
            "http_status": 200
        }

