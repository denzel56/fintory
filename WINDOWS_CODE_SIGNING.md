# Windows Code Signing Notes

This note records the current Fintory decision for Windows installer signing and the questions to revisit before public distribution.

## Current decision

MVP Windows builds are unsigned.

Do not add certificates, signing secrets, CI signing, auto-update, telemetry, crash reporting, or network-based release checks as part of the current MVP packaging work. The current packaging spike may produce an unpacked Windows app for local smoke testing, but public release signing is a separate future task.

## Why this is separate from the packaging spike

The current packaging goal is to prove that the packaged Electron app can start offline and use local SQLite/project workflows. Code signing is a distribution trust decision, not a core MVP workflow requirement.

Signing should be revisited after the MVP workflow review and before distributing builds to users outside a small test group.

## What signing does

Code signing proves:

- which publisher signed the app or installer;
- that the signed file has not been modified since signing.

Code signing does not prove that the app is safe, private, or correct. It only establishes publisher identity and file integrity.

## What happens without signing

Unsigned Windows installers/apps may show warnings such as:

- Unknown publisher;
- Windows protected your PC;
- SmartScreen prompts that hide the run action behind More info;
- stricter treatment by browsers or antivirus tools.

This is acceptable for local MVP testing, but it is not a good public distribution experience.

## Certificate options

### Standard code signing certificate

Pros:

- cheaper than EV;
- suitable for small apps and early releases;
- identifies the publisher.

Cons:

- SmartScreen reputation usually builds gradually;
- early releases may still show warnings.

### EV code signing certificate

Pros:

- stronger publisher validation;
- generally better initial Windows trust behavior.

Cons:

- more expensive;
- more bureaucracy;
- often requires hardware token or HSM-backed signing;
- likely unnecessary for the Fintory MVP.

## Open questions before enabling signing

- What publisher name should users see?
- Should the certificate be issued to an individual, sole proprietor, or company?
- Is a standard certificate sufficient, or is EV needed later?
- Where will the signing key be stored?
- Will signing happen locally or in CI?
- If CI signing is used, which secrets are required and who can access them?
- How will release artifacts be named and versioned?
- Is the build intended for private testing, limited distribution, or public release?
- What manual checks must pass before signing a release?

## Security rules

Never commit:

- certificate files, such as .pfx or .p12;
- certificate passwords;
- signing tokens;
- private keys;
- local certificate paths;
- CI secret values.

Prefer environment variables or CI secret storage if signing is added later. For Electron Builder, signing can be configured through secure environment variables such as CSC_LINK and CSC_KEY_PASSWORD, but these values must never be written into tracked files.

## Fintory privacy constraints

Signing work must preserve Fintory's local-first privacy model:

- no auto-update behavior without a separate explicit product decision;
- no telemetry;
- no crash reporting;
- no cloud sync;
- no bank API integration;
- no logging of project paths, transaction data, account values, CSV contents, or local financial files.

## Future release task scope

A future installer/signing issue should explicitly cover:

- adding a Windows installer target, likely NSIS;
- deciding signed vs unsigned release artifacts;
- choosing app version and artifact naming;
- adding an app icon;
- documenting install/uninstall behavior;
- verifying install, launch, create/open project, sanitized CSV import, dashboard view, close/reopen, and uninstall;
- confirming uninstall does not delete user-selected project database files.
