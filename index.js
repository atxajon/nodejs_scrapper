const puppeteer = require('puppeteer')

let csv = require('csv'); 
let CSVobj = csv(); 
let urls = []; 
// Capture third argument as postcode.
const args = process.argv.slice(2);
const postcode = args[0];
CSVobj.from.path('./csv_by_postcode/' + postcode + '.csv').to.array(function (data) {
    for (let i = 0; i < data.length; i++) {
        // First iteration it's the csv header, let's skip it.
        if (i == 0) continue;
        // We're only interested in col 2: urls.
        urls.push(data[i][1]);
    }
});

void (async () => {
    // create a new browser instance
    const browser = await puppeteer.launch();
    let allData = [];
        
    for (let i = 0; i < urls.length; i++) {
        try {  
            console.log(`Scraping data from ${urls[i]}`);
            const url = urls[i];
            const page = await browser.newPage();
            await page.waitFor(1000);
            await page.goto(`${url}`);
            await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'});
            
            const ref_no = await page.evaluate(() => {
                return document.querySelector(".ReferenceNumber span").textContent;
            });
            
            // Uncomment if you need screengrabs.
            // await page.setViewport({ width: 1920, height: 1080 });
            // await page.screenshot({
            //   path: './screenshots/' + ref_no + '.png',
            //   fullPage: true
            // })
            
            // Uncomment to generate a pdf of the page.
            // await page.pdf({ path: './pdfs/page1.pdf' })

            // Delay to properly capture all individuals' data.
            await page.waitFor(1000);
            const individuals_string  = await page.evaluate(() => {
                let individuals = '';
                if ($('.panel-title a:contains("Individuals")').length) {
                    //$('.panel-title a:contains("Individuals")').click();
                    let individualsRows = document.querySelectorAll('.SearchResultsTable tbody tr');
                    if (individualsRows) {
                      let individualCount = 0;
                      for(var i = 0; i < individualsRows.length; i++){  
                        if ($(individualsRows[i]).find('td').eq(0).hasClass('dataTables_empty')) {
                          // There are no individuals in the table. Break out of loop.
                          break;
                        }          
                        let individual = '';
                        if (individualCount > 0) {
                          individual +=  individual + ' / ';
                        }
                        let name = individualsRows[i].querySelector("a").textContent;
                        
                        individual += name;
                        
                        let tds = individualsRows[i].getElementsByTagName("td");
                        let ind_ref_no = tds[1].textContent;
                        individual += '-' + ind_ref_no;
                        
                        let ind_status = tds[2].textContent;
                        individual += '-' + ind_status;
                        individuals += individual;
                        individualCount++;
                      }
                    } 
                    return individuals;
                  }
            });
            
            // Check if under permissions accordion tab there is permission to retail investment.
            const investmentsAdvice  = await page.evaluate(() => {
                let advising_on_investments = 0;
                if ($('.panel-title a:contains("Permission")').length) {
                    $('.panel-title a:contains("Permission")').click();
                    if ($('li.PermCondsLimitationsItem:contains("Retail (Investment)")').length) {
                        advising_on_investments = 1;
                    }
                }
                return advising_on_investments;
            });
            
            // Check if under permissions accordion tab there is permission to retail investment under Arranging (bringing about) deals in investments.
            const arrangingDeals  = await page.evaluate(() => {
                return $('h3.PermissionsListHeader:contains("Arranging (bringing about) deals in investments")').parent().find('li.PermCondsLimitationsItem:contains("Retail (Investment)")').length || 0;
            });
            
            allData.push({
                ref_number: ref_no,
                individuals: individuals_string,
                advising_on_investments: investmentsAdvice,
                arranging_deals_in_investments: arrangingDeals
            });
            
        } catch (error) {
            // if something goes wrong display the error message in console
            console.log(error)
        } 
    }
    // all done, close this browser
    await browser.close()
    // Write all collected data to csv file.
    createCSV(allData); 
})()


const createCSV = (data) => {
    // Use json2csv package https://github.com/zemirco/json2csv
    const { Parser } = require('json2csv');  
    const colHeader = ['Company ref number', 'Individuals', 'Retail Investment permission for advising on investments deals', 'Retail Investment permissions for arranging deals in investments'];
    const opts = { colHeader };
    const json2csvParser = new Parser({ opts });
    const csv = json2csvParser.parse(data);
    const fs = require('fs')
    // @todo: replace hardcoded postcode for bulk processing of files.
    fs.writeFile(
        './csv/' + postcode + '.csv',
        csv,
        (err) => err ? console.error('Data not written!', err) : console.log('Data written!')
    )
};