# PropTrack — Project Guide for Claude Code

**PropTrack** is a private, production-ready SaaS platform for a short-term rental operator managing properties in UAE (Ajman Villa) and India (KRYSTAL VISTA Goa). It tracks income, expenses, recurring bills, and generates financial reports.

---

## Specification Documents

All implementation decisions are governed by these five documents (located in `c:\Users\Klein\Desktop\AIRBNB APP\`):

| Short Name | Full Title | Used In |
|------------|-----------|---------|
| PRD | PropTrack — Product Requirements Document v1.0 | All phases — feature specs, field definitions, business rules |
| APP FLOW | PropTrack — App Flow & Screen Specification v1.0 | Phase 2 — every screen layout, empty state, user journey |
| TECH STACK | PropTrack — Tech Stack & Dependency Specification v1.0 | Phase 1 — exact package versions, tsconfig, project structure |
| GUIDELINES | PropTrack — UI Content Guidelines & Design System v1.0 | Phase 2 — every Tailwind class, colour token, component spec |
| SCHEMA | PropTrack — Backend Schema & Database Design v1.0 | Phases 1 & 2 — all SQL, RLS policies, triggers, Edge Functions |

**Implementation plan:** `PropTrack_ImplementationPlan.txt` — 62 tasks, 3 phases, 9 milestones.

---

## 10 Build Rules (Must Follow Throughout)

1. Execute tasks in the exact order listed. Never skip ahead.
2. After completing each task, verify the app still builds (`npm run build` passes) before proceeding.
3. Use exact versions from TECH STACK for every npm install. **No `^` or `~` prefixes.**
4. Use exact Tailwind classes from GUIDELINES. No deviations.
5. All SQL must match SCHEMA exactly — column names, types, constraints, index names.
6. Every component must implement both light **and** dark mode class pairs (GUIDELINES §11).
7. Never hardcode hex colours. Always use the CSS custom property tokens from GUIDELINES §2.
8. Every form must use React Hook Form + Zod. **No exceptions.**
9. All server data fetching uses TanStack Query. **No `useState + useEffect` for data.**
10. **Soft-delete only** — never call `.delete()` on financial tables. Always set `deleted_at`.

---

## Tech Stack (Exact Versions)

| Layer | Library | Version |
|-------|---------|---------|
| Framework | Next.js (App Router) | 16.2.6 |
| Language | TypeScript | 6.0.3 |
| Runtime | Node.js | 24.x |
| Database & Auth | Supabase (PostgreSQL 15) | supabase-js 2.107.0 |
| Auth cookies | @supabase/ssr | 0.10.3 |
| Styling | Tailwind CSS v4 (CSS-first config) | 4.1.18 |
| Components | shadcn/ui (code generator, not npm) | — |
| Server state | TanStack Query | 5.101.0 |
| Client state | Zustand | 5.0.14 |
| Forms | React Hook Form | 7.77.0 |
| Validation | Zod (import from `'zod/v3'`) | 4.4.3 |
| Tables | TanStack Table (headless) | 8.21.3 |
| Charts | Recharts | 3.8.1 |
| Dates | date-fns | 4.4.0 |
| PDF | @react-pdf/renderer | 4.5.1 |
| Excel | ExcelJS (server-side only) | 4.4.0 |
| Icons | lucide-react | 0.525.0 |
| Font | DM Sans (sole typeface) | Google Fonts |

**Key deviations from spec package.json (version fixes applied):**
- `@radix-ui/react-switch`: `1.3.0` (spec said `1.1.11` — version did not exist on npm)
- Added `@tailwindcss/postcss: 4.3.0` (required by Tailwind v4, missing from spec)
- Added `@types/node: 25.9.2`, `@types/react: 19.2.17`, `@types/react-dom: 19.2.3` (required for TS, missing from spec)
- Install flag: `npm install --legacy-peer-deps` (eslint-plugin-react-hooks peer dep gap with ESLint 10)

---

## Folder Structure

```
proptrack/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── forgot-password/
│   │   └── set-password/
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← auth guard + shell
│   │   ├── page.tsx            ← /dashboard
│   │   ├── income/
│   │   ├── expenses/
│   │   │   └── recurring/
│   │   ├── reports/
│   │   │   ├── new/
│   │   │   └── history/
│   │   ├── properties/
│   │   │   └── [id]/rooms/
│   │   ├── users/
│   │   ├── settings/
│   │   │   ├── exchange-rates/
│   │   │   ├── categories/
│   │   │   ├── financial-year/
│   │   │   └── audit-logs/
│   │   └── notifications/
│   ├── api/
│   │   └── v1/
│   │       ├── upload/
│   │       └── reports/
│   ├── access-denied/
│   ├── not-found.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                ← redirects to /login
├── components/
│   ├── ui/                     ← shadcn generated components
│   ├── forms/
│   ├── charts/
│   ├── tables/
│   └── layout/
├── lib/
│   ├── supabase/
│   │   ├── client.ts           ← browser client (Realtime only)
│   │   ├── server.ts           ← server client (Server Components)
│   │   └── middleware.ts       ← session refresh
│   ├── currency/
│   │   └── convert.ts
│   └── reports/
│       ├── pdf.ts
│       ├── excel.ts
│       └── templates/
├── hooks/
│   ├── useUser.ts
│   ├── useRole.ts
│   └── usePropertyIds.ts
├── stores/
│   ├── usePropertyStore.ts
│   └── useUIStore.ts
├── types/
│   └── database.types.ts       ← supabase gen types output
├── supabase/
│   ├── migrations/             ← 0001–0018 *.sql files
│   └── functions/
│       ├── generate-recurring/
│       ├── fetch-exchange-rates/
│       ├── check-missing-income/
│       └── check-overdue-recurring/
├── middleware.ts               ← session + role-based route protection
├── .env.local                  ← NEVER commit to git
├── .nvmrc                      ← "24"
└── CLAUDE.md
```

---

## Colour Tokens (All 20 — GUIDELINES §2.2)

Define as CSS custom properties in `app/globals.css`. **Never use hex values directly in component code.**

| Token | Hex | Semantic Role |
|-------|-----|--------------|
| `--color-brand-navy` | `#1E3A5F` | Sidebar bg, page headers, emphasis text |
| `--color-brand-blue` | `#276EAC` | Buttons, links, active states, chart accent |
| `--color-brand-blue-lt` | `#EBF3FA` | Alternating table rows, tag backgrounds |
| `--color-brand-blue-md` | `#D0E7F7` | Hover states on brand-blue-lt surfaces |
| `--color-success` | `#146B3A` | Success text, green badges, positive KPI values |
| `--color-success-bg` | `#F0FDF4` | Success banners, confirmed badge background |
| `--color-warning` | `#B45A00` | Warning text, pending badges, overdue labels |
| `--color-warning-bg` | `#FFFBEB` | Warning banners, pending badge background |
| `--color-error` | `#9B1C1C` | Error text, delete buttons, negative values |
| `--color-error-bg` | `#FEF2F2` | Error banners, error badge background |
| `--color-info` | `#5B21B6` | Info badges, info banners |
| `--color-info-bg` | `#F5F3FF` | Info banner background |
| `--color-neutral-900` | `#111827` | Headings, table header text |
| `--color-neutral-700` | `#374151` | Body text, label text, sidebar items |
| `--color-neutral-500` | `#6B7280` | Placeholders, helper text, secondary labels |
| `--color-neutral-300` | `#D1D5DB` | Input borders, table dividers, card borders |
| `--color-neutral-100` | `#F3F4F6` | Page background, zebra rows, hover backgrounds |
| `--color-neutral-50` | `#F9FAFB` | Sidebar bg (light), input bg |
| `--color-white` | `#FFFFFF` | Card backgrounds, modal backgrounds |
| `--color-amber-accent` | `#F09300` | Cover page accent bar ONLY — never in app UI |

**Dark mode:** activated by `class="dark"` on `<html>`. All tokens above must have dark overrides per GUIDELINES §2.3.

---

## Critical Data Rules

### Monetary Values
- All monetary columns use `DECIMAL(12,2)` in PostgreSQL.
- All numeric/money table cells must use `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums`).
- Every record stores: `amount` (original), `currency` (original), `amount_aed` (converted), `exchange_rate_snapshot` (rate at time of entry).
- Multi-currency: AED (UAE) and INR (India).
- Indian number grouping for INR: `1,82,000` (not `182,000`).

### Soft-Delete Rule
**NEVER call `.delete()` on financial tables.** Financial tables are: `income_records`, `expense_records`, `recurring_expenses`.

Always soft-delete by setting:
```sql
deleted_at = NOW()
deleted_by = <user_id>
```

The `audit_logs` table has **no DELETE or UPDATE RLS policy** — it is append-only and immutable.

### Security Rules
- `SUPABASE_SERVICE_ROLE_KEY` must **never** appear in client-side code, browser bundles, or `.env.local` committed to git. Only in `app/api/v1/` route handlers and `supabase/functions/`.
- `EXCHANGE_RATE_API_KEY` lives in **Supabase Vault only** — not in Vercel environment variables.
- All Supabase Storage buckets must be **PRIVATE**. Never use public buckets.
- No raw PostgreSQL error messages in user-facing responses.
- Never commit `.env.local` to git.

### Zod Import
Always import Zod from the v3 subpath for React Hook Form compatibility:
```ts
import { z } from 'zod/v3';
```

### Type Regeneration
After every migration, regenerate types:
```bash
supabase gen types typescript --project-id rgdaiiglgrpcsidrcuzt > types/database.types.ts
```

---

## Supabase Project

- **URL:** `https://rgdaiiglgrpcsidrcuzt.supabase.co`
- **Project ref:** `rgdaiiglgrpcsidrcuzt`
- **Region:** eu-central-1

---

## Role System

| Role | Code | Access |
|------|------|--------|
| Super Admin (Owner) | `super_admin` | Full access. All properties. All settings. |
| Property Manager | `property_manager` | Assigned properties only. No settings/users/properties pages. |
| Read Only | `read_only` | View only. No add/edit/delete anywhere. |

Role isolation is enforced at the **database layer** via RLS using `get_my_property_ids()` — not just UI.
