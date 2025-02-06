// availability.js
import { delay } from './utils.js';
import { sendDiscordNotification } from './notifications.js'; // Import Discord notification

// Selectors for Canada Computers
const SELECTORS = {
  outerDiv: '#checkothertores',
  innerDiv: '.modal-content',
  item: '.row'
};

// --- BestBuy Check ---
export async function checkAvailabilityBestBuy(context, product) {
  const { targetURL, sku } = product;
  const page = await context.newPage();
  console.log(`Checking BestBuy: ${targetURL} for ${sku}`);
  
  // Random delay (1–3 seconds)
  const delayMs = Math.floor(Math.random() * 2000) + 1000;
  await page.waitForTimeout(delayMs);
  
  try {
    await page.goto(targetURL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const buttonSelector = 'button[data-automation="addToCartButton"]';
    try {
      await page.waitForSelector(buttonSelector, { timeout: 10000 });
    } catch (err) {
      console.log(`BestBuy: "Add to Cart" button not found for ${sku}`);
      await page.close();
      return { sku, targetURL, site: "bestbuy", availability: { type: "bestbuy", data: false } };
    }
    
    const addToCartButton = await page.$(buttonSelector);
    if (!addToCartButton) {
      console.log(`BestBuy: "Add to Cart" button missing for ${sku}`);
      await page.close();
      return { sku, targetURL, site: "bestbuy", availability: { type: "bestbuy", data: false } };
    }
    
    const isDisabled = await addToCartButton.getAttribute('disabled');
    const available = (isDisabled === null);
    console.log(`BestBuy: ${sku} is ${available ? "AVAILABLE" : "NOT available"}`);
    await page.close();
    return { sku, targetURL, site: "bestbuy", availability: { type: "bestbuy", data: available } };
  } catch (error) {
    console.error(`Error checking BestBuy for ${sku}:`, error);
    await page.close();
    return { sku, targetURL, site: "bestbuy", availability: { type: "bestbuy", data: false } };
  }
}

// --- Canada Computers Check ---
export async function checkAvailabilityCanada(context, product) {
  const { targetURL, sku } = product;
  const page = await context.newPage();
  console.log(`Checking Canada Computers: ${targetURL} for ${sku}`);
  
  // Random delay (1–3 seconds)
  const delayMs = Math.floor(Math.random() * 2000) + 1000;
  await page.waitForTimeout(delayMs);
  
  try {
    await page.goto(targetURL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const outerDivExists = await page.$(SELECTORS.outerDiv) !== null;
    if (!outerDivExists) {
      console.log(`Canada Computers: No stock info found for ${sku}`);
      await page.close();
      return { sku, targetURL, site: "canadacomputers", availability: { type: "canadacomputers", data: {} } };
    }
    
    const outerDiv = page.locator(SELECTORS.outerDiv);
    if (await outerDiv.locator(SELECTORS.innerDiv).count() === 0) {
      console.log(`Canada Computers: Inner modal not found for ${sku}`);
      await page.close();
      return { sku, targetURL, site: "canadacomputers", availability: { type: "canadacomputers", data: {} } };
    }
    
    const items = await outerDiv.locator(SELECTORS.innerDiv).locator(SELECTORS.item);
    const results = await items.evaluateAll((elements) =>
      elements
        .map((item) => {
          const spans = item.querySelectorAll(':scope > span');
          if (spans.length >= 2) {
            const location = spans[0]?.innerText.trim();
            const quantity = parseInt(spans[1]?.innerText.trim(), 10);
            return quantity > 0 ? { location, quantity } : null;
          }
          return null;
        })
        .filter((item) => item !== null)
    );
    await page.close();
    
    // Convert results array into an object mapping location to quantity.
    const availObj = {};
    results.forEach(item => {
      availObj[item.location] = item.quantity;
    });
    
    console.log(`Canada Computers: ${sku} availability:`, availObj);
    return { sku, targetURL, site: "canadacomputers", availability: { type: "canadacomputers", data: availObj } };
  } catch (error) {
    console.error(`Error checking Canada Computers for ${sku}:`, error);
    await page.close();
    return { sku, targetURL, site: "canadacomputers", availability: { type: "canadacomputers", data: {} } };
  }
}

// --- Newegg Check ---
export async function checkAvailabilityNewegg(context, product) {
  const { targetURL, sku } = product;
  const page = await context.newPage();
  console.log(`Checking Newegg: ${targetURL} for ${sku}`);
  
  // Random delay (1–3 seconds)
  const delayMs = Math.floor(Math.random() * 200) + 100;
  await page.waitForTimeout(delayMs);
  
  try {
    await page.goto(targetURL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const buttonSelector = 'button.btn-primary'; // Newegg's "Add to Cart" button class
    try {
      await page.waitForSelector(buttonSelector, { timeout: 10000 });
    } catch (err) {
      console.log(`Newegg: "Add to Cart" button not found for ${sku}`);
      await page.close();
      return { sku, targetURL, site: "newegg", availability: { type: "newegg", data: false } };
    }
  
    const addToCartButton = await page.$(buttonSelector);
    if (!addToCartButton) {
      console.log(`Newegg: "Add to Cart" button missing for ${sku}`);
      await page.close();
      return { sku, targetURL, site: "newegg", availability: { type: "newegg", data: false } };
    }
  
    const isDisabled = await addToCartButton.evaluate((btn) => btn.disabled);
    const available = !isDisabled;
    console.log(`Newegg: ${sku} is ${available ? "AVAILABLE" : "NOT available"}`);
    await page.close();
    return { sku, targetURL, site: "newegg", availability: { type: "newegg", data: available } };
  } catch (error) {
    console.error(`Error checking Newegg for ${sku}:`, error);
    await page.close();
    return { sku, targetURL, site: "newegg", availability: { type: "newegg", data: false } };
  }
}

// --- Unified Check ---
export async function checkAvailabilityUnified(context, product) {
  switch (product.site) {
    case "bestbuy":
      return await checkAvailabilityBestBuy(context, product);
    case "canadacomputers":
      return await checkAvailabilityCanada(context, product);
    case "newegg":
      return await checkAvailabilityNewegg(context, product);
    default:
      console.log(`Unknown site for product ${product.sku}`);
      return {
        sku: product.sku,
        targetURL: product.targetURL,
        site: product.site,
        availability: { type: product.site, data: null },
      };
  }
}

/**
 * checkAndNotify:
 *   - Calls the unified availability check for a given product.
 *   - Compares the newly obtained availability with the previously stored state.
 *   - Sends immediate notifications (via email and Discord) if a change is detected.
 *
 * @param {Object} context - The browser context.
 * @param {Object} product - The product to check.
 * @param {Object} previousAvailability - An object mapping product SKUs to their previous availability state.
 * @param {Function} sendEmailNotification - A function to send email notifications.
 *
 * @returns {Object} newProd - The new state for the product.
 */
export async function checkAndNotify(context, product, previousAvailability, sendEmailNotification) {
  const newProd = await checkAvailabilityUnified(context, product);
  const oldProd = previousAvailability[newProd.sku];

  let message = '';

  if (newProd.site === "bestbuy") {
    const newAvail = newProd.availability.data;
    const oldAvail = oldProd ? oldProd.availability.data : false;
    if (newAvail !== oldAvail) {
      const status = newAvail ? "AVAILABLE" : "OUT OF STOCK";
      message = `🔹 *${newProd.sku}*\n🔗 URL: ${newProd.targetURL}\nStatus: ${status}`;
    }
  } else if (newProd.site === "canadacomputers") {
    const newAvail = newProd.availability.data;
    const oldAvail = oldProd ? oldProd.availability.data : {};
    const allLocations = new Set([...Object.keys(newAvail), ...Object.keys(oldAvail)]);
    let changeDetected = false;
    for (const location of allLocations) {
      const newQty = newAvail[location] || 0;
      const oldQty = oldAvail[location] || 0;
      if (newQty !== oldQty) {
        changeDetected = true;
        break;
      }
    }
    if (changeDetected) {
      const availabilityLines = Object.entries(newAvail)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([location, quantity]) => `   - 📍 *${location.toLowerCase()}* : ${quantity}`)
        .join("\n");
      message = `🔹 *${newProd.sku}*\n🔗 URL: ${newProd.targetURL}\n${availabilityLines}`;
    }
  } else if (newProd.site === "newegg") {
    const newAvail = newProd.availability.data;
    const oldAvail = oldProd ? oldProd.availability.data : false;
    if (newAvail !== oldAvail) {
      const status = newAvail ? "AVAILABLE" : "OUT OF STOCK";
      message = `🔹 *${newProd.sku}*\n🔗 URL: ${newProd.targetURL}\nStatus: ${status}`;
    }
  }

  if (message) {
    // Send notifications immediately for this product update.
    sendEmailNotification('Stock Change Detected', message);
    sendDiscordNotification(`**Stock Change Detected**\n\n${message}`);
    console.log(`Notifications sent immediately for ${newProd.sku}`);
  } else {
    console.log(`No change detected for ${newProd.sku}`);
  }

  // Return the new product state so the caller can update their stored state.
  return newProd;
}
