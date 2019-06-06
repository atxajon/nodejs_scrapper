const puppeteer = require('puppeteer')
const url = 'https://register.fca.org.uk/directory/s/';

// const postCode = 'AL1';

const settings   = require('./settings/searchedPostcodes');
const postcodes  = settings.postcodes;

// const postCodes = ['LU3', 'LU4'];

void (async () => {
  let allData = [];
  try {
    // Use headless:false to debug behavior by viewing actions on chrome.
    // const browser = await puppeteer.launch({headless: false});
    const browser = await puppeteer.launch();
    
    // create a page inside the browser
    const page = await browser.newPage()
    await page.goto(`${url}`);
    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.2.1.min.js'})
    
    // Pass in session cookie;
    // Without it there is no loading of the directory search page.
    const cookies = [{
      'name': 'renderCtx',
      'value': '%7B%22pageId%22%3A%221828c602-e8aa-4dbb-9979-311affff64c5%22%2C%22schema%22%3A%22Published%22%2C%22viewType%22%3A%22Published%22%2C%22brandingSetId%22%3A%223cacc417-eded-4cfd-994d-5a65187daf78%22%2C%22audienceIds%22%3A%226Au0X00000000vI%22%7D'
    }];

    const formPostcodeInputId = '#input-8';
    const formInvestmentsCheckboxId = '#checkbox-12';
    const formPensionsCheckboxId = '#checkbox-13';
    const formSearchBtn = '.searchBtn';
    const pagerResultsSelect = '.slds-large-size_6-of-12 .slds-select';
    
    await page.setCookie(...cookies);
    await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'});
    
    // Use this to debug passed in session cookie.
    // const cookiesSet = await page.cookies(url);
    // console.log(JSON.stringify(cookiesSet));
    
    await page.waitFor(2000);

    // Check investments checkbox.
    await page.evaluate(()=>document.querySelector('#checkbox-12').click())
    // Check pensions checkbox.
    await page.evaluate(()=>document.querySelector('#checkbox-13').click())
    
    for (let i = 0; i < postcodes.length; i++) {
      await page.waitFor('input[name=postcode]');
      
      // Type into postcode input.
      // First empty any text in it.
      const elementHandle = await page.$('#input-8');
      await page.focus('#input-8');
      // Three clicks hack to select everything in the box.
      await elementHandle.click({clickCount: 3});
      await elementHandle.press('Backspace');
      page.keyboard.type(postcodes[i]);

      // Click on search button.
      await page.waitFor(200);
      await page.evaluate(()=>document.querySelector('.searchBtn').click())
  
      await page.waitFor('#ResultSection');
      // Delay to wait for results then click to return 200 results.
      await page.waitFor(20000);
      await page.select('.slds-large-size_6-of-12 .slds-select', '200')
  
      await page.waitFor(10000);
  
      // Store values for searched postcode.
      const scrapedData = await page.evaluate(() => {
        function collateData(value, propertyKey) {
          for (var i = 0; i < value.length; i++) {
            if (propertyKey === 'link') {
              let link = value[i].href;
              let parsedLink = link.replace('file:///',"");
              value[i].textContent = 'https://register.fca.org.uk/' + parsedLink;
            }
            if (propertyKey === 'address') {
              // Clean out address string containing ↵ char.
              value[i].textContent = value[i].textContent.replace(/[\n\r]/g, ''); 
              value[i].textContent = value[i].textContent.replace(/,/g, '');
            }
            if (propertyKey === 'phone') {
              // Clean out phones containing - char.
              value[i].textContent = value[i].textContent.replace('-','');
            }
            allData[i][propertyKey] = value[i].textContent;
          }
        }
  
        let allData = [];
        let titleLinks = document.querySelectorAll("a.titleClass");
        for (var i = 0; i < titleLinks.length; i++) {
          allData.push({
            name: titleLinks[i].textContent
          });
        }
        
        let allLinks = document.querySelectorAll(".titleClass");
        collateData(allLinks, 'link');
        
        let addresses = document.querySelectorAll("td.tabledataContentStyleClass");
        collateData(addresses, 'address');
        
        let phones = $(".slds-icon-utility-call").parent().next().find('.tabledataContentStyleClass');
        collateData(phones, 'phone');
        
        // Firm reference number can appear more than once for each returned result: we discard page right hand side's firm ref number of authorised principal, by selecting just the element on the left, which happens to have this given class...
        let firm_ref_no = $('.slds-p-right_large').find('td:contains("Firm reference")');
        for (var i = 0; i < firm_ref_no.length; i++) {
          let firm_ref_no_all_text = firm_ref_no[i].innerText;
          let parsed_out_digits = firm_ref_no_all_text.match(/\d+/g);
          allData[i]['firm_reference_number'] = parsed_out_digits[0];
        }
        
        let status = $(".firmStatusStyleClass");
        collateData(status, 'status');
        
        let emails = $(".slds-icon-utility-email").parent().next().find('.tabledataContentStyleClass');
        collateData(emails, 'email');
        return allData;
      });
  
      // Write stored values to csv file.
      createCSV(scrapedData, postcodes[i]);
    }

    
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
  // createCSV(scrapedData);
})()


const createCSV = (data, postcode) => {
  // Use json2csv package https://github.com/zemirco/json2csv
  const { Parser } = require('json2csv');  
  const colHeader = ['Company ref number', 'Individuals'];
  const json2csvParser = new Parser({ colHeader });
  const csv = json2csvParser.parse(data);
  const fs = require('fs')
  // @todo: replace hardcoded postcode for bulk processing of files.
  fs.writeFile(
    './csv_by_postcode/' + postcode + '.csv',
    csv,
    (err) => err ? console.error('Data not written!', err) : console.log('Data written for postcode ' + postcode)
  )
};