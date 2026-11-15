# Contributing to PresentMaker

Thank you for contributing to **PresentMaker — AI-Powered Presentation Maker**. This document outlines the development workflow, branching strategy, code style, and submission process for all team members.

---

## 1. Team Contribution Workflow

Each team member should follow these steps when working on features or bug fixes:

1. **Clone the Repository:**
   ```bash
   git clone <repository-url>
   cd PresentMaker
   ```

2. **Create a Dedicated Branch:**
   Never commit directly to `main`. Always create a descriptive branch:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

3. **Configure Your Local Environment:**
   - Copy `.env.example` to `.env` in `backend/` and `backend-node/`.
   - Insert your own development credentials (MongoDB connection, personal AI API keys).
   - Verify that your `.env` files are ignored by `git status`.

4. **Make Your Changes & Build Cleanly:**
   - Check TypeScript compilation in frontend:
     ```bash
     npm --prefix frontend run build
     ```
   - Check TypeScript compilation in Node backend:
     ```bash
     npm --prefix backend-node run build
     ```
   - Verify Python syntax in the AI service:
     ```bash
     python -m py_compile backend/app/services/*.py
     ```

5. **Commit Your Changes:**
   Use clear, conventional commit messages:
   ```bash
   git commit -m "feat(ai): integrate groq secondary fallback"
   git commit -m "fix(editor): resolve slide title truncation on export"
   ```

6. **Push and Open a Pull Request:**
   ```bash
   git push origin feature/your-feature-name
   ```
   Open a Pull Request targeting `main`. Include a summary of changes, affected components, and manual verification steps.

---

## 2. Commit Message Guidelines

Format: `<type>(<scope>): <subject>`

- `feat`: A new user-facing or backend feature
- `fix`: A bug fix
- `docs`: Documentation updates
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance optimizations
- `style`: Formatting, whitespace, or UI polish
- `chore`: Maintenance tasks, dependencies, build configs

---

## 3. Code Standards & Architecture Guidelines

- **TypeScript:** Strict type safety in both React frontend and Node backend. Avoid `any` where explicit interfaces exist.
- **Python:** Follow PEP 8 style. Use Pydantic models for request/response serialization.
- **Zero Secret Commits:** Never hardcode credentials into source files. Always access secrets via `process.env` (Node) or `settings` (Python).
- **Error Handling:** Always catch and log errors gracefully without exposing sensitive server internals or API keys to the client.

