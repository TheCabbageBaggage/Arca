# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 1.x (latest) | ✅ |
| < 1.0 | ❌ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

To report a security issue, email the maintainers at **security@arca.dev** (replace with your actual address) with:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Any suggested fix (optional)

You will receive an acknowledgement within 48 hours and a full response within 7 days.

## Scope

Issues of particular concern:

- Authentication bypass in the JWT or agent API key system
- SQL injection in any module
- Bypass of the append-only triggers on `system_log` or `transaction_log`
- Privilege escalation between user roles
- Exposure of API keys or secrets via logs or API responses
- SSRF via the Nextcloud WebDAV integration

## Out of Scope

- Vulnerabilities in dependencies (report directly to upstream)
- Issues requiring physical access to the host machine
- Social engineering attacks

## Responsible Disclosure

We ask for 90 days before public disclosure to allow time for a patch to be released.
