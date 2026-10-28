# AI Toon Architecture & Technical Specification

## Overview

**AI Toon — Story-Based Learning Using Artificial Intelligence** is an educational web platform designed to make learning intuitive, joyful, and memorable. It translates educational concepts and student queries into engaging cartoon stories featuring multiple storytelling tones (Funny, Adventure, Comic), paired with cartoon scene cards and interactive quizzes with instant explanatory feedback.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Browser                        │
│   (React 19 + TypeScript + Vite + Playful Cartoon CSS)      │
│   - Story Reader & Scene Viewer (TTS Web Speech API)        │
│   - Interactive Quizzes & Results Dashboard                 │
│   - Offline Content Caching (localStorage / IndexedDB)      │
└──────────────┬───────────────────────────────▲──────────────┘
               │                               │
       HTTP / REST API                  Supabase Auth & Client
       (Vite Dev Proxy)                 (Free Tier Session)
               │                               │
┌──────────────▼───────────────────────────────┴──────────────┐
│                    Backend Server (Node.js)                 │
│                 (Express 4 + TypeScript + tsx)              │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Controllers & Routing                               │   │
│   │ - Health (/api/health)                              │   │
│   │ - Story Generation & Fallback Management            │   │
│   │ - Quizzes, Scoring & Progress Analytics             │   │
│   └──────────────────────────┬──────────────────────────┘   │
│                              │                              │
│   ┌──────────────────────────▼──────────────────────────┐   │
│   │ Services Layer                                      │   │
│   │ - Replaceable AI Provider Adapter                   │   │
│   │   (Gemini 2.5 Flash / Groq / HuggingFace Free Tier) │   │
│   │ - In-Memory / Redis Free Caching (Quota Protection) │   │
│   │ - Fallback Catalog (Pre-built Educational Stories)  │   │
│   │ - Supabase Server SDK (Database & Policies)         │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## System Components

### 1. Frontend (`frontend/`)
- **Technology**: React 19, Vite, TypeScript.
- **Styling**: Vanilla CSS with custom properties (`tokens.css` and `global.css`).
- **Design Language**: Playful cartoon aesthetics — sky-blue palette, deep-navy borders & text, sunny yellow/mint accents, rounded corners (`border-radius: 14px - 28px`), and tactile cartoon shadows (`0 4px 0 #0f172a`).
- **Key Modules**:
  - `components/common`: Navigation header, footer, badges, buttons, live status indicators.
  - `components/story`: Scene card viewer, speech bubble text, tone selector, text-to-speech controller.
  - `components/quiz`: Multiple-choice question card, instant answer indicator, explanations, score summary.
  - `components/dashboard`: Recent stories, favorites, progress charts.

### 2. Backend (`backend/`)
- **Technology**: Node.js, Express, TypeScript, tsx.
- **Role**: Secure API gateway, AI prompt orchestrator, quota limiter, and business logic coordinator.
- **Key Design Principles**:
  - **No Client Secrets**: AI provider keys and service role keys are strictly kept on the server.
  - **Replaceable AI Provider Pattern**: An abstraction interface (`IAiProvider`) allowing seamless switching between free providers (e.g., Google Gemini Flash free tier, Groq free tier, Hugging Face Inference API) without breaking application logic.
  - **Fallback Redundancy**: If an AI provider returns HTTP 429 (rate limit) or is unreachable, the server returns curated offline educational stories and quizzes seamlessly.
  - **Centralized Error & Response Standard**: Standardized JSON responses using `@ai-toon/shared` (`ApiResponse<T>`).

### 3. Shared Types (`packages/shared/`)
- **Technology**: TypeScript declarations (`@ai-toon/shared`).
- **Role**: Unified domain model ensuring frontend and backend speak the exact same data contracts for:
  - Stories and Story Scenes (`Story`, `StoryScene`, `StoryTone`, `SupportedLanguage`).
  - Quizzes and Scoring (`Quiz`, `QuizQuestion`, `QuizSubmission`, `QuizResult`).
  - Users and Progress Tracking (`UserProfile`, `LearningProgress`).
  - API Envelopes and Health Checks (`ApiResponse<T>`, `HealthCheckData`).

### 4. Database & Authentication (Future Phase: Supabase Free Tier)
- **Authentication**: Email/password, OAuth with Supabase Auth.
- **PostgreSQL Database**:
  - `users`: Profile and learning preferences.
  - `stories`: Generated and cached stories with scene metadata.
  - `quizzes`: Questions, options, correct answers, and explanations.
  - `quiz_attempts`: Scores, timestamp, and answers for progress analytics.
  - `favorites` & `reading_history`: Student bookmarked stories.
- **Row-Level Security (RLS)**: Enforces student data isolation.

## Security & Quota Strategy

1. **Zero Hardcoded Secrets**: All configuration is managed via `.env` loaded into a type-safe `config/env.ts`.
2. **Free-Tier Protection**:
   - In-memory caching for repeated topics to avoid burning AI tokens.
   - Rate limiting per IP / User.
   - Pre-generated fallback stories when quota is exhausted.
3. **CORS & Input Sanitization**: Controlled allowed origins (`FRONTEND_URL`) and strict payload validation.
