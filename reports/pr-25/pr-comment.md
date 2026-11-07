## 🎭 Test Report — `chore/playwright-1.65` · Run #103
commit `f10a5685`

| | Result |
|---|---|
| ✅ Passed | 23 |
| ❌ Failed | 7 |
| ⏭️ Skipped | 2 |
| 📊 Total | 32 |
| ⏱️ Duration | 18s |

### ❌ Failed Tests
- ❌ ` › chromium › ui/checkout.spec.js › Product Detail › add to cart from detail page updates badge @regression` — *Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Add to cart' }) resolved to 6 elements:*
- ❌ ` › chromium › ui/checkout.spec.js › Product Detail › add to cart from detail page updates badge @regression` — *Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Add to cart' }) resolved to 6 elements:*
- ❌ ` › chromium › ui/dedup-demo.spec.js › Dedup Demo › broken selector always fails — dedup demo @regression` — *Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed*
- ❌ ` › chromium › ui/saucedemo.spec.js › AI Failure Analysis › intentional failure for AI analysis demo @regression` — *Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed*
- ❌ `Shopping Cart › Cart persists items after page refresh` — *Cart badge resets to 0 after hard refresh — session storage not persisted*
- ❌ `Authentication › Login error clears when user starts retyping` — *Error message persists even after the user clears the username field — no auto-dismiss*
- ❌ `Product Detail › Checkout cancel on step 2 returns to inventory` — *Cancel on step 2 navigates to /cart.html instead of /inventory.html — unexpected destination*

> 🤖 **AI Analysis** (5 failures analysed) (0% confidence): AI analysis unavailable for this test. [View full analysis →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/pr-25/)

[📊 Full Report →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/pr-25/)