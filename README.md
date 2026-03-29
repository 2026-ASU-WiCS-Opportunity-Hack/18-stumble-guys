# CaseTrack — Nonprofit Client & Case Management Platform

**Team Stumble Guys** | ASU WiCS x Opportunity Hack 2026

| | |
|---|---|
| Live Application | https://18-stumble-guys.vercel.app |
| GitHub Repository | https://github.com/2026-ASU-WiCS-Opportunity-Hack/18-stumble-guys |
| DevPost Submission | https://wics-ohack-sp26-hackathon.devpost.com/ |
| Slack Channel | [#team-18-stumble-guys](https://opportunity-hack.slack.com/app_redirect?channel=team-18-stumble-guys) |
| Hackathon | 2026 Spring WiCS x Opportunity Hack |

---

## Team

| Name | Role |
|---|---|
| Siddhesh More | Full-Stack Lead — Auth, API routes, AI integrations, deployment |
| Saniya Nande | Frontend Dev — Client profiles, service log forms, dashboard |
| Shreeraj Bhamare | Backend Dev — Database schema, RLS policies, CSV import/export |

---

## Problem Statement

92% of nonprofits operate on budgets under $1M and rely on spreadsheets, paper forms, and disconnected Google Forms to manage client data. Enterprise solutions like Bonterra cost $50–150 per user per month — pricing that excludes the organizations that need them most.

CaseTrack is a free, open-source client and case management platform built specifically for nonprofits. It handles client registration, visit logging, scheduling, audit trails, and funder reporting — with seven AI-powered features that automate the most time-consuming parts of casework.

This problem was submitted by 9+ OHack nonprofits across 7 hackathons (2016–2024):

| Nonprofit | Problem |
|---|---|
| NMTSA | Schedule music therapy sessions, track treatment progress, log therapist notes |
| Chandler CARE Center | Client intake for crisis services, demographics tracking, visit history |
| Will2Walk | Track rehabilitation progress for spinal cord injury patients over time |
| ICM Food & Clothing Bank | Track client visits, services provided, family demographics for grant reporting |
| Sunshine Acres | Track children in care, health records, placement history |
| Lost Our Home Pet Rescue | Manage animal intake, foster tracking, adopter records |
| Tranquility Trail | Animal sanctuary intake, medical records, donor/volunteer management |
| Seed Spot | Track alumni entrepreneurs, communications, program engagement metrics |

---

## Prize Track Coverage

| Prize | Requirement | Our Implementation |
|---|---|---|
| Founding Engineer ($500 + monitor) | All P0 + P1, deployed, seeded, README | All 5 P0 + all 5 P1 + all 7 AI features, live on Vercel with demo data |
| Best AI Usage (Echo Dot/member) | AI is core, team explains why, live demo with real data | 7 live AI features each solving a documented nonprofit pain point from the SRD |
| Best Security (keyboard/member) | Secrets in .env, Supabase Auth, input validated, threat model | RLS on every table, Zod on every route, SHA-256 PII audit hashing, rate limiting |
| Best Accessibility (Stanley Cup/member) | WCAG-aware, assistive tech, answers bandwidth and language questions | ElevenLabs TTS as native assistive feature, full ARIA, keyboard nav, multilingual in 99 languages |
| Best ElevenLabs ($1,980 cash + 6mo Scale/member) | ElevenLabs essential — not cosmetic | Voice case notes (STT) + read-aloud summaries (TTS) + multilingual intake — one integration, three prize angles |

---

## Features

### P0 — Must Have (All Shipped)

| Feature | Acceptance Criteria Met |
|---|---|
| Auth + Role-Based Access | Google SSO and email login. Admin (full CRUD) and Staff (create/read) roles. Unauthorized users are redirected to `/login` and cannot access any data. |
| Client Registration | Name, DOB, contact info, 3–5 configurable demographic fields, auto-generated unique client ID (CLT-2026-XXXX). List view with search by name. |
| Service / Visit Logging | Date, configurable service type dropdown, staff member, free-text notes. Voice dictation supported. |
| Client Profile View | Single-page view with demographics header and full chronological service history. Functions as a lightweight EHR chart view. |
| Deploy + Seed Data | Live at https://18-stumble-guys.vercel.app with 10+ demo clients and 30+ service entries pre-seeded for immediate judge evaluation. |

### P1 — Good to Have (All Shipped)

| Feature | Acceptance Criteria Met |
|---|---|
| CSV Import / Export | Admin uploads a CSV of existing clients and the system creates records automatically. Full data and service log export. Critical for nonprofits migrating from spreadsheets. |
| Reporting Dashboard | Total active clients, services by week/month/quarter, service type breakdown (bar chart), visit trend line, language distribution, risk level distribution. Exportable to PDF. |
| Scheduling / Calendar | Month/week/day calendar views. Staff schedule future appointments. Push notification reminders fire 90 minutes before each appointment. |
| Configurable Fields | Admin adds or removes custom demographic and service-log fields without code changes. Stored as JSON schema. NMTSA can add "instrument played"; a food bank can add "household size." |
| Audit Log | Every create/update/delete action is logged with timestamp, actor, and action type. Raw PII is never stored — only SHA-256 hashes of before/after states. Admin-only viewer with date and action filters. |

### P2-AI — AI Features (All 7 Shipped)

| Feature | Technology | Pain Point Solved |
|---|---|---|
| Voice-to-Structured Case Notes | ElevenLabs Scribe v1 (STT) + Gemini 2.5 Flash | Staff spend ~45 min/day writing notes post-session. Voice dictation converts speech to structured JSON: summary, action items, mood flags, risk level, follow-up date. |
| Photo-to-Intake | Gemini 2.5 Flash Vision | Paper intake forms are the top source of data entry errors. Camera upload extracts fields and pre-populates a new client record automatically. |
| Auto-Generated Funder Reports | Gemini 2.5 Flash | Grant reports take 4–8 hours per quarter. Quarterly, annual, demographic, and services templates generate in seconds from live data. Exportable to Word and PDF. |
| Semantic Search | pgvector + Gemini text-embedding-004 | Staff cannot find past notes by keyword. Natural language queries ("clients who mentioned housing instability") search 768-dimensional embeddings across all service entries. |
| AI Client Handoff Summary | Gemini 2.5 Flash | Staff turnover causes case continuity gaps. One click generates a structured handoff brief from the full case history. Cached with staleness detection and a prominent regenerate button. |
| Smart Follow-Up Detection | Gemini 2.5 Flash | Action items buried in free-text notes are routinely missed. AI scans new case notes and extracts follow-up tasks with urgency levels (low / medium / high / critical), linked directly to the client record. |
| Multilingual Communication | ElevenLabs Multilingual v2 (TTS) + Gemini translate | 35% of nonprofit clients are non-English speakers. Any page content can be read aloud in the client's preferred language. Intake, notes, and summaries are translatable to 99 languages. |

### P2 — Non-AI Features (All Shipped)

| Feature | Description |
|---|---|
| Multi-Tenant Architecture | Single deployment serves multiple organizations with full data isolation via `org_id` scoping and Supabase RLS. Each org has its own configurable fields and service types. |
| Document Uploads | Staff attach files (intake forms, signed waivers, photos) to client profiles. Stored in Supabase Storage with visibility controls — staff see all, clients see only what is marked visible. |
| Progressive Web App | Installable on Android and iOS home screens. Works offline via service worker cache. Push notification reminders for appointments. Two-step install and notification opt-in banner shown to all users including clients. |
| Client Self-Service Portal | Clients log in to view their own records and documents. Role-gated — clients are redirected to `/portal` and never see other clients' data. |

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript | Server Components, built-in API routes, single repo |
| UI | shadcn/ui + Tailwind CSS v4 | WCAG-accessible by default, no external design tools required |
| Database | Supabase PostgreSQL + pgvector | Built-in RLS, free tier, pgvector extension for semantic search |
| Auth | Supabase Auth (Google SSO + email magic link) | Zero-config Google SSO; RLS wires directly to `auth.uid()` |
| File Storage | Supabase Storage | Documents, photos, intake scans — S3-compatible API |
| Voice STT | ElevenLabs Scribe v1 | 99 languages, higher accuracy than Whisper for multilingual nonprofit intake |
| Voice TTS | ElevenLabs Multilingual v2 | Clinical-quality read-aloud for accessibility and non-English speakers |
| AI / Vision | Gemini 2.5 Flash (3-key rotation) | Free at 3M tokens/day total, built-in vision, 1M token context window |
| Embeddings | Gemini text-embedding-004 (3-key rotation) | Free, 768-dimensional vectors, pgvector cosine search compatible |
| Input Validation | Zod | Every API route — unexpected fields stripped, type coercion disabled |
| CSV | Papa Parse | Lightweight CSV parsing for nonprofit spreadsheet migration |
| PDF | @react-pdf/renderer | Funder report and dashboard PDF export |
| Charts | Recharts | Reporting dashboard visualizations |
| Deploy | Vercel | One-click deploy from GitHub, automatic HTTPS, free tier |
| Push Notifications | Web Push API + VAPID | Background appointment reminders, works when app is closed |

**Estimated monthly cost at 50 active clients: $0–36 AI + $0 hosting** (vs. Bonterra at $50–150/user/month)

---

## Security

This project targets the Best Security rubric (5/5):

| Control | Implementation |
|---|---|
| Secrets management | All API keys in `.env.local`, gitignored via `.env*` rule. `.env.local.example` committed with blank placeholder values only. No secrets in source code. |
| Authentication | Supabase Auth — Google SSO and email magic link. JWT sessions. Unauthorized users are blocked at the middleware and layout level. |
| Authorization | Row-Level Security (RLS) enabled on every table. `org_id` isolation enforced at the database layer, not just the application layer. Admin-only and staff-only policies are separate. |
| Input validation | Zod schemas validate every API route request. Unexpected fields are stripped. `safeParse` is used — validation errors never throw unhandled exceptions. |
| PII protection | Audit log never stores raw PII. Before/after record states are stored only as SHA-256 hashes. A PII detection utility masks tokens before any data reaches external AI APIs. |
| Rate limiting | IP-based rate limiter on auth and AI routes to prevent abuse. |

---

## Accessibility

This project targets the Best Accessibility rubric:

| Feature | Detail |
|---|---|
| ElevenLabs TTS — native assistive feature | Every case note, summary, and profile section has a read-aloud button powered by ElevenLabs Multilingual v2. Audio is cached after the first load — subsequent play/pause/rewind do not consume additional API credits. Inline mini-player with play, pause, rewind, and seek controls. |
| ARIA live regions | Dynamic status updates (loading, error, success) are announced to screen readers via `role="status"` live regions on every async action. |
| Skip navigation | Skip-to-main-content link present on every page for keyboard and screen reader users. |
| Keyboard navigation | All interactive elements are fully keyboard-accessible with visible focus rings. No mouse-only interactions. |
| Reduce motion | `useReduceMotion` hook respects the `prefers-reduced-motion` OS setting. All animations are disabled for users who have enabled this preference. |
| Multilingual | UI content is translatable to 99 languages via Gemini. Content is read aloud in the client's preferred language via ElevenLabs. Staff can communicate with any client without an interpreter. |
| Mobile-first | Fully responsive layout for field workers using phones at food banks, shelters, and community centers. Installable as a PWA. |

---

## ElevenLabs Integration

ElevenLabs is embedded into the core casework workflow — not added as a demonstration feature:

**Voice-to-Structured Case Notes (Scribe v1)**

Staff speak their session notes aloud after a client visit. ElevenLabs Scribe v1 transcribes the recording across 99 languages, then Gemini 2.5 Flash structures the transcript into a validated JSON object containing a summary, action items, mood flags, risk level (low/medium/high/critical), and a suggested follow-up date. This eliminates an estimated 45 minutes of daily documentation per caseworker — the most frequently cited pain point across all eight nonprofits in the SRD.

**Read-Aloud Summaries (Multilingual v2)**

Every case note, AI-generated handoff summary, and client profile section has a speaker icon. Clicking it calls ElevenLabs Multilingual v2 and streams the content back in audio. The audio element and blob URL are cached locally after the first call. Pressing play, pause, rewind, or seeking the progress bar does not trigger additional ElevenLabs API calls or consume credits.

**Multilingual Client Communication (Multilingual v2)**

Nonprofit clients speak Spanish, Somali, Vietnamese, and dozens of other languages. ElevenLabs Multilingual v2 reads any page content aloud in the client's preferred language. Combined with Gemini-powered translation cached in the `translations` table, staff can conduct intake and communicate follow-up instructions in any language without an interpreter.

---

## Running Locally

### Prerequisites

- Node.js 18+
- A Supabase project (free tier at supabase.com)
- Gemini API keys (Google AI Studio — free)
- ElevenLabs API key

### Setup

```bash
git clone https://github.com/2026-ASU-WiCS-Opportunity-Hack/18-stumble-guys.git
cd 18-stumble-guys
npm install
cp .env.local.example .env.local
# Fill in your credentials in .env.local
npm run dev
```

Open http://localhost:3000.

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY_1=
GEMINI_API_KEY_2=
GEMINI_API_KEY_3=
ELEVENLABS_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
```

Generate VAPID keys with: `npx web-push generate-vapid-keys`

### Database Migrations

Run each file in order from the Supabase dashboard SQL editor:

```
supabase/migrations/001_schema.sql
supabase/migrations/002_rls.sql
supabase/migrations/003_pgvector.sql
supabase/migrations/004_rbac_enhancements.sql
supabase/migrations/005_audit_log_retention.sql
supabase/migrations/006_push_subscriptions.sql
supabase/migrations/007_client_documents.sql
supabase/migrations/008_client_handoff_summaries.sql
```

Then seed demo data by running `supabase/seed.sql` in the SQL editor.

---

## SRD Requirements Coverage

| Priority | Feature | Status |
|---|---|---|
| P0 | Auth + Role-Based Access | Shipped |
| P0 | Client Registration | Shipped |
| P0 | Service / Visit Logging | Shipped |
| P0 | Client Profile View | Shipped |
| P0 | Deploy + Seed Data | Shipped |
| P1 | CSV Import / Export | Shipped |
| P1 | Basic Reporting Dashboard | Shipped |
| P1 | Scheduling / Calendar | Shipped |
| P1 | Configurable Fields | Shipped |
| P1 | Audit Log | Shipped |
| P2-AI | Voice-to-Structured Case Notes | Shipped |
| P2-AI | Photo-to-Intake | Shipped |
| P2-AI | Auto-Generated Funder Reports | Shipped |
| P2-AI | Semantic Search | Shipped |
| P2-AI | AI Client Handoff Summary | Shipped |
| P2-AI | Smart Follow-Up Detection | Shipped |
| P2-AI | Multilingual Communication | Shipped |
| P2 | Multi-Tenant Architecture | Shipped |
| P2 | Document Uploads | Shipped |
| P2 | Mobile-Responsive / PWA | Shipped |
| P2 | Client Self-Service Portal | Shipped |

---

## License

MIT License. See [LICENSE](LICENSE).
