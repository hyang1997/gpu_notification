// index.js
import { chromium } from 'playwright';
import pLimit from 'p-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { checkAvailabilityUnified, processAvailability } from './availability.js';
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

// Global variables to store state
let previousAvailability = {};
let notifiedProducts = {}; // { sku: true } for products already notified as available

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
  
  // Separate concurrency per shop
  const bestbuyLimit = pLimit(3);
  const canadacomputersLimit = pLimit(3);
  
  const bestbuyTasks = bestbuyProducts.map(product =>
    bestbuyLimit(() => checkAvailabilityUnified(context, product))
  );
  const canadacomputersTasks = canadaProducts.map(product =>
    canadacomputersLimit(() => checkAvailabilityUnified(context, product))
  );
  
  const bestbuyResults = await Promise.all(bestbuyTasks);
  const canadacomputersResults = await Promise.all(canadacomputersTasks);
  const results = [...bestbuyResults, ...canadacomputersResults];
  
  // Immediately send Discord notifications on the spot
  for (const result of results) {
    if (result.site === "bestbuy") {
      if (result.availability.data === true && !notifiedProducts[result.sku]) {
        const message = `**Stock Found for ${result.sku} (BestBuy):**\n[View Product](${result.targetURL})`;
        await sendDiscordNotification(message);
        notifiedProducts[result.sku] = true;
      } else if (result.availability.data === false) {
        // Remove if no longer available
        delete notifiedProducts[result.sku];
      }
    } else if (result.site === "canadacomputers") {
      if (Object.keys(result.availability.data).length > 0 && !notifiedProducts[result.sku]) {
        let message = `**Stock Found for ${result.sku} (Canada Computers):**\n`;
        for (const [location, qty] of Object.entries(result.availability.data)) {
          message += `Location: ${location} - Quantity: ${qty}\n`;
        }
        message += `[View Product](${result.targetURL})`;
        await sendDiscordNotification(message);
        notifiedProducts[result.sku] = true;
      } else if (Object.keys(result.availability.data).length === 0) {
        delete notifiedProducts[result.sku];
      }
    }
  }
  
  // Build new state keyed by SKU
  const newState = {};
  results.forEach(result => {
    newState[result.sku] = result;
  });
  
  // Process differences for aggregated email notifications (if desired)
  await processAvailability(newState, previousAvailability, sendEmailNotification);
  
  previousAvailability = newState;
  
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
