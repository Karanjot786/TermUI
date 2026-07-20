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
