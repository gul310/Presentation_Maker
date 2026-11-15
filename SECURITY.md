# PresentMaker — Security Policy & Controls

This document details the security principles, credential handling procedures, data isolation guarantees, and vulnerability reporting protocols enforced across the **PresentMaker** platform.

---

## 1. Supported Components & Versions

Security maintenance applies to all core active tiers:

| Component | Framework / Environment | Supported Runtime | Status |
| :--- | :--- | :--- | :---: |
| **Frontend UI** | React 19 + TypeScript + Vite | Node `>=20.0.0` | Supported |
| **Backend Gateway** | Express 4 + TypeScript + Mongoose | Node `>=20.0.0` | Supported |
| **AI Microservice** | FastAPI + Uvicorn + Pydantic | Python `3.10–3.14` | Supported |
| **Database** | MongoDB Atlas / Local MongoDB | MongoDB `7.x` | Supported |

---

## 2. Secrets Management & Environment Isolation

### 2.1 Git Exclusion Policy
- **Never Commit Secrets:** Real environment configuration files (`.env`, `.env.local`, `.env.production`), private database connection URIs, JWT signing keys, and external API keys (`GEMINI_API_KEY`, `GROQ_API_KEY`, `UNSPLASH_ACCESS_KEY`, `DEEPSEEK_API_KEY`) must never be committed to Git.
- **Root `.gitignore` Enforcement:** The root `.gitignore` file strictly excludes all environment files, Python virtual environments (`venv/`), temporary upload stores (`uploads/`), local database backups (`backup/`), and test artifacts.
- **Credential Rotation:** In the event that an API key or secret token is inadvertently exposed in logs or commits, it must be considered compromised and immediately rotated on the respective provider dashboard.

---

## 3. Authentication & Session Security

### 3.1 JSON Web Token (JWT) Architecture
- **Stateless Tokens:** All authenticated client requests transmit a signed JSON Web Token via the HTTP `Authorization: Bearer <token>` header.
- **Signature Integrity:** Tokens are cryptographically signed using HMAC-SHA256 (`HS256`) with a minimum 32-character secret key (`JWT_SECRET`).
- **Token Lifespan:** Access tokens are configured with a default lifespan of 7 days (`JWT_EXPIRES_IN=7d`). Expired or altered tokens are rejected with `HTTP 401 Unauthorized`.
- **Password Hashing:** Passwords are never stored in plaintext. Passwords are salted and hashed using `bcryptjs` with standard salt rounds before storage in MongoDB.

---

## 4. Role-Based Access Control (RBAC) & Single Super Admin Policy

### 4.1 Account Role Hierarchy
1. **Super Administrator (`role: "admin"`, `is_admin: true`):**
   - The platform designates exactly **one** primary administrative account: `admin@presentai.com`.
   - Authorized to access `/api/admin/*` endpoints, view platform analytics, audit user accounts, and moderate community templates.
2. **Standard User (`role: "student"` or `"instructor"`, `is_admin: false`):**
   - Standard user accounts (including team members Lybah Zahid and Zubair Awan) are assigned standard privileges.
   - Standard users are strictly restricted to their own private workspaces.

### 4.2 Middleware Enforcement
Administrative routes in `backend-node/src/routes/admin.routes.ts` are guarded by the `requireAdmin` middleware. Any attempt by a standard user or an unauthenticated visitor to invoke administrative routes immediately returns `HTTP 403 Forbidden`.

---

## 5. User Ownership & Data Boundary Enforcement

### 5.1 Strict Tenant Query Scoping
To prevent Insecure Direct Object Reference (IDOR) vulnerabilities:
- Every query accessing user presentations, generation records, speech practice sessions, or private drafts strictly enforces tenant isolation:
  ```typescript
  const presentation = await Presentation.findOne({
    _id: req.params.id,
    user_id: req.user._id
  });
  ```
- If an authenticated user queries a presentation belonging to another user, the server returns `HTTP 404 Not Found` without confirming the existence of the foreign record.

### 5.2 Guest Session Isolation
Unauthenticated users accessing the platform operate under an ephemeral, cryptographically random `guest_session_id`. Guest sessions are hard-capped at 2 presentation generations before requiring registration, and guest sessions have zero read or write access to registered user collections.

---

## 6. Input Validation & Injection Prevention

- **MongoDB / NoSQL Injection:** Mongoose ODM schemas enforce strict field typing and schema structures. User inputs in dynamic queries are treated as literal values.
- **Microservice Request Validation:** The Python AI microservice validates all incoming request payloads using Pydantic `v2` schemas, discarding unauthorized fields and rejecting malformed JSON payloads with `HTTP 422 Unprocessable Entity`.
- **Document Sanitization:** Ingested reference files (DOCX, PDF, PPTX) are processed in isolated binary buffers using native parsers (`python-docx`, `pypdf`, `python-pptx`), preventing arbitrary script execution.

---

## 7. Reporting a Security Vulnerability

If you identify a potential security vulnerability within PresentMaker:
1. **Do not disclose the issue publicly.** Do not open a public GitHub issue or discuss vulnerabilities in public forums.
2. Report the vulnerability privately to the project owner (`gul310`).
3. Provide a clear technical summary, reproduction steps, affected endpoints, and proof of concept where applicable.
4. The project maintainers will investigate, verify, and apply remediation promptly.
