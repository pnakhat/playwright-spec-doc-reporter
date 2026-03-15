## 🎭 Test Report — `feature/manual-test-results` · Run #65
commit `7c053f26`

| | Result |
|---|---|
| ✅ Passed | 23 |
| ❌ Failed | 4 |
| ⏭️ Skipped | 1 |
| 📊 Total | 28 |
| ⏱️ Duration | 18s |

### ❌ Failed Tests
- ❌ ` › chromium › ui/saucedemo.spec.js › AI Failure Analysis › intentional failure for AI analysis demo @regression` — *Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed*
- ❌ `Shopping Cart › Cart persists items after page refresh` — *Cart badge resets to 0 after hard refresh — session storage not persisted*
- ❌ `Authentication › Login error clears when user starts retyping` — *Error message persists even after the user clears the username field — no auto-dismiss*
- ❌ `Product Detail › Checkout cancel on step 2 returns to inventory` — *Cancel on step 2 navigates to /cart.html instead of /inventory.html — unexpected destination*

> 🤖 **AI Analysis** (4 failures analysed) (98% confidence): The test intentionally attempts to assert visibility of a heading element with the name 'Non Existing Header', which does not exist in the DOM. The assertion times out after 5000ms because no such ele [View full analysis →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/pr-12/)

[📊 Full Report →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/pr-12/)