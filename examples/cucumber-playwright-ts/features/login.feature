@smoke @auth @DEMO-1
Feature: User Authentication

  Background:
    Given the application is running

  @positive @DEMO-2
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter username "standard_user" and password "secret_sauce"
    And I click the login button
    Then I should see the products page
    And the page title should be "Products"

  @positive
  Scenario: Login persists across page reload
    Given I am on the login page
    When I enter username "standard_user" and password "secret_sauce"
    And I click the login button
    Then I should see the products page
    When I reload the page
    Then I should still see the products page

  @negative @DEMO-3
  Scenario: Login fails with invalid credentials
    Given I am on the login page
    When I enter username "locked_out_user" and password "secret_sauce"
    And I click the login button
    Then I should see an error message "Epic sadface: Sorry, this user has been locked out."

  @negative
  Scenario: Login fails with empty credentials
    Given I am on the login page
    When I click the login button
    Then I should see an error message "Epic sadface: Username is required"
