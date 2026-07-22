# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Yes    |

## Reporting a vulnerability

If you find a security issue, please **do not open a public GitHub issue.** Security bugs reported publicly give attackers a head start.

Instead, email **karanjotsingh786@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce it
- The affected package(s) and version(s)
- Any potential impact you've identified

You'll get a response within 48 hours confirming we received the report. We'll work with you to understand the issue and coordinate a fix before any public disclosure.

## What counts as a security issue

- Arbitrary code execution through crafted input (e.g., malicious ANSI sequences processed by the input parser)
- File system access beyond what a package documents (e.g., `@termuijs/data` reading files it shouldn't)
- Dependency chain vulnerabilities in published packages
- Information leakage through the screen buffer or terminal state

## What doesn't count

- Denial of service via large input (terminal apps run locally, not as services)
- Issues that require the attacker to already have local code execution
- Visual glitches or rendering bugs (report these as regular issues)

## Disclosure timeline

Once we confirm a vulnerability:

1. We develop and test a fix internally.
2. We coordinate a release date with the reporter.
3. We publish the fix and credit the reporter (unless they prefer anonymity).
4. We disclose details after users have had time to update.

We follow a 90-day disclosure window. If we can't fix it within 90 days, we'll explain why and provide a workaround.

## Responsible Disclosure

If you discover a potential security vulnerability, please report it privately instead of creating a public GitHub issue.

When reporting a vulnerability, please include:

- A clear description of the issue.
- Steps to reproduce the vulnerability.
- The affected package(s) or component(s).
- Potential impact or severity.
- Any suggested mitigation or fix (if available).

Please avoid publicly disclosing security issues until they have been reviewed and addressed by the maintainers.

---

## Response Timeline

The project aims to acknowledge new security reports within:

| Stage | Target Time |
|--------|-------------|
| Initial acknowledgement | Within 48 hours |
| Initial assessment | Within 7 days |
| Status updates | As needed during investigation |
| Security fix | Depending on severity and complexity |

These timelines are goals rather than guaranteed service-level agreements.

---

## Supported Versions

The following table indicates which versions currently receive security updates.

| Version | Supported |
|----------|:---------:|
| Latest Release | ✅ |
| Previous Minor Release | ✅ |
| Older Releases | ❌ |

Users are encouraged to upgrade to the latest supported version whenever possible.

---

## Reporting Recommendations

To help maintainers investigate efficiently, please include:

- Operating system
- Bun version
- Node.js version
- Package version
- Environment variables (if relevant)
- Complete reproduction steps
- Screenshots or terminal logs (when applicable)

Avoid including sensitive information such as API keys, passwords, or personal credentials in your report.

---

## Coordinated Disclosure

Please allow maintainers reasonable time to investigate and prepare a fix before publicly discussing the vulnerability.

Coordinated disclosure helps protect users while allowing sufficient time for remediation and testing.