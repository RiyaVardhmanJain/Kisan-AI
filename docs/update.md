# 🌾 KisanAI — PS2 Alignment Update Plan
> **Problem Statement:** PS2 — Post-Harvest Storage Inefficiency & Supply Chain Losses  
> **Date:** 27 Feb 2026  
> **Scope:** Frontend only (`frontend/src/`) — No backend, no Ollama, all Gemini AI  
> **Rule #1:** Nothing currently working breaks. All changes are additive or clearly flagged.

---

## ✏️ TWEAKS — Existing Files, Minimal Changes

These files already exist and are working. Only small prompt/logic changes to shift them PS2-aligned.

### 1. `frontend/src/ai/diseasePrompt.ts`
**What to change:** Add a **storage mode variant** to the prompt.  
When `context = "storage"`, the AI should analyze for:
- Mold, rot, fungal growth on stored produce
- Moisture damage, discoloration, texture degradation
- Pest infestation signs in stored grain/vegetables
- NOT field crop diseases (those stay in `context = "field"`)

**What stays the same:** Default prompt for field crop disease detection is unchanged.

---

### 2. `frontend/src/ai/diseaseDetectionService.ts`
**What to change:** Add an optional parameter `context: "field" | "storage"` (defaults to `"field"`).  
- `"field"` → uses existing prompt, returns existing response shape (untouched)
- `"storage"` → uses new storage spoilage prompt, returns spoilage-specific response

**What stays the same:** All existing calls to this service with no `context` param continue working exactly as before.

---

### 3. `frontend/src/ai/monitoringPrompt.ts`
**What to change:** Shift the language and focus from **field/crop monitoring → warehouse/storage monitoring**.  
- Ask Gemini to evaluate: humidity levels, ventilation adequacy, pest infestation, mold risk in storage
- Add output fields: `storageRisk`, `ventilationStatus`, `recommendedAction`

**What stays the same:** The image upload mechanism and response rendering in `Monitoring.tsx` stay intact.

---

### 4. `frontend/src/ai/marketPrompt.ts`
**What to change:** Add a distribution planning section to the prompt:  
*"Given X quintals of [produce] currently in storage, which state/market offers the best price right now? Factor in storage days elapsed and spoilage risk."*

**What stays the same:** Existing weather-price correlation output stays. This is an additive section.

---

### 5. `frontend/src/ai/consultPrompt.ts`
**What to change:** Make `storageRecommendations` the **primary output section**, not a secondary block.  
Currently it's buried under farming schedule and market intel. Restructure prompt priority so storage strategy (method, duration, optimal conditions, spoilage risk) leads the response.

**What stays the same:** All other output fields (farmingSchedule, marketIntel, riskForecast) remain — just reordered in weight/priority.

---

### 6. `frontend/src/ai/auditService.ts`
**What to change:** Extend the weather risk logic to include **storage risk**.  
- High humidity forecast → "Stored onions/potatoes at elevated spoilage risk"
- Temperature spike → "Cold storage units may need extra cooling"
- Rain forecast → "Transport window closing — dispatch before [date]"

**What stays the same:** Existing weather → crop risk mapping logic is untouched.

---

## 🆕 NEW — Features to Build From Scratch

All follow the existing pattern: `Gemini prompt file` + `service file` + `page/component file`.

### 1. Storage Dashboard
| File | Type |
|---|---|
| `frontend/src/pages/StorageDashboard.tsx` | New page |
| `frontend/src/ai/storageService.ts` | New AI service |
| `frontend/src/ai/storagePrompt.ts` | New Gemini prompt |

**What it does:**
- Shows simulated storage units with temperature, humidity, gas level gauges
- AI analyzes conditions and flags units at risk
- Alerts when thresholds breached (temp > 30°C, humidity > 75%)
- Uses local React state for storage unit data (no DB needed for demo)

---

### 2. Inventory Tracker
| File | Type |
|---|---|
| Component inside `StorageDashboard.tsx` | New component (no separate file needed) |

**What it does:**
- Log produce lots: name, quantity (kg/quintals), entry date, quality grade, farmer name
- View all stored lots with status (stored / at-risk / dispatched)
- Remaining shelf life indicator per lot (static lookup table by produce)
- Traceability timeline: harvested → stored → quality check → dispatched

---

### 3. Distribution Planner
| File | Type |
|---|---|
| `frontend/src/pages/DistributionPlanner.tsx` | New page |
| Extend `frontend/src/ai/marketService.ts` | Add one new function |

**What it does:**
- Input: select a stored lot + quantity
- Cross-references existing state-wise price JSON data (already in `frontend/src/data/`)
- AI recommends best market to sell to based on current price + storage days elapsed
- Output: ranked market options with estimated revenue and transport consideration

---

### 4. Spoilage Alert Banner
| File | Type |
|---|---|
| `frontend/src/components/SpoilageAlert.tsx` | New reusable component |

**What it does:**
- Reusable alert banner triggered when AI detects high-risk conditions
- Severity levels: `info` / `warning` / `critical` with color coding
- Shows: what's at risk, why, and recommended action
- Used across Storage Dashboard, Monitoring page, and Consult page

---

## 🗑️ REMOVE / DE-EMPHASIZE

| File | Action | Reason |
|---|---|---|
| `frontend/src/pages/SmartFarming.tsx` | Hide from Navbar | Pre-harvest feature, not PS2 relevant |
| `frontend/src/components/Market.tsx` | Remove from Home page | Static product catalog — irrelevant to PS2 |
| `backend/index.js` | Delete or leave empty | No longer needed — Ollama removed |

---

## 📋 Implementation Order

| Step | What | Risk |
|---|---|---|
| 1 | Tweak `auditService.ts` (add storage risk) | Zero — additive only |
| 2 | Tweak `consultPrompt.ts` (reorder priority) | Low — same fields, new order |
| 3 | Tweak `marketPrompt.ts` (add distribution section) | Low — additive section |
| 4 | Tweak `monitoringPrompt.ts` (storage focus) | Low — prompt rewrite |
| 5 | Tweak `diseasePrompt.ts` + `diseaseDetectionService.ts` (add storage mode) | Medium — param addition, test both modes |
| 6 | Build `SpoilageAlert.tsx` component | Zero — new component |
| 7 | Build `storagePrompt.ts` + `storageService.ts` | Zero — new files |
| 8 | Build `StorageDashboard.tsx` with Inventory Tracker | Medium — new page |
| 9 | Build `DistributionPlanner.tsx` | Medium — new page |
| 10 | Remove/hide `SmartFarming`, `Market`, `backend/` | Low — just delete/comment |

---

> ✅ **6 tweaks to existing files. 4 new features. 3 things to remove.**  
> 🔁 **Test every tweak in isolation before moving to the next step.**
