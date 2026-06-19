# 🌍 CarbonPilot AI

### * AI-powered carbon tracker, eco-route planner, and personalized climate coaching Anpilot designed to help individuals and families track, calculate, predict, and systematically lower their environmental footprints.*

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Accessibility Compliant](https://img.shields.io/badge/accessibility-WCAG%202.1%20AA-blue.svg)](#)
[![Security Audited](https://img.shields.io/badge/security-hardened-success.svg)](#)
[![Platform Coverage](https://img.shields.io/badge/platform-fullstack--react-orange.svg)](#)

---

## 📌 1. Executive Summary

### Problem Statement
Global climate change demands urgent action, yet individual action remains constrained by friction. Most people desire to reduce their ecological impact but face three critical barriers:
1. **Friction in Manual Logging**: Manually entering utility usage, food types, and transport miles is tedious and quickly abandoned.
2. **Missing Actionable Intelligence**: Static "carbon footprint calculators" provide passive, backward-looking scores rather than proactive, context-aware predictive guidance.
3. **Isolation vs. Collective Community Action**: Personal carbon tracking is traditionally an isolating, single-user task that misses the massive psychological power of positive peer reinforcement, gamified family achievements, and friendly neighborhood leaderboards.

### The Solution: CarbonPilot AI
**CarbonPilot AI** transforms carbon tracking from a passive, tedious chore into an immersive, intelligent, and socially cooperative lifestyle. Combining Vision AI scanning, conversational AI, maps platform integrations, and real-time multiplayer coordination, it serves as an omnipresent ecological pilot.

---

## 🚀 2. Live Deployment & Testing URLs

- **Development Preview App**: [CarbonPilot AI Dev](https://ais-dev-onp5g7dmuqaybjgs733bk2-64636244003.asia-southeast1.run.app)
- **Shared Production App**: [CarbonPilot AI Sandbox](https://ais-pre-onp5g7dmuqaybjgs733bk2-64636244003.asia-southeast1.run.app)

---

## 🛠️ 3. Advanced Feature Modules

CarbonPilot AI is built around several deeply integrated, high-fidelity user experiences:

### 1. 📊 Dynamic Carbon Calculator
A multi-category logging experience covering **Transport** (driving, public transit, flights), **Home Energy** (electricity, natural gas), **Diet** (meat-heavy, vegetarian, vegan offsets), and **Waste** (composted, recycled, landfill). Logs are translated instantly into actionable CO₂ equivalents (kg CO₂e) using real-world scientifically validated EPA emission factors.

### 2. 💬 Personal Climate Coach (Server-Side Gemini AI)
An interactive conversational assistant that acts as a personalized sustainability mentor. The coach ingests your historical carbon logs to offer pinpoint guidance. Standardized pre-configured inquiries are provided for quick interaction, while the chat window is optimized with absolute keyboard focus indicators, screen reader accessibility labels, and robust Firestore feedback chains.

### 3. 📸 Vision-Based Receipt & Utility Analyzer
Leverages Gemini Vision APIs backend models to let users directly upload images of shopping receipts, energy bills, or fuel stubs. Our Express server handles the ingestion safely, parses item descriptions, automates logging, and assigns carbon footprint estimations so the user never has to key in data manually.

### 4. 🚏 Eco-Route Transit Planner
Integrates the **Google Maps Platform** API to provide carbon-optimized routing. When users search for a journey, the system calculates multiple route alternatives, compares private driving emissions to modern public transport or biking, and exposes exact metric differences.

### 5. 🏡 Family Carbon Hub & Cooperative Leaderboard
A real-time co-op space where family circles can group together under a single household account:
- **Leaderboard**: Compares family members on cumulative footprints.
- **Sync Groups**: Create or join groups using dynamic invite codes.
- **Anti-Grief Group Rules**: Secured via mathematical database rule assertions preventing members from modifying details of users they do not control, but allowing authenticated joining and leaving.

### 6. 🏆 Gamified Weekly Challenges
A collection of light-footprint challenges (e.g., "Meatless Monday", "Phantom Load Elimination") that award redeemable points. Progress status is written in real-time to Cloud Firestore database nodes with strict optimistic sync protections.

### 7. 📈 Prediction and Modeling Engine
Calculates multi-month projection pathways. Predicts end-of-year footprint envelopes based on baseline usage trends, modeling what the family footprint will look like under "Business as Usual" vs "Carbon Neutral Actions".

---

## 📦 4. Technical Architecture Stack

| Layer | Component | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript | Fast, type-safe Single Page Application client bundle |
| **Styling & Motion** | Tailwind CSS, Framer Motion | Fluid layouts, high-contrast typography, physics-based UI transitions |
| **Charts & Graphics** | Recharts, SVG Canvas | Responsive, screen-reader compatible visual indicators and trend curves |
| **Backend API** | Node.js, Express, TSX | Server proxy handling private third-party APIs and Google AI models safely |
| **Database** | Google Cloud Firestore (NoSQL) | Real-time, schema-enforced, responsive state synchronization |
| **Auth** | Firebase Authentication | Unified Google/JSON federated secure login |
| **Intelligence** | Gemini 2.5/Gemini Pro Vision | Advanced natural language reasoning and OCR document receipt parsing |

---

## 🔒 5. Google Technologies & Cloud Integrations

CarbonPilot AI relies extensively on Google Cloud ecosystem tools:
- **Gemini API & Google GenAI SDK**: Implements natural language understanding for the Eco Coach and Vision-based extraction of metrics from fuel and utility invoices.
- **Cloud Run**: Hosts the full-stack Dockerized container. Nginx serves as the secure ingress router on port 3000 mapping incoming endpoints safely.
- **Cloud Firestore**: Acts as the dynamic persistence ledger, leveraging real-time snapshot synchronizer listeners (`onSnapshot`) to coordinate multiplayer team leaderboard metrics instantly.
- **Firebase Authentication**: Handles Google-authenticated logins and standard user separation using secure JWT validation chains.

---

## 💻 6. Local Development Configuration Guide

### 📋 Prerequisites
- **Node.js** (v18 or higher recommended)
- **NPM** (v9 or higher)

### 🚀 Step-by-Step Setup

1. **Clone and Navigate**:
   ```bash
   git clone <repository-url>
   cd carbonpilot-ai
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root folder. You can base it on `.env.example`:
   ```env
   # Backend secret keys (strictly kept server-side, never exposed to browser)
   GEMINI_API_KEY=your_actual_google_gemini_api_key_here
   PORT=3000
   NODE_ENV=development
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Verify Application Linting**:
   ```bash
   npm run lint
   ```

5. **Execute Security and Functional Unit Tests**:
   ```bash
   npm test
   ```

6. **Start the Local Development Server**:
   ```bash
   npm run dev
   ```
   *The server boots using the Express/TSX full-stack wrapper on `http://localhost:3000`.*

7. **Production Build Compilation**:
   ```bash
   npm run build
   ```
   *Bundles frontend assets into the `dist/` directory and compiles `server.ts` to highly optimized production-ready `dist/server.cjs`.*

---

## 🔮 7. Future Enhancements & Scalor Roadmap

- **Municipal Grid Integrations**: Sync electrical consumption parameters directly via utility APIs to automate residential log generation.
- **Smart Home IoT Webhooks**: Integrate smart thermostat inputs (e.g., Nest, ecobee) to dynamically track and offset HVAC carbon cycles.
- **Municipal Transit API Integrations**: Display ticket costs alongside estimated carbon rates to provide financial motivators next to carbon savings.
- **Certified Carbon Credit Offsets**: Connect with verified offset providers (e.g., Gold Standard) to let users invest their earned Reward Points to purchase real-world tree planting certificates.

---

## 📜 8. License

This project is licensed under the Apache License 2.0. See the `LICENSE` file for details.
