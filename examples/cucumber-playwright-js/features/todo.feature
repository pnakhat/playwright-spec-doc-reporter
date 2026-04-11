@todo @smoke @DEMO-20
Feature: Todo Application

  Background:
    Given I open the todo app

  Scenario: Add a new todo item
    When I type "Buy groceries" in the todo input
    And I press Enter
    Then I should see "Buy groceries" in the list
    And the active count should be "1 item left"

  Scenario: Complete a todo item
    Given I have added the todo "Walk the dog"
    When I click the checkbox next to "Walk the dog"
    Then "Walk the dog" should be marked as completed

  Scenario: Delete a todo item
    Given I have added the todo "Read a book"
    When I hover over "Read a book"
    And I click the delete button
    Then "Read a book" should not be in the list

  @filter
  Scenario: Filter active todos
    Given I have added the todo "Write tests"
    And I have added the todo "Deploy app"
    And I have completed "Deploy app"
    When I click the "Active" filter
    Then I should see "Write tests" in the list
    And I should not see "Deploy app" in the list

  @filter
  Scenario: Filter completed todos
    Given I have added the todo "Write tests"
    And I have added the todo "Deploy app"
    And I have completed "Deploy app"
    When I click the "Completed" filter
    Then I should see "Deploy app" in the list
    And I should not see "Write tests" in the list
