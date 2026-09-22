Automated UI tests (Playwright)

Prerequisites
- Node.js (>=16)
- npm

Install test deps:

```bash
cd <repo-root>
npm install
npx playwright install
```

Run tests:

```bash
# Start the kiln-controller server first (in a separate terminal):
python kiln-controller.py

# Then run tests
npm test
```

Notes
- The test uses the sample profile `Test/test-fast.json` and expects the server to be running on http://127.0.0.1:8081/.
- The test will clean up the written profile in `storage/profiles/` after asserting its presence.
