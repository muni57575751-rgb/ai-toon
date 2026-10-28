# AI Toon — Story-Based Learning Using Artificial Intelligence

> **Mini-Capstone Project**: An interactive educational web application that turns complex learning concepts into engaging, cartoon-style stories with multiple tones, multi-language support, cartoon scenes, and interactive quizzes.

---

## 🎨 Design Direction

AI Toon uses a playful, tactile cartoon aesthetic:
- **Color Palette**: Fresh sky-blue (`#0ea5e9`, `#e0f2fe`) and clean white backgrounds, deep-navy text & borders (`#0f172a`), with cheerful accents of sun yellow, mint green, and coral pink.
- **Typography**: Friendly, rounded Google Fonts — **Fredoka** for headings and **Nunito** for readable body text.
- **Visuals**: Tactile cartoon cards with thick dark outlines, layered offset drop-shadows (`0 4px 0 #0f172a`), rounded cards, and responsive layouts for desktop and mobile.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 19 + Vite | Fast, modern client SPA written in TypeScript |
| **Styling** | Vanilla CSS Tokens | Zero runtime overhead; custom design system |
| **Backend** | Node.js + Express | Modular REST API written in TypeScript |
| **Shared Types** | TypeScript (`@ai-toon/shared`) | Unified domain models for stories, quizzes & API contracts |
| **Database & Auth** | Supabase (Free Tier) | PostgreSQL with Row-Level Security & Auth *(Phase 2)* |
| **AI Generation** | Replaceable Server-Side Provider | Free-tier text generation (e.g. Gemini / Groq) *(Phase 3)* |
| **Version Control** | Git & GitHub | Clean commit history and branch management |

---

## 📋 Comprehensive Feature Scope

All 16 features from the project plan:
1. **User Authentication**: Sign-up, login, logout, and protected student dashboard.
2. **Dashboard Overview**: Recent stories, saved stories, and learning progress.
3. **AI Story Generation**: Topic-based educational story creation.
4. **Multilingual Support**: Multi-language story translation and generation.
5. **Storytelling Tones**: Funny, Adventure, and Comic narrative styles.
6. **Educational Scenes**: Cartoon comic panels and scene cards.
7. **Interactive Quizzes**: Multiple-choice assessment questions per story.
8. **Instant Feedback**: Explanations for correct and incorrect answers.
9. **Quiz Scoring**: Performance calculation, badges, and summaries.
10. **Story Library**: Search, filter, favorites, and reading history.
11. **Progress Tracking**: Continuous student learning progress metrics.
12. **Responsive UI**: Polished desktop, tablet, and mobile interface.
13. **Quota Protection**: Server-side caching and API rate limiting for free-tier sustainability.
14. **Curated Fallbacks**: Pre-built offline stories and quizzes when AI is unavailable.
15. **Text-to-Speech & Offline**: Browser TTS narration and local storage caching.
16. **Security & Deployment**: Secure API key isolation and cloud-ready setup.

---

## 📁 Repository Structure

```
ai-toon/
├── .gitignore               # Excludes node_modules, secrets (.env), logs, and dist
├── package.json             # Root npm workspaces config & unified commands
├── README.md                # Project documentation and guide
├── docs/                    # Technical documentation
│   ├── ARCHITECTURE.md      # Architecture, component flow, security & quota strategy
│   └── PHASES.md            # Detailed 6-phase implementation roadmap
├── packages/
│   └── shared/              # Shared TypeScript contracts (@ai-toon/shared)
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts     # Package export aggregator
│           ├── story.ts     # Story, Scene, Tone, Language types
│           ├── quiz.ts      # Quiz Question, Options, Result types
│           ├── user.ts      # Profile and Progress tracking types
│           └── api.ts       # Standardized ApiResponse & Health check
├── backend/                 # Node.js + Express + TypeScript service
│   ├── .env.example         # Environment template with future placeholders
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts        # Server entrypoint with graceful shutdown
│       ├── app.ts           # Express application factory & middleware setup
│       ├── config/
│       │   └── env.ts       # Type-safe environment loader
│       ├── controllers/
│       │   └── health.controller.ts # GET /api/health implementation
│       ├── routes/
│       │   ├── api.routes.ts        # API routes aggregator
│       │   └── health.routes.ts     # Health route definition
│       └── middleware/
│           ├── error.middleware.ts  # Centralized error handler
│           └── notFound.middleware.ts # 404 handler
└── frontend/                # React 19 + Vite + TypeScript client
    ├── .env.example         # Frontend environment variables template
    ├── index.html           # HTML template with Google Fonts (Fredoka & Nunito)
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts       # Vite config with path aliases & backend proxy
    ├── public/
    │   └── favicon.svg      # Custom cartoon storybook favicon
    └── src/
        ├── index.css        # CSS entrypoint
        ├── main.tsx         # React root mounting
        ├── App.tsx          # Main welcome, system status & roadmap page
        ├── App.css          # Layout, hero banner & cartoon grid styles
        ├── styles/
        │   ├── tokens.css   # Color, typography, shadow, radius design tokens
        │   └── global.css   # Reusable cartoon cards, badges & buttons
        └── components/
            └── common/
                ├── Header.tsx       # Cartoon navbar with badges
                ├── Footer.tsx       # Capstone footer
                └── SystemStatus.tsx # Live ping test to /api/health
```

---

## ⚡ Quick Start & Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ or v24 recommended)
- **npm**: v9.0.0 or later
- **Git**

### Installation

From the project root:

```bash
# Install all dependencies across root, backend, frontend, and shared packages
npm install
```

### Running in Development

To run **both** the backend (port `5000`) and the frontend (port `5173`) concurrently:

```bash
npm run dev
```

Or run them individually in separate terminals:

```bash
# Terminal 1: Backend API (http://localhost:5000)
npm run dev:backend

# Terminal 2: Frontend Client (http://localhost:5173)
npm run dev:frontend
```

Once running, visit **[http://localhost:5173](http://localhost:5173)** in your browser. The frontend includes a live connection tester that pings the backend's `/api/health` endpoint.

---

## 🧪 Available Commands

| Command | Action |
|---|---|
| `npm run dev` | Runs backend and frontend concurrently in development mode |
| `npm run dev:backend` | Starts the Express server using `tsx watch` (auto-reloading) |
| `npm run dev:frontend` | Starts the Vite development server with HMR |
| `npm run typecheck` | Type-checks shared package, backend, and builds frontend types |
| `npm run build` | Compiles backend to `dist/` and bundles frontend for production |

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
Copy the example file to create your local `.env`:
```bash
cp backend/.env.example backend/.env
```
Default values:
- `PORT=5000`
- `NODE_ENV=development`
- `FRONTEND_URL=http://localhost:5173`

*(Future placeholders for Supabase and AI provider keys are clearly documented in `backend/.env.example`.)*

### Frontend (`frontend/.env`)
Copy the example file:
```bash
cp frontend/.env.example frontend/.env
```
Default values:
- `VITE_API_BASE_URL=/api`
- `VITE_APP_TITLE=AI Toon`

---

## 🗺️ Implementation Phases

- **Phase 1 (Complete)**: Project Initialization, Monorepo Setup, Design System & Health Check API.
- **Phase 2**: Supabase Database, Authentication & Student Dashboard.
- **Phase 3**: Replaceable AI Story Generation Engine, Tones & Multi-Language Support.
- **Phase 4**: Interactive Quizzes, Instant Feedback & Scoring Engine.
- **Phase 5**: Story Library, Search, Favorites, Text-to-Speech & Offline Caching.
- **Phase 6**: Responsive Polish, Accessibility Auditing & Cloud Deployment.

See [`docs/PHASES.md`](docs/PHASES.md) for full details.
