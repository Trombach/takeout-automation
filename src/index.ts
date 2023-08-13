import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer
  .use(StealthPlugin())
  .launch({ headless: false })
  .then(async browser => {
    const page = await browser.newPage()
    await page.goto("https://takeout.google.com");

    const urls = fs.createWriteStream("urls.txt");

    //prevent downloads
    await (await page.target().createCDPSession()).send('Page.setDownloadBehavior', {
        behavior: "deny",
        downloadPath: "/dev/null"
    })

    // intercept requests
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
        if (interceptedRequest.url().includes("-apidata.googleusercontent.com/download/storage")) {
            console.info(`Intercepted ${interceptedRequest.url()}`);
            urls.write(`${interceptedRequest.url()}\n`);
        }
        
        interceptedRequest.continue();
    });
  })

