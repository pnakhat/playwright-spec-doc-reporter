@api @DEMO-42
Feature: JSONPlaceholder Posts API
  As an API consumer
  I want to fetch posts from the JSONPlaceholder service
  So that I can display them in my application

  @smoke
  Scenario: Fetch a single post
    Fetches post 1 and validates the payload shape.
    The request and response appear inline in the glossy report.

    When I GET the post with id 1
    Then the response status is 200
    And the post title is not empty

  @negative
  Scenario: Fetching a missing post returns 404
    When I GET the post with id 999999
    Then the response status is 404
