// Generated from: features/cart.feature
import { test } from "../../support/fixtures.ts";

test.describe('Shopping Cart', () => {

  test.beforeEach('Background', async ({ Given, baseUrl, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am logged in as "standard_user"', null, { baseUrl, page }); 
  });
  
  test('Add a product to the cart', { tag: ['@cart'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the products page', null, { page }); 
    await When('I add "Sauce Labs Backpack" to the cart', null, { page }); 
    await Then('the cart badge should show "1"', null, { page }); 
    await And('"Sauce Labs Backpack" should appear in the cart', null, { page }); 
  });

  test('Remove a product from the cart', { tag: ['@cart'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the products page', null, { page }); 
    await And('I have added "Sauce Labs Backpack" to the cart', null, { page }); 
    await When('I remove "Sauce Labs Backpack" from the cart', null, { page }); 
    await Then('the cart badge should not be visible', null, { page }); 
  });

  test('Complete checkout flow', { tag: ['@cart', '@checkout'] }, async ({ Given, When, Then, And, page }) => { 
    await Given('I am on the products page', null, { page }); 
    await And('I have added "Sauce Labs Backpack" to the cart', null, { page }); 
    await When('I proceed to checkout', null, { page }); 
    await And('I enter my details "John" "Doe" "10001"', null, { page }); 
    await And('I complete the order', null, { page }); 
    await Then('I should see the order confirmation page', null, { page }); 
  });

  test.describe('Add multiple products', () => {

    test('Example #1', { tag: ['@cart'] }, async ({ Given, When, Then, page }) => { 
      await Given('I am on the products page', null, { page }); 
      await When('I add "Sauce Labs Backpack" to the cart', null, { page }); 
      await Then('the cart badge should show "1"', null, { page }); 
    });

    test('Example #2', { tag: ['@cart'] }, async ({ Given, When, Then, page }) => { 
      await Given('I am on the products page', null, { page }); 
      await When('I add "Sauce Labs Bike Light" to the cart', null, { page }); 
      await Then('the cart badge should show "1"', null, { page }); 
    });

  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/cart.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":7,"tags":["@cart"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I am logged in as \"standard_user\"","isBg":true,"stepMatchArguments":[{"group":{"start":18,"value":"\"standard_user\"","children":[{"start":19,"value":"standard_user","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am on the products page","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":9,"keywordType":"Action","textWithKeyword":"When I add \"Sauce Labs Backpack\" to the cart","stepMatchArguments":[{"group":{"start":6,"value":"\"Sauce Labs Backpack\"","children":[{"start":7,"value":"Sauce Labs Backpack","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":13,"gherkinStepLine":10,"keywordType":"Outcome","textWithKeyword":"Then the cart badge should show \"1\"","stepMatchArguments":[{"group":{"start":27,"value":"\"1\"","children":[{"start":28,"value":"1","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":14,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"And \"Sauce Labs Backpack\" should appear in the cart","stepMatchArguments":[{"group":{"start":0,"value":"\"Sauce Labs Backpack\"","children":[{"start":1,"value":"Sauce Labs Backpack","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":17,"pickleLine":13,"tags":["@cart"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I am logged in as \"standard_user\"","isBg":true,"stepMatchArguments":[{"group":{"start":18,"value":"\"standard_user\"","children":[{"start":19,"value":"standard_user","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":14,"keywordType":"Context","textWithKeyword":"Given I am on the products page","stepMatchArguments":[]},{"pwStepLine":19,"gherkinStepLine":15,"keywordType":"Context","textWithKeyword":"And I have added \"Sauce Labs Backpack\" to the cart","stepMatchArguments":[{"group":{"start":13,"value":"\"Sauce Labs Backpack\"","children":[{"start":14,"value":"Sauce Labs Backpack","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":20,"gherkinStepLine":16,"keywordType":"Action","textWithKeyword":"When I remove \"Sauce Labs Backpack\" from the cart","stepMatchArguments":[{"group":{"start":9,"value":"\"Sauce Labs Backpack\"","children":[{"start":10,"value":"Sauce Labs Backpack","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":21,"gherkinStepLine":17,"keywordType":"Outcome","textWithKeyword":"Then the cart badge should not be visible","stepMatchArguments":[]}]},
  {"pwTestLine":24,"pickleLine":20,"tags":["@cart","@checkout"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I am logged in as \"standard_user\"","isBg":true,"stepMatchArguments":[{"group":{"start":18,"value":"\"standard_user\"","children":[{"start":19,"value":"standard_user","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":25,"gherkinStepLine":21,"keywordType":"Context","textWithKeyword":"Given I am on the products page","stepMatchArguments":[]},{"pwStepLine":26,"gherkinStepLine":22,"keywordType":"Context","textWithKeyword":"And I have added \"Sauce Labs Backpack\" to the cart","stepMatchArguments":[{"group":{"start":13,"value":"\"Sauce Labs Backpack\"","children":[{"start":14,"value":"Sauce Labs Backpack","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":27,"gherkinStepLine":23,"keywordType":"Action","textWithKeyword":"When I proceed to checkout","stepMatchArguments":[]},{"pwStepLine":28,"gherkinStepLine":24,"keywordType":"Action","textWithKeyword":"And I enter my details \"John\" \"Doe\" \"10001\"","stepMatchArguments":[{"group":{"start":19,"value":"\"John\"","children":[{"start":20,"value":"John","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":26,"value":"\"Doe\"","children":[{"start":27,"value":"Doe","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"},{"group":{"start":32,"value":"\"10001\"","children":[{"start":33,"value":"10001","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":29,"gherkinStepLine":25,"keywordType":"Action","textWithKeyword":"And I complete the order","stepMatchArguments":[]},{"pwStepLine":30,"gherkinStepLine":26,"keywordType":"Outcome","textWithKeyword":"Then I should see the order confirmation page","stepMatchArguments":[]}]},
  {"pwTestLine":35,"pickleLine":35,"tags":["@cart"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I am logged in as \"standard_user\"","isBg":true,"stepMatchArguments":[{"group":{"start":18,"value":"\"standard_user\"","children":[{"start":19,"value":"standard_user","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":36,"gherkinStepLine":29,"keywordType":"Context","textWithKeyword":"Given I am on the products page","stepMatchArguments":[]},{"pwStepLine":37,"gherkinStepLine":30,"keywordType":"Action","textWithKeyword":"When I add \"Sauce Labs Backpack\" to the cart","stepMatchArguments":[{"group":{"start":6,"value":"\"Sauce Labs Backpack\"","children":[{"start":7,"value":"Sauce Labs Backpack","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":38,"gherkinStepLine":31,"keywordType":"Outcome","textWithKeyword":"Then the cart badge should show \"1\"","stepMatchArguments":[{"group":{"start":27,"value":"\"1\"","children":[{"start":28,"value":"1","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":41,"pickleLine":36,"tags":["@cart"],"steps":[{"pwStepLine":7,"gherkinStepLine":5,"keywordType":"Context","textWithKeyword":"Given I am logged in as \"standard_user\"","isBg":true,"stepMatchArguments":[{"group":{"start":18,"value":"\"standard_user\"","children":[{"start":19,"value":"standard_user","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":42,"gherkinStepLine":29,"keywordType":"Context","textWithKeyword":"Given I am on the products page","stepMatchArguments":[]},{"pwStepLine":43,"gherkinStepLine":30,"keywordType":"Action","textWithKeyword":"When I add \"Sauce Labs Bike Light\" to the cart","stepMatchArguments":[{"group":{"start":6,"value":"\"Sauce Labs Bike Light\"","children":[{"start":7,"value":"Sauce Labs Bike Light","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":44,"gherkinStepLine":31,"keywordType":"Outcome","textWithKeyword":"Then the cart badge should show \"1\"","stepMatchArguments":[{"group":{"start":27,"value":"\"1\"","children":[{"start":28,"value":"1","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end