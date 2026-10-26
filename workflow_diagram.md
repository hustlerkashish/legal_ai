# Legal AI Workflow Diagram

This document illustrates the end-to-end architecture and operational workflows of the Legal AI platform.

## 1. High-Level Architecture

```mermaid
graph TD
    User((User))
    
    subgraph "Frontend (React + Vite)"
        UI[UI Components / Chat / Analyzer]
        Auth[Auth Context / Firebase SDK]
        Service[Gemini Service / Key Rotation]
    end
    
    subgraph "External Services"
        Firebase[(Firebase Auth)]
        Gemini[Gemini AI API]
    end
    
    User <--> UI
    UI <--> Auth
    Auth <--> Firebase
    UI <--> Service
    Service <--> Gemini
```

---

## 2. User Authentication Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant L as Login/Signup Component
    participant F as Firebase Auth
    participant AC as AuthContext
    
    U->>L: Enter Credentials
    L->>F: signInWithEmailAndPassword / createUser
    F-->>L: Auth Success / Token
    L->>AC: Update User State
    AC->>U: Redirect to Protected Routes
```

---

## 3. AI Chat & Reasoning Workflow

```mermaid
sequenceDiagram
    participant U as User
    participant CI as ChatInterface
    participant GS as GeminiService
    participant KR as Key Rotation Logic
    participant G as Gemini API
    
    U->>CI: Submit Legal Query
    CI->>GS: streamChatResponse(history, query, complexity)
    GS->>KR: withKeyRotation(operation)
    KR->>G: sendMessageStream(SystemInstruction + Prompt)
    
    alt 429 Rate Limit
        G-->>KR: Error 429
        KR->>KR: Rotate API Key
        KR->>G: Retry Request
    end
    
    G-->>GS: Streamed Chunks
    GS-->>CI: onChunk Callback
    CI-->>U: Render Markdown in UI
```

---

## 4. Document Analysis & Snap & Solve Workflow

```mermaid
flowchart LR
    A[User Uploads PDF/Image] --> B{Service Selection}
    B -- Document Analyzer --> C[Base64 Encoding]
    B -- Snap & Solve --> D[Base64 Encoding]
    
    C --> E[Gemini Service: analyzeDocument]
    D --> F[Gemini Service: snapAndSolve]
    
    E --> G[Gemini API: Legal Analysis Prompt]
    F --> H[Gemini API: OCR + Explainer Prompt]
    
    G --> I[Plain Language Summary]
    H --> J[OCR Text + Action Plan]
    
    I --> K[Display in UI]
    J --> K
```

---

## 5. System Features Summary

- **AI Reasoning**: Powered by `gemini-3-flash-preview` with multi-key failover.
- **Multilingual**: Supports 11 Indian languages via dynamic prompt injection.
- **Complexity Control**: Standard, ELI5 (Simple), and Professional modes.
- **Legal Context**: Injects specific instructions for IPC, BNS, and Constitution references.
