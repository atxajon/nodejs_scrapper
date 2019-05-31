const puppeteer = require('puppeteer')
const url = 'https://register.fca.org.uk/directory/s/';
const postCode = 'AL1';


// this wrapper means immediately execute this code
void (async () => {
  let allData = [];
  try {
    // create a new browser instance
    const browser = await puppeteer.launch({headless: false});
    // const browser = await puppeteer.launch()
    
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
    await page.$eval('input[name=postcode]', el => el.value = 'AL1');    
    await page.click('.searchBtn');
    // await page.waitFor('.ui-widget');
    await page.waitForSelector('.searchBtn');
    await page.waitFor(8000);


    
    // Uncomment if you need screengrabs.
    await page.setViewport({ width: 1920, height: 1080 });
    await page.screenshot({
      path: './directory.png',
      fullPage: true
    })
    
    const html = await page.content();
    const fs = require('fs')
    // @todo: replace hardcoded postcode for bulk processing of files.
    fs.writeFile(
      './test.html',
      html,
      (err) => err ? console.error('Data not written!', err) : console.log('Data written!')
    )
    
    
    // Uncomment to generate a pdf of the page.
    // await page.pdf({ path: './pdfs/page1.pdf' })
    
    // const individuals_string  = await page.evaluate(() => {
    //   let individuals = '';
    //   if ($('.panel-title a:contains("Individuals")').length) {
    //     $('.panel-title a:contains("Individuals")').click();
    //     var individualsRows = document.querySelectorAll('.SearchResultsTable tbody tr');
    //     if (individualsRows) {
    //       let individualCount = 0;
    //       for(var i = 0; i < individualsRows.length; i++){              
    //         let individual = '';
    //         if (individualCount > 0) {
    //           individual +=  individual + ' / ';
    //         }
    //         let name = individualsRows[i].querySelector("a").textContent;
    
    //         individual += name;
    
    //         let tds = individualsRows[i].getElementsByTagName("td");
    //         let ind_ref_no = tds[1].textContent;
    //         individual += '-' + ind_ref_no;
    
    //         let ind_status = tds[2].textContent;
    //         individual += '-' + ind_status;
    //         individuals += individual;
    //         individualCount++;
    //       }
    //     } 
    //     return individuals;
    //   }
    // });
    
    // Check if under permissions accordion tab there is permission to retail investment.
    // const investmentsAdvice  = await page.evaluate(() => {
    //   let advising_on_investments = false;
    //   if ($('.panel-title a:contains("Permission")').length) {
    //     $('.panel-title a:contains("Permission")').click();
    //     if ($('li.PermCondsLimitationsItem:contains("Retail (Investment)")').length) {
    //       advising_on_investments = true;
    //     }                                                                                       
    //   }
    //   return advising_on_investments;
    // });
    
    
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