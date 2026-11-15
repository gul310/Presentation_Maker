# Security Policy — PresentMaker

## 1. Supported Versions

| Component | Version / Environment | Supported |
| :--- | :--- | :---: |
| Frontend | React 19 + Vite 8 | Yes |
| Node Backend Gateway | Express 4 + TypeScript 5 | Yes |
| Python AI Microservice | FastAPI + Python 3.10–3.14 | Yes |

---

## 2. Environment Variables & Secret Protection

### Strict Rules for Secrets
- **Never Commit Secrets:** Real `.env` files, JWT secrets, database connection strings with passwords, and cloud API keys (`GEMINI_API_KEY`, `GROQ_API_KEY`, `UNSPLASH_ACCESS_KEY`, etc.) must **never** be committed to Git.
- **Root `.gitignore` Enforcement:** All `.env` variations, certificate files (`*.pem`, `*.key`), and local backup databases (`backup/`, `uploads/`) are ignored by default.
- **Rotated Credentials:** If any key is ever accidentally exposed or shared, it must be considered compromised and immediately rotated on the respective provider dashboard.

---

## 3. Account Isolation & Data Boundary Policies

PresentMaker enforces strict account isolation across its multi-tier architecture:
1. **JWT Verification:** All authenticated routes require a valid `Bearer <token>` signed with `JWT_SECRET`. Tokens expire in 7 days by default.
2. **User Data Scoping:** Every presentation, template, practice session, and purchase query strictly verifies `user_id: req.user._id`. No user can access, modify, or delete another user's presentations.
3. **Role-Based Access Control (RBAC):** Administrative endpoints under `/api/admin` strictly enforce `req.user.role === 'admin'`. Unauthorized requests return HTTP 403 Forbidden.
4. **Guest Isolation:** Unauthenticated users operate under isolated `guest_session_id` tokens with a hardcoded limit of 2 generations before requiring account creation. Guest sessions cannot access private user data.

---

## 4. Reporting a Security Vulnerability

If you discover a security vulnerability in PresentMaker:
1. **Do not create a public GitHub issue.**
2. Report the vulnerability privately to the project maintainers or team lead.
3. Include details of the vulnerability, steps to reproduce, and impact assessment.
4. The team will review and patch the issue promptly.

