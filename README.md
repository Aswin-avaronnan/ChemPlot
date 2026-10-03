# ChemPlot — Electrochem Studio

A full-stack scientific dashboard turning Bio-Logic potentiostat `.mpr` files into publication-ready plots and standard electrochemical analyses.

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.12+), SQLite (dev) / PostgreSQL (prod) |
| Frontend | Next.js 14+ App Router, TypeScript, Tailwind CSS, Plotly.js |
| Parsing | galvani (Bio-Logic binary reader), pandas, scipy |
| Auth | Clerk (JWKS JWT) with dev bypass |
| Storage | Local filesystem (dev) / Cloudflare R2 (prod) |

## Supported Techniques (v0)

- **CV** — Cyclic Voltammetry (multi-scan-rate overlay, specific/areal current toggle)
- **GCPL** — Galvanostatic Charge-Discharge (time or capacity x-axis, IR drop subtraction)
- **CYCLING** — Capacity retention / fade vs. cycle number with Coulombic Efficiency
- **PEIS / SPEIS** — Nyquist (1:1 aspect ratio) & Bode plots, Rs/Rct extraction

## Quick Start

### 1. Backend

```bash
cd backend
python run.py
# → http://127.0.0.1:8000/api/v1/docs
```

### 2. Frontend

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

## Sample Parameters (Active Mass & Area)

ChemPlot treats electrode mass and area as **first-class parameters** entered by the researcher, not silently sourced from the potentiostat file (which often omits them in real-world testing).

On upload or via the **Configure Parameters** button, researchers enter:
- Active material mass (mg or g) — enables F/g, A/g, mAh/g normalisation
- Electrode area (cm² or mm²) — enables mF/cm², mA/cm² normalisation
- Active material loading fraction (%) — for composite electrodes
- Reference electrode & electrolyte — displayed on all plots

## Analysis Conventions

Every formula explicitly displays which convention it used:

| Analysis | Convention Options |
|---|---|
| CV Capacitance | Full potential window / Exclude IR drop |
| GCD Capacitance | Nominal discharge window / Exclude onset IR drop |
| Coulombic Efficiency | Per-cycle discharge/charge capacity ratio |
| PEIS Rs | High-frequency real intercept (visual/manual) |

## Tests

```bash
python -m pytest backend/tests -v
```

12 tests: 4 analysis formulas, 4 parser fixtures (real .mpr files), 4 API E2E flows (CV, GCPL, PEIS, Overlay & error taxonomy).

## Project Structure

```
ChemPlot/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # FastAPI routes
│   │   ├── core/               # Config, DB, security, exceptions
│   │   ├── models/             # repository.py (SQLite/Postgres)
│   │   ├── schemas/            # Pydantic v2 models
│   │   └── services/           # parser, analysis, storage, export
│   └── tests/                  # pytest: parser, analysis, api
├── frontend/
│   └── src/
│       ├── app/                # Next.js pages
│       ├── components/         # ui/, charts/, analysis/, upload/, layout/
│       └── lib/                # api-client.ts, palette.ts, utils.ts
└── Fixtures/                   # Real Bio-Logic .mpr test files
```
