// Generated from: features/api.feature
import { test } from "../../support/fixtures.ts";

test.describe('JSONPlaceholder REST API', () => {

  test('Fetch all posts', { tag: ['@api'] }, async ({ When, Then, And, apiRequest, apiResponse }) => { 
    await When('I send a GET request to "https://jsonplaceholder.typicode.com/posts"', null, { apiRequest, apiResponse }); 
    await Then('the response status should be 200'); 
    await And('the response should be an array with at least 10 items'); 
  });

  test('Fetch a single post', { tag: ['@api'] }, async ({ When, Then, And, apiRequest, apiResponse }) => { 
    await When('I send a GET request to "https://jsonplaceholder.typicode.com/posts/1"', null, { apiRequest, apiResponse }); 
    await Then('the response status should be 200'); 
    await And('the response body should contain field "userId"'); 
    await And('the response body should contain field "title"'); 
    await And('the response body should contain field "body"'); 
  });

  test('Create a new post', { tag: ['@api', '@create'] }, async ({ When, Then, And, apiRequest, apiResponse }) => { 
    await When('I send a POST request to "https://jsonplaceholder.typicode.com/posts" with JSON body:', {"dataTable":{"rows":[{"cells":[{"value":"title"},{"value":"BDD + Playwright API Test"}]},{"cells":[{"value":"body"},{"value":"Testing APIs with Gherkin steps"}]},{"cells":[{"value":"userId"},{"value":"1"}]}]}}, { apiRequest, apiResponse }); 
    await Then('the response status should be 201'); 
    await And('the response body should contain field "id"'); 
  });

  test('Non-existent resource returns 404', { tag: ['@api', '@negative'] }, async ({ When, Then, apiRequest, apiResponse }) => { 
    await When('I send a GET request to "https://jsonplaceholder.typicode.com/posts/9999"', null, { apiRequest, apiResponse }); 
    await Then('the response status should be 404'); 
  });

  test('Fetch comments for a post', { tag: ['@api'] }, async ({ When, Then, And, apiRequest, apiResponse }) => { 
    await When('I send a GET request to "https://jsonplaceholder.typicode.com/posts/1/comments"', null, { apiRequest, apiResponse }); 
    await Then('the response status should be 200'); 
    await And('the response should be an array with at least 1 items'); 
    await And('each item in the response should contain field "email"'); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/api.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":6,"pickleLine":4,"tags":["@api"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Action","textWithKeyword":"When I send a GET request to \"https://jsonplaceholder.typicode.com/posts\"","stepMatchArguments":[{"group":{"start":24,"value":"\"https://jsonplaceholder.typicode.com/posts\"","children":[{"start":25,"value":"https://jsonplaceholder.typicode.com/posts","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":8,"gherkinStepLine":6,"keywordType":"Outcome","textWithKeyword":"Then the response status should be 200","stepMatchArguments":[{"group":{"start":30,"value":"200","children":[]},"parameterTypeName":"int"}]},{"pwStepLine":9,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"And the response should be an array with at least 10 items","stepMatchArguments":[{"group":{"start":46,"value":"10","children":[]},"parameterTypeName":"int"}]}]},
  {"pwTestLine":12,"pickleLine":9,"tags":["@api"],"steps":[{"pwStepLine":13,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"When I send a GET request to \"https://jsonplaceholder.typicode.com/posts/1\"","stepMatchArguments":[{"group":{"start":24,"value":"\"https://jsonplaceholder.typicode.com/posts/1\"","children":[{"start":25,"value":"https://jsonplaceholder.typicode.com/posts/1","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Then the response status should be 200","stepMatchArguments":[{"group":{"start":30,"value":"200","children":[]},"parameterTypeName":"int"}]},{"pwStepLine":15,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"And the response body should contain field \"userId\"","stepMatchArguments":[{"group":{"start":39,"value":"\"userId\"","children":[{"start":40,"value":"userId","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":16,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"And the response body should contain field \"title\"","stepMatchArguments":[{"group":{"start":39,"value":"\"title\"","children":[{"start":40,"value":"title","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":17,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"And the response body should contain field \"body\"","stepMatchArguments":[{"group":{"start":39,"value":"\"body\"","children":[{"start":40,"value":"body","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":20,"pickleLine":17,"tags":["@api","@create"],"steps":[{"pwStepLine":21,"gherkinStepLine":18,"keywordType":"Action","textWithKeyword":"When I send a POST request to \"https://jsonplaceholder.typicode.com/posts\" with JSON body:","stepMatchArguments":[{"group":{"start":25,"value":"\"https://jsonplaceholder.typicode.com/posts\"","children":[{"start":26,"value":"https://jsonplaceholder.typicode.com/posts","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":22,"gherkinStepLine":22,"keywordType":"Outcome","textWithKeyword":"Then the response status should be 201","stepMatchArguments":[{"group":{"start":30,"value":"201","children":[]},"parameterTypeName":"int"}]},{"pwStepLine":23,"gherkinStepLine":23,"keywordType":"Outcome","textWithKeyword":"And the response body should contain field \"id\"","stepMatchArguments":[{"group":{"start":39,"value":"\"id\"","children":[{"start":40,"value":"id","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":26,"pickleLine":26,"tags":["@api","@negative"],"steps":[{"pwStepLine":27,"gherkinStepLine":27,"keywordType":"Action","textWithKeyword":"When I send a GET request to \"https://jsonplaceholder.typicode.com/posts/9999\"","stepMatchArguments":[{"group":{"start":24,"value":"\"https://jsonplaceholder.typicode.com/posts/9999\"","children":[{"start":25,"value":"https://jsonplaceholder.typicode.com/posts/9999","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":28,"gherkinStepLine":28,"keywordType":"Outcome","textWithKeyword":"Then the response status should be 404","stepMatchArguments":[{"group":{"start":30,"value":"404","children":[]},"parameterTypeName":"int"}]}]},
  {"pwTestLine":31,"pickleLine":30,"tags":["@api"],"steps":[{"pwStepLine":32,"gherkinStepLine":31,"keywordType":"Action","textWithKeyword":"When I send a GET request to \"https://jsonplaceholder.typicode.com/posts/1/comments\"","stepMatchArguments":[{"group":{"start":24,"value":"\"https://jsonplaceholder.typicode.com/posts/1/comments\"","children":[{"start":25,"value":"https://jsonplaceholder.typicode.com/posts/1/comments","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":33,"gherkinStepLine":32,"keywordType":"Outcome","textWithKeyword":"Then the response status should be 200","stepMatchArguments":[{"group":{"start":30,"value":"200","children":[]},"parameterTypeName":"int"}]},{"pwStepLine":34,"gherkinStepLine":33,"keywordType":"Outcome","textWithKeyword":"And the response should be an array with at least 1 items","stepMatchArguments":[{"group":{"start":46,"value":"1","children":[]},"parameterTypeName":"int"}]},{"pwStepLine":35,"gherkinStepLine":34,"keywordType":"Outcome","textWithKeyword":"And each item in the response should contain field \"email\"","stepMatchArguments":[{"group":{"start":47,"value":"\"email\"","children":[{"start":48,"value":"email","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end