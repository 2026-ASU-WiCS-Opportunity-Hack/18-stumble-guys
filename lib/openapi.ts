/**
 * OpenAPI 3.0 specification for CaseTrack.
 * Served by GET /api/docs and rendered at /api-docs.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'CaseTrack API',
    version: '1.0.0',
    description:
      'Nonprofit client and case management platform. All routes require Supabase session auth (cookie-based JWT) unless marked public. Role-based access: **admin** has full CRUD, **staff** can create and read, **client** can only access portal routes.',
    contact: { name: 'Team Stumble Guys — ASU WiCS x Opportunity Hack 2026' },
  },
  servers: [
    { url: 'https://18-stumble-guys.vercel.app', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Local Development' },
  ],
  tags: [
    { name: 'Auth',          description: 'Authentication and account setup' },
    { name: 'Clients',       description: 'Client registration and profile management' },
    { name: 'Service Entries', description: 'Visit and service log entries' },
    { name: 'Appointments',  description: 'Scheduling and calendar' },
    { name: 'Follow-Ups',    description: 'Action items and follow-up tasks' },
    { name: 'Reports',       description: 'Dashboard statistics and funder reports' },
    { name: 'Admin',         description: 'Staff management, settings, configurable fields (admin role only)' },
    { name: 'AI',            description: 'Gemini-powered AI features' },
    { name: 'Push',          description: 'Web Push notification subscriptions and delivery' },
    { name: 'Portal',        description: 'Client self-service portal (client role only)' },
    { name: 'Data',          description: 'CSV import and full data export' },
    { name: 'Audit',         description: 'Audit log and page visit tracking' },
  ],
  components: {
    securitySchemes: {
      supabaseSession: {
        type: 'apiKey',
        in: 'cookie',
        name: 'sb-access-token',
        description: 'Supabase JWT session cookie — set automatically by the browser after login.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Unauthorized' },
        },
      },
      Client: {
        type: 'object',
        properties: {
          id:             { type: 'string', format: 'uuid' },
          org_id:         { type: 'string', format: 'uuid' },
          client_number:  { type: 'string', example: 'CLT-2026-0001' },
          first_name:     { type: 'string', example: 'Maria' },
          last_name:      { type: 'string', example: 'Gonzalez' },
          date_of_birth:  { type: 'string', format: 'date', example: '1985-04-12' },
          phone:          { type: 'string', example: '+1-480-555-0100' },
          email:          { type: 'string', format: 'email' },
          demographics:   { type: 'object', additionalProperties: true },
          language_preference: { type: 'string', example: 'es' },
          is_active:      { type: 'boolean' },
          created_by:     { type: 'string', format: 'uuid', nullable: true },
          created_at:     { type: 'string', format: 'date-time' },
        },
      },
      ServiceEntry: {
        type: 'object',
        properties: {
          id:           { type: 'string', format: 'uuid' },
          client_id:    { type: 'string', format: 'uuid' },
          org_id:       { type: 'string', format: 'uuid' },
          staff_id:     { type: 'string', format: 'uuid', nullable: true },
          service_type: { type: 'string', example: 'Food Assistance' },
          date:         { type: 'string', format: 'date' },
          notes:        { type: 'string' },
          ai_structured_notes: { type: 'object', nullable: true },
          voice_consent: { type: 'boolean' },
          created_at:   { type: 'string', format: 'date-time' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id:           { type: 'string', format: 'uuid' },
          client_id:    { type: 'string', format: 'uuid' },
          staff_id:     { type: 'string', format: 'uuid', nullable: true },
          org_id:       { type: 'string', format: 'uuid' },
          scheduled_at: { type: 'string', format: 'date-time' },
          service_type: { type: 'string', nullable: true },
          status:       { type: 'string', enum: ['scheduled', 'completed', 'cancelled', 'no_show'] },
          notes:        { type: 'string', nullable: true },
          reminder_sent: { type: 'boolean' },
          created_at:   { type: 'string', format: 'date-time' },
        },
      },
      FollowUp: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          client_id:   { type: 'string', format: 'uuid' },
          description: { type: 'string' },
          due_date:    { type: 'string', format: 'date', nullable: true },
          urgency:     { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          category:    { type: 'string', nullable: true },
          status:      { type: 'string', enum: ['pending', 'completed', 'dismissed'] },
          source:      { type: 'string', enum: ['manual', 'ai'], example: 'ai' },
        },
      },
      AiStructuredNote: {
        type: 'object',
        properties: {
          summary:      { type: 'string' },
          action_items: { type: 'array', items: { type: 'string' } },
          mood_flags:   { type: 'array', items: { type: 'string' } },
          risk_level:   { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          follow_up_date: { type: 'string', format: 'date', nullable: true },
        },
      },
    },
  },
  security: [{ supabaseSession: [] }],
  paths: {
    // ── AUTH ──────────────────────────────────────────────────────────────────
    '/api/auth/signout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out the current user',
        description: 'Destroys the Supabase session cookie and redirects to /login.',
        security: [],
        responses: {
          302: { description: 'Redirects to /login' },
        },
      },
    },
    '/api/auth/setup': {
      post: {
        tags: ['Auth'],
        summary: 'Complete first-time account setup',
        description: 'Called after Google SSO on first login. Creates the users row with org_id and role.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['org_id'],
                properties: {
                  org_id:    { type: 'string', format: 'uuid' },
                  full_name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User record created' },
          400: { description: 'Validation error' },
          401: { description: 'Unauthenticated' },
        },
      },
    },

    // ── CLIENTS ───────────────────────────────────────────────────────────────
    '/api/clients': {
      get: {
        tags: ['Clients'],
        summary: 'List all clients in the org',
        description: 'Returns up to 500 clients scoped to the authenticated user\'s org_id. Supports optional `search` query parameter.',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Filter by first or last name (case-insensitive)' },
        ],
        responses: {
          200: { description: 'Array of clients', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Client' } } } } },
          401: { description: 'Unauthorized' },
        },
      },
      post: {
        tags: ['Clients'],
        summary: 'Register a new client',
        description: 'Creates a new client record. Auto-generates client_number (CLT-YYYY-NNNN). Sets created_by to the authenticated user.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['first_name', 'last_name'],
                properties: {
                  first_name:     { type: 'string' },
                  last_name:      { type: 'string' },
                  date_of_birth:  { type: 'string', format: 'date' },
                  phone:          { type: 'string' },
                  email:          { type: 'string', format: 'email' },
                  demographics:   { type: 'object' },
                  language_preference: { type: 'string', example: 'en' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Client created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Client' } } } },
          422: { description: 'Validation error' },
        },
      },
    },
    '/api/clients/{id}': {
      get: {
        tags: ['Clients'],
        summary: 'Get a single client profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Client record', content: { 'application/json': { schema: { $ref: '#/components/schemas/Client' } } } },
          404: { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Clients'],
        summary: 'Update a client record',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  first_name: { type: 'string' },
                  last_name:  { type: 'string' },
                  phone:      { type: 'string' },
                  email:      { type: 'string' },
                  demographics: { type: 'object' },
                  is_active:  { type: 'boolean' },
                  language_preference: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated client' },
          422: { description: 'Validation error' },
        },
      },
      delete: {
        tags: ['Clients'],
        summary: 'Delete a client (admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Deleted' },
          403: { description: 'Forbidden — admin role required' },
        },
      },
    },
    '/api/clients/fields': {
      get: {
        tags: ['Clients'],
        summary: 'Get configurable field schema for the org',
        description: 'Returns the JSON schema of custom demographic fields and service types defined by the admin.',
        responses: {
          200: {
            description: 'Field configuration',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    demographic_fields: { type: 'array', items: { type: 'object' } },
                    service_types: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ['Clients'],
        summary: 'Update configurable field schema (admin only)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  demographic_fields: { type: 'array', items: { type: 'object' } },
                  service_types: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Schema updated' },
          403: { description: 'Admin role required' },
        },
      },
    },
    '/api/clients/{id}/documents': {
      get: {
        tags: ['Clients'],
        summary: 'List documents attached to a client',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Array of document metadata' } },
      },
      post: {
        tags: ['Clients'],
        summary: 'Upload a document to a client profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' },
                  visible_to_client: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Document uploaded' },
          413: { description: 'File too large' },
        },
      },
    },
    '/api/clients/{id}/documents/{docId}': {
      delete: {
        tags: ['Clients'],
        summary: 'Delete a document',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'docId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Deleted' } },
      },
    },
    '/api/clients/{id}/invite': {
      post: {
        tags: ['Clients'],
        summary: 'Invite a client to the self-service portal',
        description: 'Sends a magic-link email to the client\'s email address. Creates a users row with role=client linked to this client record.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Invite sent' },
          400: { description: 'Client has no email address' },
        },
      },
    },

    // ── SERVICE ENTRIES ───────────────────────────────────────────────────────
    '/api/service-entries': {
      get: {
        tags: ['Service Entries'],
        summary: 'List service entries',
        parameters: [
          { name: 'client_id', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by client' },
        ],
        responses: {
          200: { description: 'Array of service entries', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ServiceEntry' } } } } },
        },
      },
      post: {
        tags: ['Service Entries'],
        summary: 'Log a new service or visit entry',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['client_id', 'service_type', 'date'],
                properties: {
                  client_id:    { type: 'string', format: 'uuid' },
                  service_type: { type: 'string' },
                  date:         { type: 'string', format: 'date' },
                  notes:        { type: 'string', maxLength: 5000 },
                  ai_structured_notes: { $ref: '#/components/schemas/AiStructuredNote' },
                  voice_consent: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Entry created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ServiceEntry' } } } },
          422: { description: 'Validation error' },
        },
      },
    },

    // ── APPOINTMENTS ──────────────────────────────────────────────────────────
    '/api/appointments': {
      get: {
        tags: ['Appointments'],
        summary: 'List all appointments in the org',
        responses: {
          200: { description: 'Array of appointments with nested client and staff names', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } } } } },
        },
      },
      post: {
        tags: ['Appointments'],
        summary: 'Schedule a new appointment',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['client_id', 'scheduled_at'],
                properties: {
                  client_id:    { type: 'string', format: 'uuid' },
                  scheduled_at: { type: 'string', format: 'date-time' },
                  service_type: { type: 'string' },
                  notes:        { type: 'string', maxLength: 2000 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Appointment created' },
          422: { description: 'Validation error' },
        },
      },
    },
    '/api/appointments/{id}': {
      patch: {
        tags: ['Appointments'],
        summary: 'Update appointment status or reschedule',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status:       { type: 'string', enum: ['scheduled', 'completed', 'cancelled', 'no_show'] },
                  scheduled_at: { type: 'string', format: 'date-time', description: 'New time for rescheduling' },
                  notes:        { type: 'string', maxLength: 2000 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Updated' },
          422: { description: 'Validation error' },
        },
      },
    },

    // ── FOLLOW-UPS ────────────────────────────────────────────────────────────
    '/api/follow-ups': {
      get: {
        tags: ['Follow-Ups'],
        summary: 'List follow-up tasks for the org',
        parameters: [
          { name: 'client_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'completed', 'dismissed'] } },
        ],
        responses: {
          200: { description: 'Array of follow-ups', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/FollowUp' } } } } },
        },
      },
    },
    '/api/follow-ups/{id}': {
      patch: {
        tags: ['Follow-Ups'],
        summary: 'Update a follow-up status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['pending', 'completed', 'dismissed'] },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },

    // ── REPORTS ───────────────────────────────────────────────────────────────
    '/api/reports/service-stats': {
      get: {
        tags: ['Reports'],
        summary: 'Service type breakdown',
        description: 'Returns count per service_type for the org. Used in the reporting dashboard bar chart.',
        responses: { 200: { description: 'Array of { service_type, count }' } },
      },
    },
    '/api/reports/month-stats': {
      get: {
        tags: ['Reports'],
        summary: 'Monthly service volume trend',
        description: 'Returns sessions per month for the last 12 months.',
        responses: { 200: { description: 'Array of { month, sessions }' } },
      },
    },
    '/api/reports/language-stats': {
      get: {
        tags: ['Reports'],
        summary: 'Client language distribution',
        responses: { 200: { description: 'Array of { language, count }' } },
      },
    },
    '/api/reports/risk-stats': {
      get: {
        tags: ['Reports'],
        summary: 'Client risk level distribution',
        responses: { 200: { description: 'Array of { level, count }' } },
      },
    },
    '/api/reports/engagement-stats': {
      get: {
        tags: ['Reports'],
        summary: 'Client engagement distribution (sessions per client)',
        responses: { 200: { description: 'Array of { sessions, clients }' } },
      },
    },
    '/api/reports/followup-stats': {
      get: {
        tags: ['Reports'],
        summary: 'Follow-up urgency breakdown',
        responses: { 200: { description: 'Array of { urgency, pending, completed, total }' } },
      },
    },

    // ── ADMIN ─────────────────────────────────────────────────────────────────
    '/api/admin/staff': {
      get: {
        tags: ['Admin'],
        summary: 'List all staff members (admin only)',
        responses: { 200: { description: 'Array of user records' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Invite a new staff member (admin only)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  full_name: { type: 'string' },
                  role: { type: 'string', enum: ['admin', 'staff'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Staff member invited' },
          403: { description: 'Admin role required' },
        },
      },
    },
    '/api/admin/staff/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update staff role (admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { role: { type: 'string', enum: ['admin', 'staff'] } },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Remove a staff member (admin only)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Removed' } },
      },
    },
    '/api/admin/settings': {
      get: {
        tags: ['Admin'],
        summary: 'Get organization settings',
        responses: { 200: { description: 'Organization settings object' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Update organization settings (admin only)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  logo_url: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/api/admin/prompts': {
      get: {
        tags: ['Admin'],
        summary: 'Get org-scoped AI prompt overrides (admin only)',
        responses: { 200: { description: 'Array of prompt records' } },
      },
      post: {
        tags: ['Admin'],
        summary: 'Save an AI prompt override (admin only)',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['key', 'prompt'],
                properties: {
                  key:    { type: 'string', example: 'voice_to_notes' },
                  prompt: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Saved' } },
      },
    },
    '/api/admin/embed-seed': {
      post: {
        tags: ['Admin'],
        summary: 'Backfill vector embeddings for all existing service entries (admin only)',
        description: 'Generates Gemini text-embedding-004 vectors for all service entries that don\'t have one yet. Required before semantic search works on pre-existing data.',
        responses: {
          200: { description: '{ embedded: number } — count of entries processed' },
          403: { description: 'Admin role required' },
        },
      },
    },

    // ── AI ────────────────────────────────────────────────────────────────────
    '/api/ai/voice-to-notes': {
      post: {
        tags: ['AI'],
        summary: 'Voice-to-Structured Case Notes',
        description: 'Accepts an audio recording via ElevenLabs Scribe v1 (STT), then passes the transcript to Gemini 2.5 Flash to produce a structured case note JSON. Rate limited to 10 requests/minute per user.',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['audio'],
                properties: {
                  audio: { type: 'string', format: 'binary', description: 'Audio file (webm/mp3/wav/m4a, max 25MB)' },
                  voice_consent: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Structured case note',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AiStructuredNote' } } },
          },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/ai/tts': {
      post: {
        tags: ['AI'],
        summary: 'Text-to-Speech via ElevenLabs Multilingual v2',
        description: 'Converts text to audio in the specified language. Returns an audio/mpeg binary stream. Cache the blob URL on the client — do not call this on every play event.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text'],
                properties: {
                  text:     { type: 'string', maxLength: 5000 },
                  language: { type: 'string', example: 'es', description: 'BCP-47 language code' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'audio/mpeg binary stream' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/ai/photo-to-intake': {
      post: {
        tags: ['AI'],
        summary: 'Photo-to-Intake — AI form digitization',
        description: 'Accepts a photo of a paper intake form. Gemini 2.5 Flash Vision extracts fields and returns a pre-filled client JSON. Image is compressed client-side to <4MB before upload. Audit log records a SHA-256 hash of the image — the image itself is never stored.',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['photo'],
                properties: {
                  photo: { type: 'string', format: 'binary', description: 'JPEG/PNG/WEBP/HEIC, auto-compressed to <4MB' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Extracted client fields',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    first_name:    { type: 'string' },
                    last_name:     { type: 'string' },
                    date_of_birth: { type: 'string', format: 'date' },
                    phone:         { type: 'string' },
                    email:         { type: 'string' },
                    demographics:  { type: 'object' },
                  },
                },
              },
            },
          },
          413: { description: 'Image too large (max 10MB — compress client-side)' },
        },
      },
    },
    '/api/ai/funder-report': {
      get: {
        tags: ['AI'],
        summary: 'List available funder report templates',
        responses: { 200: { description: 'Array of template names' } },
      },
      post: {
        tags: ['AI'],
        summary: 'Generate an AI funder report',
        description: 'Aggregates live org data and generates a narrative report using Gemini 2.5 Flash. Returns a formatted report ready for Word/PDF export.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['template', 'period'],
                properties: {
                  template: { type: 'string', enum: ['quarterly', 'annual', 'demographic', 'services'], example: 'quarterly' },
                  period:   { type: 'string', example: 'Q1 2026' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ report: string } — Markdown-formatted narrative report' },
          429: { description: 'Rate limit exceeded' },
        },
      },
    },
    '/api/ai/search': {
      post: {
        tags: ['AI'],
        summary: 'Semantic search across case notes',
        description: 'Embeds the query via Gemini text-embedding-004, then runs pgvector cosine similarity search across all service_entries in the org. Returns semantically relevant results even when exact keywords are absent.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['query'],
                properties: {
                  query: { type: 'string', example: 'clients who mentioned housing instability' },
                  limit: { type: 'integer', default: 10, maximum: 50 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Array of { client, entry, similarity_score }' },
        },
      },
    },
    '/api/ai/client-summary': {
      get: {
        tags: ['AI'],
        summary: 'Generate or retrieve a cached client handoff summary',
        description: 'Fetches full case history for the client and generates a structured handoff brief via Gemini. Cached in client_handoff_summaries table. Returns staleness flag if the cached version is >7 days old.',
        parameters: [
          { name: 'client_id', in: 'query', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'regenerate', in: 'query', schema: { type: 'boolean' }, description: 'Force regeneration even if cached' },
        ],
        responses: {
          200: {
            description: 'Handoff summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    summary:   { type: 'string' },
                    is_stale:  { type: 'boolean' },
                    generated_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/ai/follow-ups': {
      post: {
        tags: ['AI'],
        summary: 'Smart follow-up extraction from case notes',
        description: 'Scans a service entry\'s notes with Gemini to extract implied follow-up tasks, urgency levels, and suggested due dates. Writes results to the follow_ups table automatically.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['service_entry_id'],
                properties: {
                  service_entry_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ follow_ups: FollowUp[] } — extracted tasks' },
        },
      },
    },
    '/api/ai/translate': {
      post: {
        tags: ['AI'],
        summary: 'Translate text via Gemini',
        description: 'Translates arbitrary text into the target language. Results are cached in the translations table — identical text+language pairs return instantly from cache.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['text', 'target_language'],
                properties: {
                  text:            { type: 'string' },
                  target_language: { type: 'string', example: 'es' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ translated: string }' },
        },
      },
    },
    '/api/ai/translate/cached': {
      get: {
        tags: ['AI'],
        summary: 'Look up a cached translation',
        parameters: [
          { name: 'text', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'language', in: 'query', required: true, schema: { type: 'string', example: 'es' } },
        ],
        responses: {
          200: { description: '{ translated: string } or null if not cached' },
        },
      },
    },

    // ── PUSH ──────────────────────────────────────────────────────────────────
    '/api/push/subscribe': {
      post: {
        tags: ['Push'],
        summary: 'Register a Web Push subscription',
        description: 'Saves the browser\'s PushSubscription JSON (endpoint + keys) to the push_subscriptions table scoped to the current user and org.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['endpoint', 'keys'],
                properties: {
                  endpoint: { type: 'string', format: 'uri' },
                  keys: {
                    type: 'object',
                    properties: {
                      p256dh: { type: 'string' },
                      auth:   { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Subscription saved' } },
      },
    },
    '/api/push/send': {
      post: {
        tags: ['Push'],
        summary: 'Send a push notification to an org or a specific user',
        description: 'Sends to all subscribers in the org, or a specific user if user_id is provided. Falls back to the caller\'s own org if neither is supplied.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'body', 'type', 'id'],
                properties: {
                  org_id:  { type: 'string', nullable: true },
                  user_id: { type: 'string', nullable: true },
                  title:   { type: 'string' },
                  body:    { type: 'string' },
                  type:    { type: 'string', enum: ['appointment', 'follow_up'] },
                  id:      { type: 'string', description: 'Appointment or follow-up ID for deep-link' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ sent: number } — count of subscriptions notified' },
          400: { description: 'Could not resolve org_id' },
        },
      },
    },
    '/api/push/reminders': {
      get: {
        tags: ['Push'],
        summary: 'Fire appointment reminders due in the next 90 minutes',
        description: 'Called automatically by the service worker every 5 minutes while the app is open. Finds appointments scheduled in [now, now+90min] that haven\'t had a reminder_sent yet, and fires push notifications.',
        responses: {
          200: { description: '{ sent: number }' },
        },
      },
    },

    // ── PORTAL ────────────────────────────────────────────────────────────────
    '/api/portal/appointments': {
      get: {
        tags: ['Portal'],
        summary: 'List own appointments (client role only)',
        description: 'Returns all appointments for the authenticated client user\'s linked client record.',
        responses: {
          200: { description: 'Array of appointments' },
          403: { description: 'Non-client role attempted access' },
        },
      },
      post: {
        tags: ['Portal'],
        summary: 'Self-schedule an appointment (client role only)',
        description: 'Creates an appointment with staff_id set to the client\'s created_by (the staff member who onboarded them). Validates the requested time is in the future.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['scheduled_at', 'service_type'],
                properties: {
                  scheduled_at: { type: 'string', format: 'date-time' },
                  service_type: { type: 'string' },
                  notes:        { type: 'string', maxLength: 2000 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Appointment created' },
          422: { description: 'Appointment must be in the future, or validation error' },
          403: { description: 'Non-client role attempted access' },
        },
      },
    },

    // ── DATA ──────────────────────────────────────────────────────────────────
    '/api/import': {
      post: {
        tags: ['Data'],
        summary: 'CSV bulk import of clients (admin only)',
        description: 'Parses a CSV file using Papa Parse. Expects columns: first_name, last_name, date_of_birth, phone, email. Creates client records in bulk. Returns counts of created and skipped rows.',
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: { type: 'string', format: 'binary', description: 'CSV file with client data' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: '{ created: number, skipped: number, errors: string[] }' },
          403: { description: 'Admin role required' },
        },
      },
    },
    '/api/export': {
      get: {
        tags: ['Data'],
        summary: 'Export all org data as CSV',
        description: 'Returns a zip-like response with clients.csv and service_entries.csv for the org. Used for data portability and nonprofit migration.',
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['clients', 'services', 'all'] }, description: 'What to export (default: all)' },
        ],
        responses: {
          200: { description: 'text/csv download' },
          403: { description: 'Admin role required' },
        },
      },
    },

    // ── AUDIT ─────────────────────────────────────────────────────────────────
    '/api/audit/page-visit': {
      post: {
        tags: ['Audit'],
        summary: 'Record a page visit in the audit log',
        description: 'Called client-side by PageVisitTracker on every route change. Logs actor, org, path, and timestamp. PII is never stored — only SHA-256 hashes of before/after record states.',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  path: { type: 'string', example: '/clients/abc-123' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Logged' } },
      },
    },
  },
}
