## 🎭 Test Report — `fix/bugs` · Run #52
commit `e7447aea`

| | Result |
|---|---|
| ✅ Passed | 13 |
| ❌ Failed | 1 |
| 📊 Total | 14 |
| ⏱️ Duration | 19s |

### ❌ Failed Tests
- ❌ ` › chromium › ui/saucedemo.spec.js › AI Failure Analysis › intentional failure for AI analysis demo @regression` — *Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed*

> 🤖 **AI Analysis** (98% confidence): The test intentionally attempts to locate a heading element with the text 'Non Existing Header' using getByRole, which does not exist in the DOM. The assertion toBeVisible() fails after the 5000ms tim [View full analysis →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/pr-7/)

[📊 Full Report →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/pr-7/)