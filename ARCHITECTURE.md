# 🏗️ CarbonPilot AI: Systems Architecture Document

This document provides a highly comprehensive breakdown of the systems architecture, technical design, data flows, and infrastructure layout of **CarbonPilot AI**.

---

## 🗺️ 1. Complete Architecture Diagram

The system operates on an event-driven, full-stack, client-server paradigm utilizing secure server-side API gateways to handle credentialed requests, backed by a real-time reactive persistence layer.

```
                    ┌───────────────────────────────────────────────┐
                    │               React 18 SPA Client             │
                    │   (Vite, Tailwind, Recharts, Framer Motion)   │
                    └───────┬───────────────▲───────────────┬───────┘
                            │               │               │
                            │ Firestore     │ Firestore     │ Secure API
                            │ writes/sync   │ onSnapshot    │ JSON Queries
                            ▼               │               ▼
                    ┌───────────────────────┴──────┐ ┌────────────────────────┐
                    │                              │ │     Express Backend    │
                    │    Cloud Firestore DB        │ │    (TSX Native Dev)    │
                    │                              │ └──────────┬─────────────┘
                    └──────────────────────────────┘            │
                                                                ├─► Gemini API
                                                                ├─► Google Maps Platform
                                                                └─► Receipt Vision Extractor
```

---

## 💻 2. Frontend Layer (Single-Page Application Client)

The frontend client is engineered using **React 18** and **TypeScript**, coordinated by the **Vite** build runner. It prioritizes responsive design, rich visual feedback, and multi-interactive experiences.

### 🔌 Framework & Main Libraries
- **React 18**: Implements a modular functional component architecture driven by hook states.
- **Framer Motion (`motion/react`)**: Implements hardware-accelerated animations, micro-transitions, entrance transitions, and card expansions without causing layout flicker.
- **Recharts (utilizing D3)**: Renders accessible, clean, and interactive responsive carbon analytical charts (Donut breakdowns, Weekly trend vectors, and Year-end scenario projections).
- **Lucide React**: Simple, clean SVG-based icons used exclusively, avoiding heavy custom asset structures.

### 📂 Client Subcomponent Directory Architecture
The client's modular capabilities are separated into single-purpose UI controllers to prevent file bloat and minimize token overhead:
- `App.tsx`: The primary orchestrator. Handles user session registration, viewport mounting, and navigation state.
- `components/CarbonCalculator.tsx`: Houses the carbon metric engine, converting logs into kg CO₂e.
- `components/ClimateCoach.tsx`: Connects to conversational real-time subcollections in firestore and fires queries to the proxy API backend.
- `components/EcoRoute.tsx`: Implements transit searches, comparing multiple transit vectors using location APIs.
- `components/FamilyDashboard.tsx`: Controls the shared leaderboard, co-op circle initialization, and invite sync checks.
- `components/PredictionEngine.tsx`: Forecasts and projects cumulative carbon footprints over multi-month spans under active vs. inactive reduction scenarios.
- `components/ReceiptAnalyzer.tsx`: Manages drag-and-drop receipt uploader structures, converting images to base64 for vision processing on the proxy.
- `components/SustainabilityReports.tsx`: The graphical analytics system modeling carbon outputs over time.
- `components/WeeklyChallenges.tsx`: Implements the gamified co-op quest registry, synchronizing award states.

---

## ⚙️ 3. Backend Proxy Layer (Google Cloud Ingress Engine)

The backend runs on **Node.js + Express** using TypeScript. Standard web requirements constrain client browsers from holding sensitive third-party keys. Thus, our Express server operates as a **secure API Gateway** proxying all upstream requests to Google Cloud capabilities.

### 🔒 Gateway Route Schematics
- **`/api/coach`**: Validates request sessions, queries user-specific metric trends from Firestore, feeds history context, and queries the **Gemini 2.5/Pro** model via the **Google GenAI SDK**.
- **`/api/analyze-receipt`**: Receives base64 image data payloads safely in the request body. Formulates a prompt asking the Gemini Vision analyzer to extract numerical total charges, identify food/fuel categories, and reply with structured JSON schemas.
- **`/api/eco-route`**: Proxies requests to Google Maps Platform endpoints, formats route coordinates, and calculates emission estimates across transit modes.

### 🐳 Build & Server Compilation Flow
To completely bypass Node's runtime ES Module relative import limitations and ensure standard container startup, the backend code is compiled using **esbuild**:
- **Dev Executer**: Runs directly via `tsx server.ts` executing the TS entry file in development with instant hot reloading of script assets.
- **Production Compilation**:
  ```bash
  vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs
  ```
  This custom step packs the entire TS architecture, resolves internal modular dependencies, and writes a self-contained, lightweight CommonJS output (`dist/server.cjs`). Highly resilient and optimized for sub-second cold starts in Google Cloud Run.

---

## 🗄️ 4. Data Persistence & Real-Time Sync Layer

**Cloud Firestore** functions as the primary, durable cloud data ledger. State is synchronized in a non-blocking fashion using standard WebSockets.

### 📋 Firestore Blueprint Schema Design
The datastore layout maintains strict parent-child document hierarchies:

#### 1. `users` Collection
Tracks individual profiles, total metrics, and accrued rewards.
```json
{
  "email": "user@domain.com",
  "displayName": "User Name",
  "totalPoints": 240,
  "onboarded": true,
  "totalCarbonSaved": 35.8,
  "lastSyncTime": "TIMESTAMP"
}
```

#### 2. `carbon_logs` Collection (Subcollection of `users`)
Holds logged carbon incidents, mapped by category.
```json
{
  "logId": "unique-log-id",
  "category": "transport" | "energy" | "food" | "waste",
  "subCategory": "flight" | "car" | "electricity" | "diet",
  "amount": 12.5,
  "unit": "hours" | "miles" | "kwh",
  "carbonEmission": 24.5, // stored in kg CO2e
  "note": "Commute to center",
  "timestamp": "TIMESTAMP"
}
```

#### 3. `chats` Collection (Subcollection of `users`)
Tracks conversational threads with the Climate Coach.
- `messages` (Nested Subcollection):
```json
{
  "messageId": "msg-uuid",
  "sender": "user" | "coach",
  "text": "What is my largest carbon source?",
  "timestamp": "TIMESTAMP"
}
```

#### 4. `family_groups` Collection
Shared rooms where families track and complete challenges in teams.
```json
{
  "name": "The Green Family",
  "ownerId": "owner-uid-xyz",
  "memberIds": ["owner-uid-xyz", "participant-uid-foo"],
  "inviteCode": "8A9D2",
  "createdAt": "TIMESTAMP",
  "memberPoints": {
    "owner-uid-xyz": 250,
    "participant-uid-foo": 120
  }
}
```

---

## 🔗 5. Google Cloud Service Integrations

### 1. Google GenAI SDK (`@google/genai`)
We initialize the modern Google GenAI library server-side, entirely protected from client sniffing:
```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```
This single client acts as both the natural language engine (using structured System Prompts instructing it to act as an objective environmental scientist) and the structured Vision API parser converting raw receipts into machine-readable JSON logs.

### 2. Google Cloud Run Security
The application is deployed to Cloud Run inside an isolated, secure container. Connections ingress solely on port 3000 running behind a production reverse-proxy. Credentials like `GEMINI_API_KEY` are mounted via Google Secret Manager directly, preventing storage of hardcoded configurations in the git codebase.
