/**
 * Step 14: single-source webview protocol + CI unit tests.
 *
 * - scripts/generate-webview-protocol.mjs — TS → media/src/shared/webview-protocol.js
 * - npm run generate:webview-protocol (runs before compile)
 * - npm run test:unit — Mocha on out/tests/suite/*.test.js (no VS Code host)
 * - CI: compile + test:unit + test:webview
 */
console.log('Step 14: generate:webview-protocol + test:unit in CI');
