@ui @docs-site
Feature: Playwright Documentation Site
  As a developer new to end-to-end testing
  I want to browse the Playwright documentation site
  So that I can learn how to write reliable tests

  Background:
    Given I open the Playwright homepage

  @smoke @SCRUM-1
  Scenario: Homepage shows the hero title
    The hero banner should advertise reliable end-to-end testing.

    Then the page title contains "Playwright"
    And the hero title mentions "Playwright"

  @navigation @SCRUM-2
  Scenario: Get started link leads to the installation docs
    When I click the "Get started" link
    Then the page URL contains "intro"

  Rule: Primary sections are reachable from the top navigation

    @navigation
    Scenario Outline: Top navigation exposes the "<link>" section
      Then the top navigation shows the "<link>" link

      Examples:
        | link |
        | Docs |
        | API  |
