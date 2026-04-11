@cart
Feature: Shopping Cart

  Background:
    Given I am logged in as "standard_user"

  Scenario: Add a product to the cart
    Given I am on the products page
    When I add "Sauce Labs Backpack" to the cart
    Then the cart badge should show "1"
    And "Sauce Labs Backpack" should appear in the cart

  Scenario: Remove a product from the cart
    Given I am on the products page
    And I have added "Sauce Labs Backpack" to the cart
    When I remove "Sauce Labs Backpack" from the cart
    Then the cart badge should not be visible

  @checkout
  Scenario: Complete checkout flow
    Given I am on the products page
    And I have added "Sauce Labs Backpack" to the cart
    When I proceed to checkout
    And I enter my details "John" "Doe" "10001"
    And I complete the order
    Then I should see the order confirmation page

  Scenario Outline: Add multiple products
    Given I am on the products page
    When I add "<product>" to the cart
    Then the cart badge should show "<count>"

    Examples:
      | product                 | count |
      | Sauce Labs Backpack     | 1     |
      | Sauce Labs Bike Light   | 1     |
