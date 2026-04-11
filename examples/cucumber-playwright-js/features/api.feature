@api @DEMO-30
Feature: JSONPlaceholder API

  Scenario: Fetch a list of posts
    When I send a GET request to "/posts"
    Then the response status should be 200
    And the response should contain at least 10 posts

  Scenario: Fetch a single post
    When I send a GET request to "/posts/1"
    Then the response status should be 200
    And the response body should have "userId" field
    And the response body should have "title" field

  Scenario: Create a new post
    When I send a POST request to "/posts" with body:
      """
      {
        "title": "BDD with Playwright",
        "body": "Testing APIs with Gherkin",
        "userId": 1
      }
      """
    Then the response status should be 201
    And the response body should have "id" field

  @negative
  Scenario: Fetch non-existent post returns 404
    When I send a GET request to "/posts/9999"
    Then the response status should be 404
