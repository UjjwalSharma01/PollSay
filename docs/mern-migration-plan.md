Title: PollSay Migration Plan: From HTML/CSS/JS + Supabase to MERN Stack

Goals
- Move from a static HTML/Tailwind/vanilla JS frontend and Supabase-backed services to a full MERN architecture (MongoDB, Express, React, Node)
- Preserve existing features (multi-step signup, email verification, org/team management, form builder, encrypted responses, dashboard analytics)
- Improve developer experience, testing, scalability, and deployment workflows
- Minimize downtime and provide a safe, reversible cutover

Current State (High-level)
- Frontend: Static HTML in /public styled via Tailwind built from src/input.css. Vanilla JS modules and some Alpine patterns.
- Backend: Lightweight Node/Express API at server/authApi.js for privileged Supabase operations (signup with org/team). Services for email verification and user-data encryption in /services.
- Data: Supabase (Postgres) tables (organizations, team_members, user_profiles, email_verification, plus forms/responses per product domain). RLS and anon/service keys used.
- Deployment: Static hosting + Vercel config; client-side env-config generator; minimal server runtime.

Target Architecture (MERN)
- Client: React + Vite + Tailwind (reuse current Tailwind config). React Router for pages. React Query for data fetching and caching. Recharts/Chart.js for analytics.
- API: Node.js (Express) REST API with structured routing, validation (zod/celebrate), authentication (JWT + refresh tokens), and role-based authorization.
- Database: MongoDB Atlas with Mongoose ODM. Collections to mirror domain entities.
- Real-time updates: Socket.IO (or SSE) for live poll results; optional MongoDB change streams for server-triggered pushes.
- Secrets/Config: .env files for local; cloud secret stores for production.
- CI/CD: Linting, tests, type checks (optionally TypeScript), and automated deployments (client/server separately).

Project Structure (Proposed Monorepo)
/
  client/ (React + Vite + Tailwind)
  server/ (Express + Mongoose + Socket.IO)
  scripts/ (migration and maintenance scripts)
  docs/ (architecture, ADRs, runbooks)
  .env.example, docker-compose.yml, etc.

Data Model Mapping (Supabase → MongoDB)
- organizations → organizations
  - { _id, email, orgName, orgSize, industry, createdAt, updatedAt }
- team_members → teamMembers
  - { _id, orgId (ObjectId->organizations), email, role, invitedBy, userId (ObjectId->users, nullable), createdAt }
- user_profiles → userProfiles
  - { _id, userId (ObjectId->users), displayName, encryptedData, createdAt }
- email_verification → emailVerifications
  - { _id, email, token (idx+TTL), expiresAt, verifiedAt, createdAt }
- users (new, replaces Supabase Auth)
  - { _id, email (unique), passwordHash, orgId (ObjectId), roles: ["owner","admin","member"], emailVerifiedAt, createdAt, updatedAt }
- forms (polls) → forms
  - { _id, orgId, ownerId, title, description, questions[], options[], settings { allowedDomains[], opensAt, closesAt, visibility }, encryption: { version, publicKeyId? }, createdAt, updatedAt }
- responses → responses
  - { _id, formId, respondentId (nullable/anon), answers[], createdAt, clientMeta{ip, ua}, signature? }
- keys (if persisting org-level keys) → orgKeys
  - { _id, orgId, type: "form"|"org", encPrivateKey, publicKey, createdAt, rotatedAt }

Security and Encryption
- Replace Supabase auth with JWT-based auth (access+refresh). Hash passwords with bcrypt. Enforce email verification before privileged actions.
- Preserve client-side encryption for sensitive response payloads. Use Web Crypto on client and Node crypto on server for key gen/rotation. Store encrypted blobs and non-sensitive metadata separately.
- Consider envelope encryption with a per-form symmetric key encrypted by an org-level asymmetric key pair. Keep private keys encrypted at rest server-side with a KMS-managed wrapping key if feasible.

API Surface (Initial)
- Auth
  - POST /api/auth/register {email, password, organization, team?}
  - POST /api/auth/login {email, password}
  - POST /api/auth/refresh
  - POST /api/auth/logout
  - POST /api/auth/verify-email {token}
  - POST /api/auth/resend-verification
- Organizations
  - GET /api/orgs/me (org and role from JWT)
  - PATCH /api/orgs/:orgId
  - POST /api/orgs/:orgId/team/invite
  - PATCH /api/orgs/:orgId/team/:memberId
- Forms
  - POST /api/forms
  - GET /api/forms?orgId=...
  - GET /api/forms/:id
  - PATCH /api/forms/:id
  - POST /api/forms/:id/close
- Responses
  - POST /api/forms/:id/responses (accepts encrypted payloads)
  - GET /api/forms/:id/analytics (aggregated, role-guarded)
- Keys
  - POST /api/orgs/:orgId/keys/rotate
  - GET /api/orgs/:orgId/keys/active (never expose private; provide public or wrapped keys)

Frontend Routes (React)
- / (Landing)
- /signup (multi-step)
- /signin
- /dashboard (org overview, analytics widgets)
- /forms (list)
- /forms/new (builder)
- /forms/:id (edit)
- /f/:id (public respondent view)
- /verify-email?token=...

Frontend Implementation Notes
- Preserve Tailwind config and utility-first styling.
- Split UI into feature modules: auth, org, forms, responses, analytics.
- Use React Hook Form + zod for form schemas.
- Data fetching via React Query; global auth via context provider; token refresh interceptor.
- Charts via Recharts/Chart.js; virtualized lists where needed.

Real-time Strategy
- Use Socket.IO on /api for rooms per formId to push new response aggregates.
- On response submission, API updates Mongo, recomputes aggregate, emits to room.
- Alternate: poll /analytics endpoint if websockets are deferred.

Migration Strategy (Phased, Low-Risk)
- Phase 0: Foundations
  - Add docs, ADRs, and agree on coding standards. Confirm production targets and environments.
- Phase 1: Repository Restructure
  - Introduce /client and /server folders. Preserve existing static site under /public for reference.
  - Add ESLint/Prettier, commit hooks, environment templates.
- Phase 2: Server Skeleton
  - Initialize Express app, health endpoint, error handler, request logging, CORS.
  - Add Mongoose connection and base models (User, Organization).
  - Provide Docker Compose for local Mongo.
- Phase 3: Auth + Email Verification
  - Implement registration, login, refresh tokens, password policies, email verification with nodemailer + token TTL index. Migrate services/emailVerification.js logic.
  - Build tests with supertest/Jest.
- Phase 4: Org and Team Management
  - Endpoints and models for organizations and team members. Role-based guards.
- Phase 5: Forms + Responses Domain
  - Models and CRUD for forms. Public submission endpoint with rate limit and bot protection (hCaptcha/Recaptcha optional).
  - Responses write path, analytics aggregation (Mongo pipelines). Socket.IO broadcasting.
- Phase 6: Encryption Layer
  - Implement key management (org-level asymmetric, form-level symmetric). Client encrypts responses, server stores opaque payloads. Add key rotation.
  - Backfill support for existing encrypted data conventions.
- Phase 7: React Client Build-out
  - Scaffold Vite + React + Tailwind. Implement auth pages, dashboard, forms list/editor, public respondent page.
  - Integrate with API and socket events. Integrate charts.
- Phase 8: Data Migration
  - Write scripts/supabase-export.js to read from Supabase (using service key) and transform to Mongo insert batches.
  - Map IDs, maintain referential integrity. Create indexes (email unique, orgId, formId, token TTL).
  - Dry-run in staging; checksum record counts; validate sample records.
- Phase 9: Hardening
  - Add rate limiting, helmet, CORS policy, input validation, audit logs, alerting hooks.
  - Performance passes (indexes, N+1 avoidance, payload sizes). Load test critical endpoints.
- Phase 10: Cutover
  - Deploy server (Render/Fly/Heroku/EC2) + MongoDB Atlas. Deploy client (Vercel/Netlify).
  - Blue/green: point public DNS to new client pointing to new API. Maintain read-only view for legacy during transition window.
  - Run rollback plan documented below if issues.

Data Migration Details
- Export order: organizations → users → team_members → forms → responses → user_profiles → email_verification.
- ID strategy: Retain original UUIDs as legacyId fields for traceability; use ObjectIds as primary in Mongo.
- Timestamps: Preserve created_at/updated_at using Mongoose schema options.
- Encryption fields: Copy encrypted blobs as-is; document cipher/version fields; re-encrypt only if necessary.

Testing Strategy
- Unit tests: models, utils, encryption helpers.
- Integration tests: auth, org, forms, responses endpoints with an in-memory Mongo or test DB.
- E2E: Playwright/Cypress against a seeded test environment.
- Security: JWT tampering, RCE/injection tests, rate-limit tests.

DevOps and Tooling
- Linting/formatting with ESLint + Prettier. Commit hooks via Husky + lint-staged.
- Environment management via dotenv; typed config loader; secrets via cloud provider.
- Docker Compose for local dev: api + mongo + seed script; optional mailhog for email testing.
- Observability: morgan logs locally; prod structured logs, health/ready endpoints, uptime monitors.

SEO, Accessibility, and UX
- SSR is optional; for now, React SPA with appropriate meta tags and sitemap. If SEO-critical, consider Next.js later.
- Maintain or improve accessibility; use semantic HTML and aria where applicable.

Performance Considerations
- Use Mongo indexes: users.email, forms.orgId, responses.formId, emailVerifications.token (TTL), teamMembers.orgId.
- Cache hot analytics aggregates in-memory or Redis if required.
- Bundle splitting on client; code-split routes and heavy components.

Risks and Mitigations
- Authentication regression: Launch a beta/staging for existing users to verify login flows; prepare password reset rollouts.
- Data consistency: Verify migration with checksums and sampled record comparisons; keep rollback script.
- Real-time complexity: If socket infra slips, fall back to short polling for initial release.
- Encryption portability: Validate crypto compatibility; pin cipher suites and versions.

Rollback Plan
- Keep legacy Supabase-based site in read-only mode for 2 weeks post cutover.
- Maintain backfill scripts to re-apply late data from legacy to Mongo if needed.
- DNS toggle to restore legacy client if P0 defects emerge.

Definition of Done
- All critical feature parity met (auth, org/team, form builder, response collection, analytics display)
- Green CI (lint, tests) on server and client
- Staging passes QA including load tests and security checks
- Successful data migration dry-run and production run with sign-off
- Production deployed with monitoring and alerting

Estimated Timeline (aggressive, adjustable)
- Weeks 1-2: Repo restructure, server skeleton, auth + email verification
- Weeks 3-4: Org/team, forms CRUD, responses + analytics, sockets
- Weeks 5-6: Client build-out, encryption layer, integration tests
- Week 7: Data migration tooling, staging dry-run, perf hardening
- Week 8: Production migration, cutover, observation window

Adoption Notes for This Repository
- Reuse Tailwind config and UI motifs to reduce redesign time.
- Port existing services/emailVerification.js and services/userEncryption.js into the new server with minimal changes, swapping Supabase calls for Mongo models.
- Maintain /public for legacy reference during transition; new client under /client will supersede it.

Out of Scope (for initial release)
- SSO (OAuth/SAML) beyond email/password
- Advanced RBAC/ABAC beyond org owner/admin/member
- Multi-region active-active deployments
