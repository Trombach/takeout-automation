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
          console.log(interceptedRequest.url());
            urls.write(`${interceptedRequest.url()}\n`);
        }

        interceptedRequest.continue();
    });

    // wait for "Show exports" button
    const exportButton = await page.waitForSelector("div[jsaction='click:npT2md']", { timeout: 180_000 })
    if (!exportButton) {
      throw new Error("Could not find export button");
    }
    const buttonText = await (await (await exportButton.$("span[jsname=V67aGc]"))?.getProperty('textContent'))?.jsonValue();
    if (!buttonText || buttonText !== "Show exports") {
      throw new Error("Export button does not have expected text");
    }

    exportButton.click();

    // wait for dialog
    await page.waitForSelector("div.I7OXgf.nxteG.ZEeHrd.Inn9w.iWO5td", { visible: true, timeout: 180_000 });

        // query download buttons
    const nButtons = (await page.$$("td:not(.yrYG6) a[aria-label=Download]")).length;

    if (nButtons === 0) {
      throw new Error("No download buttons found");
    }

    // click download buttons
    for (let i = 0; i < nButtons; i++) {
      const button = (await page.$$("td:not(.yrYG6) a[aria-label=Download]"))[i];
        button.click();
        await page.waitForRequest(request => request.url().includes("-apidata.googleusercontent.com/download/storage"));
    }

    await browser.close();
  })

