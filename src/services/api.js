// Replace this with your Google Apps Script Web App URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxQgx25ZaydYULoa-FU5VxGnppBhgyiZJ61I14hqsnlQNGgiTD6opuciEy_X-mm674/exec";
// Initial mock state for local development
const defaultMockState = {
    maxStock: 50,
    totalServings: 10,
    availableStock: 40,
    shopOpen: true,
    orders: [],
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

let mockState = null;

function getMockState() {
    try {
        const stored = localStorage.getItem('lunchDeliveryMockState');
        if (stored) {
            mockState = JSON.parse(stored);
            // Patch older format data
            if (typeof mockState.dailyMenu.mini === 'string' || mockState.dailyMenu.mini.price === undefined) {
                mockState.dailyMenu = defaultMockState.dailyMenu;
            }
            return mockState;
        }
    } catch (e) { }
    mockState = JSON.parse(JSON.stringify(defaultMockState));
    return mockState;
}

function saveMockState() {
    try {
        localStorage.setItem('lunchDeliveryMockState', JSON.stringify(mockState));
    } catch (e) { }
}

export async function fetchStatus() {
    if (WEB_APP_URL === "YOUR_WEB_APP_URL_HERE") {
        const state = getMockState();
        return {
            success: true,
            maxStock: state.maxStock,
            totalServings: state.totalServings,
            availableStock: Math.max(0, state.maxStock - state.totalServings),
            shopOpen: state.shopOpen,
            dailyMenu: state.dailyMenu,
            appHeader: state.appHeader,
            paymentSettings: state.paymentSettings
        };
    }
    const res = await fetch(`${WEB_APP_URL}?action=status`);
    return await res.json();
}

export async function fetchAdminData() {
    if (WEB_APP_URL === "YOUR_WEB_APP_URL_HERE") {
        const state = getMockState();
        return {
            success: true,
            orders: state.orders,
            totalServings: state.totalServings,
            maxStock: state.maxStock,
            shopOpen: state.shopOpen,
            dailyMenu: state.dailyMenu,
            appHeader: state.appHeader,
            paymentSettings: state.paymentSettings
        };
    }
    const res = await fetch(`${WEB_APP_URL}?action=orders`);
    return await res.json();
}

export async function placeOrder(orderData) {
    if (WEB_APP_URL === "YOUR_WEB_APP_URL_HERE") {
        const state = getMockState();
        state.availableStock -= orderData.quantity;
        state.totalServings += orderData.quantity;
        state.orders.push({
            id: Date.now(),
            ...orderData,
            timestamp: new Date().toISOString()
        });
        saveMockState();
        return new Promise(resolve => setTimeout(() => resolve({ success: true, newStock: state.availableStock }), 1000));
    }
    const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            action: 'place_order',
            ...orderData
        })
    });
    return await res.json();
}

export async function updateSettings(settings) {
    if (WEB_APP_URL === "YOUR_WEB_APP_URL_HERE") {
        const state = getMockState();
        if (settings.maxStock !== undefined) {
            state.maxStock = settings.maxStock;
            state.availableStock = Math.max(0, state.maxStock - state.totalServings);
        }
        if (settings.shopOpen !== undefined) state.shopOpen = settings.shopOpen;
        if (settings.dailyMenu !== undefined) state.dailyMenu = settings.dailyMenu;
        if (settings.appHeader !== undefined) state.appHeader = settings.appHeader;
        if (settings.paymentSettings !== undefined) state.paymentSettings = settings.paymentSettings;
        saveMockState();
        return new Promise(resolve => setTimeout(() => resolve({ success: true }), 500));
    }

    const payload = { action: 'update_settings' };
    for (const key in settings) {
        if (typeof settings[key] === 'object' && settings[key] !== null) {
            payload[key] = JSON.stringify(settings[key]);
        } else {
            payload[key] = settings[key];
        }
    }

    const res = await fetch(WEB_APP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload)
    });
    return await res.json();
}
