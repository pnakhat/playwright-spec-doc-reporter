@api @DEMO-10
Feature: JSONPlaceholder REST API

  Scenario: Fetch all posts
    When I send a GET request to "https://jsonplaceholder.typicode.com/posts"
    Then the response status should be 200
    And the response should be an array with at least 10 items

  Scenario: Fetch a single post
    When I send a GET request to "https://jsonplaceholder.typicode.com/posts/1"
    Then the response status should be 200
    And the response body should contain field "userId"
    And the response body should contain field "title"
    And the response body should contain field "body"

  @create
  Scenario: Create a new post
    When I send a POST request to "https://jsonplaceholder.typicode.com/posts" with JSON body:
      | title  | BDD + Playwright API Test       |
      | body   | Testing APIs with Gherkin steps |
      | userId | 1                               |
    Then the response status should be 201
    And the response body should contain field "id"

  @negative
  Scenario: Non-existent resource returns 404
    When I send a GET request to "https://jsonplaceholder.typicode.com/posts/9999"
    Then the response status should be 404

  Scenario: Fetch comments for a post
    When I send a GET request to "https://jsonplaceholder.typicode.com/posts/1/comments"
    Then the response status should be 200
    And the response should be an array with at least 1 items
    And each item in the response should contain field "email"
