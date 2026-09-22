// @ts-check
import { test, expect } from '@playwright/test';

const URL_PAGE = 'https://google.com';
//need to use async await
// test.skip('hello world - browser context - first playwright test', async ({browser}) =>{
//   //create an anonymous browser - by that creating new context
//   const context =  await browser.newContext(); // new browser instance
//   const page =  await context.newPage();

//   await  page.goto(URL_PAGE);
  
  
//   // async process - steps only work after another
//   //step 1 open browser
//   //step 2 enter u/p 2sec
//   //step 3 click

// })

test('hello world - open google - page second playwright test', async ({page}) =>{
  //create an anonymous browser - by that creating new context
  await  page.goto(URL_PAGE);

  await expect(page).toHaveTitle(/Google/);
})

//failed
test('hello world - open yahoo to fail - page second playwright test', async ({page}) =>{
  //create an anonymous browser - by that creating new context
  await  page.goto(URL_PAGE);

  await expect(page).toHaveTitle(/Bing/);
})