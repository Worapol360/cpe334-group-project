const { chromium } = require('../../../e2e/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const htmlPath = path.resolve(__dirname, 'lab5_report.html');
  console.log('Loading:', htmlPath);
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const outputPath = path.resolve(__dirname, 'lab5_sec3_s3ed50763.pdf');
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '14mm',
      left: '15mm',
      right: '15mm'
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 7.8pt; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #6b7280; width: 100%; text-align: center;">
        <span>CPE 334 Lab 5 · Sec 3 FeedbackLoop (s3ed50763) | Commit de6d513 | Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `
  });

  console.log('PDF successfully rendered to:', outputPath);
  await browser.close();
})();
