# Legal AI

A production-ready, AI-powered legal assistance platform for Indian laws. Get answers, analyze documents, compare laws, and understand legal concepts in plain language—powered by Gemini.

## Features

- **AI Chat** — RAG-based legal Q&A with support for citations and follow-up
- **Document Analyzer** — Upload and summarize legal documents
- **Law Comparison** — Compare provisions across different laws
- **ELI5 Mode** — Simplify legal language into easy-to-understand explanations
- **Calculators** — Legal calculators (e.g., interest, compensation)
- **Scam Check** — Quick checks for common legal scams
- **Snap & Solve** — Upload images for quick legal guidance
- **Legal Flow** — Step-by-step flows for common legal processes
- **Case Studies** — Bite-sized case summaries and takeaways
- **Find Help** — Locate lawyers and legal aid near you

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **AI:** Google Gemini API (`@google/genai`)
- **Auth:** Firebase Authentication (email/password, password reset)
- **UI:** Tailwind-style utilities, custom components
- **Content:** React Markdown, Mermaid (diagrams), React Router

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- A [Gemini API key](https://ai.google.dev/) (Google AI Studio)
- A [Firebase](https://console.firebase.google.com/) project with Email/Password sign-in enabled (for login/signup)

## Quick Start

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd legal_ai
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env.local` and fill in:

   - **Gemini:** `GEMINI_API_KEY` — get from [Google AI Studio](https://aistudio.google.com/apikey).
   - **Firebase:** `VITE_FIREBASE_*` — from [Firebase Console](https://console.firebase.google.com/) → Project settings → Your apps → Web app config. In **Authentication → Sign-in method**, enable **Email/Password** and **Google**.

3. **Run locally**

   ```bash
   npm run dev
   ```

   Open the URL shown in the terminal (usually `http://localhost:5173`).

## Scripts

| Command           | Description                |
|-------------------|----------------------------|
| `npm run dev`     | Start development server   |
| `npm run build`   | Build for production       |
| `npm run preview` | Preview production build   |

## Project Structure

```
legal_ai/
├── App.tsx              # Main app, routing, welcome screen
├── index.tsx            # Entry point
├── components/          # Feature components
│   ├── ChatInterface.tsx
│   ├── DocumentAnalyzer.tsx
│   ├── Login.tsx        # Sign in
│   ├── Signup.tsx       # Create account
│   ├── ForgotPassword.tsx
│   ├── ProtectedRoute.tsx
│   ├── ScamCheck.tsx
│   ├── SnapSolve.tsx
│   ├── LegalFlow.tsx
│   ├── CaseStudies.tsx
│   ├── FindHelp.tsx
│   ├── Calculators.tsx
│   ├── Architecture.tsx
│   └── Icons.tsx
├── contexts/
│   └── AuthContext.tsx  # Firebase auth state
├── services/
│   ├── geminiService.ts # Gemini API integration
│   ├── firebase.ts      # Firebase app config
│   └── authService.ts   # signUp, login, forgotPassword, logout
├── public/              # Static assets & fonts
└── FK-Grotesk-Font-Family/  # Custom fonts
```

## License

Private project. All rights reserved.
