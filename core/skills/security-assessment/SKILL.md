---
name: security-assessment
description: Step-by-step procedure for the Security Pentester to threat-model a change, audit code and dependencies against OWASP Top 10/ASVS, run safe local PoC tests, and produce security-report.md with severity-rated findings.
---
# Skill: Security Assessment

## Rules of engagement
- Authorized scope: this repository and its **local/dev** runtime only.
- Never target production or third-party hosts. Never print or commit real secrets — redact.

## Steps
1. **Threat model** – Assets, actors, entry points (HTTP routes, CLI, queues, file uploads), trust boundaries. Apply STRIDE per entry point.
2. **Static audit** – Review changed and related code for:
   - Access control: missing authz checks, IDOR, privilege escalation.
   - Injection: SQL/NoSQL, command, template, LDAP, XSS, path traversal.
   - AuthN/session: weak password handling, token validation, session fixation, CSRF.
   - Crypto: weak algorithms, hardcoded keys, insecure randomness.
   - SSRF, open redirect, insecure deserialization, XXE.
   - Misconfiguration: CORS, debug mode, verbose errors, security headers.
   - Data exposure: secrets in code/logs, PII in responses or logs.
3. **Tooling** (if available in the project or already installed): dependency audit (`npm audit`, `pip-audit`, `govulncheck`, `cargo audit`, `mvn dependency-check`), secret scan (`gitleaks`), SAST (`semgrep`). Note tools that are unavailable instead of installing globally.
4. **Dynamic PoC** – Where valuable, write a local test or request that demonstrates the issue against the dev server/test harness.
5. **Rate** each finding `S<n>`: Critical / High / Medium / Low / Info with impact, likelihood, evidence (redacted), location, remediation, reference (CWE/OWASP).
6. **Write** `security-report.md` with verdict `BLOCKED` (any open Critical/High) or `CLEARED`.
