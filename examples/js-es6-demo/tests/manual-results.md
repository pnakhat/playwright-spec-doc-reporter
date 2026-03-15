# Feature: Shopping Cart

## Scenario: Standard user can view the product catalogue @PASS @smoke @SCRUM-1
Given I open the Saucedemo login page
When I enter standard_user credentials
Then I am redirected to the inventory page
And I can see at least 6 products listed
Notes: Verified manually on Chrome 124 and Firefox 125

## Scenario: Product images load correctly on inventory page @PASS @regression
Given I am logged in as standard_user
When I view the inventory page
Then all product images are visible and not broken
Notes: Spot-checked on Chrome; one image took ~2s on slow connection but loaded

## Scenario: Cart persists items after page refresh @FAIL @regression @SCRUM-1
Given I am logged in and have added 2 items to the cart
When I refresh the browser
Then the cart badge should still show 2
Error: Cart badge resets to 0 after hard refresh — session storage not persisted
Notes: Reproduced consistently on Chrome and Safari

## Scenario: User can sort products by name Z-A @PASS @regression
Given I am on the inventory page
When I select "Name (Z to A)" from the sort dropdown
Then the products are reordered alphabetically in reverse
And "Test.allTheThings() T-Shirt" appears last


# Feature: Authentication

## Scenario: Standard user login with correct credentials @PASS @smoke @auth
Given I am on the Saucedemo login page
When I enter username "standard_user" and password "secret_sauce"
Then I am redirected to /inventory.html
And the page title shows "Products"

## Scenario: Login page shows password field as masked @PASS @regression
Given I open the login page
When I inspect the password input field
Then the input type is "password" and characters are masked
Notes: Confirmed via browser devtools

## Scenario: Login error clears when user starts retyping @FAIL @regression @SCRUM-2
Given I have submitted invalid credentials and see the error message
When I start typing in the username field
Then the error message should be dismissed automatically
Error: Error message persists even after the user clears the username field — no auto-dismiss
Notes: Tested on Chrome 124; the X dismiss button works but auto-clear does not

## Scenario: Performance glitch user experiences delayed page load @SKIP @regression
Given I log in as performance_glitch_user
When the inventory page loads
Then it should load within 3 seconds
Notes: Skipped — test environment has unstable network; will revisit in next sprint


# Feature: Checkout Flow

## Complete checkout happy path — exploratory session @PASS @smoke @critical
Notes: Full end-to-end checkout completed manually. Added Sauce Labs Backpack, proceeded through checkout steps, entered name and zip, confirmed order. Order confirmation page displayed correctly with "Thank you for your order!" message.

## Scenario: Checkout requires all three address fields @PASS @validation
Given I am on checkout step one
When I submit the form with only First Name filled in
Then I see "Last Name is required"
When I fill Last Name and resubmit
Then I see "Postal Code is required"
When I fill all fields
Then I proceed to checkout step two

## Scenario: Order summary shows correct item price before finishing @PASS @regression
Given I have added "Sauce Labs Bolt T-Shirt" ($15.99) to the cart
When I reach checkout step two
Then the item subtotal shows $15.99
And the tax amount is shown separately
And the total equals subtotal plus tax
Notes: Prices verified against the product listing page

## Scenario: Checkout cancel on step 2 returns to inventory @FAIL @regression
Given I am on checkout step two (order overview)
When I click the "Cancel" button
Then I should be returned to the inventory page
Error: Cancel on step 2 navigates to /cart.html instead of /inventory.html — unexpected destination
Notes: May be intentional UX but contradicts the "cancel checkout" expectation; raised with product team


# Feature: Product Detail

## Scenario: Product detail page shows all required information @PASS @smoke
Given I am on the inventory page
When I click on the "Sauce Labs Backpack" product name
Then I see the product detail page with name, price, description and image
And an "Add to cart" button is visible

## Scenario: Adding product from detail page updates cart badge @PASS @regression
Given I am on a product detail page
When I click "Add to cart"
Then the cart badge in the top-right updates to show 1
And the button text changes to "Remove"
