import os
import sys
import json
import psycopg
from dotenv import load_dotenv

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

load_dotenv(os.path.join(backend_dir, ".env"))
supabase_uri = os.getenv("SUPABASE_URI")

if not supabase_uri:
    print("Warning: SUPABASE_URI not found in environment, checking app.config")
    try:
        from app.config import settings
        supabase_uri = settings.SUPABASE_URI
    except Exception as e:
        pass

if not supabase_uri:
    raise ValueError("SUPABASE_URI must be set to run seeding script")

print(f"[Seed] Connecting to Supabase database...")

# 1. Apply Migration 002
migration_path = os.path.join(backend_dir, "migrations", "002_civic_knowledge_base.sql")
if os.path.exists(migration_path):
    print(f"[Seed] Applying migration {migration_path}...")
    with open(migration_path, "r", encoding="utf-8") as f:
        migration_sql = f.read()
    with psycopg.connect(supabase_uri) as conn:
        with conn.cursor() as cur:
            cur.execute(migration_sql)
        conn.commit()
    print("[Seed] Migration 002 applied successfully!")

# 2. Comprehensive Civic Schemes Data
SCHEMES_DATA = [
    {
        "slug": "pm-kisan",
        "name": "Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)",
        "name_hi": "प्रधानमंत्री किसान सम्मान निधि",
        "category": "Agriculture",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "benefit_summary": "Direct income support of ₹6,000 per year transferred via DBT to eligible farmer bank accounts in three equal 4-monthly installments of ₹2,000 each.",
        "benefit_summary_hi": "पात्र किसान परिवारों को प्रति वर्ष ₹6,000 की वित्तीय सहायता, ₹2,000 की 3 समान किस्तों में सीधे बैंक खाते में दी जाती है।",
        "eligibility_criteria": [
            "All landholding farmer families having cultivable landholding in their names",
            "Family defined as husband, wife, and minor children",
            "Aadhaar linked with bank account and active e-KYC on PM-Kisan portal"
        ],
        "exclusions": [
            "Institutional landholders",
            "Farmer families holding or having held constitutional posts",
            "Serving or retired officers/employees of Central/State Govts and PSUs (excluding Class IV/Group D)",
            "All persons who paid Income Tax in last assessment year",
            "Professionals like Doctors, Engineers, Lawyers, Chartered Accountants"
        ],
        "documents_required": [
            "Aadhaar Card",
            "Land ownership record (Khatauni / Jamabandi / ROR)",
            "Aadhaar-seeded Bank Account Passbook",
            "Mobile number linked to Aadhaar for OTP e-KYC"
        ],
        "application_url": "https://pmkisan.gov.in",
        "common_misconceptions": [
            "Government increased installment to ₹4,000 or ₹12,000",
            "Farmers without land ownership papers are eligible for direct grant",
            "Money can be received through third-party WhatsApp links without e-KYC"
        ]
    },
    {
        "slug": "ayushman-bharat-pmjay",
        "name": "Ayushman Bharat - Pradhan Mantri Jan Arogya Yojana (PM-JAY)",
        "name_hi": "आयुष्मान भारत - प्रधानमंत्री जन आरोग्य योजना",
        "category": "Healthcare",
        "ministry": "Ministry of Health and Family Welfare",
        "benefit_summary": "Comprehensive health insurance cover of up to ₹5,00,000 per family per year for secondary and tertiary care hospitalization across empanelled public and private hospitals on a completely cashless basis. Senior citizens aged 70+ receive a separate top-up of ₹5,00,000 regardless of income.",
        "benefit_summary_hi": "प्रति परिवार प्रति वर्ष ₹5,00,000 तक का मुफ्त कैशलेस स्वास्थ्य बीमा। 70 वर्ष से अधिक आयु के सभी वरिष्ठ नागरिकों को आय सीमा के बिना ₹5 लाख का अतिरिक्त टॉप-अप कवर।",
        "eligibility_criteria": [
            "Rural and urban families identified under the deprivation and occupational criteria of SECC 2011",
            "Existing RSBY (Rashtriya Swasthya Bima Yojana) cardholders",
            "All senior citizens aged 70 years and above (universal coverage without income bar)"
        ],
        "exclusions": [
            "Families owning motorized vehicles or mechanized 3/4 wheeler agricultural equipment (SECC criteria)",
            "Government servants and families covered under CGHS/ECHS (unless 70+ senior citizen top-up scheme)"
        ],
        "documents_required": [
            "Aadhaar Card",
            "Ration Card or Family ID",
            "Active mobile number linked to Aadhaar"
        ],
        "application_url": "https://beneficiary.nha.gov.in",
        "common_misconceptions": [
            "Ayushman Bharat card costs money to create",
            "Ayushman coverage provides direct cash deposited in bank account",
            "Private hospital bills for general OPD consultations are reimbursed directly in cash"
        ]
    },
    {
        "slug": "pm-surya-ghar",
        "name": "PM Surya Ghar: Muft Bijli Yojana",
        "name_hi": "पीएम सूर्य घर: मुफ्त बिजली योजना",
        "category": "Energy & Sustainability",
        "ministry": "Ministry of New and Renewable Energy",
        "benefit_summary": "Provides up to 300 units of free electricity every month to 1 crore households through rooftop solar installation with direct central subsidy: ₹30,000 for 1 kW, ₹60,000 for 2 kW, and ₹78,000 for 3 kW or higher systems, supported by collateral-free low-interest bank loans.",
        "benefit_summary_hi": "छत पर सोलर पैनल लगाने के लिए ₹30,000 से ₹78,000 तक की केंद्रीय सब्सिडी और हर महीने 300 यूनिट तक मुफ्त बिजली।",
        "eligibility_criteria": [
            "Applicant must be an Indian citizen and own a house with a suitable roof",
            "Must have an active residential grid electricity connection in applicant's name",
            "Must not have availed any central/state solar rooftop subsidy previously for the same premises"
        ],
        "exclusions": [
            "Commercial and industrial electricity connections",
            "Rented premises without owner's explicit NOC and separate meter"
        ],
        "documents_required": [
            "Latest residential electricity bill",
            "Aadhaar Card",
            "Cancelled cheque / Bank passbook of applicant",
            "Proof of roof ownership / Electricity consumer number"
        ],
        "application_url": "https://pmsuryaghar.gov.in",
        "common_misconceptions": [
            "Government sends solar panels for free without rooftop inspection",
            "Subsidy is paid as physical cash by local contractors"
        ]
    },
    {
        "slug": "pm-awas-yojana-gramin",
        "name": "Pradhan Mantri Awaas Yojana - Gramin (PMAY-G)",
        "name_hi": "प्रधानमंत्री आवास योजना - ग्रामीण",
        "category": "Housing",
        "ministry": "Ministry of Rural Development",
        "benefit_summary": "Financial grant assistance of ₹1,20,000 in plain areas and ₹1,30,000 in hilly/northeastern/difficult states for construction of a permanent pucca house, plus ~₹20,000 unskilled labour support under MGNREGS and ₹12,000 for toilet under Swachh Bharat Mission.",
        "benefit_summary_hi": "पक्के मकान के निर्माण के लिए मैदानी क्षेत्रों में ₹1,20,000 और पहाड़ी क्षेत्रों में ₹1,30,000 की वित्तीय सहायता, साथ ही शौचालय हेतु ₹12,000।",
        "eligibility_criteria": [
            "Homeless rural families or households living in zero, one, or two-room kutcha houses as per SECC 2011 and Awaas+ list verified by Gram Sabha",
            "Must not own a pucca house anywhere in India"
        ],
        "exclusions": [
            "Households owning motorized 2/3/4 wheeler or mechanized agricultural machinery",
            "Households with any family member earning more than ₹15,000 per month or paying income tax",
            "Households with government employees"
        ],
        "documents_required": [
            "Aadhaar Card of all family members",
            "MGNREGA Job Card number",
            "Bank Account details (DBT enabled)",
            "Swachh Bharat Mission (SBM) toilet beneficiary registration number"
        ],
        "application_url": "https://pmayg.nic.in",
        "common_misconceptions": [
            "PMAY house money is paid in a single advance lump sum",
            "Middlemen or brokers can get names added instantly for a cash fee"
        ]
    },
    {
        "slug": "pradhan-mantri-mudra-yojana-pmmy",
        "name": "Pradhan Mantri Mudra Yojana (PMMY)",
        "name_hi": "प्रधानमंत्री मुद्रा योजना",
        "category": "Business & Microfinance",
        "ministry": "Ministry of Finance",
        "benefit_summary": "Institutional collateral-free business loans for non-farm micro and small enterprises across three categories: Shishu (loans up to ₹50,000), Kishore (loans from ₹50,001 to ₹5,00,000), and Tarun (loans up to ₹10,00,000, expanded to ₹20,00,000 for previous successful Tarun borrowers).",
        "benefit_summary_hi": "छोटे कारोबारियों और उद्यमियों को बिना किसी गारंटी के ₹50,000 से लेकर ₹20,00,000 तक का सस्ता व्यावसायिक ऋण।",
        "eligibility_criteria": [
            "Any Indian citizen who has a viable business plan for a non-farm income generating activity (manufacturing, trading, services, or shopkeeping)",
            "Borrower must not be a defaulter to any bank or financial institution"
        ],
        "exclusions": [
            "Personal loans, household consumption loans, or purely agricultural crop loans"
        ],
        "documents_required": [
            "Proof of identity (Aadhaar / Voter ID / PAN)",
            "Proof of residence",
            "Business address proof and trade licenses (if applicable)",
            "Quotation of machinery/items to be purchased and projected financials",
            "Last 6 months bank statement"
        ],
        "application_url": "https://www.mudra.org.in",
        "common_misconceptions": [
            "Mudra loan is a 100% free government grant that doesn't need to be repaid",
            "Mudra loans are sanctioned via WhatsApp by private agents charging 5% advance fee"
        ]
    },
    {
        "slug": "pradhan-mantri-ujjwala-yojana-pmuy",
        "name": "Pradhan Mantri Ujjwala Yojana (PMUY)",
        "name_hi": "प्रधानमंत्री उज्ज्वला योजना",
        "category": "Women & Energy",
        "ministry": "Ministry of Petroleum and Natural Gas",
        "benefit_summary": "Provides free deposit-free LPG connection to adult women from poor households, including financial support of ₹1,600 per connection (covering security deposit of cylinder, regulator, hose, and domestic gas consumer card book) and targeted subsidy of ₹300 per 14.2 kg cylinder for up to 12 refills per year.",
        "benefit_summary_hi": "गरीब परिवारों की महिलाओं को मुफ्त एलपीजी गैस कनेक्शन, चूल्हा एवं पहला रिफिल तथा प्रति सिलेंडर ₹300 की सब्सिडी।",
        "eligibility_criteria": [
            "Adult woman (aged 18+) belonging to BPL or underprivileged household",
            "No other LPG connection exists in the same household"
        ],
        "exclusions": [
            "Households already having an active LPG connection with any OMC (IOCL, BPCL, HPCL)"
        ],
        "documents_required": [
            "Aadhaar Card of the female applicant as proof of identity and address",
            "Ration card issued by the State Government / Family declaration",
            "Aadhaar-linked bank account passbook"
        ],
        "application_url": "https://www.pmuy.gov.in",
        "common_misconceptions": [
            "Ujjwala provides unlimited free gas cylinders every month without payment",
            "Men can register for new connections in their own names under PMUY"
        ]
    },
    {
        "slug": "sukanya-samriddhi-yojana",
        "name": "Sukanya Samriddhi Yojana (SSY)",
        "name_hi": "सुकन्या समृद्धि योजना",
        "category": "Women & Child Welfare",
        "ministry": "Ministry of Finance",
        "benefit_summary": "High-interest government-backed small savings scheme for girl children with sovereign guarantee, currently offering 8.2% annual interest compounded yearly, complete tax exemption under Section 80C (EEE status), with maturity upon the girl child turning 21 years of age.",
        "benefit_summary_hi": "बेटियों के उज्ज्वल भविष्य के लिए 8.2% वार्षिक ब्याज दर, 80C के तहत पूर्ण कर छूट और 21 वर्ष में परिपक्वता वाली बचत योजना।",
        "eligibility_criteria": [
            "Can be opened by legal guardian in the name of a girl child below 10 years of age",
            "Maximum 2 accounts permitted per family (except in case of twin/triplet girl children)"
        ],
        "exclusions": [
            "Girl child aged above 10 years at the time of account opening"
        ],
        "documents_required": [
            "Birth certificate of the girl child",
            "Identity and address proof of the guardian (Aadhaar / PAN)",
            "Medical certificate in case of twins/triplets"
        ],
        "application_url": "https://www.indiapost.gov.in",
        "common_misconceptions": [
            "Government deposits ₹1,00,000 cash bonus upon opening the account",
            "Accounts can be operated by anyone other than the natural/legal guardian"
        ]
    },
    {
        "slug": "atal-pension-yojana",
        "name": "Atal Pension Yojana (APY)",
        "name_hi": "अटल पेंशन योजना",
        "category": "Social Security",
        "ministry": "Ministry of Finance",
        "benefit_summary": "Guaranteed minimum monthly pension of ₹1,000, ₹2,000, ₹3,000, ₹4,000, or ₹5,000 starting at age 60, depending on the subscriber's monthly contribution, with spouse pension continuation and return of full pension corpus to the nominee.",
        "benefit_summary_hi": "60 वर्ष की आयु के बाद ₹1,000 से ₹5,000 तक की आजीवन मासिक पेंशन की गारंटी।",
        "eligibility_criteria": [
            "All Indian citizens aged between 18 and 40 years holding a savings bank account"
        ],
        "exclusions": [
            "Any citizen who is or has been an income tax payer as per rules effective from October 1, 2022"
        ],
        "documents_required": [
            "Aadhaar Card",
            "Active Savings Bank Account with auto-debit facility",
            "Registered mobile number"
        ],
        "application_url": "https://www.npscra.nsdl.co.in",
        "common_misconceptions": [
            "Pension starts immediately upon payment of first installment",
            "Income tax payers are eligible for new APY registrations"
        ]
    },
    {
        "slug": "pm-vishwakarma",
        "name": "PM Vishwakarma Scheme",
        "name_hi": "पीएम विश्वकर्मा योजना",
        "category": "Artisans & Crafts",
        "ministry": "Ministry of Micro, Small and Medium Enterprises",
        "benefit_summary": "Holistic recognition and financial empowerment for traditional artisans across 18 trades: free PM Vishwakarma Certificate & ID Card, ₹15,000 toolkit incentive via e-voucher, basic and advanced skill training with ₹500/day stipend, and collateral-free enterprise credit up to ₹3,00,000 in two tranches (₹1 lakh & ₹2 lakh) at a concessional interest rate of 5%.",
        "benefit_summary_hi": "18 पारंपरिक व्यवसायों के कारीगरों को ₹15,000 टूलकिट अनुदान, ₹500 दैनिक स्टाइपेंड के साथ प्रशिक्षण, और 5% ब्याज पर ₹3 लाख तक का गारंटी-मुक्त ऋण।",
        "eligibility_criteria": [
            "Traditional artisan or craftsperson working with hands and tools in one of the 18 notified trades (Carpenters, Blacksmiths, Potters, Cobblers, Tailors, Weavers, Barbers, Washermen, etc.)",
            "Minimum age of 18 years on date of application",
            "Limited to one member per family"
        ],
        "exclusions": [
            "Persons who have availed credit facilities under PMEGP, PM SVANidhi, or Mudra in past 5 years and not repaid",
            "Government servants and their family members"
        ],
        "documents_required": [
            "Aadhaar Card",
            "Mobile number linked to Aadhaar",
            "Bank account passbook",
            "Ration card"
        ],
        "application_url": "https://pmvishwakarma.gov.in",
        "common_misconceptions": [
            "The ₹15,000 toolkit money can be withdrawn directly as cash from ATM",
            "Any general retail shopkeeper is eligible without performing traditional craft work"
        ]
    },
    {
        "slug": "pm-svanidhi",
        "name": "PM Street Vendor's AtmaNirbhar Nidhi (PM SVANidhi)",
        "name_hi": "पीएम स्वनिधि योजना",
        "category": "Street Vendors & Micro-business",
        "ministry": "Ministry of Housing and Urban Affairs",
        "benefit_summary": "Collateral-free working capital micro-credit for urban street vendors: 1st tranche up to ₹10,000 (1 year), 2nd tranche up to ₹20,000 upon timely repayment, and 3rd tranche up to ₹50,000, with 7% interest subsidy credited directly to bank account and cashback up to ₹1,200/year on digital transactions.",
        "benefit_summary_hi": "रेहड़ी-पटरी एवं ठेले वालों को बिना गारंटी ₹10,000 से ₹50,000 तक का कार्यशील पूंजी ऋण एवं 7% ब्याज सब्सिडी।",
        "eligibility_criteria": [
            "Street vendors vending in urban areas possessing Certificate of Vending / ID Card issued by Urban Local Bodies (ULBs)",
            "Vendors identified in vending census or holding letter of recommendation (LoR)"
        ],
        "exclusions": [
            "Non-vending individuals or those with no prior history of urban vending"
        ],
        "documents_required": [
            "Certificate of Vending / Vendor ID Card or Letter of Recommendation (LoR)",
            "Aadhaar Card",
            "Bank Account Passbook"
        ],
        "application_url": "https://pmsvanidhi.mohua.gov.in",
        "common_misconceptions": [
            "Vendors must pledge gold or property as collateral",
            "Private loan recovery agents can freeze personal accounts outside formal banking channels"
        ]
    }
]

# 3. High-Frequency PIB Fact Check & Viral Misinformation Debunks
PIB_DEBUNKS_DATA = [
    {
        "claim_text": "Government is giving free laptops to all 10th and 12th pass students under PM Free Laptop Yojana 2024 / 2025.",
        "debunk_verdict": "contradicted",
        "official_explanation": "The claim that the Central Government is operating a 'PM Free Laptop Scheme' providing free laptops to all students is completely fake. The Ministry of Education and PIB Fact Check have repeatedly warned that no such scheme exists and fraudulent websites are phishing for personal student data.",
        "official_explanation_hi": "केंद्र सरकार द्वारा 'पीएम फ्री लैपटॉप योजना' के तहत सभी छात्रों को मुफ्त लैपटॉप दिए जाने का दावा पूरी तरह फर्जी है। शिक्षा मंत्रालय ने स्पष्ट किया है कि ऐसी कोई योजना संचालित नहीं की जा रही है।",
        "correct_fact": "No 'PM Free Laptop Scheme' has been launched by the Central Government. Official educational assistance is provided strictly through the National Scholarship Portal (scholarships.gov.in).",
        "source_url": "https://factcheck.pib.gov.in"
    },
    {
        "claim_text": "RBI has banned ₹500 currency notes with the green security thread strip located near Mahatma Gandhi's photo.",
        "debunk_verdict": "contradicted",
        "official_explanation": "A viral social media claim alleges that ₹500 notes where the green security thread is closer to Mahatma Gandhi's portrait are fake and will be discontinued. This is completely false. The Reserve Bank of India has officially confirmed that both types of genuine ₹500 notes in the Mahatma Gandhi (New) Series are 100% valid legal tender.",
        "official_explanation_hi": "सोशल मीडिया पर यह दावा फर्जी है कि जिस ₹500 के नोट पर हरी पट्टी गांधी जी की तस्वीर के पास होती है वह नकली है। भारतीय रिज़र्व बैंक (RBI) ने स्पष्ट किया है कि दोनों प्रकार के ₹500 के नोट पूरी तरह वैध हैं।",
        "correct_fact": "All genuine ₹500 Mahatma Gandhi (New) Series banknotes issued by the Reserve Bank of India are legal tender. The slight alignment difference of the security thread is an acceptable printing variance.",
        "source_url": "https://factcheck.pib.gov.in"
    },
    {
        "claim_text": "Electricity will be disconnected tonight at 9:30 PM due to unpaid electricity bill. Call this mobile number immediately or install app.",
        "debunk_verdict": "contradicted",
        "official_explanation": "This viral SMS/WhatsApp forward is a widespread cyber fraud and phishing scam. Power distribution utilities (DISCOMs) never send disconnection threats from personal 10-digit mobile numbers asking customers to call an individual or download external APK apps like AnyDesk, TeamViewer, or QuickSupport.",
        "official_explanation_hi": "यह एक साइबर धोखाधड़ी (फिशिंग स्कैम) है। बिजली वितरण कंपनियां कभी भी किसी व्यक्तिगत 10 अंकों के मोबाइल नंबर से बिजली काटने की धमकी भरा एसएमएस नहीं भेजती हैं।",
        "correct_fact": "Electricity disconnection notices are served through formal paper bills or registered company headers. Payments should only be made via official DISCOM portals or authorized Bharat BillPay (BBPS) channels.",
        "source_url": "https://factcheck.pib.gov.in"
    },
    {
        "claim_text": "Government is crediting ₹5,000 cash bonus into all women's bank accounts under PM Nari Shakti / Kanya Ayush Yojana.",
        "debunk_verdict": "contradicted",
        "official_explanation": "Viral messages and YouTube videos claim that the Government of India is depositing ₹5,000 or ₹10,000 cash into the bank accounts of all daughters and women under 'PM Nari Shakti Yojana'. PIB Fact Check has officially confirmed that this claim is fabricated and no such scheme is run by the Government.",
        "official_explanation_hi": "यह दावा पूरी तरह फर्जी है। केंद्र सरकार 'पीएम नारी शक्ति' या 'कन्या आयुष' नाम से महिलाओं को ₹5,000 नकद देने की कोई योजना नहीं चला रही है।",
        "correct_fact": "There is no 'PM Nari Shakti Yojana' granting ₹5,000 cash handouts. Genuine welfare programs for women include PMMVY (maternity support) and Sukanya Samriddhi Yojana (savings).",
        "source_url": "https://factcheck.pib.gov.in"
    },
    {
        "claim_text": "UNESCO has declared Indian National Anthem Jana Gana Mana as the best national anthem in the world.",
        "debunk_verdict": "contradicted",
        "official_explanation": "This is a decades-old internet rumor that resurfaces periodically on social media. UNESCO has repeatedly issued formal statements clarifying that it does not hold competitions, rank, or proclaim 'best national anthems' for any nation.",
        "official_explanation_hi": "यूनेस्को द्वारा भारत के राष्ट्रगान 'जन गण मन' को विश्व का सर्वश्रेष्ठ राष्ट्रगान घोषित किए जाने का दावा पूरी तरह निराधार है। यूनेस्को ने स्पष्ट किया है कि वह ऐसा कोई सम्मान या रैंकिंग जारी नहीं करता।",
        "correct_fact": "UNESCO does not rate or award rankings to national anthems of any country. While Jana Gana Mana is the revered national anthem of India, the UNESCO award claim is a long-standing internet hoax.",
        "source_url": "https://factcheck.pib.gov.in"
    },
    {
        "claim_text": "PM Kisan installment has been doubled from ₹2,000 to ₹4,000 for the upcoming installment date.",
        "debunk_verdict": "contradicted",
        "official_explanation": "Viral posts frequently claim that the Central Government has doubled the PM-KISAN installment to ₹4,000 or annual assistance to ₹12,000. The Ministry of Agriculture and Farmers Welfare has clarified that the PM-KISAN financial benefit remains ₹6,000 per year, delivered in 3 equal installments of ₹2,000 each.",
        "official_explanation_hi": "पीएम किसान सम्मान निधि की किस्त ₹2,000 से बढ़ाकर ₹4,000 करने की खबरें भ्रामक हैं। योजना के तहत राशि ₹6,000 प्रति वर्ष (₹2,000 की 3 किस्तें) ही निर्धारित है।",
        "correct_fact": "Under PM-KISAN, eligible farmers receive ₹6,000 annually in three 4-monthly installments of ₹2,000. No notification doubling the installment amount has been released by the Government.",
        "source_url": "https://pmkisan.gov.in"
    },
    {
        "claim_text": "Government is giving free mobile recharge for 3 months to all Indian citizens under PM Free Recharge Yojana via this link.",
        "debunk_verdict": "contradicted",
        "official_explanation": "Fraudulent messages circulating on WhatsApp claim that the Prime Minister is providing 3 months of free mobile recharge to Jio, Airtel, and Vi users to celebrate election victories or national events. This is a credential-harvesting scam designed to compromise users' accounts and device security.",
        "official_explanation_hi": "फ्री 3 महीने का मोबाइल रिचार्ज मिलने का दावा पूरी तरह फर्जी और धोखाधड़ी है। सरकार या टेलीकॉम कंपनियां ऐसी कोई मुफ्त रिचार्ज योजना नहीं चला रही हैं। लिंक पर कभी क्लिक न करें।",
        "correct_fact": "The Government of India and telecom service providers do not provide free 3-month recharge packages via social media links. Do not forward such messages or click unverified links.",
        "source_url": "https://factcheck.pib.gov.in"
    },
    {
        "claim_text": "Cabinet has approved ₹1,000 monthly unemployment allowance for all youth under PM Berojgari Bhatta Yojana.",
        "debunk_verdict": "contradicted",
        "official_explanation": "Viral messages claiming that the Central Government has launched 'PM Berojgari Bhatta Yojana' offering ₹1,000 to ₹3,500 monthly allowance to unemployed youth are fake. PIB Fact Check has refuted this scheme repeatedly.",
        "official_explanation_hi": "केंद्र सरकार 'पीएम बेरोजगारी भत्ता योजना' के तहत युवाओं को ₹1,000 या ₹3,500 का मासिक भत्ता नहीं दे रही है। यह दावा भ्रामक और फर्जी है।",
        "correct_fact": "The Central Government does not run any 'PM Berojgari Bhatta' cash allowance scheme. Government focus is on skilling and self-employment initiatives like PMKVY, PMEGP, and Apprenticeship schemes.",
        "source_url": "https://factcheck.pib.gov.in"
    }
]

# 4. Insert Schemes
print(f"[Seed] Ingesting {len(SCHEMES_DATA)} official civic schemes into 'civic_schemes_kb'...")
with psycopg.connect(supabase_uri) as conn:
    with conn.cursor() as cur:
        for s in SCHEMES_DATA:
            cur.execute("""
                INSERT INTO civic_schemes_kb (
                    slug, name, name_hi, category, ministry, level,
                    benefit_summary, benefit_summary_hi,
                    eligibility_criteria, exclusions, documents_required,
                    application_url, common_misconceptions
                )
                VALUES (%s, %s, %s, %s, %s, 'central', %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (slug) DO UPDATE SET
                    name = EXCLUDED.name,
                    name_hi = EXCLUDED.name_hi,
                    category = EXCLUDED.category,
                    ministry = EXCLUDED.ministry,
                    benefit_summary = EXCLUDED.benefit_summary,
                    benefit_summary_hi = EXCLUDED.benefit_summary_hi,
                    eligibility_criteria = EXCLUDED.eligibility_criteria,
                    exclusions = EXCLUDED.exclusions,
                    documents_required = EXCLUDED.documents_required,
                    application_url = EXCLUDED.application_url,
                    common_misconceptions = EXCLUDED.common_misconceptions,
                    updated_at = NOW();
            """, (
                s["slug"], s["name"], s.get("name_hi"), s["category"], s["ministry"],
                s["benefit_summary"], s.get("benefit_summary_hi"),
                json.dumps(s["eligibility_criteria"]),
                json.dumps(s["exclusions"]),
                json.dumps(s["documents_required"]),
                s["application_url"],
                s.get("common_misconceptions", [])
            ))
    conn.commit()
print("[Seed] Successfully seeded civic_schemes_kb!")

# 5. Insert PIB Debunks
print(f"[Seed] Ingesting {len(PIB_DEBUNKS_DATA)} verified fact-check records into 'pib_debunks_kb'...")
with psycopg.connect(supabase_uri) as conn:
    with conn.cursor() as cur:
        for d in PIB_DEBUNKS_DATA:
            cur.execute("""
                INSERT INTO pib_debunks_kb (
                    claim_text, debunk_verdict, official_explanation,
                    official_explanation_hi, correct_fact, source_url, publisher
                )
                VALUES (%s, %s, %s, %s, %s, %s, 'PIB Fact Check Unit')
                ON CONFLICT DO NOTHING;
            """, (
                d["claim_text"], d["debunk_verdict"], d["official_explanation"],
                d.get("official_explanation_hi"), d["correct_fact"], d["source_url"]
            ))
    conn.commit()
print("[Seed] Successfully seeded pib_debunks_kb!")

# 6. Verification Queries
with psycopg.connect(supabase_uri) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM civic_schemes_kb")
        schemes_count = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM pib_debunks_kb")
        debunks_count = cur.fetchone()[0]
        print(f"\n[Verification] Knowledge Base Stats:")
        print(f"  • civic_schemes_kb: {schemes_count} official schemes loaded")
        print(f"  • pib_debunks_kb: {debunks_count} verified debunks loaded")

print("\n[Seed] Complete! Civic Knowledge Base is ready for zero-token fast matching.")
