// availability.js
import { delay } from './utils.js';

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

// --- Unified Check ---
export async function checkAvailabilityUnified(context, product) {
  if (product.site === "bestbuy") {
    return await checkAvailabilityBestBuy(context, product);
  } else if (product.site === "canadacomputers") {
    return await checkAvailabilityCanada(context, product);
  } else {
    console.log(`Unknown site for product ${product.sku}`);
    return { sku: product.sku, targetURL: product.targetURL, site: product.site, availability: { type: product.site, data: null } };
  }
}

// --- Process Availability (for email aggregation) ---
export async function processAvailability(newState, previousAvailability, sendEmailNotification) {
  const changesToEmail = [];
  
  for (const sku in newState) {
    const newProd = newState[sku];
    const oldProd = previousAvailability[sku];
    
    if (newProd.site === "bestbuy") {
      const newAvail = newProd.availability.data;
      const oldAvail = oldProd ? oldProd.availability.data : false;
      if (newAvail !== oldAvail) {
        const status = newAvail ? "AVAILABLE" : "OUT OF STOCK";
        changesToEmail.push({
          sku,
          targetURL: newProd.targetURL,
          availability: { status }
        });
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
        }
      }
      if (changeDetected) {
        changesToEmail.push({
          sku,
          targetURL: newProd.targetURL,
          availability: Object.entries(newAvail).map(([location, quantity]) => ({ location, quantity }))
        });
      }
    }
  }
  
  if (changesToEmail.length > 0) {
    const subject = 'Stock Changes Detected';
    const text = changesToEmail
      .map(change => {
        if (change.availability.status) {
          return `🔹 *${change.sku}*\n🔗 URL: ${change.targetURL}\nStatus: ${change.availability.status}`;
        } else {
          const availabilityLines = change.availability
            .sort((a, b) => a.location.localeCompare(b.location))
            .map(item => `   - 📍 *${item.location.toLowerCase()}* : ${item.quantity}`)
            .join("\n");
          return `🔹 *${change.sku}*\n🔗 URL: ${change.targetURL}\n${availabilityLines}`;
        }
      })
      .join("\n\n");
      
    sendEmailNotification(subject, text);
  } else {
    console.log('No stock changes detected.');
  }
}
