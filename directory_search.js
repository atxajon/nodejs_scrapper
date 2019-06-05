const puppeteer = require('puppeteer')
const url = 'https://register.fca.org.uk/directory/s/';
const postCode = 'AL1';


// this wrapper means immediately execute this code
void (async () => {
  let allData = [];
  try {
    const browser = await puppeteer.launch({headless: false});
    
    // create a page inside the browser
    const page = await browser.newPage()
    // await page.waitFor(8000);
    // await page.goto(url, {waitUntil: 'load'});
    await page.goto(`${url}`);
    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.2.1.min.js'})
    
    // Pass in session cookie;
    // Without it there is no loading of the directory search page.
    const cookies = [{
      'name': 'renderCtx',
      'value': '%7B%22pageId%22%3A%221828c602-e8aa-4dbb-9979-311affff64c5%22%2C%22schema%22%3A%22Published%22%2C%22viewType%22%3A%22Published%22%2C%22brandingSetId%22%3A%223cacc417-eded-4cfd-994d-5a65187daf78%22%2C%22audienceIds%22%3A%226Au0X00000000vI%22%7D'
    }];
    
    await page.setCookie(...cookies);
    const cookiesSet = await page.cookies(url);
    // console.log(JSON.stringify(cookiesSet));
    
    await page.waitFor('input[name=postcode]');
    // Type into postcode input.
    await page.focus('#input-8');
    // @todo: replace hardcoded with array of values.
    page.keyboard.type('AL1');
    // Check investments checkbox.
    await page.evaluate(()=>document.querySelector('#checkbox-12').click())
    // Check pensions checkbox.
    await page.evaluate(()=>document.querySelector('#checkbox-13').click())
    // Click on search button.
    await page.evaluate(()=>document.querySelector('.searchBtn').click())

    await page.waitFor('#ResultSection');
    await page.waitFor('.slds-select');
    // @todo: Click on show all results.
    await page.select('.slds-select', '200')

    await page.waitFor(19000);
    
    const html = await page.content();
    const fs = require('fs')
    fs.writeFile(
      './test.html',
      html,
      (err) => err ? console.error('Data not written!', err) : console.log('Data written!')
    )
  
    // allData.push({
    //   ref_number: ref_no,
    //   individuals: individuals_string,
    //   advising_on_investments: investmentsAdvice
    // });
    
    
    // all done, close this browser
    await browser.close()
  } catch (error) {
    // if something goes wrong
    // display the error message in console
    console.log(error)
  }  
  // Write all collected data to csv file.
  //createCSV(allData);
})()


const createCSV = (data) => {
  // Use json2csv package https://github.com/zemirco/json2csv
  const { Parser } = require('json2csv');  
  const colHeader = ['Company ref number', 'Individuals'];
  const json2csvParser = new Parser({ colHeader });
  const csv = json2csvParser.parse(data);
  const fs = require('fs')
  // @todo: replace hardcoded postcode for bulk processing of files.
  fs.writeFile(
    './csv/AL1.csv',
    csv,
    (err) => err ? console.error('Data not written!', err) : console.log('Data written!')
  )
};