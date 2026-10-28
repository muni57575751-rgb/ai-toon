# AI Toon — Frontend Client

The frontend for **AI Toon** is built with **React 19**, **Vite**, and **TypeScript**, styled with a custom tactile cartoon design system.

## Features
- **Modern Stack**: React 19 + TypeScript + Vite.
- **Cartoon Design System**: Tactile rounded cards, sky-blue background gradients, deep-navy borders (`#0f172a`), sunny accents, and custom Fredoka/Nunito typography.
- **Shared Types**: Strongly typed contracts imported from `@ai-toon/shared`.
- **Backend Integration**: Automatic development proxy forwards `/api` requests to Express on port `5000`.

## Scripts

```bash
# Start Vite development server (http://localhost:5173)
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```
