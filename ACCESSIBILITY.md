# ♿ CarbonPilot AI: Accessible UX Design & Compliance

This document evaluates the design metrics, code structures, and user experiences implemented to ensure that CarbonPilot AI complies with the **W3C WCAG 2.1 AA** standard for digital accessibility.

---

## 🎯 1. Our Accessibility Philosophy

Digital tools that track carbon footprints and promote sustainability must be available to everyone, regardless of physical or cognitive abilities. CarbonPilot AI integrates web accessibility (a11y) as a primary requirement. We use semantic elements, ARIA landmarks, screen reader instructions, and tactile keyboard boundaries to create an inclusive experience for all users.

---

## 🏗️ 2. Core Architectural Implementations

### 1. Semantic HTML Landmarks
The application avoids generic `div` clutter, organizing views under logical structural landmarks:
- `<main>`: Wraps the core tabbed view to locate focal layouts.
- `<header>`: Structures branding titles, active credentials, and profile indicators.
- `<nav>`: Structures the main navigation tabs, with appropriate responsive click cues.
- `<section>`: Segregates focus blocks (Emissions metrics cards, leaderboards, climate coaches).

### 2. High-Contrast Typography & Visual Cues
- **Color Contrast Guidelines**: Backgrounds (such as soft off-whites and dark charcoal grays) provide a text-to-background contrast ratio that exceeds the WCAG requirement (minimum 4.5:1).
- **Explicit Focus Outlines**: Global focus-ring handlers are applied to interactive controls:
  ```css
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary
  ```
  Ensures clear, visible visual indicators for keyboard and switch users.

---

## 🛠️ 3. Component Deep Dive: Engineered A11y Implementations

Here is how key modular files in the codebase was refactored to achieve pristine accessibility scores:

### 📸 Vision Upload Helper (`ReceiptAnalyzer.tsx`)
Traditional drag-and-drop file upload wrappers consist of un-stylable floating `<input type="file">` panels or custom mouse-only components that block keyboard and screen reader access.
We engineered an accessible uploader:
```typescript
<div
  id="uploader_container"
  role="button"
  tabIndex={0}
  aria-label="Receipt upload field. Select or drag and drop receipt images here to analyze carbon emissions factors."
  onDragEnter={handleDrag}
  onDragOver={handleDrag}
  onDragLeave={handleDrag}
  onClick={() => fileInputRef.current?.click()}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }}
  className="border-2 border-dashed rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
>
```
*Effect: This custom wrapper behaves exactly like a standard native form button. Keyboard users can focus on the component, read its purpose, and press Space or Enter to open the native file-selection dialog.*

### 💬 Conversational Dialogue Assistant (`ClimateCoach.tsx`)
Inputs must be explicitly labeled so screen readers know what to declare when focus lands on the text field:
```typescript
<label htmlFor="coach_message_input" className="sr-only">
  Ask climate coach environmental inquiry
</label>
<input
  id="coach_message_input"
  type="text"
  placeholder="Ask climate coach, e.g., how do I start washing clothes cleaner?"
/>
<button
  id="coach_submit_btn"
  type="submit"
  disabled={!inputText.trim() || loading}
  aria-label="Send message to climate coach"
>
  <Send className="w-4 h-4" />
</button>
```
*Effect:*
1. *The `<label>` with a matching `htmlFor` target creates a strict, logical link for assistive screen readers without cluttering the visual UI (using the tailwind-standard hidden screen-reader class `sr-only`).*
2. *The submission button (which contains a simple visual `<Send />` vector icon) is configured with an explicit text-based descriptor (`aria-label="Send message to climate coach"`) instead of reading generic svg code.*

### 📊 Metric Logging Form (`CarbonCalculator.tsx`)
Input elements throughout our manual calculator are paired with explicit label elements:
```typescript
<label htmlFor={subCategory === "flight" ? "flight_hours_input" : "amount_input"} className="block text-sm font-semibold text-text-primary mb-2">
  {subCategory === "flight" ? "Flight Duration" : "Quantity"} ({getUnit()})
</label>
<input
  id={subCategory === "flight" ? "flight_hours_input" : "amount_input"}
  type="number"
/>
```
*Effect: Assures assistive screen-readers read the specific semantic metrics ("Flight Duration" or "Quantity") precisely of the corresponding numeric entry fields.*

### 🗑️ Audit Logs Container (`DashboardTab.tsx`)
Generic tables with repetitive icon-based deletion control clusters create cognitive load and screen reader ambiguity.
```typescript
<button
  id={`delete_log_${log.logId}`}
  type="button"
  onClick={() => handleDeleteLog(log)}
  aria-label={`Delete audit log item for ${log.subCategory} activity of ${log.amount} ${log.unit}`}
  className="p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
>
  <Trash className="w-4 h-4" />
</button>
```
*Effect: Instead of reading generic "Trash" or "Delete", the system specifies exactly which log entry will be deleted, preventing accidental destructive mutations.*

---

## ⚙️ 4. Motion Controls: Motion-Compensation Standard

CarbonPilot AI uses **Framer Motion** for subtle UI transition animations. We respect cognitive and motion sensibilities:
- Transition durations are kept short (under 250ms) to prevent visual fatigue.
- Gradients and layout elevations avoid highly disorienting rotations or high-velocity fly-ins.
- The app automatically respects standard OS-level reduced motion preferences via CSS media query adapters, suppressing non-essential transitions for users with motion-sensitive conditions.
