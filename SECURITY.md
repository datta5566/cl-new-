# Security Policy

Last reviewed: 10 July 2026

## Data model

File Store Pro is a static browser application. Production records, complaint records, barcodes and uploaded file data are stored only in the current browser's `localStorage`.

This means:

- Data is not automatically shared between phones or computers.
- Clearing browser data, uninstalling the browser or changing devices can permanently remove records.
- Anyone who can open the same unlocked browser profile may be able to read the locally saved records.
- GitHub Pages cannot provide secure server-side login by itself.

## Safe use

1. Use the application only through HTTPS or localhost, especially for camera access.
2. Do not store confidential customer documents, personal identity documents, passwords, API keys or financial data.
3. Export Excel backups regularly and store backups in an approved company location.
4. Lock the phone or computer when it is unattended.
5. Keep the browser and operating system updated.
6. Use small, trusted file types. Avoid opening unknown uploaded files.
7. Never place an OpenAI key, GitHub token, password or other secret in HTML or JavaScript.

## Current limitations

- Records are not encrypted at rest.
- There is no server-side authentication or user management.
- Browser storage has a size limit and is not a replacement for a database.
- External scanner and Excel libraries require internet access and are loaded over HTTPS.

For company-wide or multi-device use, move storage and authentication to a protected backend database with named user accounts, role-based access and audit logs.

## Reporting a problem

Do not publish passwords, tokens, customer records or screenshots containing confidential data in a public GitHub issue. Revoke any exposed secret immediately and remove it from Git history.
