# PresentMaker — Account Roles, RBAC & User Isolation Specification

This document details the role-based access control (RBAC) architecture, account structure, administrative boundaries, and tenant data isolation rules enforced within **PresentMaker**.

---

## 1. Intended Account Structure

PresentMaker defines a strict separation between administrative oversight and standard user capabilities:

| Account Type | Email / Identifier | Display Name | Application Role | `is_admin` Flag | Access Privileges |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Super Administrator** | `admin@presentai.com` | Super Administrator | `admin` | `true` | Full administrative control, Super Admin dashboard, user management, audit logs, marketplace listing moderation, platform analytics, system-wide presentation overview. |
| **Standard User (Team)** | `laiba@example.com` | Lybah Zahid (`laiba`) | `student` | `false` | Standard user access: create/edit own presentations, document ingestion, AI Tutor ("Teach Me"), speech coaching ("Practice Mode"), exports, marketplace discovery. Strictly isolated from admin APIs. |
| **Standard User (Team)** | `zawan9624@gmail.com` | Zubair Awan | `student` | `false` | Standard user access: create/edit own presentations, document ingestion, AI Tutor ("Teach Me"), speech coaching ("Practice Mode"), exports, marketplace discovery. Strictly isolated from admin APIs. |

---

## 2. Core Security & RBAC Principles

### 2.1 Single Super Administrator Policy
- **Designated Sole Administrator:** The platform authorizes exactly **one** primary administrative account: `admin@presentai.com`.
- **No Automatic Promotion:** Standard registration and application startup routines do not grant administrative privileges to any normal user or collaborator email.
- **Super Admin Guard:** All administrative endpoints located under `/api/admin/*` in the Node.js API gateway are protected by the `requireAdmin` middleware:
  ```typescript
  export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || (req.user.role !== 'admin' && !req.user.is_admin)) {
      return res.status(403).json({ error: 'Forbidden: Super Administrator access required' });
    }
    next();
  };
  ```

### 2.2 Standard User Isolation
- **Private Data Scoping:** Every presentation document, generation job, template favorite, and practice recording in MongoDB is strictly scoped to the creator's `user_id`.
- **Query Scoping:** Backend API queries on user resources strictly include `{ _id: presentationId, user_id: req.user._id }`. Even if a user knows another user's presentation `_id`, requests return `HTTP 404 Not Found` or `HTTP 403 Forbidden`.
- **Standard Users Cannot Escalate:** A standard user attempting to invoke administrative endpoints (e.g., `/api/admin/users`, `/api/admin/system-stats`, `/api/admin/cleanup`) immediately receives `HTTP 403 Forbidden`.

### 2.3 GitHub Collaboration Access vs. Application Roles
- **Separation of Source Control and Runtime Privileges:** GitHub collaborator access (`Write` or `Maintain` permission on `https://github.com/gul310/Presentation_Maker.git`) grants permissions to contribute code, push feature branches, and submit Pull Requests.
- **No Runtime Impact:** GitHub repository collaborator access does **not** grant or confer application administrative privileges (`is_admin: true` or `role: admin`) within the live database or runtime application.

### 2.4 Credential Confidentiality
- **No Passwords or Secrets in Documentation:** Application login passwords, MongoDB Atlas connection strings with credentials, JWT signing secrets, and third-party API keys must **never** be placed in `README.md`, technical documentation, or public Git commits.
- **Local Secret Provisioning:** Each team collaborator configures their own private local `.env` files using `.env.example` templates.

---

## 3. Database State & Pending Maintenance

### 3.1 Verified Team Accounts
- `admin@presentai.com` has been verified as the active Super Administrator (`role: "admin"`, `is_admin: true`).
- `laiba@example.com` has been verified with standard privileges (`role: "student"`, `is_admin: false`).
- `zawan9624@gmail.com` has been verified with standard privileges (`role: "student"`, `is_admin: false`).

### 3.2 Legacy Test Record Notice
- During historical automated test suites, an ephemeral test record (`rogue_1794717223080@test.com`) was generated with `role: "admin"` and `is_admin: false`.
- Because this record does not have `is_admin: true`, it cannot authenticate with full Super Admin privileges.
- **Pending Maintenance Item:** This record remains cataloged as a pending database cleanup item for the project owner to purge during planned database maintenance.
