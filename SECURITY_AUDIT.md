# oddyCRM — Security & Code Quality Audit
**Date:** 2026-05-31  
**Scope:** Full codebase review (backend Express/Prisma + frontend React/Vite)  
**Auditor:** Claude Code (automated review)

---

## Summary

| Severity | Count | Status |
|---|---|---|
| HIGH | 2 | Open |
| MEDIUM | 4 | Open |
| LOW / Code Quality | 5 | 2 Fixed in this audit |

---

## HIGH Severity

### H-1 — No Rate Limiting on Auth Endpoints
**File:** `backend/src/routes/auth.routes.ts`  
**Endpoints:** `POST /api/auth/login`, `POST /api/auth/register`  
**Risk:** Brute-force attacks on login (unlimited password guesses), registration spam.  
**Recommendation:** Add `express-rate-limit` before the auth router:
```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { success: false, message: 'Too many attempts, try again later' },
});
router.use(authLimiter);
```
Install: `npm install express-rate-limit`

### H-2 — Uploaded Files Publicly Accessible Without Authentication
**File:** `backend/src/app.ts:61`  
**Code:** `app.use('/uploads', express.static(...))`  
**Risk:** Anyone who knows or guesses a filename (e.g. from a leaked URL) can download
certificates, logos, or reports without authenticating. Filenames include a random 6-char
suffix but are not cryptographically strong.  
**Recommendation:** Replace `express.static` with an authenticated route that checks the
requesting user's `companyId` before streaming the file:
```typescript
app.get('/uploads/*', authenticate, (req, res) => {
  // Verify the file belongs to req.user.companyId, then res.sendFile(...)
});
```

---

## MEDIUM Severity

### M-1 — JWT Secret Dev Fallback Active if NODE_ENV Not Set
**File:** `backend/src/config/env.ts:4`  
**Code:** `process.env.NODE_ENV === 'production' ? throw ... : 'dev-fallback-secret-change-in-prod'`  
**Risk:** If `NODE_ENV` is missing or misspelled in a production `.env`, the application
silently signs JWTs with a well-known fallback secret, allowing anyone to forge tokens.  
**Recommendation:** Remove the fallback entirely and always require `JWT_SECRET`:
```typescript
jwtSecret: process.env.JWT_SECRET ?? (() => { throw new Error('JWT_SECRET is required'); })(),
```

### M-2 — Email Not Normalised on Registration / Login
**File:** `backend/src/services/auth.service.ts`  
**Risk:** `Admin@Example.com` and `admin@example.com` are treated as different users,
allowing duplicate accounts.  
**Recommendation:** Lowercase emails before all queries:
```typescript
const normalizedEmail = email.toLowerCase().trim();
```

### M-3 — Missing Input Validation on Most API Endpoints
**Files:** Most controllers other than `auth.controller.ts`  
**Risk:** Invalid data types, oversized strings, or unexpected fields reach Prisma directly.
While Prisma protects against SQL injection, no size limits or type checks exist.  
**Recommendation:** Apply `express-validator` (already installed) or Zod schemas at the
controller layer for `customerId`, `amount`, `status`, and other sensitive fields.

### M-4 — SUPER_ADMIN Fallback Login from Any Domain
**File:** `backend/src/services/auth.service.ts:76–80`  
**Context:** Added intentionally to fix production login issue (see git log).  
**Risk:** If the SUPER_ADMIN password is compromised, an attacker can authenticate from
any tenant's login page, not only the admin domain. Acceptable as a known trade-off but
should be reviewed if an admin-domain-only restriction is desired.  
**Recommendation (optional):** Log a warning when SUPER_ADMIN logs in from a non-admin
domain:
```typescript
if (!user) {
  user = await prisma.user.findFirst({ where: { email, companyId: null, role: 'SUPER_ADMIN' } });
  if (user) console.warn('[AUTH] SUPER_ADMIN logged in from non-admin domain:', companyId);
}
```

---

## LOW / Code Quality

### L-1 — `require('crypto').randomUUID()` Inside Service Functions ✅ FIXED
**Files:** `backend/src/services/invoices.service.ts`, `backend/src/services/quotes.service.ts`  
**Issue:** Using CommonJS `require()` inside ES module TypeScript functions is a runtime
anti-pattern: it bypasses module caching and triggers a synchronous require on every call.  
**Fix applied:** Replaced with `import { randomUUID } from 'crypto'` at module scope.

### L-2 — Token Stored in `localStorage` (XSS Exposure)
**File:** `frontend/src/store/auth.store.ts`, `frontend/src/lib/api.ts`  
**Risk:** `localStorage` is accessible to any JavaScript running on the page. An XSS
vulnerability would allow token theft. React's default JSX escaping and Helmet's CSP
headers significantly mitigate this, but the risk is non-zero.  
**Recommendation:** For higher security, consider `httpOnly` cookie-based sessions.
For current architecture, ensure Content Security Policy (`script-src`) is as restrictive
as possible.

### L-3 — `trust proxy: 1` Overly Broad
**File:** `backend/src/app.ts:13`  
**Issue:** `app.set('trust proxy', 1)` trusts the first hop proxy. If the API is also
directly reachable (e.g. a direct IP hit), `X-Forwarded-For` can be spoofed. This affects
any IP-based rate limiting or audit logging.  
**Recommendation:** Set to the specific proxy IP or CIDR if known:
```typescript
app.set('trust proxy', '172.16.0.0/12'); // Docker network or specific load balancer IP
```

### L-4 — `deletePayment` Has No Tenant Isolation Check
**File:** `backend/src/services/invoices.service.ts` — `deletePayment(paymentId)`  
**Issue:** The `Payment` model has no `companyId` column. The service deletes by `paymentId`
only without verifying the invoice belongs to the calling tenant. Tenant check relies
entirely on the controller.  
**Recommendation:** The controller already fetches the invoice first (`getInvoiceById` with
`companyId`), which covers this. Document explicitly that this is intentional:
```typescript
// Payment has no companyId — ownership verified in controller via getInvoiceById(companyId)
```

### L-5 — `app.ts` JSON Body Limit Set to 10MB
**File:** `backend/src/app.ts:57`  
**Code:** `express.json({ limit: '10mb' })`  
**Issue:** 10 MB is very large for a JSON API. A malicious client could send a 10 MB JSON
payload to any endpoint to consume server memory or CPU (JSON.parse).  
**Recommendation:** Reduce to `1mb` or lower since no endpoint legitimately needs >1 MB
JSON bodies (files go through multer which has its own limits):
```typescript
app.use(express.json({ limit: '1mb' }));
```

---

## Positive Security Findings

The following security controls are correctly implemented:

- **Helmet.js** active: security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- **CORS** restricted to known production domains (siarem.com, oddyship.com.tr, FRONTEND_URL)
- **bcrypt with cost factor 12** for all password hashing
- **Prisma ORM** used for all DB access — parameterised queries prevent SQL injection
- **Raw SQL** only in `dashboard.service.ts` using Prisma template literals (parameterised)
- **companyId isolation** on every service query with `tenantFilter`
- **Ownership verification** before update/delete (`findFirst({ where: { id, companyId } })`)
- **Soft delete** for customers, ships, services, quotes, invoices (prevents accidental data loss)
- **reCAPTCHA v2** on the public registration form
- **express-validator** on auth endpoints
- **JWT expiry** configurable via `JWT_EXPIRES_IN` env variable
- **Error sanitisation** in production: 500 errors return "Internal server error" only
- **`process.env.NODE_ENV !== 'production'` guard** skips reCAPTCHA verification in dev

---

## Recommended Action Plan

| Priority | Action | Effort |
|---|---|---|
| 1 | Add rate limiting on `/api/auth/*` | 1 hour |
| 2 | Remove JWT_SECRET fallback | 15 min |
| 3 | Normalise emails to lowercase | 30 min |
| 4 | Reduce JSON body limit to 1mb | 5 min |
| 5 | Protect `/uploads/*` with auth | 2–4 hours |
| 6 | Add input validation to CRUD controllers | 4–8 hours |
