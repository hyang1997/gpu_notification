// index.js
import { chromium } from 'playwright';
import pLimit from 'p-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { checkAndNotify } from './availability.js';
import { sendDiscordNotification, sendEmailNotification } from './notifications.js';

// Create __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load product data from JSON files
const bestbuyProducts = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'bestbuy-urls.json'), 'utf8')
);
const canadaProducts = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'canada-computers-urls.json'), 'utf8')
);

// Global variable to store previous availability state (keyed by SKU)
let previousAvailability = {};

async function checkProducts() {
  // Launch browser in headless mode
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });
  
  // Block nonessential resources (images and fonts)
  await context.route('**/*', (route) => {
    const resourceType = route.request().resourceType();
    if (['image', 'font'].includes(resourceType)) {
      route.abort();
    } else {
      route.continue();
    }
  });
  
  // Separate concurrency limits per shop
  const bestbuyLimit = pLimit(3);
  const canadacomputersLimit = pLimit(3);
  
  // For each product, call checkAndNotify so that any change sends notifications immediately.
  const bestbuyTasks = bestbuyProducts.map(product =>
    bestbuyLimit(() =>
      checkAndNotify(context, product, previousAvailability, sendEmailNotification)
    )
  );
  const canadacomputersTasks = canadaProducts.map(product =>
    canadacomputersLimit(() =>
      checkAndNotify(context, product, previousAvailability, sendEmailNotification)
    )
  );
  
  const bestbuyResults = await Promise.all(bestbuyTasks);
  const canadacomputersResults = await Promise.all(canadacomputersTasks);
  const results = [...bestbuyResults, ...canadacomputersResults];
  
  // Update the stored state with the latest results.
  results.forEach(result => {
    previousAvailability[result.sku] = result;
  });
  
  await context.close();
  await browser.close();
}

async function runTasks() {
  try {
    console.log("------------- Running tasks ----------------");
    await checkProducts();
    console.log("------------- End of batch ----------------");
  } catch (err) {
    console.error("An error occurred while running the script:", err);
  }
}

const minutes = 1; // Run every minute
runTasks();
setInterval(runTasks, minutes * 60 * 1000);
