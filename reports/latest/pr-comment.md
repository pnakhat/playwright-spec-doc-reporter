## 🎭 Test Report · Run #68
commit `f0c4e2e6`

| | Result |
|---|---|
| ✅ Passed | 23 |
| ❌ Failed | 4 |
| ⏭️ Skipped | 1 |
| 📊 Total | 28 |
| ⏱️ Duration | 19s |

### ❌ Failed Tests
- ❌ ` › chromium › ui/saucedemo.spec.js › AI Failure Analysis › intentional failure for AI analysis demo @regression` — *Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed*
- ❌ `Shopping Cart › Cart persists items after page refresh` — *Cart badge resets to 0 after hard refresh — session storage not persisted*
- ❌ `Authentication › Login error clears when user starts retyping` — *Error message persists even after the user clears the username field — no auto-dismiss*
- ❌ `Product Detail › Checkout cancel on step 2 returns to inventory` — *Cancel on step 2 navigates to /cart.html instead of /inventory.html — unexpected destination*

> 🤖 **AI Analysis** (4 failures analysed) (97% confidence): The test 'intentional failure for AI analysis demo @regression' fails because it attempts to assert visibility of a heading element with the text 'Non Existing Header', which does not exist in the DOM [View full analysis →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/latest/)

[📊 Full Report →](https://pnakhat.github.io/playwright-spec-doc-reporter/reports/latest/)