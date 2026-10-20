# DB Copilot — Security Architecture & Policy

## Overview
DB Copilot is designed with a defense-in-depth security model to ensure safe handling of database credentials, application source code, queries, and AI interactions.

---

## 1. Session Lifecycle & Token Security

### Cryptographic Entropy
- Session identifiers and authorization tokens are generated using Node.js's native `crypto.randomBytes(32)`, yielding **256 bits of cryptographic entropy** formatted as 64-character hexadecimal strings.
- Predictable UUIDs or incremental counters are strictly forbidden for session tokens.

### Token Dual-Architecture
- **`sessionId`**: A public session reference used in status tracking and logging.
- **`authToken`**: A confidential secret token required for all sensitive, state-changing, and schema-introspecting operations.
- The `authToken` is returned only once upon initial connection handshake and must be passed via the `X-Session-Auth` header or request body.

### Dual Expiration Policy
- **Idle Expiration**: Sessions with no activity for **30 minutes** are automatically invalidated.
- **Absolute Ceiling**: Regardless of activity, sessions expire after **4 hours** to prevent long-lived connection hijackings.
- **Periodic Pruning**: An automated server timer purges expired sessions and terminates idle database connection pools every **5 minutes**.

### Immediate Destruction
- Explicit disconnect requests (`POST /api/database/disconnect`) immediately revoke both `sessionId` and `authToken`, release open database connections, and purge connection configurations from server memory.

---

## 2. Database Credentials & Secret Redaction

### Memory-Only Storage
- Database passwords, authentication keys, and connection strings are retained strictly in ephemeral server memory for the duration of the active session.
- Credentials are never persisted to disk, never logged to stdout/stderr, and never exposed in client API responses.

### Schema Redaction
- Schema metadata returned to frontend and IDE extensions contains structural data (table names, column names, data types, indexes, and constraints). Database credentials, role passwords, and sensitive system catalogs are filtered out at the adapter layer.

### AI Sanitization
- Before sending queries, schema fragments, or code snippets to external LLM providers (e.g., Google Gemini), the payload passes through the `redactSecrets()` pipeline in `ai.service.js`:
  - Connection strings with credentials (`mysql://user:pass@host`, `mongodb+srv://...`) are redacted.
  - JWT tokens, bearer tokens, API keys, and sensitive environment assignments (`PASSWORD=`, `SECRET=`, `API_KEY=`) are masked with `[REDACTED]`.

---

## 3. Archive & Codebase Ingestion Security

### ZIP Slip & Path Traversal Guards
- Extracted archive entries are normalized using standard path utilities.
- Any entry resolving with absolute paths (`/`, `C:`) or containing path traversal sequences (`..`, `../`, `..\`) is skipped silently without disk writes or execution.

### ZIP Bomb & Resource Exhaustion Defense
- **Maximum File Count**: 1,000 files per archive.
- **Maximum Per-File Size**: 1 MB per source file.
- **Maximum Scanned Source Size**: 10 MB total scanned source payload.
- **Maximum Uncompressed Archive Size**: 50 MB total expanded size guard.

### Execution Isolation
- Uploaded source code is parsed exclusively via static AST / regex analyzers.
- No uploaded files, scripts (`npm postinstall`, shell scripts), or binaries are ever executed by the DB Copilot runtime.

---

## 4. SQL & Database Query Safety

### Static Validation Separation
- Query validation is performed through AST parsing, dialect lexical analysis, and schema cross-referencing. DB Copilot **never executes user SQL queries against the database** to determine validity.
- Dialect-aware adapters normalize parameter markers (`$1`, `?`, `:name`) to prevent false positives during static inspection.

### Non-Destructive Operations
- AI-generated SQL fixes and schema migrations are presented as advisory suggestions or diffs. They are never automatically executed against the connected database.
- Explicit approval and human review are required for any file modifications in VS Code or database mutations.

---

## 5. Network & HTTP Hardening

### Security Headers
Every HTTP response is guarded with standard security headers:
- `X-Content-Type-Options: nosniff` (MIME sniffing prevention)
- `X-Frame-Options: DENY` (Clickjacking prevention)
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Request Rate Limiting & Size Bounds
- Global IP-based rate limiting (120 requests per 1-minute window).
- JSON body payload cap of **2 MB** to prevent denial-of-service memory exhaustion.
- Maximum SQL query string limit of **10,000 characters**.

---

## 6. Authentication & Session Authorization Reality

### Important Release Limitation:
- **Developer Session Tokens**: In this release candidate, a `sessionId` is a cryptographically random token (256 bits) representing an ephemeral database workspace session. **A session ID is not user authentication or multi-tenant authorization.**
- **Single-Tenant / Local Tooling**: DB Copilot is built for local development and private team networks. There is no built-in user account table, RBAC, or SSO identity provider.
- **Production Deployment Recommendations**:
  1. Do not expose the DB Copilot backend to the public internet without an authenticating reverse proxy (e.g. Cloudflare Access, OAuth2 Proxy, AWS Cognito).
  2. For multi-tenant environments, bind session tokens to authenticated user identities.
  3. Ensure DB Copilot connects to live databases over private VPCs, localhost, or TLS-encrypted connections.

---

## 7. Reporting a Security Vulnerability

If you discover a security vulnerability in DB Copilot, please report it privately:
- **Email**: security@dbcopilot.local
- Do not open public issues for suspected security vulnerabilities.
- We will acknowledge receipt within 48 hours and provide a remediation timeline.
