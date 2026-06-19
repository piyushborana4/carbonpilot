# 🧪 CarbonPilot AI: Multi-Tier Testing & Validation Strategy

This document outlines the testing architecture, unit suites, component-rendering tests, and network mock configurations implemented in **CarbonPilot AI** to ensure code correctness and bulletproof runtime stability.

---

## 🎯 1. Testing Infrastructure Overview

CarbonPilot AI maintains high code confidence through a multi-tier test matrix executed via **Jest** and **React Testing Library**:

| Test Tier | Focus Areas | Frameworks | Files |
| :--- | :--- | :--- | :--- |
| **Unit tests** | Math formulas, footprint conversion tables, error hooks | Jest, ts-jest | `/src/tests/unit/` |
| **Component tests** | DOM layouts, keyboard input loops, asynchronous updates | React Testing Library | `/src/tests/components/` |
| **API Endpoints** | Ingress proxies, server health checks, JSON router pipelines | Supertest, Jest | `/src/tests/api/` |

---

## 🏗️ 2. Isolation Framework: Custom Firebase Mocking

To execute comprehensive unit and component tests offline without depending on high-latency cloud connections or exposing active Firebase billing projects, we designed a custom-mocking layer:

### 1. The Global Mock Suite (`firebaseMock.ts`)
Creates standard stub instances of key Firebase and Firestore functions so components can fire operations safely:
```typescript
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn().mockReturnValue({}),
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  collection: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn().mockReturnValue(() => {}),
  increment: jest.fn(),
  arrayUnion: jest.fn(),
}));
```

### 2. Standardized Configuration Stub (`firebaseConfigMock.js`)
Mapped via our custom Jest config (`jest.config.cjs`) to intercept any relative JSON configurations, injecting generic mock credentials so initialization never crashes on module load:
```javascript
module.exports = {
  projectId: "cellular-link-nhh41",
  appId: "mock-app-id",
  apiKey: "mock-api-key",
  authDomain: "mock-auth-domain-here",
  firestoreDatabaseId: "mock-db-id"
};
```

---

## 📐 3. The Execution Test Suites

### 🗳️ 1. Unit Tests (`/src/tests/unit/`)

#### A. Calculator Validations (`calculator.test.ts`)
- **Objective**: Verify that individual log parameters yield mathematically correct carbon outputs (kg CO₂e), aligning with scientific expectations.
- **Features Tested**:
  - **Transport conversions**: Miles driven mapped via vehicle categories (compact, SUV, truck).
  - **Housing emissions**: Electricity conversions mapped by kWh rates.
  - **Diet choices**: Meat-heavy lifestyles vs structural vegetarian/vegan offsets.

#### B. Security Logging & Validation (`firebase.test.ts`)
- **Objective**: Ensure that client-side access errors trigger secure intercepts, preserving security logs without leaking server forensics.
- **Features Tested**:
  - Structural error translation blocks (`handleFirestoreError`).
  - Active credential diagnostics verification.

---

### 🗳️ 2. Component Tests (`/src/tests/components/`)

#### A. Climate Coach Chat Controller (`ClimateCoach.test.tsx`)
- **Objective**: Ensure chat mechanics render correctly, process keyboard submissions, format responses, and fail gracefully if services are unreachable.
- **Features Tested**:
  - Rendering of display prompts, title headers, and suggestion buttons.
  - Mock API request dispatches when message input forms are submitted.
  - Secure state recovery under server-failure scenarios.

#### B. Weekly Challenges Tracker (`WeeklyChallenges.test.tsx`)
- **Objective**: Formulate and test co-op challenge indicators, checking reward accrual and optimistic synchronization writes to Firestore collection hooks.
- **Features Tested**:
  - Proper formatting of current reward balances.
  - Interactive click actions triggering `setDoc` increments.

---

### 🗳️ 3. API & Proxy Integration Tests (`/src/tests/api/`)

#### Express Server Endpoint Checks (`server.test.ts`)
- **Objective**: Verify backend route bindings, routing correct headers and payloads while maintaining robust uptime status.
- **Features Tested**:
  - Root route static files binding.
  - JSON parameters validity.
  - API Health checkers (`/api/health`).

---

## 🚀 4. Executing Tests Locally

To run the testing suite manually, verify coverage, and validate architectural integrity, use these commands:

### Running the Entire Testing Matrix
```bash
npm test
```
*Executes all suites with standard verbose output reporting coverage. Expected output matches:*
```text
 PASS  src/tests/components/WeeklyChallenges.test.tsx
 PASS  src/tests/components/ClimateCoach.test.tsx
 PASS  src/tests/unit/firebase.test.ts
 PASS  src/tests/api/server.test.ts
 PASS  src/tests/unit/calculator.test.ts

Test Suites: 5 passed, 5 total
Tests:       22 passed, 22 total
```

### Running a Specific Test Collection
To isolate tests and execute a single file (for faster iterations):
```bash
npx jest src/tests/unit/calculator.test.ts --colors
```
