# Stock Checker Script

This Node.js script monitors product availability on both BestBuy and Canada Computers concurrently. When stock is detected, it sends immediate Discord notifications and aggregates email notifications for stock changes.

## Features

- **Concurrent Scraping:**  
  Runs independent concurrent checks for BestBuy and Canada Computers (each with its own concurrency limit).

- **Site-Specific Logic:**  
  - **BestBuy:** Checks for the presence and enabled state of the "Add to Cart" button.
  - **Canada Computers:** Parses stock information by reading designated page elements.

- **Real-Time Notifications:**  
  - **Discord:** Sends immediate notifications as soon as stock is found.
  - **Email:** Aggregates and sends notifications when stock changes are detected.

- **Modular Structure & Environment Variables:**  
  Keeps sensitive credentials (email, Discord webhook URL) out of source code and organizes logic across multiple files.

## Project Structure
```
project/
├─ .env
├─ config.js
├─ notifications.js
├─ availability.js
├─ utils.js
├─ index.js
├─ bestbuy-urls.json
└─ canada-computers-urls.json
```
- **`.env`**: Contains sensitive credentials and configuration.
- **`config.js`**: Loads environment variables.
- **`notifications.js`**: Contains functions to send Discord and email notifications.
- **`availability.js`**: Contains site-specific scraping functions and unified check logic.
- **`utils.js`**: Contains utility functions (e.g., a delay helper).
- **`index.js`**: The main entry point that loads products, creates the browser context, and schedules tasks.
- **`bestbuy-urls.json` / `canada-computers-urls.json`**: JSON files that hold product data for each shop.

## Setup & Installation

### 1. Clone the Repository

Clone this repository to your local machine:

```bash
git clone https://github.com/hyang1997/gpu_notification
cd <repository-directory>
```
### 2. Install Dependencies
Make sure you have Node.js installed. Then, install the required packages:
npm install
This will install packages such as playwright, nodemailer, axios, p-limit, and dotenv.

### 3. Configure Environment Variables
Create a .env file in the project root with the following content:
```
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-email-password
EMAIL_TO=recipient@example.com
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url
```
Replace the placeholder values with your actual email credentials and Discord webhook URL.

### 4. Prepare the Product Data Files
Ensure that your product data files exist in the project root and follow the correct JSON structure.

For BestBuy (bestbuy-urls.json):
```
[
  {
    "targetURL": "https://www.bestbuy.ca/en-ca/product/nvidia-geforce-rtx-5080-16gb-gddr7-video-card/18931347",
    "sku": "NVIDIA GeForce RTX 5080 16GB",
    "site": "bestbuy"
  },
  {
    "targetURL": "https://www.bestbuy.ca/en-ca/product/pny-nvidia-geforce-rtx-5080-16gb-gddr7-video-card/18934178",
    "sku": "PNY RTX 5080 16GB",
    "site": "bestbuy"
  }
  // Add additional BestBuy products as needed
]
```
For Canada Computers (canada-computers-urls.json):
```
[
  {
    "targetURL": "https://www.canadacomputers.com/en/powered-by-nvidia/268187/gigabyte-aorus-geforce-rtx-5090-master-ice-32g-gv-n5090aorusm-ice-32gd.html",
    "sku": "GIGABYTE AORUS RTX 5090 MASTER ICE",
    "site": "canadacomputers"
  },
  {
    "targetURL": "https://www.canadacomputers.com/en/powered-by-nvidia/268437/msi-geforce-rtx-5090-32g-gaming-trio-oc-rtx-5090-32g-gaming-trio-oc.html",
    "sku": "MSI GeForce RTX 5090 32G GAMING TRIO OC",
    "site": "canadacomputers"
  }
  // Add additional Canada Computers products as needed
]
```
### 6.Usage
To run the script, use the following command:
```
node index.js
```

**The script will:**

-> Open a headless browser using Playwright.
-> Load product data from the JSON files.
-> Check product availability concurrently for each shop.
-> Immediately send a Discord notification when stock change is detected.
-> Send aggregated email notifications if stock changes occur.
-> Repeat the check every minute (this interval can be adjusted in index.js).

### 7.Customization
Check Frequency:
Adjust the minutes variable in index.js to change how often the script runs.

Concurrency Limits:
Modify the pLimit(3) values in index.js to change the number of concurrent checks for each shop.

Notification Behavior:
You can customize the notification message formats in notifications.js and the immediate notification logic in index.js.

### 8.Troubleshooting
No Notifications:
If no Discord messages are being sent, verify that your DISCORD_WEBHOOK_URL is correct in the .env file.

Selector Issues:
If the script isn’t detecting elements on the page, inspect the page structure to ensure the CSS selectors in availability.js are still valid.

Error Logging:
Check the console logs for errors related to Playwright navigation or network issues.

License
This project is licensed under the MIT License.

Acknowledgments
Playwright for the browser automation framework.
Nodemailer for email notifications.
Axios for HTTP requests.
dotenv for environment variable management.

