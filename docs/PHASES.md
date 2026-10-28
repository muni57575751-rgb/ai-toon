# AI Toon — Implementation Phases Roadmap

This document outlines the phased roadmap for building **AI Toon — Story-Based Learning Using Artificial Intelligence**. All 16 planned capstone features are mapped into sequential, verifiable milestones.

---

### Phase 1: Project Initialization & Architecture Setup (Current Phase)
- [x] Inspect environment, Git repository, Node.js, and npm tooling.
- [x] Initialize React + Vite + TypeScript frontend.
- [x] Initialize Express + TypeScript backend.
- [x] Create `@ai-toon/shared` package for shared domain models and API contracts.
- [x] Configure root `package.json` with npm workspaces and unified dev/build/typecheck scripts.
- [x] Set up root `.gitignore` excluding secrets, logs, and build artifacts.
- [x] Create `.env.example` templates for both frontend and backend.
- [x] Implement initial design system tokens (sky-blue palette, deep-navy borders, cartoon shadows, Fredoka/Nunito typography).
- [x] Build live `/api/health` check endpoint and frontend status verification.
- [x] Comprehensive documentation in `docs/` and root `README.md`.

---

### Phase 2: Database, Authentication & Student Dashboard
*Addresses Features 1, 2, 11, 16*
- Connect Supabase Free Tier (Auth + PostgreSQL).
- Define database schema (users, stories, quizzes, results, favorites).
- Sign-up, login, logout, and persistent session management.
- Protected student dashboard showing:
  - Welcome greeting with user avatar and stats.
  - Recent stories read.
  - Bookmarked/saved favorite stories.
  - Learning progress summary (stories completed, quiz accuracy).

---

### Phase 3: Replaceable AI Engine & Story Generation
*Addresses Features 3, 4, 5, 6, 13, 14*
- Implement `IAiProvider` interface for swappable free-tier LLMs (e.g. Gemini 2.5 Flash / Groq / Hugging Face).
- Structured prompt engineering for educational story generation:
  - Input: topic, storytelling tone (`funny`, `adventure`, `comic`), language (`en`, `es`, `hi`, `fr`, `de`, `ta`, `te`).
  - Output: structured JSON scenes, illustration descriptions, key takeaways.
- Story scene reader UI:
  - Cartoon comic panels with speech bubbles and character reactions.
  - Tone toggles and language switcher.
- Quota conservation & reliability:
  - In-memory cache for common topics.
  - Curated fallback story catalog when AI API is unavailable or rate-limited.

---

### Phase 4: Interactive Quizzes & Learning Assessment
*Addresses Features 7, 8, 9, 14*
- AI-generated interactive multiple-choice quiz based on the story topic.
- Fallback quizzes for pre-built stories.
- Question card UI with animated option selection.
- Immediate correct/incorrect visual feedback with educational explanations.
- Score calculation, grade badge (e.g. "Science Explorer!", "Master Storyteller!"), and progress saving to Supabase.

---

### Phase 5: Story Library, Accessibility & Offline Experience
*Addresses Features 10, 15*
- Public & personal story library with search by keyword, topic, tone, and language.
- Favorites toggle and reading history tracker.
- Web Speech API browser Text-to-Speech (TTS) integration:
  - Read scene text aloud in cartoon narrative voice with play/pause controls.
- Offline storage using browser `localStorage` / `IndexedDB` to allow reviewing previously saved stories without internet.

---

### Phase 6: Polish, Responsive Optimization & Deployment Readiness
*Addresses Features 12, 16*
- Comprehensive mobile and tablet responsive layout testing.
- Accessibility audit (ARIA labels, keyboard navigation, contrast ratios).
- Production build optimization and environment-variable validation.
- Deployment configurations:
  - Frontend: Vercel / Netlify / Cloudflare Pages.
  - Backend: Render / Railway / Fly.io (free tiers).
- Final capstone project report and presentation review.
