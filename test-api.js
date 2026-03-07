import fs from 'fs';

async function testPlaceOrder() {
    const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz84nLg5LVDTTjD6JD0hVAn_qF5c6S-9Mo5_uPzSkxDhxmkrrIwRJGncDx6xQYzLzm6/exec";
    const orderData = {
        name: 'Test User',
        building: 'Test Building',
        mobile: '1234567890',
        quantity: 1,
        thaliType: 'Mini Thali (x1)',
        paymentMethod: 'razorpay',
        totalAmount: 120
    };

    try {
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
        const text = await res.text();
        console.log("Response text:", text);
    } catch (err) {
        console.error("Fetch threw error:", err);
    }
}

testPlaceOrder();
