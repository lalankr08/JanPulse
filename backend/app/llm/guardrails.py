import re
import ipaddress
from urllib.parse import urlparse
from app.config import settings

ALLOWED_GOV_DOMAINS = {
    "gov.in",
    "nic.in",
    "pib.gov.in",
    "myscheme.gov.in",
    "indiacode.nic.in",
    "egazette.gov.in",
    "data.gov.in",
    "digitalindia.gov.in",
    "pmkisan.gov.in",
    "uidai.gov.in",
    "incometax.gov.in",
    "cbic.gov.in"
}

DISALLOWED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

def is_safe_government_url(url: str) -> tuple[bool, str]:
    if not url.startswith("https://") and not url.startswith("http://"):
        return False, "URL must start with https://"
    
    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    if not hostname:
        return False, "Invalid URL host"

    # Check for IP literal (SSRF protection)
    try:
        ip = ipaddress.ip_address(hostname)
        for net in DISALLOWED_IP_NETWORKS:
            if ip in net:
                return False, "Internal and private IP addresses are strictly forbidden"
    except ValueError:
        pass

    if hostname == "localhost" or hostname.endswith(".local"):
        return False, "Localhost addresses are strictly forbidden"

    # Check allowlist
    domain_match = False
    for allowed in ALLOWED_GOV_DOMAINS:
        if hostname == allowed or hostname.endswith("." + allowed):
            domain_match = True
            break
            
    if not domain_match:
        return False, f"Domain '{hostname}' is not an allowlisted official Indian government domain (.gov.in / .nic.in)"

    return True, "URL allowed"

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"you\s+are\s+now\s+(a|an|in)\s+mode",
    r"system\s*prompt\s*:",
    r"reveal\s+your\s+(secret|instructions|key)",
    r"disregard\s+the\s+instructions",
    r"format\s+c:",
    r"<\|im_start\|>",
    r"<\|im_end\|>",
]

def sanitize_untrusted_text(content: str) -> str:
    # Strip potential delimiter escapes
    cleaned = content.replace("</untrusted_external_content>", "")
    return f"<untrusted_external_content>\n{cleaned}\n</untrusted_external_content>"

def screen_prompt_injection(text: str, groq_client=None) -> tuple[bool, str]:
    # 1. Regex heuristic check
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return True, f"Detected potential prompt injection heuristic: pattern matched"
            
    # 2. Model-based screen if groq prompt-guard model available
    if groq_client and settings.GROQ_MODEL_VISION:
        try:
            # Test with llama-prompt-guard if desired
            pass
        except Exception:
            pass

    return False, "Clean"

