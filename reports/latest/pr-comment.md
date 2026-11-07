## 🎭 Test Report · Run #108
commit `886ee5fb`

| | Result |
|---|---|
| ✅ Passed | 23 |
| ❌ Failed | 8 |
| ⚠️ Flaky | 1 |
| ⏭️ Skipped | 2 |
| 📊 Total | 33 |
| ⏱️ Duration | 29s |

### ❌ Failed Tests
- ❌ `chromium › ui/checkout.spec.js › Product Detail › add to cart from detail page updates badge @regression` — *Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Add to cart' }) resolved to 6 elements:*
- ❌ `chromium › ui/checkout.spec.js › Checkout Flow › checkout with all 6 items shows correct count @regression` — *Error: expect(locator).toHaveText(expected) failed*
- ❌ `chromium › ui/dedup-demo.spec.js › Dedup Demo › broken selector always fails — dedup demo @regression` — *Error: expect(locator).toBeVisible() failed*
- ❌ `chromium › ui/checkout.spec.js › Checkout Flow › checkout with all 6 items shows correct count @regression` — *Error: expect(locator).toHaveText(expected) failed*
- ❌ `chromium › ui/saucedemo.spec.js › AI Failure Analysis › intentional failure for AI analysis demo @regression` — *Error: expect(locator).toBeVisible() failed*
- ❌ `Shopping Cart › Cart persists items after page refresh` — *Cart badge resets to 0 after hard refresh — session storage not persisted*
- ❌ `Authentication › Login error clears when user starts retyping` — *Error message persists even after the user clears the username field — no auto-dismiss*
- ❌ `Product Detail › Checkout cancel on step 2 returns to inventory` — *Cancel on step 2 navigates to /cart.html instead of /inventory.html — unexpected destination*

> 🤖 **AI Analysis** (5 failures analysed) (0% confidence): AI analysis unavailable for this test. [View full analysis →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/latest/)

[📊 Full Report →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/latest/)