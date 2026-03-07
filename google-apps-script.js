const SETTINGS_SHEET_NAME = "Settings";
const ORDERS_SHEET_NAME = "Orders";

const DEFAULT_CONFIG = {
    maxStock: 50,
    shopOpen: true,
    dailyMenu: {
        mini: { desc: "1 Main Dish (Dal or Gravy), 3 Rotis, Small Rice, and Salad.", image: null, price: 120 },
        standard: { desc: "1 Gravy Item, 1 Dry Sabzi, 4 Rotis, Rice, Salad, and Raita.", image: null, price: 150 },
        deluxe: { desc: "1 Premium Gravy, 1 Dry Sabzi, Small Dal, 4 Butter Rotis, Veg Biryani/Rice, Sweet, Raita, and Salad.", image: null, price: 180 }
    },
    appHeader: {
        title: "Shree Shyam Rasoi",
        subtitle: "Authentic Taste of India",
        bannerText: "Fresh, hot meals delivered to your desk.",
        logo: null,
        bgImage: "/customer_header.png"
    },
    paymentSettings: {
        razorpayKey: "rzp_test_YourTestKeyHere",
        upiId: "9876543210@upi",
        bankName: "Example Bank",
        accountName: "Shree Shyam Rasoi",
        accountNumber: "1234567890",
        ifscCode: "EXMPL000123"
    }
};

function setup() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss.getSheetByName(SETTINGS_SHEET_NAME)) {
        const setSheet = ss.insertSheet(SETTINGS_SHEET_NAME);
        setSheet.appendRow(["ConfigKey", "ConfigJSON"]);
        setSheet.appendRow(["app_config", JSON.stringify(DEFAULT_CONFIG)]);
    }
    if (!ss.getSheetByName(ORDERS_SHEET_NAME)) {
        const ordSheet = ss.insertSheet(ORDERS_SHEET_NAME);
        ordSheet.appendRow(["Timestamp", "Date", "Name", "Building", "Mobile", "ThaliType", "Quantity", "PaymentMethod"]);
    }
}

function getConfig(ss) {
    const setSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    const values = setSheet.getRange(2, 2, 50, 1).getValues();
    const jsonStr = values.map(row => row[0]).join('');

    if (!jsonStr) return DEFAULT_CONFIG;

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        return DEFAULT_CONFIG;
    }
}

function saveConfig(ss, configData) {
    const setSheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
    const jsonStr = JSON.stringify(configData);

    // Clear old config cells (B2 to B51)
    setSheet.getRange(2, 2, 50, 1).clearContent();

    // Split into chunks of 45,000 characters (Google Sheets limit is 50,000 per cell)
    const chunkSize = 45000;
    const chunks = [];
    for (let i = 0; i < jsonStr.length; i += chunkSize) {
        chunks.push([jsonStr.substring(i, i + chunkSize)]);
    }

    if (chunks.length > 50) {
        throw new Error("Configuration is too large to save (exceeds 50 cells). Please use a smaller image.");
    }

    // Write chunks
    if (chunks.length > 0) {
        setSheet.getRange(2, 2, chunks.length, 1).setValues(chunks);
    }
}

function doGet(e) {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const config = getConfig(ss);
    const ordSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
    const data = ordSheet.getDataRange().getValues();
    const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });

    const now = new Date();
    const today_year = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' });
    const today_month = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'numeric' });
    const today_day = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' });

    const todayOrdersData = data.slice(1).filter(row => {
        try {
            if (!row[0]) return false;
            const rowDate = new Date(row[0]); // Parse the ISO timestamp in Column A
            if (isNaN(rowDate.getTime())) return false;

            const row_year = rowDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' });
            const row_month = rowDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'numeric' });
            const row_day = rowDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' });

            return row_year === today_year && row_month === today_month && row_day === today_day;
        } catch (e) {
            return false;
        }
    });
    const totalServings = todayOrdersData.reduce((sum, row) => sum + Number(row[6] || Number(row[5] || 0)), 0); // Handle old schema vs new schema columns

    if (action === 'orders') {
        const orders = todayOrdersData.map(row => ({
            timestamp: row[0],
            date: row[1],
            name: row[2],
            building: row[3],
            mobile: row[4],
            thaliType: row[5],
            quantity: row[6] || row[5], // Fallback for older records
            paymentMethod: row[7] || "unknown"
        }));

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            orders: orders,
            totalServings: totalServings,
            ...config
        })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
        success: true,
        ...config,
        totalServings: totalServings,
        availableStock: Math.max(0, config.maxStock - totalServings)
    })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let payload = {};
        if (e.parameter) {
            payload = e.parameter;
        } else if (e.postData && e.postData.contents) {
            try {
                payload = JSON.parse(e.postData.contents);
            } catch (err) { }
        }
        const action = payload.action;

        if (action === 'update_settings') {
            const config = getConfig(ss);

            // Merge properties
            if (payload.maxStock !== undefined) config.maxStock = Number(payload.maxStock);
            if (payload.shopOpen !== undefined) config.shopOpen = payload.shopOpen === 'true';
            if (payload.dailyMenu !== undefined) config.dailyMenu = typeof payload.dailyMenu === 'string' ? JSON.parse(payload.dailyMenu) : payload.dailyMenu;
            if (payload.appHeader !== undefined) config.appHeader = typeof payload.appHeader === 'string' ? JSON.parse(payload.appHeader) : payload.appHeader;
            if (payload.paymentSettings !== undefined) config.paymentSettings = typeof payload.paymentSettings === 'string' ? JSON.parse(payload.paymentSettings) : payload.paymentSettings;

            saveConfig(ss, config);

            return ContentService.createTextOutput(JSON.stringify({ success: true }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        if (action === 'place_order') {
            const lock = LockService.getScriptLock();
            lock.waitLock(10000);

            try {
                const config = getConfig(ss);
                const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
                const ordSheet = ss.getSheetByName(ORDERS_SHEET_NAME);
                const data = ordSheet.getDataRange().getValues();

                const now = new Date();
                const today_year = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' });
                const today_month = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'numeric' });
                const today_day = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' });

                const todayOrders = data.slice(1).filter(row => {
                    try {
                        if (!row[0]) return false;
                        const rowDate = new Date(row[0]);
                        if (isNaN(rowDate.getTime())) return false;

                        const row_year = rowDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', year: 'numeric' });
                        const row_month = rowDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', month: 'numeric' });
                        const row_day = rowDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', day: 'numeric' });

                        return row_year === today_year && row_month === today_month && row_day === today_day;
                    } catch (e) {
                        return false;
                    }
                });
                const totalServings = todayOrders.reduce((sum, row) => sum + Number(row[6] || Number(row[5] || 0)), 0);

                const requestedQuantity = Number(payload.quantity);
                const availableStock = config.maxStock - totalServings;

                if (!config.shopOpen) {
                    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Shop is closed.' }))
                        .setMimeType(ContentService.MimeType.JSON);
                }

                if (availableStock < requestedQuantity) {
                    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Not enough stock available.' }))
                        .setMimeType(ContentService.MimeType.JSON);
                }

                const timestamp = new Date().toISOString();
                ordSheet.appendRow([
                    timestamp,
                    today,
                    payload.name,
                    payload.building,
                    payload.mobile,
                    payload.thaliType || "Unknown",
                    requestedQuantity,
                    payload.paymentMethod || "Unknown"
                ]);

                return ContentService.createTextOutput(JSON.stringify({ success: true, newStock: availableStock - requestedQuantity }))
                    .setMimeType(ContentService.MimeType.JSON);

            } finally {
                lock.releaseLock();
            }
        }

        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid action.' }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
