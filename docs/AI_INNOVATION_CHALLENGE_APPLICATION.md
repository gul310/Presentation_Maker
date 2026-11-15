# AI INNOVATION CHALLENGE 2026
## Complete Project Application

### 1. Thematic Stream
**Stream 02 – Civics** *(Civic Empowerment, Digital Inclusion & Knowledge Democratization)*

---

### 2. Project Title
**Presentation Maker – An AI-Powered Platform for Multilingual Presentation Creation, Conceptual Learning, Communication Skill Development, and Civic Knowledge Sharing**

---

### 3. Identify a Real Problem

Effective communication, public speaking, and knowledge dissemination are foundational skills for civic participation, academic progress, and professional growth. However, students, educators, public researchers, and community advocates—particularly across Khyber Pakhtunkhwa (KP)—face three critical barriers:

1. **The Communication and Confidence Deficit:** While private, elite institutions offer speech coaching, debate training, and communication labs, public college and university students rarely have access to structured speaking mentorship. This results in severe presentation anxiety, weak verbal delivery, and limited representation in civic and academic forums.
2. **Linguistic and Comprehension Barriers:** Academic literature, government policies, and civic reports are predominantly written in dense English. Grassroots advocates and students struggle to understand complex material and translate it into clear, contextual presentations in Urdu or local formats for public comprehension.
3. **Fragmented, Design-Only Presentation Tools:** Existing commercial software (PowerPoint, Canva, Gamma) focuses purely on visual templates and aesthetic slide formatting. They do not help the user understand the underlying subject, structure a persuasive narrative, or rehearse oral delivery. Furthermore, foreign AI tools require costly foreign-currency (USD) subscriptions that are unaffordable for local public students and educators.

Without an integrated, affordable platform that combines comprehension, generation, and verbal coaching, students and community leaders remain disadvantaged in articulating their ideas.

---

### 4. Explain Your Proposed Solution

**Presentation Maker** is an AI-powered Software-as-a-Service (SaaS) and digital inclusion platform designed to support the complete communication journey:

$$\text{Create} \longrightarrow \text{Understand} \longrightarrow \text{Refine} \longrightarrow \text{Practise} \longrightarrow \text{Present} \longrightarrow \text{Share} \longrightarrow \text{Monetize}$$

Users can generate complete, structured presentations from natural language text prompts or by uploading source documents (PDF, DOCX, PPTX). Rather than stopping at slide creation, the platform helps users comprehend the subject, rehearse their spoken delivery with real-time feedback, and share or monetize verified educational resources.

#### Core Capabilities:

1. **AI Presentation Generation:** Converts prompts and uploaded documents into logically sequenced, editable slides.
2. **Teach Mode (AI Tutor):** Explains difficult slide concepts in simple, accessible language with definitions and practical analogies.
3. **AI Slide Refine:** Provides 1-click tools to polish grammar, adjust tone (academic, persuasive, professional), expand points, or summarize bullet points.
4. **Speaker Notes & Talking Cues:** Generates presentation scripts and speaking prompts for every slide.
5. **Voice Narration (TTS):** Synthesizes spoken audio narration using language-matched text-to-speech models.
6. **Interactive Practice Studio (STT):** Listens to live rehearsals via browser speech recognition and provides instant scoring on pacing (words per minute), clarity, slide coverage, and vocabulary.
7. **Multilingual Architecture:** Supports Urdu (`ur-PK`) with native Right-to-Left (RTL) typography, alongside major international languages, lowering barriers for non-native English speakers.
8. **Present Mode:** Fullscreen, keyboard-navigable slideshow environment with on-screen speaker cue drawers.
9. **PowerPoint & Multi-Format Export:** Allows one-click export to editable PowerPoint (`.pptx`), PDF, and HTML.
10. **Presentation Sharing:** Secure public and private link sharing for classroom collaboration and community advocacy.
11. **Discover Hub:** A curated space to explore public presentations, trending civic topics, and top-rated academic resources.
12. **Creator Marketplace:** Allows educators, subject experts, and students to discover, share, and commercially exchange peer-reviewed presentation decks and templates.

#### Sustainable Business & Monetization Architecture:

13. **Local Payment Gateway Integration:** Secure transaction processing supporting Pakistani payment channels (JazzCash, Easypaisa, Raast, PayFast/Safepay) alongside international cards.
14. **Flexible Subscription Management:** Free (civic access), Student (subsidized), Pro, and Institutional Team plans with automated billing, renewals, and cancellations.
15. **Fair-Usage AI Credit Allocation:** Dynamic monthly credit quotas managed per subscription tier to balance user value with computational cost.
16. **Transaction & Invoice History:** Transparent payment verification, automated receipting, and real-time subscription status tracking.
17. **Marketplace Revenue Share:** Sustainable platform commissions (15–20%) from paid marketplace templates, incentivizing local educators and creators.

---

### 5. Explain the Role of Artificial Intelligence

Artificial Intelligence is the core technological engine powering Presentation Maker. The platform integrates existing foundation models and browser-native AI APIs rather than training a costly foundation model from scratch:

* **Natural Language Processing (NLP) & Document Grounding:** Extracts text from uploaded files (PDF/DOCX/PPTX) and structures content into coherent thematic slides without hallucinations.
* **Generative Content Synthesis:** Generates outlines, slide headlines, bullet points, and speaker notes tailored to user-specified tones and target audiences.
* **Pedagogical Simplification (Teach Mode):** Translates dense technical and academic prose into plain, beginner-friendly explanations.
* **Speech Recognition & Acoustic Metrics:** Utilizes browser-level Web Speech STT for live spoken practice, tracking pacing, hesitation, and slide alignment at zero server inference cost.
* **Automated Formative Coaching:** Evaluates spoken rehearsals across clarity, pace, and vocabulary, delivering personalized coaching tips.
* **Bilingual & Multilingual Processing:** Handles bidirectional text generation and cross-lingual translation between English and Urdu.
* **Token Budgeting & Credit Governance:** Backend rate-limiting and token management track AI consumption per user to ensure financial and infrastructure stability.

---

### 6. Target Users and Beneficiaries

1. **University and College Students (Primary Target):** Specifically undergraduate and graduate students across Khyber Pakhtunkhwa (including Merged and Southern Districts) preparing thesis defenses, term presentations, and seminar talks.
2. **Public School Teachers and College Lecturers:** Educators needing to create structured, visually rich instructional slides and explanations in less time.
3. **Civic Researchers and Civil Society Organizations:** Community advocates translating complex civic data, policy briefs, and social research into accessible presentations for public audiences.
4. **Youth Leaders and Early Entrepreneurs:** Aspiring founders preparing pitch decks and proposals for innovation challenges, grants, and incubators.
5. **Public Sector and Educational Institutions:** Colleges and departments seeking an affordable, standardized digital platform to elevate oral communication literacy across their student bodies.

---

### 7. Demonstrate Practical Feasibility / Data Needs

A functional prototype is already operational (**TRL 6 – Working Prototype in Operational Environment**), built and tested within our development environment.

#### Current Technology Stack:
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, and Web Speech API.
* **Backend Services:** Node.js/Express.js (application logic, AI orchestration, deck persistence) and Python FastAPI (document parsing, chunking, and text extraction).
* **Database:** MongoDB Atlas (cloud database with schemas for users, decks, practice metrics, and marketplace items).
* **AI Integration:** Abstracted AI provider service communicating with Google Gemini and OpenAI APIs with token-usage controls.
* **Document Processing:** In-house extraction pipelines for `.pdf`, `.docx`, and `.pptx` documents.

#### Planned Payment & Monetization Implementation:
The monetization pipeline will integrate a verified local payment processor (e.g., PayFast/Safepay with JazzCash/Easypaisa support) via webhook callbacks. Transactions will update user credits and subscription tiers automatically. Sensitive financial credentials (credit cards, mobile PINs) are handled entirely within the PCI-DSS compliant payment gateway, ensuring strict data protection.

#### Data Needs & Privacy:
* **Zero Model Retraining:** User documents and practice transcripts are processed strictly during runtime and are never used to train external foundation models.
* **Ephemeral Processing:** Uploaded source documents are parsed and discarded after slide generation.
* **Data Security:** All communications are encrypted over TLS/HTTPS, with JWT-based session security.

---

### 8. Demonstrate Potential Impact

Presentation Maker transforms presentations from an intimidating hurdle into an accessible learning and civic communication tool.

#### Anticipated Social and Civic Benefits:
* **70% Reduction in Preparation Time:** Automates slide creation and layout so students and educators can invest time into understanding concepts and mastering delivery.
* **Democratizing Public Speaking:** Practice Mode provides objective, private coaching, empowering shy and non-native English speakers to build confidence before public speaking.
* **Linguistic Inclusion:** Native Urdu script and bilingual capabilities allow vernacular educators and community advocates to produce high-standard presentations.
* **Regional Equity:** Gives public institution students in KP access to presentation coaching on par with elite private universities.

#### Measurable 90-Day Pilot Targets:
* **Pilot Scale:** 1,000+ active student and faculty users across 3–5 KP public universities and colleges.
* **Volume:** 3,500+ academic and civic presentations generated.
* **Skill Growth:** 1,200+ completed Practice Mode sessions, with a target 30%+ measured improvement in pacing and delivery score across repeat sessions.
* **Vernacular Adoption:** 25%+ of generated presentations incorporating Urdu or bilingual content.

---

### 9. Pitch Video / Demo Link

* **Demo Video:** `[Add Public YouTube (Unlisted) or Google Drive Link for video.mp4]`
* **Prototype Codebase:** Fully developed full-stack web application featuring the studio slide editor, document grounding engine, Teach Mode, speech practice studio, and PowerPoint exporter.

*(Note: The demonstration video recording `video.mp4` is prepared and ready for upload to YouTube/Google Drive).*

---

### 10. Business Model and Revenue Generation

Presentation Maker utilizes a sustainable **Freemium Software-as-a-Service (SaaS)** model adapted for emerging economies:

| Tier | Price | Features & Allowances |
| :--- | :--- | :--- |
| **Free (Civic Good)** | PKR 0 | 2 presentation generations/month, standard templates, basic Teach Mode, public sharing. |
| **Student Plan** | PKR 350 – 500 / month | 25 AI credits, document upload (PDF/DOCX), full Practice Mode scoring, Urdu support. |
| **Pro Plan** | PKR 1,500 / month | 100 AI credits, priority AI generation, custom branding, unlimited PowerPoint exports. |
| **Institutional Team** | Custom annual licensing | Dedicated credit pool for university departments, administrative dashboard, team sharing. |
| **Marketplace Fee** | 15–20% per sale | Commission on community sales of verified premium templates and educational slide decks. |

Payment methods will prioritize mobile wallets (JazzCash, Easypaisa, Raast) and local debit cards to ensure frictionless onboarding for Pakistani youth.

---

### 11. Innovation and Differentiation

Presentation Maker shifts the paradigm from simple visual formatting to **comprehensive communication mastery**:

```
Traditional Tools (Canva, Gamma, PowerPoint)
   └─ Input Topic ──► Generate Slides ──► Export (Stops Here)

Presentation Maker (Our Platform)
   └─ Document / Prompt ──► Structured Slides ──► Teach Mode (Understand) 
          ──► Practice Studio (Speech AI Coaching) ──► Present / Multilingual Share
```

#### Key Innovations:
1. **The "Teach Me" Comprehension Engine:** Rather than assuming the presenter already knows everything, our AI tutors the user on every slide before they stand up to speak.
2. **Interactive Oral Coaching Studio:** In-browser vocal rehearsal with live WPM and clarity evaluation—turning presentation prep into an interactive coaching lab.
3. **Bilingual & Urdu RTL Support:** High-quality right-to-left layout and Urdu generation tailored to Pakistani academic and civic realities.
4. **Local Affordability & Monetization:** Priced in PKR with local mobile wallet support, plus a marketplace that rewards local educators for creating top-tier educational assets.

---

### 12. Development Status and Project Team

Presentation Maker is an active software project with a working, testable web application prototype. Core features—generation, document extraction, slide editing, Teach Mode, and rehearsal tracking—are fully implemented in code.

#### Project Team:

1. **Syeda Gul Andam Ali Kazmi** – *Project Lead & AI Systems Engineer*
   * Responsible for overall project vision, AI prompt architecture, LLM orchestration, and Teach Mode logic.
2. **Laiba Zahid** – *Full-Stack & Frontend Lead*
   * Leads React frontend development, Studio slide editor interface, Web Speech API integration, and responsive UX design.
3. **Zubair Awan** – *Backend & Infrastructure Lead*
   * Oversees Node.js/FastAPI backend services, document parsing engine, MongoDB Atlas schemas, and cloud deployment.

*Note on Roadmap:* Core presentation, document processing, Teach Mode, and practice functionality are fully operational. Payment gateway integration, automated billing, and marketplace transactions represent the planned commercialization deliverables of this 90-day challenge.

---

### 13. Proposed Project Duration and Budget

* **Proposed Project Duration:** 3 Months (90-Day Pilot & Launch Cycle)
* **Total Requested Budget:** PKR 300,000

#### Itemized Budget Breakdown:

| Expense Category | Description & Allocation | Cost (PKR) |
| :--- | :--- | :---: |
| **Cloud Hosting & Infrastructure** | Cloud servers, database scaling (MongoDB Atlas), and asset storage for 3 months | 65,000 |
| **AI API & Model Inference Tokens** | Token consumption for 1,000+ pilot students and educators (Gemini/OpenAI APIs) | 90,000 |
| **Payment Gateway Sandbox & Onboarding** | Local payment processor merchant account setup, API testing, and verification fees | 45,000 |
| **Pilot Testing & User Engagement** | User evaluation workshops across 3 KP institutions, user feedback collection, and pilot support | 50,000 |
| **Security Auditing & Code Hardening** | Penetration testing, rate limiting, and data encryption verification | 30,000 |
| **Operational Contingency** | Domain hosting, SSL certs, and operational emergencies | 20,000 |
| **Total Proposed Budget** | | **PKR 300,000** |

