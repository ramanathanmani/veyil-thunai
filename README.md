# Veyil Thunai (வெயில் துணை)
### *Offline-First Heat-Safety Companion PWA for Outdoor and Gig Labourers*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646cff?logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-205%20Passed-brightgreen)](https://vitest.dev/)
[![A11y: WCAG AA](https://img.shields.io/badge/A11y-WCAG%20AA%20Compliant-success)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-orange)](https://web.dev/progressive-web-apps/)

> **Veyil Thunai** (*"Sun Companion"* in Tamil) is a local-first, privacy-respecting Progressive Web App engineered to protect outdoor gig riders, construction workers, street vendors, and sanitation workers from dangerous heat stress and heat stroke under extreme Indian summers.

---

## 📌 The Problem

1. **Peak Heat Matches Peak Demand**: The most dangerous heat window (11:00 AM – 4:00 PM IST) directly coincides with peak lunch food and grocery delivery demand. Delivery aggregators do not halt order dispatch, and incentive structures penalize workers who step away.
2. **Invisible Heat Stress**: Standard ambient thermometer readings underestimate thermal strain by failing to account for direct solar radiation, humidity, and radiant heat from asphalt and motorbike fuel tanks.
3. **No Infrastructure Access**: Dark stores and delivery transit points frequently lack shade, seating, or cold drinking water. Public corporation toilets are often locked or distant, disproportionately affecting women workers who restrict fluid intake out of fear of lacking sanitation facilities.
4. **Platform Disconnect & Inequity**: Workers bear 100% of the physiological and financial risk. Rest breaks are treated by algorithms as inactivity, jeopardizing ratings and daily wage slabs.

---

## ☀️ Core Features

### 1. Scientific WBGT Heat Engine (Liljegren Model)
- Pure TypeScript implementation of the **NOAA Solar Position** and **Liljegren et al. (2008)** Wet-Bulb Globe Temperature (WBGT) model.
- Validated against the Python `pywbgt` scientific oracle over 200 random meteorological test vectors, achieving a maximum difference of **0.090 °C** and a mean difference of **0.022 °C** (well within the ≤ 1.5 °C scientific tolerance).
- Dynamically integrates air temperature, relative humidity, direct & diffuse solar irradiance ($W/m^2$), and wind speed (with 10m to 2m micrometeorological scaling).

### 2. Advisory Peak-Heat Window (11:00 – 16:00 IST)
- Marks the **11:00–16:00 Asia/Kolkata** window as *"Advisory Peak Heat"* based on National Disaster Management Authority (NDMA) guidelines.
- Grounded in worker honesty: cites public advisory without false claims that work is banned or that aggregators have suspended orders.

### 3. 90-Minute Cooling-Break Timer & One-Tap Log
- Runs offline during active shifts. At 90 minutes of continuous work, triggers a prominent cooling alert and plays spoken voice guidance: *"Rest 15 minutes in shade"*.
- **One-tap recording** logs the 15-minute rest break directly onto the cryptographic hash chain without requiring an internet connection.

### 4. Worker-Owned Cryptographic Exposure Chain
- Shifts, WBGT readings, rest intervals, and answers to *"Were you pushed by platform incentives to work during dangerous heat?"* are chained using **SHA-256 hashes**.
- Stored exclusively in local IndexedDB. Exports to **JSON, CSV, and printable union representation summaries**.
- Tamper-evident: any attempt to alter past exposure records immediately breaks the chain hash link.

### 5. Chennai Cool, Water & Sanitation Directory (Offline)
- Static, hand-curated directory of public drinking water, shaded transit shelters, and accessible corporation restrooms across key Chennai hubs (Central, Broadway, T. Nagar, Guindy, Koyambedu, etc.).
- Transparently badged: *"Unofficial — verify on site"* (zero live Google Places API dependencies, zero background scraping).

### 6. Emergency Heat Pause ("I Need to Stop")
- Quick-access heat distress modal with direct one-tap calling to **112 (National Emergency)** and **108 (Ambulance)**.
- First-aid pointer to heat stroke warning signs and a 1-tap local log entry recording.
- Generates a clean printable notice slip for supervisors or station leads.

### 7. Multilingual Voice Readout (Tamil, Hindi, English)
- Fully accessible to low-literacy workers with complete string parity across **English**, **Tamil (தமிழ்)**, and **Hindi (हिन्दी)**.
- Includes pre-recorded spoken MP3 audio clips played sequentially (Band $\rightarrow$ Meteorological Driver $\rightarrow$ Action Plan), with Web Speech API fallback.

### 8. Construction & Farm Labour Daily Wage Mode
- Specifically highlights early morning (6:00–9:00 AM) and late evening (5:00–7:00 PM) as **least-bad hours** for heavy physical labor, helping daily-wage earners safeguard their daily earnings while reducing peak thermal strain.

### 9. Worker Dignity & Mutual Aid Tools
- **Health Before Hustle**: Honesty card affirming that resting during extreme heat is biological self-preservation, not laziness, with a worker's own target note.
- **Customer Heat Kindness Slip**: Multilingual offline share/print slip asking customers to offer a glass of drinking water to delivery riders.
- **Smartphone Thermal Tip**: Guidance on shading delivery mounts and avoiding fuel-tank heat to prevent phone freezes and missed order pings.
- **Women Worker Hydration Guidance**: Information addressing public toilet limitations and dehydration/UTI risks, citing NDMA public health advisories.

---

## 🛡️ Privacy, Security & Architectural Guarantees

| Guarantee | Implementation |
|---|---|
| **Zero Accounts & Zero Login** | Open and immediately usable. No phone numbers, passwords, or KYC. |
| **Zero Telemetry & Zero Trackers** | No Google Analytics, no Mixpanel, no third-party scripts. |
| **Strict Network Policy** | **Open-Meteo (`api.open-meteo.com`)** is the *only* allowed external network host. Enforced via Content Security Policy (CSP). |
| **6h / 24h Offline Fallback** | Fresh forecast (< 6h) $\rightarrow$ Stale warning (6h–24h) $\rightarrow$ Deterministic sample fallback (> 24h or offline). |
| **Universal Accessibility** | All interactive touch targets are $\ge 48\text{px}$. Dual-encoded with SVG iconography and text (never color alone). Axe WCAG AA certified (0 violations). |

---

## 🏗️ Architecture & Tech Stack

```
veyil-thunai/
├── config/              # ACGIH TLV / NIOSH thresholds, presets, physical constants
│   ├── constants.json
│   ├── presets.json
│   └── thresholds.json
├── public/              # PWA manifest, service worker, icons, spoken audio MP3s
│   ├── audio/           # Spoken templates in /en/, /ta/, /hi/
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── data/            # Weather forecast client, IndexedDB cache, Chennai cool spots
│   ├── engine/          # Liljegren WBGT calculation, NOAA solar position, limits & plans
│   ├── i18n/            # Trilingual dictionary (English, Tamil, Hindi) & voice hook
│   ├── log/             # SHA-256 cryptographic chain, IndexedDB storage, export utilities
│   └── ui/
│       ├── components/  # Modals (Cool Spots, Emergency Pause, Customer Share, Badges)
│       └── screens/     # Screens S1 (Setup), S2 (Today), S3 (Plan), S4 (Log),
│                        # S5 (History), S6 (Learn), S7 (Settings), S8 (Ward Demo)
└── tests/               # Comprehensive Vitest & Axe accessibility test suites
```

- **Frontend**: React 19, TypeScript 5.7, Vite 6, Tailwind CSS 3.4
- **State & Storage**: Browser `IndexedDB` via `idb`
- **Crypto**: Web Crypto API `crypto.subtle.digest('SHA-256', ...)`
- **PWA**: `vite-plugin-pwa` with Workbox service worker precaching 124 offline assets
- **Testing**: Vitest 5, Testing Library, Axe-core, Playwright

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation & Local Run

1. Clone the repository:
   ```bash
   git clone https://github.com/ramanathanmani/veyil-thunai.git
   cd veyil-thunai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

> [!TIP]
> **Mobile Emulation**: In Chrome/Firefox, press `F12` and toggle Device Mode (`Ctrl+Shift+M`) to view at **360px – 412px** width for the authentic worker experience.

---

## 🧪 Testing & Verification

The codebase includes 14 test suites and **205 tests** with 100% pass rate:

```bash
# Run unit, oracle, a11y, and integration tests
npm test

# Run TypeScript strict type-checking
npm run lint

# Build production bundle with PWA service worker precaching
npm run build

# Preview production build locally
npm run preview
```

### Verified Test Suites:
- `wbgt-oracle.test.ts`: Liljegren WBGT engine tested against Python `pywbgt` ground truth.
- `limits.test.ts`: ACGIH (2024) TLV and NIOSH Action Limit boundary conditions.
- `forecast.test.ts`: Open-Meteo API fetching, timeout handling, and 6h/24h cache hierarchy.
- `chain.test.ts`: SHA-256 hash chaining, deterministic canonical JSON, and tamper detection.
- `i18n.test.ts`: Complete key parity across English, Tamil, and Hindi dictionaries.
- `a11y.test.tsx`: Automated Axe WCAG AA audit and $\ge 48\text{px}$ touch target compliance.
- `chennai-cool-spots.test.ts`: Validation of hand-curated offline cool spots dataset.
- `pwa-perf.test.ts`: Performance budgets, CSP validation, and single-host network policy.

---

## 📜 Scientific & Public Health References

1. **Liljegren, J. C., et al. (2008)**: *Modeling the Wet Bulb Globe Temperature Using Standard Meteorological Measurements*. Journal of Occupational and Environmental Hygiene, 5:10, 645-655.
2. **ACGIH (2024)**: *Threshold Limit Values (TLVs) and Biological Exposure Indices (BEIs) for Heat Stress and Heat Strain*.
3. **NIOSH (2016)**: *Criteria for a Recommended Standard: Occupational Exposure to Heat and Hot Environments*. DHHS (NIOSH) Publication No. 2016-106.
4. **National Disaster Management Authority (NDMA)**: *National Guidelines for Preparation of Action Plan - Prevention and Management of Heat Wave*. Government of India.
5. **NDMA Advisory (July 2025)**: *Heat advisory regarding outdoor gig delivery workers, cooling breaks, and water provisions*.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
