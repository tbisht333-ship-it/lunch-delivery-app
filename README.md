# Shree Shyam Rasoi - Delivery App

A high-performance React web application for bulk lunch delivery, featuring a customer ordering layout and an admin control dashboard. 

## Live Development Server
To start the application locally:
```bash
npm install
npm run dev -- --host
```

## How to Set Up the Google Sheets Database
By default, this app uses temporary local storage. To sync data across all your devices, you must deploy the Google Sheets Backend.

### Step 1: Create the Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com/) and create a new Blank spreadsheet.
2. Name it something like "Lunch Delivery Database".

### Step 2: Add the Apps Script
1. Look at the top menu in Google Sheets. Click on **Extensions** -> **Apps Script**.
2. Delete any boilerplate code you see in the editor.
3. Open the `google-apps-script.js` file from this project and copy **all** of its contents.
4. Paste it into the Apps Script editor.
5. Click the **Save** icon (or press Ctrl+S / Cmd+S).

### Step 3: Run Setup
1. In the Apps Script editor, look at the dropdown menu near the top that says `setup` (it might say `doGet`). Make sure it says **`setup`**.
2. Click the **Run** button.
3. Google will ask for Permissions. Click **Review Permissions**, choose your Google Account, click **Advanced**, and click **Go to Untitled project (unsafe)**. Click **Allow**.
4. Check your spreadsheet – you should now see two tabs created automatically: `Inventory` and `Orders`.

### Step 4: Deploy as Web App
1. In the top right corner of the Apps Script editor, click the **Deploy** button, then **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Under *Description*, type `Version 1`.
4. Under *Execute as*, leave it as **Me**.
5. Under *Who has access*, change it to **Anyone**. (This is critical for the app to work).
6. Click **Deploy**.
7. Copy the **Web app URL** that appears.

### Step 5: Connect Your App
1. Open up `src/services/api.js` in your code editor.
2. Find the line at the very top: `const WEB_APP_URL = "YOUR_WEB_APP_URL_HERE";`
3. Replace `"YOUR_WEB_APP_URL_HERE"` with the URL you just copied.
4. Refresh your application. It is now fully connected to your Google Sheet!
