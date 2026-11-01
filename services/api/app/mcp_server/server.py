"""
Jan-Pulse Civic Pulse MCP Server
Exposes civic verification tools: check_claim, find_schemes, explain_notification
"""
from typing import Any
from app.tools.myscheme import find_myscheme_candidates, fetch_myscheme
from app.tools.pib import search_pib
from app.tools.egazette import fetch_and_parse_pdf

class CivicMCPServer:
    @staticmethod
    def list_tools() -> list[dict]:
        return [
            {
                "name": "check_claim",
                "description": "Verifies an Indian civic or government claim against official PIB and government sources.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "claim": {"type": "string", "description": "The viral forward or claim text to verify"},
                        "language": {"type": "string", "default": "en", "description": "Language code (en, hi)"}
                    },
                    "required": ["claim"]
                }
            },
            {
                "name": "find_schemes",
                "description": "Discovers relevant Indian government schemes and eligibility criteria from myScheme.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "situation": {"type": "string", "description": "Citizen profile or scheme name"}
                    },
                    "required": ["situation"]
                }
            },
            {
                "name": "explain_notification",
                "description": "Extracts citizen impact, deadlines, and action items from an official gazette or rule notification.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "url": {"type": "string", "description": "Allowlisted official .gov.in / .nic.in notification link"}
                    },
                    "required": ["url"]
                }
            }
        ]

    @staticmethod
    def call_tool(name: str, arguments: dict) -> dict:
        if name == "find_schemes":
            query = arguments.get("situation", "")
            candidates = find_myscheme_candidates(query, limit=3)
            results = []
            for c in candidates:
                try:
                    data = fetch_myscheme(c["slug"])
                    results.append({
                        "name": data["title"],
                        "url": data["url"],
                        "eligibility": data["eligibility_markdown"][:400],
                        "documents": data["documents_markdown"][:300]
                    })
                except Exception:
                    pass
            return {"schemes": results}
        elif name == "check_claim":
            claim = arguments.get("claim", "")
            articles = search_pib(claim, limit=2)
            return {
                "claim": claim,
                "evidence": [{"title": a["title"], "url": a["url"], "excerpt": a["content"][:300]} for a in articles]
            }
        elif name == "explain_notification":
            url = arguments.get("url", "")
            data = fetch_and_parse_pdf(url, max_pages=3)
            return {
                "title": data["title"],
                "publisher": data["publisher"],
                "excerpt": data["content"][:600]
            }
        else:
            raise ValueError(f"Unknown MCP tool: {name}")

