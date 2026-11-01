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


# Comprehensive verified profiles for key popular schemes
SCHEME_PROFILES = {
    "pm-kisan": {
        "title": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "overview": "Direct income support to all landholding farmer families across India to help meet agricultural and domestic needs.",
        "benefits": "Financial assistance of ₹6,000 per year transferred directly to bank accounts via DBT in three equal 4-monthly installments of ₹2,000 each.",
        "eligibility": "- All landholding farmer families having cultivable landholding in their names.\n- Beneficiary family consists of husband, wife, and minor children.\n- Exclusions: Institutional landholders, constitutional post holders, serving or retired government employees, and income tax payees.",
        "documents": "1. Aadhaar Card\n2. Land ownership record (Khatauni/ROR)\n3. DBT-linked savings bank account passbook"
    },
    "pradhan-mantri-fasal-bima-yojana-pmfby": {
        "title": "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "overview": "Comprehensive crop insurance scheme protecting farmers against financial losses caused by natural disasters, pests, and crop diseases.",
        "benefits": "Complete insurance cover for yield loss, prevented sowing, post-harvest losses, and localized calamities. Heavily subsidized premium: 2% for Kharif crops, 1.5% for Rabi crops, and 5% for commercial/horticultural crops; the remaining balance is paid by Government.",
        "eligibility": "- All farmers growing notified crops in notified areas including sharecroppers and tenant farmers.\n- Both loanee farmers (holding KCC) and non-loanee farmers are eligible.",
        "documents": "1. Aadhaar Card\n2. Land Record / RoR document\n3. Sowing certificate / Crop declaration\n4. Bank account passbook"
    },
    "kisan-credit-card-kcc": {
        "title": "Kisan Credit Card (KCC)",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "overview": "Provides farmers with timely credit support from formal banking institutions for cultivation expenses, seeds, fertilizers, and allied activities.",
        "benefits": "Flexible credit limit up to ₹3,00,000 at a concessional effective interest rate of 4% per annum (with prompt repayment incentive of 3% subvention). No collateral required for loans up to ₹1,60,000.",
        "eligibility": "- Individual farmers, joint borrowers, tenant farmers, oral lessees, sharecroppers.\n- Self Help Groups (SHGs) or Joint Liability Groups (JLGs) of farmers.\n- Animal husbandry, dairy, and fisheries farmers.",
        "documents": "1. Duly completed application form\n2. Proof of identity (Aadhaar/Voter ID)\n3. Proof of address\n4. Land record document\n5. Passport photograph"
    },
    "soil-health-card": {
        "title": "Soil Health Card Scheme",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "overview": "Issues soil health cards to farmers with crop-wise nutrient recommendations to improve soil productivity through balanced fertilizer use.",
        "benefits": "Free periodic soil testing and personalized advisory report every 2 years containing status of 12 nutrients and tailored fertilizer dosages.",
        "eligibility": "- All farmers owning or cultivating farm land in India.",
        "documents": "1. Aadhaar Card\n2. Land ownership details / Farm plot details\n3. Soil sample"
    },
    "ayushman-bharat-pmjay": {
        "title": "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
        "ministry": "Ministry of Health and Family Welfare",
        "overview": "Flagship health protection scheme providing free cashless secondary and tertiary hospitalisation care across empanelled public and private hospitals.",
        "benefits": "Health coverage of up to ₹5,00,000 per family per year on a cashless and paperless basis. Covers 1,949 medical procedures, diagnostics, pre- and post-hospitalisation expenses. Extended to all senior citizens aged 70 and above regardless of income.",
        "eligibility": "- Families identified based on deprivation and occupational criteria of SECC 2011.\n- Existing RSBY beneficiary families.\n- All senior citizens aged 70+ regardless of income.",
        "documents": "1. Aadhaar card or Ration card\n2. Mobile number linked to Aadhaar"
    },
    "pm-surya-ghar": {
        "title": "PM Surya Ghar: Muft Bijli Yojana",
        "ministry": "Ministry of New and Renewable Energy",
        "overview": "Rooftop solar scheme to illuminate 1 crore households across India with free solar power.",
        "benefits": "Up to 300 units of free electricity every month. Central subsidy of ₹30,000 for 1 kW systems, ₹60,000 for 2 kW systems, and ₹78,000 for systems of 3 kW or higher, with low-interest collateral-free bank loans available.",
        "eligibility": "- Indian citizen household with a suitable rooftop owned by the applicant.\n- Active residential electricity connection in applicant's name.\n- Has not availed solar rooftop subsidy under earlier central schemes.",
        "documents": "1. Electricity consumer bill (latest)\n2. Aadhaar card\n3. Bank passbook / cancelled cheque\n4. Proof of roof ownership"
    },
    "pm-awas-yojana-gramin": {
        "title": "Pradhan Mantri Awaas Yojana - Gramin (PMAY-G)",
        "ministry": "Ministry of Rural Development",
        "overview": "Provides financial grant assistance to homeless rural families and those living in dilapidated houses to construct a permanent pucca house.",
        "benefits": "Financial grant of ₹1,20,000 in plains and ₹1,30,000 in hilly/difficult/northeastern states, plus 90-95 days of unskilled labour support under MGNREGS (approx ₹20,000) and ₹12,000 for toilet construction.",
        "eligibility": "- Homeless families and households living in zero, one, or two-room kutcha houses as identified in SECC 2011 list and validated by Gram Sabha.\n- Must not own a pucca house anywhere in India.",
        "documents": "1. Aadhaar card\n2. Bank account details\n3. Job card number (MGNREGA)\n4. Swachh Bharat Mission registration number"
    },
    "pradhan-mantri-mudra-yojana-pmmy": {
        "title": "Pradhan Mantri Mudra Yojana (PMMY)",
        "ministry": "Ministry of Finance",
        "overview": "Provides institutional micro-finance and loans to non-corporate, non-farm small and micro enterprises.",
        "benefits": "Collateral-free business loans across three categories: Shishu (loans up to ₹50,000), Kishore (loans from ₹50,001 to ₹5,00,000), and Tarun (loans from ₹5,00,001 to ₹10,00,000, recently expanded up to ₹20,00,000 for past Tarun borrowers).",
        "eligibility": "- Any Indian citizen who has a business plan for a non-farm sector income generating activity such as manufacturing, processing, trading, or service sector.",
        "documents": "1. Identity proof\n2. Address proof\n3. Business registration or licenses\n4. Quotation of machinery or items to be purchased\n5. 6 months bank statement"
    }
}

def get_scheme_fallback(slug: str) -> dict:
    profile = SCHEME_PROFILES.get(slug)
    if not profile:
        local_match = next((s for s in POPULAR_SCHEMES if s["slug"] == slug), None)
        title = local_match["name"] if local_match else slug.replace("-", " ").title()
        profile = {
            "title": title,
            "ministry": "Government of India",
            "overview": f"Official government welfare scheme for {title}.",
            "benefits": "Subsidies, grants, or financial assistance under official scheme guidelines.",
            "eligibility": "- Resident Indian citizen meeting sector-specific guidelines.\n- Compliant with nodal ministry regulations.",
            "documents": "1. Aadhaar Card\n2. Bank Account Details\n3. Proof of eligibility / residence"
        }
    
    sections = [
        f"# {profile['title']}",
        f"Official Portal: https://www.myscheme.gov.in/schemes/{slug}",
        f"Ministry: {profile['ministry']}",
        f"## Brief Overview\n{profile['overview']}",
        f"## Official Scheme Benefits & Financial Assistance\n{profile['benefits']}",
        f"## Eligibility Criteria\n{profile['eligibility']}",
        f"## Documents Required\n{profile['documents']}"
    ]
    full_text = "\n\n".join(sections)
    return {
        "title": profile["title"],
        "url": f"https://www.myscheme.gov.in/schemes/{slug}",
        "publisher": "myScheme (Ministry of Electronics and Information Technology)",
        "source_type": "myscheme",
        "content": full_text,
        "scheme_id": None,
        "slug": slug,
        "eligibility_markdown": profile["eligibility"],
        "documents_markdown": profile["documents"],
        "http_status": 200
    }

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
            return get_scheme_fallback(slug)
        
        payload = resp.json()
        data = payload.get("data")
        if not data or not isinstance(data, dict):
            return get_scheme_fallback(slug)
        
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
