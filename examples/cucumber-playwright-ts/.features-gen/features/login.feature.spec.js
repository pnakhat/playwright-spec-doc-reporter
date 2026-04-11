// Generated from: features/login.feature
import { test } from "../../support/fixtures.ts";

test.describe('User Authentication', () => {

  test.beforeEach('Background', async ({ Given, baseUrl, page }, testInfo) => { if (testInfo.error) return;
    await Given('the application is running', null, { baseUrl, page }); 
  });
  
  test('Successful login with valid credentials', { tag: ['@smoke', '@auth', '@positive'] }, async ({ Given, When, Then, And, apiRequest, apiResponse, baseUrl, page }) => { 
    await Given('I am on the login page', null, { baseUrl, page }); 
    await When('I enter username "standard_user" and password "secret_sauce"', null, { page }); 
    await And('I click the login button', null, { apiRequest, apiResponse, baseUrl, page }); 
    await Then('I should see the products page', null, { page }); 
    await And('the page title should be "Products"', null, { page }); 
  });

  test('Login persists across page reload', { tag: ['@smoke', '@auth', '@positive'] }, async ({ Given, When, Then, And, apiRequest, apiResponse, baseUrl, page }) => { 
    await Given('I am on the login page', null, { baseUrl, page }); 
    await When('I enter username "standard_user" and password "secret_sauce"', null, { page }); 
    await And('I click the login button', null, { apiRequest, apiResponse, baseUrl, page }); 
    await Then('I should see the products page', null, { page }); 
    await When('I reload the page', null, { page }); 
    await Then('I should still see the products page', null, { page }); 
  });

  test('Login fails with invalid credentials', { tag: ['@smoke', '@auth', '@negative'] }, async ({ Given, When, Then, And, apiRequest, apiResponse, baseUrl, page }) => { 
    await Given('I am on the login page', null, { baseUrl, page }); 
    await When('I enter username "locked_out_user" and password "secret_sauce"', null, { page }); 
    await And('I click the login button', null, { apiRequest, apiResponse, baseUrl, page }); 
    await Then('I should see an error message "Epic sadface: Sorry, this user has been locked out."', null, { page }); 
  });

  test('Login fails with empty credentials', { tag: ['@smoke', '@auth', '@negative'] }, async ({ Given, When, Then, apiRequest, apiResponse, baseUrl, page }) => { 
    await Given('I am on the login page', null, { baseUrl, page }); 
    await When('I click the login button', null, { apiRequest, apiResponse, baseUrl, page }); 
    await Then('I should see an error message "Epic sadface: Username is required"', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/login.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":8,"tags":["@smoke","@auth","@positive"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given the application is running","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":9,"keywordType":"Context","textWithKeyword":"Given I am on the login page","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":10,"keywordType":"Action","textWithKeyword":"When I enter username \"standard_user\" and password \"secret_sauce\"","stepMatchArguments":[{"group":{"start":17,"value":"\"standard_user\"","children":[{"start":18,"value":"standard_user","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":46,"value":"\"secret_sauce\"","children":[{"start":47,"value":"secret_sauce","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":11,"keywordType":"Action","textWithKeyword":"And I click the login button","stepMatchArguments":[]},{"pwStepLine":14,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"Then I should see the products page","stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":13,"keywordType":"Outcome","textWithKeyword":"And the page title should be \"Products\"","stepMatchArguments":[{"group":{"start":25,"value":"\"Products\"","children":[{"start":26,"value":"Products","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":18,"pickleLine":16,"tags":["@smoke","@auth","@positive"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given the application is running","isBg":true,"stepMatchArguments":[]},{"pwStepLine":19,"gherkinStepLine":17,"keywordType":"Context","textWithKeyword":"Given I am on the login page","stepMatchArguments":[]},{"pwStepLine":20,"gherkinStepLine":18,"keywordType":"Action","textWithKeyword":"When I enter username \"standard_user\" and password \"secret_sauce\"","stepMatchArguments":[{"group":{"start":17,"value":"\"standard_user\"","children":[{"start":18,"value":"standard_user","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":46,"value":"\"secret_sauce\"","children":[{"start":47,"value":"secret_sauce","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":21,"gherkinStepLine":19,"keywordType":"Action","textWithKeyword":"And I click the login button","stepMatchArguments":[]},{"pwStepLine":22,"gherkinStepLine":20,"keywordType":"Outcome","textWithKeyword":"Then I should see the products page","stepMatchArguments":[]},{"pwStepLine":23,"gherkinStepLine":21,"keywordType":"Action","textWithKeyword":"When I reload the page","stepMatchArguments":[]},{"pwStepLine":24,"gherkinStepLine":22,"keywordType":"Outcome","textWithKeyword":"Then I should still see the products page","stepMatchArguments":[]}]},
  {"pwTestLine":27,"pickleLine":25,"tags":["@smoke","@auth","@negative"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given the application is running","isBg":true,"stepMatchArguments":[]},{"pwStepLine":28,"gherkinStepLine":26,"keywordType":"Context","textWithKeyword":"Given I am on the login page","stepMatchArguments":[]},{"pwStepLine":29,"gherkinStepLine":27,"keywordType":"Action","textWithKeyword":"When I enter username \"locked_out_user\" and password \"secret_sauce\"","stepMatchArguments":[{"group":{"start":17,"value":"\"locked_out_user\"","children":[{"start":18,"value":"locked_out_user","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":48,"value":"\"secret_sauce\"","children":[{"start":49,"value":"secret_sauce","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":30,"gherkinStepLine":28,"keywordType":"Action","textWithKeyword":"And I click the login button","stepMatchArguments":[]},{"pwStepLine":31,"gherkinStepLine":29,"keywordType":"Outcome","textWithKeyword":"Then I should see an error message \"Epic sadface: Sorry, this user has been locked out.\"","stepMatchArguments":[{"group":{"start":30,"value":"\"Epic sadface: Sorry, this user has been locked out.\"","children":[{"start":31,"value":"Epic sadface: Sorry, this user has been locked out.","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":34,"pickleLine":32,"tags":["@smoke","@auth","@negative"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given the application is running","isBg":true,"stepMatchArguments":[]},{"pwStepLine":35,"gherkinStepLine":33,"keywordType":"Context","textWithKeyword":"Given I am on the login page","stepMatchArguments":[]},{"pwStepLine":36,"gherkinStepLine":34,"keywordType":"Action","textWithKeyword":"When I click the login button","stepMatchArguments":[]},{"pwStepLine":37,"gherkinStepLine":35,"keywordType":"Outcome","textWithKeyword":"Then I should see an error message \"Epic sadface: Username is required\"","stepMatchArguments":[{"group":{"start":30,"value":"\"Epic sadface: Username is required\"","children":[{"start":31,"value":"Epic sadface: Username is required","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end