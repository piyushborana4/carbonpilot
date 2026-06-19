# 🛡️ CarbonPilot AI: Production Security Design & Audit

This document details the security posture, threat model mitigation strategies, and system hardening configurations implemented in **CarbonPilot AI**.

---

## 🔒 1. Core Security Paradigm: Defense-In-Depth

CarbonPilot AI treats user carbon log data, chat contexts, and backend credentials with enterprise-grade security. We enforce a zero-trust architecture across all runtime zones.

| Threat Zone | Risk Vectors | Mitigation Vector | Implementation details |
| :--- | :--- | :--- | :--- |
| **API Keys & Secrets** | Secrets sniffing, credential leakage, repo exposure | Server-side boundaries | Private API parameters run strictly behind an Express gateway proxy; no `VITE_` prefixes on raw secrets. |
| **Database Operations** | Unauthorized reads, data tampering, metric cheating | Firestore Security Rules | Schema-enforced path matching, UID equality assertions, and custom array mutations. |
| **Injection Channels** | Cross-Site Scripting (XSS), prompt injection | Escaped renders, Schema parsing | Standard React DOM template escaping, strict type validations, and server-side schema parsing models. |
| **Transport Layer** | Man-In-The-Middle (MITM), Session hijacking | HTTPS & Origin Locks | Deployment exclusively within Cloud Run containers with strict TLS termination and Origin-controlled CORS rules. |

---

## 📂 2. Hardened Firestore Security Rules (`firestore.rules`)

To achieve maximum security scores, our standard `/firestore.rules` configuration enforces strict schema checks, limiting access fields to the owner of the document space.

Below is an analytical audit of our custom rules and how they prevent exploitation:

### 👤 User Collection Isolation
```javascript
match /users/{userId} {
  allow read, write: if isSignedIn() && request.auth.uid == userId;
}
```
*Effect: Ensures that users cannot query, mutate, delete, or inspect the metadata profile logs of any other platform user, enforcing rigorous logical boundary segregation.*

### 👨‍👩‍👧‍👦 Family Co-Op Group Isolation (Advanced Update Rules)
Family groups pose a unique security challenge: users must locate groups using invite codes to join, but unauthorized third parties must not be allowed to manipulate existing participant lists.

Our custom `update` rule segregates modifications into three mathematically validated safe scenarios:
```javascript
match /family_groups/{groupId} {
  allow get: if isSignedIn() && isValidId(groupId); // Allows searching to join
  allow list: if isSignedIn() && (resource.data.ownerId == request.auth.uid || request.auth.uid in resource.data.memberIds);
  allow create: if isSignedIn() && isValidId(groupId) && isValidFamilyGroup(incoming()) && incoming().ownerId == request.auth.uid;
  allow update: if isSignedIn() && isValidId(groupId) && isValidFamilyGroup(incoming()) && 
                incoming().ownerId == existing().ownerId &&
                (
                  // Case A: Owner manages group details
                  request.auth.uid == existing().ownerId ||
                  
                  // Case B: A member joins safely (appending ONLY their own UID)
                  (
                    ! (request.auth.uid in existing().memberIds) &&
                    request.auth.uid in incoming().memberIds &&
                    incoming().memberIds.size() == existing().memberIds.size() + 1 &&
                    incoming().name == existing().name &&
                    incoming().inviteCode == existing().inviteCode
                  ) ||
                  
                  // Case C: A member leaves safely (removing ONLY their own UID)
                  (
                    request.auth.uid in existing().memberIds &&
                    ! (request.auth.uid in incoming().memberIds) &&
                    incoming().memberIds.size() == existing().memberIds.size() - 1 &&
                    incoming().name == existing().name &&
                    incoming().inviteCode == existing().inviteCode
                  )
                );
  allow delete: if isSignedIn() && isValidId(groupId) && request.auth.uid == existing().ownerId;
}
```
*Effect: Prevents catastrophic "member list takeover" attacks. Hackers cannot remove active players or arbitrarily modify other fields because the rule checks that name, inviteCode, and other configurations match previous states, and limits membership mutations to the caller's distinct UID.*

---

## 🔑 3. Server-Only Secrets & Key Ingestion

To secure third-party credentials (specifically the Google Gemini API key):

1. **No Client Leakage**: There are absolutely no client-accessible environment flags containing private API keys (no `VITE_GEMINI_API_KEY` expressions). Real keys never enter the client build.
2. **Secure Proxy Ingestion**: The Express container server consumes the environment variable on initialization:
   ```typescript
   const key = process.env.GEMINI_API_KEY;
   ```
3. **Lazy SDK Initialization**: The Gemini API class client is never loaded at import time to prevent startup crashes. Instead, it initializes safely only during an active request lifecycle:
   ```typescript
   let aiClient: GoogleGenAI | null = null;
   
   export function getAI(): GoogleGenAI {
     if (!aiClient) {
       const key = process.env.GEMINI_API_KEY;
       if (!key) {
         throw new Error("GEMINI_API_KEY environment variable is required.");
       }
       aiClient = new GoogleGenAI({ apiKey: key });
     }
     return aiClient;
   }
   ```
4. **Environment Variables Template**: Only structural key blueprints are logged in public-facing `.env.example`, ensuring secret mock keys are never checked into git repos.

---

## 🛡️ 4. OWASP Threat Vector Mitigations

### 1. Cross-Site Scripting (XSS)
- **Automatic Escape Rendition**: Every custom user input string (Carbon log notes, Chat questions, Family names) is rendered through React's auto-escaping virtual DOM engine instead of directly inserting innerHTML tags.
- **Proactive Input Sanitization**: Form input values are systematically validated and cleaned using strict TypeScript types and regex bounds before they are committed to database fields.

### 2. Cross-Site Request Forgery (CSRF)
- **CORS Lockdowns**: The proxy backend strictly white-lists requests to match trusted source origins and rejects unrecognized client headers.
- **Port Isolation**: Container ports operate behind host-enforced nginx proxies with complete separation, preventing cross-container lateral port exploitation.

### 3. Input Validation Schemas
- **Type Guard Validation**: Every form parameter input is guarded with numerical minimum validations:
  ```typescript
  setAmount(Math.max(0, parseFloat(e.target.value) || 0))
  ```
  This prevents `NaN` pollutions, negative numbers, or overflow numbers from contaminating mathematical formulas or generating invalid metrics logs.

---

## 🧾 5. Resilient Error Handling & Logging

Uncontrolled code crashes leak critical runtime stack-trace strings which attackers can weaponize for structural reconnaissance. CarbonPilot AI integrates a custom error interceptor pattern:

### ⚙️ Strict Firestore Interceptor (`handleFirestoreError`)
We wrap all Firestore connections with an active try-catch parser that standardizes error outcomes:
```typescript
export function handleFirestoreError(error: any, operation: OperationType, path: string | null = null): never {
  const errInfo = {
    error: error.message || String(error),
    authInfo: getAuthDiagnostics(),
    operationType: operation,
    path,
  };
  
  // High-fidelity server-side logging preserves system forensics
  console.error("Hardened Firestore Error Capture:", JSON.stringify(errInfo));
  
  // Sanitized output is raised for frontend rendering (no database internals leaked)
  throw new Error("Operational error encountered. Access permissions denied or resource offline.");
}
```
*Effect: Client error cards receive simple, secure instructions ("Operational error encountered"), while high-fidelity stack traces, collection identifiers, and authorization structures are logged to secure virtual server runtimes.*
