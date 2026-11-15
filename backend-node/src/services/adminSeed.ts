import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { PlatformSettings } from "../models/PlatformSettings.js";
import { Template } from "../models/Template.js";

export async function ensureAdminAndSettings(): Promise<void> {
  try {
    // 1. Ensure project owner has admin privileges
    await User.updateOne(
      { email: "zawan9624@gmail.com" },
      { $set: { role: "admin", is_admin: true } }
    );

    // 2. Ensure dedicated Super Admin account exists
    const adminEmail = "admin@presentai.com";
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash("AdminPass123!", salt);
      const newAdmin = new User({
        name: "Super Administrator",
        email: adminEmail,
        password_hash,
        role: "admin",
        is_admin: true,
        country: "Global",
        interface_language: "English",
        presentation_language: "English",
        is_active: true,
        subscription: {
          plan: "team",
          status: "active"
        },
        ai_credits: {
          total_granted: 1000,
          used: 0,
          remaining: 1000
        }
      });
      await newAdmin.save();
      console.log("[AdminSeed] Dedicated Super Admin account created: admin@presentai.com");
    } else {
      await User.updateOne(
        { email: adminEmail },
        { $set: { role: "admin", is_admin: true, is_active: true } }
      );
    }

    // 2.5. Ensure existing verified accounts have secure, active access
    const existingAndam = await User.findOne({ email: "andam@gmail.com" });
    if (existingAndam) {
      const andamSalt = await bcrypt.genSalt(10);
      const andamHash = await bcrypt.hash("Andam123!", andamSalt);
      await User.updateOne(
        { email: "andam@gmail.com" },
        { $set: { password_hash: andamHash, role: "student", is_admin: false, is_active: true } }
      );
      console.log("[AdminSeed] Verified account 'andam@gmail.com' active with password 'Andam123!'.");
    }

    const existingLaiba = await User.findOne({ email: "laiba@example.com" });
    if (existingLaiba) {
      const laibaSalt = await bcrypt.genSalt(10);
      const laibaHash = await bcrypt.hash("laiba123", laibaSalt);
      await User.updateOne(
        { email: "laiba@example.com" },
        { $set: { password_hash: laibaHash, role: "student", is_admin: false, is_active: true } }
      );
      console.log("[AdminSeed] Verified account 'laiba@example.com' active with password 'laiba123'.");
    }

    // 3. Ensure Platform Payment Settings document exists and has official NayaPay owner credentials
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = new PlatformSettings({
        payment_provider: "NayaPay",
        account_title: "Syeda Gul Andam Malik Kazmi",
        platform_payment_number: "03339114569",
        bank_details: "NayaPay (Transferable from any Bank app, Raast, JazzCash, or Easypaisa)",
        payment_instructions: "Transfer to NayaPay account 03339114569 (Title: Syeda Gul Andam Malik Kazmi). Enter your Transaction/Order Reference in the note and upload your receipt screenshot for Super Admin approval.",
        support_contact: "support@presentai.com",
        commission_percentage: 5
      });
      await settings.save();
      console.log("[AdminSeed] Platform NayaPay payment settings initialized.");
    } else if (
      settings.account_title.includes("Presentation Maker") ||
      settings.platform_payment_number.includes("0000000") ||
      settings.platform_payment_number.includes("1234567") ||
      settings.payment_provider !== "NayaPay" ||
      settings.account_title !== "Syeda Gul Andam Malik Kazmi"
    ) {
      settings.payment_provider = "NayaPay";
      settings.account_title = "Syeda Gul Andam Malik Kazmi";
      settings.platform_payment_number = "03339114569";
      settings.bank_details = "NayaPay (Transferable from any Bank app, Raast, JazzCash, or Easypaisa)";
      settings.payment_instructions = "Transfer to NayaPay account 03339114569 (Title: Syeda Gul Andam Malik Kazmi). Enter your Transaction/Order Reference in the note and upload your receipt screenshot for Super Admin approval.";
      await settings.save();
      console.log("[AdminSeed] Platform settings updated with official NayaPay owner details.");
    }

    // 4. Ensure Curated Freemium Template Library exists across all 8 Categories
    const templateCount = await Template.countDocuments();
    if (templateCount === 0) {
      const initialTemplates = [
        {
          title: "Corporate Strategy & Quarterly Review 2026",
          description: "Executive presentation deck for quarterly business reviews, KPI scorecards, market share analysis, and organizational growth objectives.",
          category: "Business & Corporate",
          cover_image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab",
          preview_images: ["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab"],
          access_type: "PLAN_INCLUDED",
          price_pkr: 0,
          price_usd: 0,
          applicable_plans: ["student", "pro", "team"],
          slide_count: 5,
          tags: ["corporate", "strategy", "qbr", "enterprise", "executive"],
          is_published: true,
          is_featured: true,
          usage_count: 142,
          average_rating: 4.9,
          ratings_count: 28,
          slides: [
            {
              slide_number: 1,
              title: "Executive Overview & Strategic Direction",
              content: ["Q1 revenue targets and performance scorecard", "Key corporate achievements and milestones reached", "Macroeconomic market headwinds and competitive landscape", "Strategic priorities for the upcoming quarters"],
              layout_type: "title_and_body",
              speaker_notes: "Welcome team and leadership to our 2026 strategic review. Today we evaluate key performance indicators and align on upcoming goals."
            },
            {
              slide_number: 2,
              title: "Financial Health & Revenue Expansion",
              content: ["Gross margin expansion by 18% year-over-year", "Customer acquisition cost optimization initiatives", "Recurring subscription growth and annualized run-rate", "Capital allocation strategy across core business units"],
              layout_type: "title_and_body",
              speaker_notes: "Financial efficiency has accelerated, driven by enterprise account expansion and strong gross margins."
            },
            {
              slide_number: 3,
              title: "Operational Excellence & Efficiency",
              content: ["Workflow automation reducing cycle times by 35%", "Cross-functional team alignment across global hubs", "Supply chain resilience and localized fulfillment", "Risk mitigation and regulatory compliance governance"],
              layout_type: "title_and_body",
              speaker_notes: "Operational throughput has improved across all operational units through automation."
            },
            {
              slide_number: 4,
              title: "Product Roadmap & Market Innovation",
              content: ["Next-generation enterprise platform rollout", "AI-assisted analytics suite for real-time reporting", "Security certifications: SOC2 Type II and ISO 27001", "Client pilot programs and feedback integration"],
              layout_type: "title_and_body",
              speaker_notes: "Our product engineering team has delivered high-velocity updates focused on security and automation."
            },
            {
              slide_number: 5,
              title: "Action Items & Implementation Timeline",
              content: ["Phase 1: Regional leadership alignment workshops", "Phase 2: Core systems integration and beta testing", "Phase 3: Global commercial launch and sales enablement", "Key governance checkpoints and deliverables"],
              layout_type: "title_and_body",
              speaker_notes: "Let us review individual accountability and target deadlines for execution."
            }
          ]
        },
        {
          title: "Academic Research Defense & Thesis Framework",
          description: "Structured academic presentation designed for Master's and Doctoral thesis defense, research proposals, methodology breakdown, and empirical findings.",
          category: "Education & University",
          cover_image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644",
          preview_images: ["https://images.unsplash.com/photo-1523240795612-9a054b0db644"],
          access_type: "FREE",
          price_pkr: 0,
          price_usd: 0,
          applicable_plans: ["free", "student", "pro", "team"],
          slide_count: 5,
          tags: ["academic", "thesis", "university", "research", "defense"],
          is_published: true,
          is_featured: true,
          usage_count: 320,
          average_rating: 4.8,
          ratings_count: 45,
          slides: [
            {
              slide_number: 1,
              title: "Introduction & Research Problem Statement",
              content: ["Background and contextual significance of the study", "Identified gaps in contemporary scholarly literature", "Central research questions and primary hypotheses", "Scope, limitations, and theoretical boundaries"],
              layout_type: "title_and_body",
              speaker_notes: "Distinguished committee members, thank you for convening today for this thesis presentation."
            },
            {
              slide_number: 2,
              title: "Literature Review & Theoretical Framework",
              content: ["Synthesis of foundational academic models and paradigms", "Contrasting historical theories with empirical modern results", "Conceptual framework guiding this investigation", "Methodological precedents in published peer-reviewed journals"],
              layout_type: "title_and_body",
              speaker_notes: "The theoretical underpinning draws upon established models while addressing empirical inconsistencies."
            },
            {
              slide_number: 3,
              title: "Methodological Design & Data Collection",
              content: ["Quantitative / Qualitative mixed-methods design", "Sampling criteria, participant demographics, and cohort size", "Data collection instrumentation and validation protocols", "Ethical approval and research integrity safeguards"],
              layout_type: "title_and_body",
              speaker_notes: "A rigorous empirical design was implemented to ensure repeatability and statistical significance."
            },
            {
              slide_number: 4,
              title: "Empirical Findings & Data Analysis",
              content: ["Descriptive statistics and demographic breakdown", "Hypothesis testing: p-values and effect size metrics", "Comparative visualization of experimental cohorts", "Correlation analyses and statistical significance"],
              layout_type: "title_and_body",
              speaker_notes: "The primary hypothesis was strongly validated with statistically significant outcomes across all test groups."
            },
            {
              slide_number: 5,
              title: "Academic Contributions & Future Directions",
              content: ["Implications for existing academic theory and literature", "Practical applications for industry practitioners", "Identified avenues for follow-up longitudinal research", "Concluding remarks and formal defense Q&A"],
              layout_type: "title_and_body",
              speaker_notes: "Thank you for your time and scholarly guidance. I now welcome questions from the committee."
            }
          ]
        },
        {
          title: "Enterprise Artificial Intelligence & LLM Roadmap",
          description: "Technical and strategic deck for AI architecture, Large Language Model deployments, vector retrieval, fine-tuning, and corporate governance.",
          category: "Technology & AI",
          cover_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
          preview_images: ["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe"],
          access_type: "PREMIUM",
          price_pkr: 1200,
          price_usd: 4.5,
          applicable_plans: ["pro", "team"],
          slide_count: 5,
          tags: ["artificial-intelligence", "llm", "deep-learning", "cloud", "architecture"],
          is_published: true,
          is_featured: true,
          usage_count: 88,
          average_rating: 5.0,
          ratings_count: 19,
          slides: [
            {
              slide_number: 1,
              title: "Generative AI Architecture & Model Hierarchy",
              content: ["Proprietary vs. Open-Source foundation model selection", "Hybrid inference strategy: Cloud, Edge, and On-Premises", "Latency optimization and quantization techniques (AWQ / GGUF)", "Token cost management and dynamic prompt caching"],
              layout_type: "title_and_body",
              speaker_notes: "This roadmap outlines our enterprise strategy for deploying production AI systems at scale."
            },
            {
              slide_number: 2,
              title: "Retrieval-Augmented Generation (RAG) Architecture",
              content: ["Vector database indexing with semantic partitioning", "Chunking strategies and multi-stage re-ranking algorithms", "Hybrid search: dense vector similarity combined with BM25 keyword matching", "Factuality validation and automated hallucination scoring"],
              layout_type: "title_and_body",
              speaker_notes: "To eliminate hallucinations, our RAG pipeline incorporates multi-stage re-ranking and citation tracking."
            },
            {
              slide_number: 3,
              title: "Fine-Tuning & Domain Adaptation Pipeline",
              content: ["Supervised fine-tuning (SFT) with verified internal data", "LoRA and QLoRA parameter-efficient adaptation", "Direct Preference Optimization (DPO) for brand tone", "Continuous evaluation against human benchmark rubrics"],
              layout_type: "title_and_body",
              speaker_notes: "By using parameter-efficient fine-tuning, we specialize models for domain tasks at a fraction of compute cost."
            },
            {
              slide_number: 4,
              title: "AI Safety, Guardrails & Governance",
              content: ["Real-time prompt injection and jailbreak prevention", "Automated PII detection and tokenized redaction", "Audit logging for enterprise compliance and legal review", "Model explainability and ethical transparency guidelines"],
              layout_type: "title_and_body",
              speaker_notes: "Enterprise deployment requires strict guardrails to prevent data leakage and ensure compliance."
            },
            {
              slide_number: 5,
              title: "Infrastructure Deployment & ROI Projection",
              content: ["GPU cluster allocation and containerized Kubernetes pods", "Targeted 40% reduction in customer support response cycles", "Engineering productivity uplift via automated code generation", "Projected 3-year return on investment and scalability metrics"],
              layout_type: "title_and_body",
              speaker_notes: "With infrastructure optimizations in place, we project a 3x return on invested capital within 18 months."
            }
          ]
        },
        {
          title: "Clinical Healthcare Innovations & Patient Care",
          description: "Healthcare presentation covering digital medical workflows, telemedicine advancements, clinical patient safety, and medical technology innovations.",
          category: "Healthcare",
          cover_image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d",
          preview_images: ["https://images.unsplash.com/photo-1576091160399-112ba8d25d1d"],
          access_type: "PLAN_INCLUDED",
          price_pkr: 0,
          price_usd: 0,
          applicable_plans: ["student", "pro", "team"],
          slide_count: 5,
          tags: ["healthcare", "medicine", "clinical", "hospital", "patient-care"],
          is_published: true,
          is_featured: false,
          usage_count: 94,
          average_rating: 4.7,
          ratings_count: 14,
          slides: [
            {
              slide_number: 1,
              title: "Modern Clinical Ecosystem & Patient-Centered Care",
              content: ["Integration of electronic health records (EHR) across specialties", "Reducing administrative burden on physicians and nursing staff", "Continuous patient monitoring and early warning systems", "Enhancing clinical decision support at the point of care"],
              layout_type: "title_and_body",
              speaker_notes: "Patient-centered healthcare focuses on seamless clinical coordination and evidence-based medicine."
            },
            {
              slide_number: 2,
              title: "Telehealth & Remote Diagnostic Networks",
              content: ["Expanding specialized medical access to underserved regions", "Secure HIPAA-compliant high-definition consultation channels", "Remote physiological monitoring (blood pressure, glucose, SpO2)", "Emergency triage escalation protocols"],
              layout_type: "title_and_body",
              speaker_notes: "Telemedicine bridges geographical divides, allowing specialized physicians to consult remotely in real time."
            },
            {
              slide_number: 3,
              title: "Clinical Safety & Infection Control Protocols",
              content: ["Standardized sterile procedures in surgical operating suites", "Antibiotic stewardship and antimicrobial resistance tracking", "Automated medication dispensing verification", "Continuous medical staff training and accreditation"],
              layout_type: "title_and_body",
              speaker_notes: "Clinical safety protocols are continuously reviewed against international healthcare quality standards."
            },
            {
              slide_number: 4,
              title: "Medical Imaging & Diagnostic AI Integration",
              content: ["AI-assisted radiological triage for MRI, CT, and X-ray scans", "Early pathology detection and automated anomaly flagging", "Interoperability between imaging PACS and clinical notes", "Maintaining physician diagnostic primacy and review"],
              layout_type: "title_and_body",
              speaker_notes: "Diagnostic AI tools assist clinicians by prioritizing urgent scans while leaving final diagnosis with physicians."
            },
            {
              slide_number: 5,
              title: "Patient Outcomes & Healthcare Sustainability",
              content: ["Key indicators: readmission rates, recovery timelines, and satisfaction", "Community health outreach and preventative wellness campaigns", "Resource management and sustainable medical supply chains", "Closing remarks and multidisciplinary team discussion"],
              layout_type: "title_and_body",
              speaker_notes: "Sustainable healthcare hinges on balancing clinical excellence with proactive community prevention."
            }
          ]
        },
        {
          title: "Omnichannel Growth & Digital Marketing Strategy",
          description: "High-impact marketing slide deck covering audience segmentation, conversion funnels, CAC/LTV metrics, content distribution, and brand positioning.",
          category: "Marketing",
          cover_image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f",
          preview_images: ["https://images.unsplash.com/photo-1460925895917-afdab827c52f"],
          access_type: "FREE",
          price_pkr: 0,
          price_usd: 0,
          applicable_plans: ["free", "student", "pro", "team"],
          slide_count: 5,
          tags: ["marketing", "growth", "digital", "branding", "conversion"],
          is_published: true,
          is_featured: true,
          usage_count: 215,
          average_rating: 4.9,
          ratings_count: 36,
          slides: [
            {
              slide_number: 1,
              title: "Market Positioning & Customer Persona Mapping",
              content: ["Demographic and psychographic segmentation of target buyers", "Unique Value Proposition (UVP) differentiation matrix", "Customer pain points, motivations, and purchasing triggers", "Brand voice guidelines across communication channels"],
              layout_type: "title_and_body",
              speaker_notes: "Understanding customer psychology is the bedrock of our high-conversion marketing strategy."
            },
            {
              slide_number: 2,
              title: "Acquisition Channels & Funnel Architecture",
              content: ["Organic search (SEO) and thought leadership content", "Paid performance marketing: Meta, Google, and LinkedIn ads", "Influencer collaborations and community affiliate programs", "Top-of-funnel conversion rate optimization (CRO)"],
              layout_type: "title_and_body",
              speaker_notes: "We balance immediate paid acquisition channels with sustainable long-term organic discovery."
            },
            {
              slide_number: 3,
              title: "Retention, Nurturing & Lifetime Value (LTV)",
              content: ["Automated email lifecycle flows (onboarding, re-engagement)", "Loyalty reward mechanisms and milestone recognition", "Churn prediction triggers and proactive customer success", "Maximizing Average Order Value (AOV) via strategic upselling"],
              layout_type: "title_and_body",
              speaker_notes: "Customer retention delivers the highest ROI; nurturing existing users expands lifetime value significantly."
            },
            {
              slide_number: 4,
              title: "Creative Asset Strategy & Social Storytelling",
              content: ["Short-form video content tailored for viral social reach", "Interactive quizzes, case studies, and customer testimonials", "A/B testing ad creative variants (hooks, visuals, copy)", "Consistent cross-platform visual identity guidelines"],
              layout_type: "title_and_body",
              speaker_notes: "Compelling creative assets and storytelling turn passive viewers into active brand advocates."
            },
            {
              slide_number: 5,
              title: "Budget Allocation, Attribution & KPIs",
              content: ["Marketing budget breakdown across channels", "Key performance metrics: ROAS, CPA, CAC-to-LTV ratio", "Multi-touch attribution modeling across touchpoints", "Quarterly growth forecasts and campaign launch dates"],
              layout_type: "title_and_body",
              speaker_notes: "Data-driven attribution ensures every marketing dollar invested generates measurable returns."
            }
          ]
        },
        {
          title: "Scientific Methodology & Empirical Discovery",
          description: "Rigorous scientific presentation template for laboratory discoveries, controlled trials, empirical modeling, and peer-reviewed conference papers.",
          category: "Research & Academic",
          cover_image: "https://images.unsplash.com/photo-1507668077129-56e32842fceb",
          preview_images: ["https://images.unsplash.com/photo-1507668077129-56e32842fceb"],
          access_type: "PLAN_INCLUDED",
          price_pkr: 0,
          price_usd: 0,
          applicable_plans: ["student", "pro", "team"],
          slide_count: 5,
          tags: ["science", "laboratory", "empirical", "methodology", "data"],
          is_published: true,
          is_featured: false,
          usage_count: 73,
          average_rating: 4.8,
          ratings_count: 11,
          slides: [
            {
              slide_number: 1,
              title: "Scientific Context & Theoretical Basis",
              content: ["Fundamental principles governing the observed phenomenon", "Prior experimental literature and conflicting observations", "Hypothesis definition and mathematical modeling", "Objectives of the present empirical investigation"],
              layout_type: "title_and_body",
              speaker_notes: "Welcome colleagues. Today we present experimental findings on the underlying physical mechanisms."
            },
            {
              slide_number: 2,
              title: "Experimental Setup & Instrumentation",
              content: ["High-precision analytical instrumentation and calibration", "Control variables and experimental boundary conditions", "Reagent purity and sample preparation protocols", "Automated telemetry data acquisition systems"],
              layout_type: "title_and_body",
              speaker_notes: "All instrumentation was calibrated under controlled environmental conditions to ensure fidelity."
            },
            {
              slide_number: 3,
              title: "Data Acquisition & Statistical Rigor",
              content: ["Multiple independent experimental trial runs", "Error propagation analysis and confidence intervals (95% CI)", "Noise reduction and signal filtering techniques", "Validation against baseline theoretical predictions"],
              layout_type: "title_and_body",
              speaker_notes: "Data collection spanned multiple runs, validating reproducibility across all experimental sets."
            },
            {
              slide_number: 4,
              title: "Experimental Analysis & Discussion",
              content: ["Empirical findings confirm predicted non-linear behavior", "Comparison with standard benchmarks in published literature", "Identification of boundary condition anomalies", "Practical implications for experimental physics"],
              layout_type: "title_and_body",
              speaker_notes: "Our findings substantiate the initial hypothesis while revealing novel secondary dynamics."
            },
            {
              slide_number: 5,
              title: "Conclusions, Publications & Next Steps",
              content: ["Summary of validated experimental conclusions", "Manuscript submission to peer-reviewed scientific journals", "Proposed collaborative follow-up laboratory studies", "Open scientific floor for peer inquiry"],
              layout_type: "title_and_body",
              speaker_notes: "Thank you for your scientific engagement. We welcome questions from the symposium attendees."
            }
          ]
        },
        {
          title: "Creative Design Agency & Visual Showcase",
          description: "Stunning aesthetic portfolio deck designed for agencies, UI/UX designers, creative directors, and branding studios presenting client work.",
          category: "Portfolio & Creative",
          cover_image: "https://images.unsplash.com/photo-1542744094-3a31f272c490",
          preview_images: ["https://images.unsplash.com/photo-1542744094-3a31f272c490"],
          access_type: "PREMIUM",
          price_pkr: 800,
          price_usd: 3.0,
          applicable_plans: ["pro", "team"],
          slide_count: 5,
          tags: ["design", "portfolio", "creative", "agency", "branding", "ui-ux"],
          is_published: true,
          is_featured: true,
          usage_count: 110,
          average_rating: 4.9,
          ratings_count: 22,
          slides: [
            {
              slide_number: 1,
              title: "Agency Philosophy & Creative Vision",
              content: ["Crafting evocative visual identities that resonate emotionally", "Human-centered design thinking applied to complex problems", "Award-winning portfolio across digital, physical, and brand spaces", "Collaborative client partnerships that drive measurable engagement"],
              layout_type: "title_and_body",
              speaker_notes: "Welcome. We believe great design is not just visual ornamentation; it is the bridge between brands and humans."
            },
            {
              slide_number: 2,
              title: "Selected Client Case Studies & Brand Transformations",
              content: ["Brand identity redesign for Global Tech Enterprises", "Complete digital design system with 200+ modular components", "E-commerce platform overhaul boosting checkout conversion by 28%", "Visual packaging design featured in international showcases"],
              layout_type: "title_and_body",
              speaker_notes: "These client case studies demonstrate how aesthetic intentionality produces undeniable commercial growth."
            },
            {
              slide_number: 3,
              title: "Our Iterative Creative Process",
              content: ["Discovery & Research: Immersion in user psychology", "Ideation & Wireframing: Rapid exploration of design directions", "High-Fidelity Prototyping: Micro-interactions and motion design", "Design System Delivery: Scalable tokens and developer handoff"],
              layout_type: "title_and_body",
              speaker_notes: "Our four-stage creative framework eliminates guesswork and ensures seamless technical handoff."
            },
            {
              slide_number: 4,
              title: "Capabilities, Core Disciplines & Tooling",
              content: ["UI/UX Product Design (Figma, Framer, Webflow)", "Motion graphics, 3D rendering, and animated brand assets", "Typography hierarchy, bespoke iconography, and color palettes", "Brand narrative guidelines and copy direction"],
              layout_type: "title_and_body",
              speaker_notes: "From micro-interactions to holistic brand ecosystems, our interdisciplinary capabilities deliver excellence."
            },
            {
              slide_number: 5,
              title: "Let Us Build Something Extraordinary Together",
              content: ["Engagement models: Retainer, Sprint, or Full Project", "Project kickoff timeline and key deliverables roadmap", "Dedicated multidisciplinary design team assignment", "Direct contact: hello@creativeagency.studio"],
              layout_type: "title_and_body",
              speaker_notes: "Thank you for exploring our portfolio. Let us create something memorable together."
            }
          ]
        },
        {
          title: "Venture Capital Seed Pitch Deck & Financial Model",
          description: "Investor-ready 5-slide seed pitch deck engineered to secure funding, highlighting the market problem, proprietary solution, traction, TAM, and team.",
          category: "Pitch Decks",
          cover_image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44",
          preview_images: ["https://images.unsplash.com/photo-1559526324-4b87b5e36e44"],
          access_type: "PREMIUM",
          price_pkr: 1500,
          price_usd: 5.5,
          applicable_plans: ["team"],
          slide_count: 5,
          tags: ["pitch-deck", "investor", "startup", "venture-capital", "fundraising"],
          is_published: true,
          is_featured: true,
          usage_count: 175,
          average_rating: 5.0,
          ratings_count: 31,
          slides: [
            {
              slide_number: 1,
              title: "The Problem: Inefficient Legacy Presentation Workflows",
              content: ["Professionals waste 8+ hours weekly creating presentation decks", "Generic slide software lacks content intelligence and research depth", "Design inconsistencies degrade corporate credibility and sales pitches", "Current tools require manual image sourcing, drafting, and formatting"],
              layout_type: "title_and_body",
              speaker_notes: "Investors, professionals worldwide spend billions of hours on formatting presentations instead of high-value work."
            },
            {
              slide_number: 2,
              title: "The Solution: Automated AI-Powered Presentation Engine",
              content: ["Instant topic research and structured slide synthesis in seconds", "Unsplash licensed photography integration with smart canvas placement", "Urdu, multilingual, and RTL voice rehearsal practice studio", "Export to editable PowerPoint (PPTX), vector PDF, and web packages"],
              layout_type: "title_and_body",
              speaker_notes: "PresentAI solves this by turning any raw topic or document into a complete, editable presentation instantly."
            },
            {
              slide_number: 3,
              title: "Market Size & Total Addressable Market (TAM)",
              content: ["Global Presentation Software Market: $15.8 Billion by 2028", "TAM: 1.2 Billion global knowledge workers and students", "SAM: 280 Million higher education students and sales professionals", "SOM: $120 Million initial focus on South Asia and emerging markets"],
              layout_type: "title_and_body",
              speaker_notes: "Our addressable market is massive and expanding rapidly as knowledge workers demand automated tools."
            },
            {
              slide_number: 4,
              title: "Traction, Business Model & Unit Economics",
              content: ["Freemium SaaS subscription tiers ($4.99 to $19.99 / month)", "Peer-to-peer marketplace with 5% platform commission on every sale", "Organic user growth: 35% month-over-month viral coefficient", "CAC payback period under 2.8 months with strong gross margins"],
              layout_type: "title_and_body",
              speaker_notes: "We monetize through dual streams: recurring subscriptions and a self-sustaining creator marketplace."
            },
            {
              slide_number: 5,
              title: "The Ask: $1.5M Seed Round for Growth & Expansion",
              content: ["Use of funds: 45% Engineering & AI, 35% Growth & Sales, 20% Ops", "18-month runway to reach $2.4M Annual Recurring Revenue (ARR)", "Founding team with deep expertise in AI engineering and education", "Join us in revolutionizing how human beings communicate ideas"],
              layout_type: "title_and_body",
              speaker_notes: "We invite you to join our journey as we redefine presentation creation for the next generation."
            }
          ]
        }
      ];

      await Template.insertMany(initialTemplates);
      console.log(`[AdminSeed] Curated Freemium Template Library initialized with 8 categories.`);
    }
  } catch (err: any) {
    console.warn("[AdminSeed] Warning during admin/settings/templates initialization:", err.message);
  }
}
