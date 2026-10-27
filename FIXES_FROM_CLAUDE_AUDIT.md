# Veyil Thunai — Actionable Fixes & Improvements
### *Audit Report from Claude (Lead Judge & Social Innovation Specialist Review)*

This document compiles every bug, critical flaw, layout defect, and architectural recommendation identified during the external Claude audit of [https://veyil-thunai.vercel.app/](https://veyil-thunai.vercel.app/) and the repository codebase.

---

## 🚨 Priority 0: Critical Functional & Engine Bugs (Showstoppers)

### 1. Device-Timezone Bug in Solar Calculation (Critical WBGT Skew)
* **The Bug**:
  * The Open-Meteo payload provides timestamp strings without explicit timezone offsets (e.g. `2026-10-27T13:00`).
  * In `src/engine/solar.ts`, `new Date(date)` is evaluated using UTC getters (`getUTCHours()`).
  * If the device/browser is set to **India (IST, UTC+5:30)**, 13:00 is parsed as 13:00 IST $\rightarrow$ $7.5\text{h}$ UTC $\rightarrow$ local solar noon $\rightarrow$ **WBGT = 35.1 °C (Black Band)**.
  * If the device/evaluator is in **UTC**, 13:00 is parsed as 13:00 UTC $\rightarrow$ local solar time in Chennai ($80.27^\circ\text{E}$) becomes $18:21$ (sunset/night) $\rightarrow$ direct beam radiation drops to 0 $\rightarrow$ **WBGT = 29.2 °C (Green Band)**!
  * If an evaluator in the US or Europe tests the app, the engine will falsely report **Green ("work as usual")** during scorching Chennai midday heat.
* **Exact Fix**:
  * In `src/data/forecast.ts` (`parseOpenMeteoPayload`), ensure all timestamp strings without timezone offsets have `+05:30` appended:
    ```typescript
    const timeISO = times[i].includes('+') || times[i].endsWith('Z')
      ? times[i]
      : `${times[i]}+05:30`;
    ```
  * In `src/engine/plan.ts` (`findCurrentHourPlan`), do not use device-local `now.getHours()`. Instead, extract the current hour formatted in `Asia/Kolkata`:
    ```typescript
    const istHour = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        hour12: false,
      }).format(now),
      10
    );
    ```
  * Add an explicit test case running under simulated UTC timezone to guarantee identical WBGT output.

---

### 2. Missing Translation Keys on Screen S2 (Raw Key Display)
* **The Bug**:
  * On Screen S2, the peak heat alert banner calls:
    `t('plan.peak_heat_window_badge')` and `t('plan.peak_heat_window_desc')`
  * These keys do not exist in `en.json`, `ta.json`, or `hi.json` (the dictionaries contain `plan.peak_heat_badge` and `plan.peak_heat_strip`).
  * Users in all languages see ugly raw text: `PLAN.PEAK_HEAT_WINDOW_BADGE` and `plan.peak_heat_window_desc`.
* **Exact Fix**:
  * In `ScreenS2Today.tsx`, change lines 114 and 116 to use the existing keys:
    ```tsx
    <span>{t('plan.peak_heat_badge')}</span>
    <span>{t('plan.peak_heat_strip')}</span>
    ```
  * Or add aliases in all 3 dictionaries so neither key can ever fail.

---

### 3. `<html lang>` Attribute Never Updates
* **The Bug**:
  * When a worker toggles from English to Tamil (`ta`) or Hindi (`hi`), `<html lang="en">` in `index.html` remains statically set to `en`.
  * Mobile screen readers (TalkBack / VoiceOver) mispronounce Tamil and Hindi text using English pronunciation rules.
* **Exact Fix**:
  * In `src/i18n/useTranslation.tsx`, add a reactive effect whenever `lang` changes:
    ```typescript
    useEffect(() => {
      document.documentElement.lang = currentLang;
    }, [currentLang]);
    ```

---

## 🔤 Priority 1: Tamil & Indic Typography (Fixing the "Collapsed" Look)

Claude's audit directly diagnosed why Tamil text appears cramped, broken, or "collapsed":

| Issue | Root Cause in CSS | Fix Required |
|---|---|---|
| **Stacked Marks Squeezed** | `tracking-tight` ($-0.6\text{px}$) and `tracking-tighter` on headings | Set `letter-spacing: 0` or `tracking-normal` for all Indic scripts |
| **Ligatures Disrupted** | `tracking-wider` / `tracking-wide` on uppercase headings | Remove tracking on Indic text; Indic letters and diacritics must never be spaced apart |
| **Diacritic Clipping** | Tight line height (`leading-none`, `leading-snug`, $1.25$–$1.33$ ratio) | Set line-height to $\ge 1.5$ (`leading-relaxed` or `leading-normal`) for Tamil text |
| **Overflow on Small Badges** | Tamil strings average **15% to 68% longer** than English; fixed widths clip text | Replace `min-w-[64px]` with dynamic padding (`px-3 py-2 min-w-max`) |
| **Missing Native Font Fallback** | CSS relies on `system-ui`; budget Android phones lack quality Tamil fonts | Bundle self-hosted subset of `Noto Sans Tamil` and `Noto Sans Devanagari` in `/public/fonts/` |

---

## 🌐 Priority 2: Language Leak Fixes (70+ Hardcoded English Strings)

Claude identified ~70 hardcoded English fragments displayed when Tamil or Hindi is selected:

### 1. Screen S2 (Today)
- `Work / hour` $\rightarrow$ Needs key `s2.work_per_hour`
- `min max` $\rightarrow$ Needs key `s2.min_max`
- `Rest / hour` $\rightarrow$ Needs key `s2.rest_per_hour`
- `min rest` $\rightarrow$ Needs key `s2.min_rest`
- `Rest in shade` $\rightarrow$ Needs key `act.rest_shade`
- `Stop work` $\rightarrow$ Needs key `act.stop_work`
- `WBGT Est.` $\rightarrow$ Needs key `s2.wbgt_est`
- `Voice Guidance` $\rightarrow$ Needs key `s2.voice_guidance`
- `Air`, `Humidity`, `Solar` $\rightarrow$ Needs keys `s2.air`, `s2.humidity`, `s2.solar`
- `(Shade)` $\rightarrow$ Needs key `s2.shade_label`

### 2. Screen S3 (Day Plan)
- Timeline band names `GREEN`, `YELLOW`, `ORANGE`, `RED`, `BLACK` $\rightarrow$ Translate to localized band names
- `Tap hour for work/rest plan` $\rightarrow$ Needs key `s3.tap_hour_prompt`
- `Peak 11-4` badge $\rightarrow$ Needs localized acronym/text
- `Primary Heat Drivers:` $\rightarrow$ Needs key `s3.primary_drivers`
- `minutes max` / `minutes min` $\rightarrow$ Needs localized duration strings

### 3. Screen S4 (Work Log)
- `No Active Shift` $\rightarrow$ Needs key `s4.no_active_shift`
- `Start recording ambient heat exposure and your rest breaks securely on this phone.` $\rightarrow$ Needs key `s4.intro_text`
- `Started at` $\rightarrow$ Needs key `s4.started_at`
- `+30m fast forward (demo test)` $\rightarrow$ Label as demo helper
- `break(s)` $\rightarrow$ Needs key `s4.breaks_unit`
- `Pressure felt: Yes, pushed to work / No` $\rightarrow$ Needs localized response strings

### 4. Settings Screen (Screen S7)
- `Display`, `Readability`, `Normal`, `Large`, `Extra Large`
- `Source`, `Data Age`, `Attribution`, `Privacy`, `About`
- Disclaimers and legal text in Settings

### 5. Chennai Cool Spots Directory (`src/data/chennai-cool-spots.json`)
- Spot names, areas, landmarks, and notes are currently 100% English.
- Add Tamil names (e.g., `சென்ட்ரல் ரயில் நிலையம்`, `பனகல் பூங்கா`, `கோயம்பேடு பேருந்து நிலையம்`) or provide localized fields.

---

## 🛠️ Priority 3: Safety & UX Enhancements Before Final Judging

### 1. Safe Offline Fallback Warning
* **Current Behavior**: When offline $> 24\text{h}$, app silently loads sample data with a tiny `sample data (offline)` badge.
* **Risk**: A worker in $42^\circ\text{C}$ heat might trust yesterday's sample forecast.
* **Fix**: Prominently display a high-contrast banner:
  > *"Offline Data Mode: Showing historical baseline. Assume severe heat caution between 11:00 AM – 4:00 PM."*

### 2. Heat-Stroke 5-Question Rapid Triage (Screen S6)
* Add a 1-tap rapid self-check modal:
  1. Are you confused, dizzy, or slurring speech?
  2. Have you stopped sweating despite intense heat?
  3. Are you vomiting or nauseous?
  4. Is your heart racing rapidly?
  5. Did someone faint?
* If **ANY** red-flag symptom is checked $\rightarrow$ Flashing red screen: **"CALL 108 IMMEDIATELY — Move to Shade & Douse with Cool Water"**.

### 3. Client-Side WhatsApp Share Button (`wa.me`)
* Add a 1-tap WhatsApp share button on Screen S2:
  * Generates a pre-filled client-side message:
    `wa.me/?text=🚨 Heat Alert Chennai: WBGT is 34.2°C (Orange Band). Stay in shade, drink ORS. Track safe hours on https://veyil-thunai.vercel.app/`
* **Zero telemetry, zero backend, zero privacy cost.** Riders can share it into their local union/peer WhatsApp groups.

### 4. Web Speech Voice Setting (`en-IN` instead of `en-US`)
* In `src/i18n/useTranslation.tsx`, ensure the speech synthesis voice selector prefers `en-IN` / `ta-IN` / `hi-IN` rather than generic US voices.

### 5. Human Language Review for Spoken Audio
* `act.stop_work`: Currently renders "exhausted" as *"நடுக்கம்"* (which means shivering/trembling) and drops "strenuous".
* Heat stroke: Media often translates as *"வெப்ப பக்கவாதம்"* (which colloquially means heat paralysis); standardize to *"கடுமையான வெப்ப பக்கவாதம் / வெப்ப மயக்கம்"*.

---

## 🎯 Priority 4: Evaluator Pitch & Q&A Strategy (Viksit Bharat 2047)

### 1. The 60-Second Winning Elevator Pitch
> *"Every summer afternoon across India, millions of gig delivery riders and construction workers are forced to work through the hottest hours because the 12–3 PM lunch rush is also the peak heat window. While delivery aggregators refuse to halt dispatch, workers bear 100% of the physiological risk.*
> 
> *We built **Veyil Thunai** — the first worker-owned, offline heat-safety companion. Built on the peer-reviewed Liljegren WBGT scientific model, it calculates real heat stress from solar radiation and humidity, speaks reminders in Tamil, Hindi, and English, and records breaks on a tamper-evident cryptographic hash chain.*
> 
> *It requires zero login, zero network, and zero employer permission. Under the new Labour Codes taking effect now, this gives workers independent proof of dangerous exposure. In a climate-stressed Viksit Bharat, worker safety cannot depend on an algorithm's goodwill."*

### 2. Crucial Q&A Rebuttals for Judges

* **Q: "Aggregators won't pause orders. Who is this app for?"**
  * **Answer**: *"It is designed exclusively for the worker and their union. Just as workers wear their own helmets and carry their own water bottles, Veyil Thunai is their personal digital safety layer. When future regulatory heat standards arrive, workers already possess cryptographic, timestamped proof of extreme exposure."*

* **Q: "Why is your WBGT different from simple temperature apps?"**
  * **Answer**: *"Air temperature alone ignores the fact that asphalt radiant heat and direct sunlight add up to 6 °C of thermal load to the human body. Our engine ports the NOAA Solar Position & Liljegren (2008) model, separating sun and wind effects so it can accurately distinguish riding on an open highway from resting under a flyover."*

* **Q: "Can a worker forge the exposure log to fake rest breaks?"**
  * **Answer**: *"The log is tamper-evident, not centralized DRM. Each entry is cryptographically linked to the previous entry via SHA-256. For union representation, we provide an export with the chain's cryptographic signature and timestamp that can be witnessed by union leads."*

---

## ✅ Implementation Checklist

- [x] **Step 1**: Add timezone offset `+05:30` to `src/data/forecast.ts` and fix `Intl.DateTimeFormat` hour lookup in `src/engine/plan.ts`.
- [x] **Step 2**: Fix missing key references `plan.peak_heat_window_badge` $\rightarrow$ `plan.peak_heat_badge` in `src/ui/screens/ScreenS2Today.tsx`.
- [x] **Step 3**: Add `document.documentElement.lang = currentLang;` in `src/i18n/useTranslation.tsx`.
- [x] **Step 4**: Remove negative letter-spacing and uppercase tracking on Tamil/Devanagari headings in `ScreenS1LanguageJob.tsx`, `ScreenS2Today.tsx`, and `ScreenS3DayPlan.tsx`.
- [x] **Step 5**: Localize hardcoded English labels in `src/i18n/{en,ta,hi}.json`.
- [x] **Step 6**: Add 1-tap WhatsApp share button on S2.
- [x] **Step 7**: Add 5-question Heat-Stroke Emergency Triage card on S6.
- [x] **Step 8**: Run `npm test && npm run lint && npm run build` and push to GitHub.
