## 🎭 Test Report — `feat/adoption-features` · Run #105
commit `1d4f840d`

| | Result |
|---|---|
| ✅ Passed | 24 |
| ❌ Failed | 5 |
| ⏭️ Skipped | 2 |
| 📊 Total | 31 |
| ⏱️ Duration | 21s |

### ❌ Failed Tests
- ❌ `chromium › ui/dedup-demo.spec.js › Dedup Demo › broken selector always fails — dedup demo @regression` — *Error: expect(locator).toBeVisible() failed*
- ❌ `chromium › ui/saucedemo.spec.js › AI Failure Analysis › intentional failure for AI analysis demo @regression` — *Error: expect(locator).toBeVisible() failed*
- ❌ `Shopping Cart › Cart persists items after page refresh` — *Cart badge resets to 0 after hard refresh — session storage not persisted*
- ❌ `Authentication › Login error clears when user starts retyping` — *Error message persists even after the user clears the username field — no auto-dismiss*
- ❌ `Product Detail › Checkout cancel on step 2 returns to inventory` — *Cancel on step 2 navigates to /cart.html instead of /inventory.html — unexpected destination*

> 🤖 **AI Analysis** (5 failures analysed) (98% confidence): The test 'broken selector always fails — dedup demo' intentionally uses a non-existent CSS selector '#this-element-does-not-exist' and asserts it is visible, causing a guaranteed failure. The element  [View full analysis →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/pr-26/)

[📊 Full Report →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/pr-26/)