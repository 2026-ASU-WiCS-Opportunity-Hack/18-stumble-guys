# CaseTrack - Nonprofit Client & Case Management Platform

|**Team Stumble Guys**| ASU WiCS x Opportunity Hack 2026 |
| ------------------ |  ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live Application   | [18-stumble-guys.vercel.app](https://18-stumble-guys.vercel.app)                                                                                              |
| GitHub Repository  | [2026-ASU-WiCS-Opportunity-Hack/18-stumble-guys](https://github.com/2026-ASU-WiCS-Opportunity-Hack/18-stumble-guys)                                           |
| Demo Video         | [![YouTube](https://img.shields.io/badge/YouTube-Demo_Video-red?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=cPbH9p1UsDA) |
| DevPost Submission | [wics-ohack-sp26-hackathon.devpost.com](https://wics-ohack-sp26-hackathon.devpost.com/)                                                                       |
| Slack Channel      | [#team-18-stumble-guys](https://opportunity-hack.slack.com/app_redirect?channel=team-18-stumble-guys)                                                         |
| Hackathon          | [2026 Spring WiCS x Opportunity Hack](https://www.ohack.dev/)   

## High-Level Architecture

```
+-------------------------------------------------------------------------+
|                          CLIENTS (BROWSERS)                             |
|   [ Staff Portal ]    [ Admin Portal ]    [ Client Portal ]    [ PWA ] |
+-------------|-----------------|-----------------|----------------------+
              |                 |                 |
              v                 v                 v
+-------------------------------------------------------------------------+
|                        VERCEL (Next.js 16)                              |
|                                                                         |
|  +-------------------------------------------------------------------+ |
|  |                  MIDDLEWARE (proxy.ts)                              | |
|  |          Auth Guard  -  Route Protection  -  Role Check            | |
|  +-------------------------------------------------------------------+ |
|                                                                         |
|  +-------------------------------------------------------------------+ |
|  |                FRONTEND (Next JS + App Router)                    | |
|  |                                                                     | |
|  |  [Dashboard]  [Clients]  [Reports]  [Admin]  [Appointments]       | |
|  |  [Portal]     [Shared: shadcn/ui, Recharts, Voice, A11y, i18n]    | |
|  +-------------------------------------------------------------------+ |
|                                                                         |
|  +-------------------------------------------------------------------+ |
|  |                    API LAYER (39 Routes)                            | |
|  |                                                                     | |
|  |  [Clients CRUD]  [Auth]  [Appointments]  [Reports]  [Admin]       | |
|  |  [Service Entries]  [Follow-ups]  [Push]  [Import/Export]  [Audit] | |
|  |                                                                     | |
|  |  +---------- AI ROUTES (7 Endpoints) ---------------------------+ | |
|  |  | Voice->Notes | Photo->Intake | Follow-Ups | Handoff Summary  | | |
|  |  | Funder Report | Semantic Search | TTS | Translation          | | |
|  |  +--------------------------------------------------------------+ | |
|  +-------------------------------------------------------------------+ |
|                                                                         |
|  +-------------------------------------------------------------------+ |
|  |                  SECURITY & UTILITY LAYER                          | |
|  |  PII Masking  -  Zod Validation  -  Rate Limiter (10/min)         | |
|  |  Audit Logger (SHA-256)  -  AI Prompt Cache  -  Translation Cache  | |
|  +-------------------------------------------------------------------+ |
+--------|----------------------|------------------------|-----------------+
         |                      |                        |
         v                      v                        v
+------------------+   +------------------+   +--------------------------+
|    SUPABASE      |   |  GOOGLE GEMINI   |   |      ELEVENLABS          |
|                  |   |  2.5 Flash       |   |                          |
| - PostgreSQL     |   |                  |   | - Scribe v1 (STT)       |
|   (13 Tables)    |   | - Case Note      |   |   99 languages           |
| - RLS on all     |   |   Structuring    |   |   Voice -> Text          |
| - pgvector       |   | - Photo->Intake  |   |                          |
|   (768 dims)     |   | - Handoff Summary|   | - Multilingual v2 (TTS)  |
|                  |   | - Funder Reports |   |   99 languages           |
| - Auth           |   | - Follow-Up Det. |   |   Text -> Speech         |
|   (Google SSO +  |   | - Translation    |   |                          |
|    Magic Link)   |   |                  |   |                          |
|                  |   | - text-embedding |   |                          |
| - Storage        |   |   -004 (768d)    |   |                          |
|   (Documents)    |   |   Semantic Search|   |                          |
|                  |   | - 3-key rotation |   |                          |
+------------------+   +------------------+   +--------------------------+
```

---

## LLM Services

| Service       | Model              | Purpose                                                              | Capacity                                 |
| ------------- | ------------------ | -------------------------------------------------------------------- | ---------------------------------------- |
| Google Gemini | 2.5 Flash          | Case note structuring, summaries, reports, photo intake, translation | 3-key rotation: 45 RPM / 3M TPM combined |
| Google Gemini | text-embedding-004 | Semantic search embeddings (768 dims)                                | Same 3-key rotation pool                 |
| ElevenLabs    | Scribe v1          | Speech-to-text (99 languages)                                        | Free tier: 1M tokens/month               |
| ElevenLabs    | Multilingual v2    | Text-to-speech (99 languages)                                        | Free tier: 1M tokens/month               |

### DevOps

| Technology | Purpose                                     |
| ---------- | ------------------------------------------- |
| Vercel     | Hosting, HTTPS, auto-deploy from GitHub     |
| GitHub     | Source control                              |
| VAPID Keys | Web Push Protocol for appointment reminders |

---

## Frontend Architecture

### Route Structure

```
app/
|-- (auth)/login/                        # Public - Google SSO + magic link
|
|-- (dashboard)/                         # Protected - requires auth
|   |-- layout.tsx                       # Sidebar nav, breadcrumbs
|   |-- dashboard/page.tsx               # KPIs, semantic search, recent entries
|   |
|   |-- clients/
|   |   |-- page.tsx                     # Client list with search
|   |   |-- new/page.tsx                 # Create client form
|   |   |-- [id]/page.tsx                # Client profile + service history
|   |   |-- [id]/service/new/page.tsx    # Log visit (voice, photo, manual)
|   |
|   |-- appointments/
|   |   |-- page.tsx                     # Calendar (month/week/day)
|   |   |-- new/page.tsx                 # Schedule appointment
|   |
|   |-- reports/page.tsx                 # Analytics dashboard with charts
|   |
|   |-- admin/
|       |-- staff/page.tsx               # Manage team (invite, roles)
|       |-- settings/page.tsx            # Org config (fields, service types)
|       |-- audit-log/page.tsx           # Compliance trail (SHA-256)
|       |-- import/page.tsx              # CSV bulk import
|       |-- prompts/page.tsx             # Customize AI prompts per org
|
|-- (portal)/portal/                     # Client self-service (role-gated)
```

---

## API Layer

### 39 Endpoints Across 13 Route Groups

#### Authentication (2 endpoints)

| Method | Endpoint              | Description                    |
| ------ | --------------------- | ------------------------------ |
| POST   | `/api/auth/setup`   | First-time user org assignment |
| POST   | `/api/auth/signout` | Logout and clear session       |

#### Clients (6 endpoints)

| Method | Endpoint                     | Description                           |
| ------ | ---------------------------- | ------------------------------------- |
| GET    | `/api/clients`             | List clients with search              |
| POST   | `/api/clients`             | Create new client (Zod validated)     |
| GET    | `/api/clients/[id]`        | Single client detail                  |
| PATCH  | `/api/clients/[id]`        | Update client                         |
| POST   | `/api/clients/[id]/invite` | Invite client to self-service portal  |
| GET    | `/api/clients/fields`      | Fetch org's custom demographic fields |

#### Client Documents (3 endpoints)

| Method | Endpoint                                | Description                     |
| ------ | --------------------------------------- | ------------------------------- |
| POST   | `/api/clients/[id]/documents`         | Upload file to Supabase Storage |
| GET    | `/api/clients/[id]/documents`         | List client's documents         |
| DELETE | `/api/clients/[id]/documents/[docId]` | Remove document                 |

#### Service Entries (1 endpoint)

| Method | Endpoint                 | Description                                       |
| ------ | ------------------------ | ------------------------------------------------- |
| POST   | `/api/service-entries` | Create visit log + auto-embed for semantic search |

#### Appointments (3 endpoints)

| Method | Endpoint                   | Description                    |
| ------ | -------------------------- | ------------------------------ |
| GET    | `/api/appointments`      | List with client/staff details |
| POST   | `/api/appointments`      | Create appointment             |
| PATCH  | `/api/appointments/[id]` | Update/reschedule appointment  |

#### Follow-Ups (1 endpoint)

| Method | Endpoint                 | Description            |
| ------ | ------------------------ | ---------------------- |
| PATCH  | `/api/follow-ups/[id]` | Mark as done/dismissed |

#### AI Routes (9 endpoints)

| Method | Endpoint                     | AI Service                   | Description                              |
| ------ | ---------------------------- | ---------------------------- | ---------------------------------------- |
| POST   | `/api/ai/voice-to-notes`   | ElevenLabs Scribe + Gemini   | Audio -> transcript -> structured JSON   |
| POST   | `/api/ai/photo-to-intake`  | Gemini Vision                | Photo -> extracted client fields         |
| POST   | `/api/ai/follow-ups`       | Gemini                       | Notes -> action items with urgency       |
| GET    | `/api/ai/client-summary`   | Gemini                       | Cached 6-section handoff summary         |
| POST   | `/api/ai/funder-report`    | Gemini                       | Grant narrative generation (5 templates) |
| GET    | `/api/ai/search`           | Gemini Embeddings + pgvector | Semantic search over case notes          |
| POST   | `/api/ai/tts`              | ElevenLabs Multilingual v2   | Text -> audio/mpeg stream                |
| GET    | `/api/ai/translate`        | Gemini                       | Text translation (99 languages)          |
| GET    | `/api/ai/translate/cached` | DB lookup                    | Fetch cached translation only            |

#### Admin (7 endpoints)

| Method | Endpoint                  | Description                               |
| ------ | ------------------------- | ----------------------------------------- |
| GET    | `/api/admin/settings`   | Fetch org config                          |
| PATCH  | `/api/admin/settings`   | Update org config (fields, service types) |
| POST   | `/api/admin/prompts`    | Save custom AI prompt template            |
| GET    | `/api/admin/staff`      | List org staff                            |
| POST   | `/api/admin/staff`      | Invite new staff member                   |
| PATCH  | `/api/admin/staff/[id]` | Update staff role                         |
| DELETE | `/api/admin/staff/[id]` | Remove staff from org                     |

#### Reporting (6 endpoints)

| Method | Endpoint                          | Description                           |
| ------ | --------------------------------- | ------------------------------------- |
| GET    | `/api/reports/service-stats`    | Service type breakdown                |
| GET    | `/api/reports/month-stats`      | Services by month (trend line)        |
| GET    | `/api/reports/engagement-stats` | Total/active clients, sessions count  |
| GET    | `/api/reports/language-stats`   | Language distribution                 |
| GET    | `/api/reports/risk-stats`       | Risk level distribution from AI notes |
| GET    | `/api/reports/followup-stats`   | Pending/done follow-ups by urgency    |

#### Push Notifications (3 endpoints)

| Method | Endpoint                | Description                               |
| ------ | ----------------------- | ----------------------------------------- |
| POST   | `/api/push/subscribe` | Register browser for push (VAPID)         |
| DELETE | `/api/push/subscribe` | Unregister push endpoint                  |
| GET    | `/api/push/reminders` | Fire reminders 90 min before appointments |

#### Import/Export (2 endpoints)

| Method | Endpoint        | Description                                 |
| ------ | --------------- | ------------------------------------------- |
| POST   | `/api/import` | Admin CSV upload (Papa Parse, max 500 rows) |
| GET    | `/api/export` | Export all clients to CSV                   |

#### Audit & Portal (2 endpoints)

| Method | Endpoint                     | Description                   |
| ------ | ---------------------------- | ----------------------------- |
| POST   | `/api/audit/page-visit`    | Track page navigation         |
| GET    | `/api/portal/appointments` | Client views own appointments |

---

## Database Architecture

#### Tier 1 -- Core Entities

| Table                        | Key Columns                                                                                                                                                                                                                   | Notes                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **organizations** 🛡️ | `id` PK, `name`, `slug`, `config` JSONB, `service_types` text[], `ai_budget_cents`                                                                                                                                | Multi-tenant root. Config holds custom demographic fields as JSON schema |
| **users** 🛡️         | `id` PK (= auth.uid), `org_id` FK, `email`, `full_name`, `role` (admin/staff/client)                                                                                                                                | Linked to Supabase Auth. Role determines RBAC permissions                |
| **clients** 🛡️       | `id` PK, `org_id` FK, `client_number` (CLT-2026-XXXX), `first_name`, `last_name`, `date_of_birth`, `phone`, `email`, `demographics` JSONB, `language_preference`, `is_active`, `created_by` FK→users | Auto-generated client number. Demographics are org-configurable          |

**Relationships:** organizations 1→many users, organizations 1→many clients, users 1→many clients (created_by)

#### Tier 2 -- Activity Entities

| Table                          | Key Columns                                                                                                                                                                                                            | Notes                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **service_entries** 🛡️ | `id` PK, `client_id` FK, `staff_id` FK, `org_id` FK, `service_type`, `date`, `notes`, `ai_structured_notes` JSONB (summary, action_items[], follow_ups[], risk_level, mood_flags[]), `voice_consent` | Core visit logging. AI structuring via Gemini |
| **appointments** 🛡️    | `id` PK, `client_id` FK, `staff_id` FK, `org_id` FK, `scheduled_at`, `service_type`, `status` (scheduled/completed/cancelled/no_show), `notes`, `reminder_sent`                                      | Push reminders fire 90 min before             |
| **follow_ups** 🛡️      | `id` PK, `client_id` FK, `service_entry_id` FK, `org_id` FK, `description`, `due_date`, `urgency` (low/medium/high/critical), `category`, `status` (pending/done/dismissed)                          | AI-detected or human-created action items     |
| **documents** 🛡️       | `id` PK, `client_id` FK, `org_id` FK, `uploaded_by` FK, `file_name`, `storage_path`, `mime_type`, `file_size_bytes`                                                                                    | Files stored in Supabase Storage (S3)         |

**Relationships:** clients 1→many service_entries, clients 1→many appointments, clients 1→many follow_ups, clients 1→many documents, users 1→many service_entries (staff_id), service_entries 1→many follow_ups

#### Tier 3 -- AI/ML Entities

| Table                                            | Key Columns                                                                                                                                                                                              | Notes                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **case_note_embeddings** 🛡️ `pgvector` | `id` PK, `service_entry_id` FK, `org_id` FK, `embedding` vector(768), `content_hash`                                                                                                           | IVFFlat cosine index for semantic search        |
| **client_handoff_summaries** 🛡️          | `id` PK, `client_id` FK, `org_id` FK, `summary_text` (Markdown), `generated_at`                                                                                                                | Cached AI summaries with staleness detection    |
| **ai_prompts** 🛡️                        | `id` PK, `org_id` FK, `action`, `prompt_template`, `version`, `is_active`                                                                                                                    | Per-org customizable AI system prompts          |
| **translations** ⚠️ NO RLS               | `id` PK, `original_text`, `language`, `translated_text`                                                                                                                                          | Global cache shared across all orgs             |
| **audit_logs** 🛡️ (admin-only)           | `id` PK, `org_id` FK, `actor_id` FK, `action`, `table_name`, `record_id`, `before_hash` SHA-256, `after_hash` SHA-256, `ip_address`, `actor_role`, `page_path`, `metadata` JSONB | HIPAA-adjacent compliance. Never stores raw PII |
| **push_subscriptions** 🛡️                | `id` PK, `user_id` FK, `org_id` FK, `endpoint`, `p256dh`, `auth`                                                                                                                             | Web Push Protocol (VAPID) endpoints             |

**Relationships:** service_entries 1→1 case_note_embeddings, clients 1→1 client_handoff_summaries, organizations 1→many ai_prompts, organizations 1→many audit_logs, users 1→many push_subscriptions

---

### Feature 1: Voice-to-Structured Case Notes

```
Flow:
  Microphone -> MediaRecorder API -> Audio Blob
    -> POST /api/ai/voice-to-notes
      -> ElevenLabs Scribe v1 (STT, 99 languages)
        -> Raw Transcript
          -> PII Masker (SSN/phone/email -> tokens)
            -> Gemini 2.5 Flash (structuring prompt)
              -> JSON Output:
                 {
                   summary: string,
                   action_items: string[],
                   follow_ups: { task, due_date, urgency }[],
                   risk_level: "low" | "medium" | "high" | "critical",
                   mood_flags: string[]
                 }
              -> Audit Log (token count, no PII stored)

Problem Solved: Caseworkers spend 45 min/day writing notes post-session
```

### Feature 2: Photo-to-Intake

```
Flow:
  Camera/File -> Base64 encoding
    -> POST /api/ai/photo-to-intake
      -> Gemini 2.5 Flash Vision
        -> Extracted Fields:
           { first_name, last_name, date_of_birth, phone, email, demographics }
        -> Prefill client creation form in UI

Problem Solved: Paper intake forms are #1 source of data entry errors
```

### Feature 3: Smart Follow-Up Detection

```
Flow:
  Service Entry Notes -> POST /api/ai/follow-ups
    -> PII Masker -> Gemini 2.5 Flash
      -> Extracted Action Items:
         [{ description, due_date, urgency, category }]
      -> Dry-run preview in UI -> User confirms
        -> INSERT into follow_ups table
          -> Push notification for critical/high urgency items

Problem Solved: Action items buried in free-text notes are routinely missed
```

### Feature 4: Client Handoff Summary

```
Flow:
  GET /api/ai/client-summary?client_id=UUID[&force=true]
    -> Fetch client record + ALL service entries
      -> PII Masker -> Gemini 2.5 Flash
        -> 6-Section Markdown Output:
           1. Background & Demographics
           2. Services History
           3. Current Status
           4. Active Needs & Referrals
           5. Risk Factors
           6. Recommended Next Steps
        -> Cache in client_handoff_summaries table
          -> Staleness detection (new entries = stale)
            -> "Regenerate" button when stale

Problem Solved: Staff turnover causes critical case continuity gaps
```

### Feature 5: Auto-Generated Funder Reports

```
Flow:
  POST /api/ai/funder-report { template, date_range }
    -> Aggregate from database:
       - Service counts by type
       - Language breakdown
       - Anonymized case note snippets
    -> PII Masker -> Gemini 2.5 Flash (template-aware prompt)
      -> Markdown Report with data tables
        -> Export options:
           - PDF (jspdf)
           - Word (.docx)

Templates: Quarterly | Annual | Demographics | Services | Custom

Problem Solved: Grant reports take 4-8 hours per quarter to compile
```

### Feature 6: Semantic Search over Case Notes

```
Flow:
  User types natural language query
    -> GET /api/ai/search?q=TEXT
      -> Gemini text-embedding-004 (768 dims)
        -> pgvector match_case_notes RPC
          -> Cosine similarity (IVFFlat index)
            -> Top 10 results:
               { service_entry_id, client_name, date,
                 service_type, notes, similarity_score }

  Indexing (background, on service entry creation):
    New service entry -> Fire-and-forget embedding job
      -> Gemini text-embedding-004 -> Store in case_note_embeddings

Problem Solved: Staff cannot find relevant past notes by keyword search alone
```

### Feature 7: Multilingual Communication

```
Flow (Text-to-Speech):
  Any text content -> POST /api/ai/tts { text, voice }
    -> PII Masker -> ElevenLabs Multilingual v2
      -> audio/mpeg stream -> Cached locally (play/pause/seek)

Flow (Translation):
  Text -> GET /api/ai/translate?text=X&language=Y
    -> Check translations table (cache hit?)
      -> Yes: Return cached translation
      -> No: Gemini 2.5 Flash -> Translate -> Cache in DB -> Return

  - Read-aloud button on every case note, summary, profile section
  - Translations cached globally (shared across all orgs)
  - 99 languages supported

Problem Solved: 35% of nonprofit clients are non-English speakers
```

---

## Security Architecture

### Defense-in-Depth Layers

```
Layer 1: TRANSPORT
  +-- HTTPS enforced (Vercel)
  +-- HSTS header
  +-- Strict CSP (connect-src: self, Supabase, Gemini, ElevenLabs only)

Layer 2: AUTHENTICATION
  +-- Supabase Auth (JWT sessions)
  +-- Google SSO + Magic Link email
  +-- Middleware (proxy.ts) protects all /dashboard, /api/* routes

Layer 3: AUTHORIZATION
  +-- Role-Based Access Control (admin / staff / client)
  +-- Middleware enforces role before page render
  +-- API routes check role before data access

Layer 4: INPUT VALIDATION
  +-- Zod schemas on EVERY API route
  +-- Type coercion disabled
  +-- Unexpected fields stripped (safeParse)

Layer 5: RATE LIMITING
  +-- 10 AI requests per user per 60 seconds
  +-- In-memory tracker with auto-cleanup every 5 min

Layer 6: DATA ISOLATION
  +-- Row-Level Security (RLS) on ALL 13 tables
  +-- org_id-based multi-tenant isolation at DB layer
  +-- get_my_org_id() and get_my_role() SECURITY DEFINER functions

Layer 7: PII PROTECTION
  +-- PII Masker: SSN, phone, email -> reversible tokens
  +-- Tokens sent to external AI APIs (never raw PII)
  +-- Masker.unmask() restores in API response

Layer 8: AUDIT TRAIL
  +-- Every create/update/delete logged
  +-- SHA-256 hashes of before/after state (never raw PII)
  +-- Actor, role, IP, page path, metadata, timestamp
  +-- Admin-only access to audit logs

Layer 9: HTTP SECURITY HEADERS
  +-- Content-Security-Policy (strict)
  +-- X-Frame-Options: DENY (anti-clickjacking)
  +-- X-Content-Type-Options: nosniff
  +-- Referrer-Policy: strict-origin-when-cross-origin
  +-- Permissions-Policy (camera/mic/geo restricted)
```

### Secrets Management

```
- All API keys stored in .env.local (gitignored)
- .env.local.example committed with blank values
- No secrets in source code
- 3 Gemini API keys for automatic round-robin failover
- Environment variables:
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
    GEMINI_API_KEY_1, _2, _3
    ELEVENLABS_API_KEY
    NEXT_PUBLIC_SITE_URL
    NEXT_PUBLIC_VAPID_PUBLIC_KEY
    VAPID_PRIVATE_KEY
    VAPID_SUBJECT
```
## Team

| Name              | Role                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| Siddhesh More     | Full-Stack Lead — Auth, API routes, AI integrations, deployment                    |
| Saniya Nande      | Frontend Dev — Client profiles, service log forms, dashboard                       |
| Shreeraj Bhamare  | AI Engineering Lead — Vector Embedding Models, Guardrails specialist, LLM Explorer |
| Siddharth Bhamare | Backend Dev — Database schema, RLS policies, CSV import/export                     |

## License

MIT License. See [LICENSE](LICENSE).