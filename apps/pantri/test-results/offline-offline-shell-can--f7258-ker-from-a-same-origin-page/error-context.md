# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: offline.spec.ts >> offline shell >> can register the service worker from a same-origin page
- Location: e2e/offline.spec.ts:27:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at /var/folders/b2/fhjtn3hn6jx_7z3j488l27km0000gn/T/cursor-sandbox-cache/5bb79905e161de555e969a0a4e013052/playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     pnpm exec playwright install                           ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```