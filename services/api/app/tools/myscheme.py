import httpx
from typing import Optional
from app.config import settings

# Comprehensive directory of top central & state schemes across all categories
POPULAR_SCHEMES = [
    # Agriculture & Rural
    {
        "slug": "pm-kisan",
        "name": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
        "category": "Agriculture",
        "keywords": ["farmer", "kisan", "agriculture", "land", "6000", "cash", "subsidy", "kheti", "cultivable", "landholder"]
    },
    {
        "slug": "pradhan-mantri-fasal-bima-yojana-pmfby",
        "name": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "category": "Agriculture",
        "keywords": ["crop", "insurance", "fasal", "bima", "drought", "flood", "loss", "farmer", "damage", "harvest"]
    },
    {
        "slug": "kisan-credit-card-kcc",
        "name": "Kisan Credit Card (KCC)",
        "category": "Agriculture",
        "keywords": ["credit card", "crop loan", "interest subvention", "farmer loan", "bank credit", "seeds", "fertilizer"]
    },
    {
        "slug": "soil-health-card",
        "name": "Soil Health Card Scheme",
        "category": "Agriculture",
        "keywords": ["soil", "farmer", "fertilizer", "crop nutrient", "soil test", "mridha", "testing lab"]
    },
    {
        "slug": "pradhan-mantri-krishi-sinchayee-yojana-pmksy",
        "name": "Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)",
        "category": "Agriculture",
        "keywords": ["irrigation", "water", "sinchayee", "drip irrigation", "sprinkler", "borewell", "farm pond"]
    },

    # Housing & Shelter
    {
        "slug": "pm-awas-yojana-gramin",
        "name": "Pradhan Mantri Awaas Yojana - Gramin (PMAY-G)",
        "category": "Housing",
        "keywords": ["house", "housing", "pucca house", "rural", "awas", "homeless", "kaccha ghar", "gramin", "home"]
    },
    {
        "slug": "pm-awas-yojana-urban",
        "name": "Pradhan Mantri Awas Yojana - Urban (PMAY-U)",
        "category": "Housing",
        "keywords": ["house", "housing", "urban", "slum", "flat", "city house", "clss", "subsidized flat", "home loan"]
    },

    # Healthcare & Wellness
    {
        "slug": "ayushman-bharat-pmjay",
        "name": "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
        "category": "Healthcare",
        "keywords": ["health", "hospital", "5 lakh", "insurance", "medical", "treatment", "card", "illness", "doctor", "swasthya", "surgery"]
    },
    {
        "slug": "pradhan-mantri-bhartiya-janaushadhi-pariyojana-pmbjp",
        "name": "Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)",
        "category": "Healthcare",
        "keywords": ["medicine", "generic drugs", "cheap medicine", "pharmacy", "medical store", "dawakhana"]
    },

    # Business, Micro-finance & Loans
    {
        "slug": "pradhan-mantri-mudra-yojana-pmmy",
        "name": "Pradhan Mantri Mudra Yojana (PMMY)",
        "category": "Business",
        "keywords": ["loan", "business", "small business", "shishu", "kishore", "tarun", "shop", "vendor", "startup", "collateral free"]
    },
    {
        "slug": "pm-vishwakarma",
        "name": "PM Vishwakarma Scheme",
        "category": "Artisans & Crafts",
        "keywords": ["artisan", "craftsman", "tools", "carpenter", "blacksmith", "weaver", "potter", "sculptor", "toolkit", "loan", "karigar"]
    },
    {
        "slug": "pm-svanidhi",
        "name": "PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi)",
        "category": "Business",
        "keywords": ["street vendor", "thela", "rehri", "hawker", "working capital loan", "10000", "20000", "urban vendor", "dokan"]
    },
    {
        "slug": "stand-up-india",
        "name": "Stand-Up India Scheme",
        "category": "Business",
        "keywords": ["sc", "st", "women entrepreneur", "greenfield enterprise", "bank loan", "manufacturing", "services", "trading"]
    },
    {
        "slug": "prime-ministers-employment-generation-programme-pmegp",
        "name": "Prime Minister's Employment Generation Programme (PMEGP)",
        "category": "Employment",
        "keywords": ["employment", "subsidy", "khadi", "village industries", "manufacturing unit", "service project", "unemployed"]
    },

    # Women & Family Welfare
    {
        "slug": "pradhan-mantri-ujjwala-yojana-pmiy",
        "name": "Pradhan Mantri Ujjwala Yojana (PMUY)",
        "category": "Women & Family",
        "keywords": ["lpg", "gas cylinder", "cooking", "women", "fuel", "free connection", "chulha", "subsidy", "gas"]
    },
    {
        "slug": "sukanya-samriddhi-yojana",
        "name": "Sukanya Samriddhi Yojana (SSY)",
        "category": "Women & Family",
        "keywords": ["girl child", "daughter", "savings", "education", "marriage", "post office", "interest rate", "beti", "ladki"]
    },
    {
        "slug": "pradhan-mantri-matru-vandana-yojana-pmmvy",
        "name": "Pradhan Mantri Matru Vandana Yojana (PMMVY)",
        "category": "Women & Family",
        "keywords": ["pregnant", "maternity", "first child", "cash incentive", "lactating mother", "nutrition", "delivery"]
    },
    {
        "slug": "lakhpati-didi",
        "name": "Lakhpati Didi Scheme",
        "category": "Women & Family",
        "keywords": ["self help group", "shg", "women entrepreneur", "rural women", "training", "income"]
    },

    # Pension & Social Security
    {
        "slug": "atal-pension-yojana",
        "name": "Atal Pension Yojana (APY)",
        "category": "Social Security",
        "keywords": ["pension", "retirement", "monthly income", "unorganised", "old age", "monthly pension", "guaranteed pension"]
    },
    {
        "slug": "pradhan-mantri-shram-yogi-maan-dhan-pmsym",
        "name": "Pradhan Mantri Shram Yogi Maan-dhan (PM-SYM)",
        "category": "Social Security",
        "keywords": ["informal worker", "labour", "driver", "maid", "rickshaw", "pension 3000", "unorganised worker"]
    },
    {
        "slug": "pradhan-mantri-suraksha-bima-yojana-pmsby",
        "name": "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
        "category": "Social Security",
        "keywords": ["accident insurance", "accidental death", "20 rupees", "bima", "disability"]
    },
    {
        "slug": "pradhan-mantri-jeevan-jyoti-bima-yojana-pmjjby",
        "name": "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)",
        "category": "Social Security",
        "keywords": ["life insurance", "term life", "436 rupees", "death cover", "bank account", "family protection"]
    },
    {
        "slug": "national-social-assistance-programme-nsap",
        "name": "National Social Assistance Programme (NSAP)",
        "category": "Social Security",
        "keywords": ["elderly pension", "widow pension", "disability pension", "bpl", "destitute", "vridha", "vidhwa"]
    },

    # Education & Skill Development
    {
        "slug": "pradhan-mantri-kaushal-vikas-yojana-pmkvy",
        "name": "Pradhan Mantri Kaushal Vikas Yojana (PMKVY)",
        "category": "Education & Skills",
        "keywords": ["skill training", "job training", "certificate", "youth", "placement", "free course", "hunar"]
    },
    {
        "slug": "national-apprenticeship-promotion-scheme-naps",
        "name": "National Apprenticeship Promotion Scheme (NAPS)",
        "category": "Education & Skills",
        "keywords": ["apprentice", "stipend", "on the job training", "iti", "diploma", "graduate training"]
    }
]

def find_myscheme_candidates(query: str, limit: int = 5) -> list[dict]:
    """
    Semantically scores candidate schemes matching the citizen's query.
    Returns up to `limit` relevant schemes.
    """
    query_lower = query.lower().strip()
    query_words = set(query_lower.split())
    scored = []

    for s in POPULAR_SCHEMES:
        score = 0
        slug_lower = s["slug"].lower()
        name_lower = s["name"].lower()
        category_lower = s.get("category", "").lower()

        # Exact slug or name match
        if slug_lower in query_lower or query_lower in slug_lower:
            score += 25
        if name_lower in query_lower or query_lower in name_lower:
            score += 20

        # Word overlap in name
        name_words = set(name_lower.split())
        common_name = query_words.intersection(name_words)
        score += len(common_name) * 8

        # Category match
        if category_lower in query_lower:
            score += 15

        # Keyword matching
        for kw in s["keywords"]:
            if kw in query_lower:
                score += 10
            elif any(qw == kw for qw in query_words):
                score += 8
            elif any(qw in kw for qw in query_words if len(qw) > 3):
                score += 4

        if score > 0:
            scored.append((score, s))

    # Sort descending by relevance score
    scored.sort(key=lambda x: x[0], reverse=True)
    results = [s for score, s in scored[:limit]]

    # If no specific matches, return broad top schemes across key domains
    if not results:
        results = [
            POPULAR_SCHEMES[0],  # PM-Kisan
            POPULAR_SCHEMES[5],  # PMAY-G
            POPULAR_SCHEMES[7],  # Ayushman Bharat
            POPULAR_SCHEMES[9],  # PM Mudra
        ][:limit]

    return results

def fetch_myscheme(slug_or_url: str, lang: str = "en") -> dict:
    slug = slug_or_url.strip()
    if "/" in slug:
        slug = slug.split("/")[-1]
        
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        "x-api-key": settings.MYSCHEME_API_KEY,
        "Origin": "https://www.myscheme.gov.in",
        "Referer": "https://www.myscheme.gov.in/"
    }
    
    url = f"https://api.myscheme.gov.in/schemes/v6/public/schemes?slug={slug}&lang={lang}"
    
    with httpx.Client(headers=headers, timeout=12.0) as client:
        resp = client.get(url)
        if resp.status_code != 200:
            # Fallback to local catalog definition if remote API rate limits
            local_match = next((s for s in POPULAR_SCHEMES if s["slug"] == slug), None)
            scheme_title = local_match["name"] if local_match else slug
            return {
                "title": scheme_title,
                "url": f"https://www.myscheme.gov.in/schemes/{slug}",
                "publisher": "myScheme (Ministry of Electronics and Information Technology)",
                "source_type": "myscheme",
                "content": f"# {scheme_title}\nOfficial Portal: https://www.myscheme.gov.in/schemes/{slug}",
                "scheme_id": None,
                "slug": slug,
                "eligibility_markdown": "Refer to official portal for current eligibility details.",
                "documents_markdown": "Aadhaar card, Bank passbook, Category certificate if applicable.",
                "http_status": 200
            }
        
        payload = resp.json()
        data = payload.get("data", {})
        if not data or not isinstance(data, dict):
            local_match = next((s for s in POPULAR_SCHEMES if s["slug"] == slug), None)
            scheme_title = local_match["name"] if local_match else slug
            return {
                "title": scheme_title,
                "url": f"https://www.myscheme.gov.in/schemes/{slug}",
                "publisher": "myScheme (Ministry of Electronics and Information Technology)",
                "source_type": "myscheme",
                "content": f"# {scheme_title}",
                "scheme_id": None,
                "slug": slug,
                "eligibility_markdown": "Please refer to official guidelines.",
                "documents_markdown": "",
                "http_status": 200
            }
        
        scheme_id = data.get("_id")
        content_lang = data.get(lang, data.get("en", {}))
        
        basic = content_lang.get("basicDetails", {})
        scheme_name = basic.get("schemeName") or basic.get("schemeShortTitle") or slug
        brief = content_lang.get("schemeContent", {}).get("briefDescription", "")
        
        # Eligibility
        elig_data = content_lang.get("eligibilityCriteria", {})
        elig_text = elig_data.get("eligibilityDescription_md") or elig_data.get("eligibilityDescription", "")
        
        # Fetch documents if scheme_id is available
        documents_text = ""
        if scheme_id:
            try:
                doc_url = f"https://api.myscheme.gov.in/schemes/v6/public/schemes/{scheme_id}/documents?lang={lang}"
                d_resp = client.get(doc_url)
                if d_resp.status_code == 200:
                    d_json = d_resp.json().get("data", {})
                    d_content = d_json.get(lang, d_json.get("en", {}))
                    documents_text = d_content.get("documentsRequired_md", "")
            except Exception as e:
                print(f"[myScheme] Error fetching documents for {slug}: {e}")

        # Assemble full content
        sections = [
            f"# {scheme_name}",
            f"Official Portal: https://www.myscheme.gov.in/schemes/{slug}",
            f"Ministry: {basic.get('nodalMinistryName', 'Government of India')}",
            f"## Brief Overview\n{brief}",
            f"## Eligibility Criteria\n{elig_text}",
            f"## Documents Required\n{documents_text}" if documents_text else ""
        ]
        full_text = "\n\n".join(s for s in sections if s)

        return {
            "title": scheme_name,
            "url": f"https://www.myscheme.gov.in/schemes/{slug}",
            "publisher": "myScheme (Ministry of Electronics and Information Technology)",
            "source_type": "myscheme",
            "content": full_text,
            "scheme_id": scheme_id,
            "slug": slug,
            "eligibility_markdown": elig_text,
            "documents_markdown": documents_text,
            "http_status": resp.status_code
        }
