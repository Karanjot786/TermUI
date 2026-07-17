# Content Security Policy (CSP)

## Overview

This project includes a recommended Content Security Policy (CSP) configuration
for documentation deployments.

The goal is to reduce the impact of:

- Cross-Site Scripting (XSS)
- Malicious third-party scripts
- Clickjacking
- Mixed-content attacks

---

## Recommended Policy

```text
default-src 'self';
script-src 'self';
style-src 'self';
img-src 'self' data: https:;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```