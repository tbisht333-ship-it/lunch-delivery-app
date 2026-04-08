import { useState, useEffect } from 'react';
import { fetchStatus, placeOrder } from '../services/api';
import { Clock, MapPin, Phone, User, ShoppingBag, CheckCircle, AlertOctagon, Plus, Minus, ChevronRight, ArrowLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const GRADIENTS = [
    'from-yellow-400 to-orange-500',
    'from-emerald-400 to-teal-500',
    'from-purple-500 to-indigo-600',
    'from-rose-400 to-red-500',
    'from-cyan-400 to-blue-500'
];

export default function CustomerMenu() {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    // Core states
    const [cart, setCart] = useState({}); // { mini: 2, standard: 1 }
    const [showCartView, setShowCartView] = useState(false);

    // Form and Submission
    const [form, setForm] = useState({ name: '', building: '', mobile: '' });
    const [submitting, setSubmitting] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);
    const [timeCutoffHit, setTimeCutoffHit] = useState(false);

    const isWeekend = false;

    useEffect(() => {
        fetchStatus().then(res => {
            setStatus(res);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        }
    }, []);

    const isSoldOut = status?.availableStock <= 0;
    const isShopClosed = status?.shopOpen === false;
    const canOrder = !isSoldOut && !isShopClosed && !orderSuccess;

    // Cart Handlers
    const handleAddToCart = (thaliId) => {
        const currentQty = cart[thaliId] || 0;
        const totalItemsInCart = Object.values(cart).reduce((a, b) => a + b, 0);

        if (totalItemsInCart >= (status?.availableStock || 10)) {
            alert("Whoops! You've reached the maximum available servings limit limit.");
            return;
        }

        setCart(prev => ({ ...prev, [thaliId]: currentQty + 1 }));
    };

    const handleRemoveFromCart = (thaliId) => {
        setCart(prev => {
            const currentQty = prev[thaliId] || 0;
            if (currentQty <= 1) {
                const newCart = { ...prev };
                delete newCart[thaliId];
                if (Object.keys(newCart).length === 0) setShowCartView(false); // Close cart if empty
                return newCart;
            }
            return { ...prev, [thaliId]: currentQty - 1 };
        });
    };

    const getCartTotalDetails = () => {
        let baseTotal = 0;
        let totalItems = 0;
        const items = [];

        Object.keys(cart).forEach(id => {
            const qty = cart[id];
            const menuItem = status?.menu?.find(m => String(m.id) === String(id));
            if (!menuItem) return;
            const price = Number(menuItem.price);
            baseTotal += (price * qty);
            totalItems += qty;
            items.push({
                id: menuItem.id,
                title: menuItem.name,
                qty,
                price,
                itemSubtotal: price * qty
            });
        });

        const cgst = baseTotal * 0.025;
        const sgst = baseTotal * 0.025;
        const totalAmount = baseTotal + cgst + sgst;

        return { items, baseTotal, cgst, sgst, totalAmount, totalItems };
    };

    const billDetails = getCartTotalDetails();

    const generateAndDownloadPDF = (orderDetails) => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Tax Invoice", 105, 20, null, null, "center");

        doc.setFontSize(12);
        doc.text("Trade Name: Tarun Enterprise ( Shree Shyam Rasoi)", 14, 30);
        doc.text("GSTIN: 07CNDPB2494M1ZT", 14, 38);
        doc.text("HSN Code: 9963", 14, 46);

        doc.setFontSize(10);
        doc.text(`Customer Name: ${form.name}`, 14, 60);
        doc.text(`Mobile: ${form.mobile}`, 14, 66);
        doc.text(`Delivery Location: ${form.building}`, 14, 72);
        doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 78);

        // Build Table Rows
        const tableBody = billDetails.items.map(item => [
            item.title,
            `Rs. ${item.price.toFixed(2)}`,
            item.qty,
            `Rs. ${item.itemSubtotal.toFixed(2)}`
        ]);

        // Add CGST and SGST
        tableBody.push(['CGST (2.5%)', '', '', `Rs. ${billDetails.cgst.toFixed(2)}`]);
        tableBody.push(['SGST (2.5%)', '', '', `Rs. ${billDetails.sgst.toFixed(2)}`]);

        autoTable(doc, {
            startY: 85,
            head: [['Description', 'Rate', 'Qty', 'Amount']],
            body: tableBody,
            foot: [['Total Amount', '', '', `Rs. ${billDetails.totalAmount.toFixed(2)}`]],
            theme: 'grid',
            headStyles: { fillColor: [249, 115, 22] }
        });

        doc.save(`Invoice_${form.name || 'Order'}.pdf`);
    };

    const handleRazorpayPayment = async () => {
        if (!form.name || !form.mobile || !form.building) {
            alert("Please fill in all delivery details.");
            return;
        }

        if (form.mobile.length !== 10) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        setSubmitting(true);

        // Prepare summary string for Google Sheets compatibility (e.g. "Standard Thali (x2), Mini Thali (x1)")
        const thaliSummary = billDetails.items.map(i => `${i.title} (x${i.qty})`).join(', ');

        const orderPayload = {
            name: form.name,
            building: form.building,
            mobile: form.mobile,
            quantity: billDetails.totalItems,
            thaliType: thaliSummary,
            paymentMethod: 'razorpay',
            totalAmount: billDetails.totalAmount
        };

        const razorpayKey = status?.paymentSettings?.razorpayKey || "rzp_test_YourTestKeyHere";
        const options = {
            key: razorpayKey,
            amount: Math.round(billDetails.totalAmount * 100), // paise
            currency: "INR",
            name: "Tarun Enterprise",
            description: `Order for ${billDetails.totalItems} items`,
            image: status?.appHeader?.logo || "https://example.com/your_logo",
            handler: async function (response) {
                // Success Callback
                try {
                    const res = await placeOrder(orderPayload);
                    if (res.success) {
                        // Auto Download PDF
                        try {
                            generateAndDownloadPDF(orderPayload);
                        } catch (pdfErr) {
                            console.error("PDF ERROR:", pdfErr);
                            alert("Order confirmed, but we could not download the PDF: " + pdfErr.message);
                        }

                        setOrderSuccess(true);
                        setStatus(prev => ({ ...prev, availableStock: res.newStock }));
                    } else {
                        alert("Order placed, but failed to sync: " + res.error);
                    }
                } catch (err) {
                    console.error("PLACE ORDER ERROR:", err);
                    alert("System error confirming your order. Check your internet connection.");
                }
                setSubmitting(false);
            },
            prefill: {
                name: form.name,
                contact: form.mobile
            },
            theme: { color: "#f97316" }
        };
        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response) {
            alert("Payment Failed: " + response.error.description);
            setSubmitting(false);
        });
        rzp1.open();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
                <img src="/logo.png" alt="Shree Shyam Rasoi Logo" className="h-24 md:h-32 object-contain animate-pulse mb-4" />
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    // ----------------------------------------------------
    // SUCCESS VIEW
    // ----------------------------------------------------
    if (orderSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 text-center shadow-sm w-full max-w-md">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-inner">
                        <CheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Order Confirmed!</h3>
                    <p className="text-emerald-800 text-sm mb-6">Your lunch will be delivered to {form.building} by 1:00 PM today.<br /><br />Your invoice has been downloaded automatically.</p>

                    <button
                        onClick={() => {
                            setOrderSuccess(false);
                            setCart({});
                            setShowCartView(false);
                            setForm({ name: '', building: '', mobile: '' });
                        }}
                        className="w-full py-3 px-4 bg-white border border-emerald-200 text-emerald-700 font-bold rounded-xl shadow-sm hover:bg-emerald-50 transition-colors"
                    >
                        Place Another Order
                    </button>
                </div>
            </div>
        )
    }

    // ----------------------------------------------------
    // CART & CHECKOUT VIEW
    // ----------------------------------------------------
    if (showCartView) {
        return (
            <div className="min-h-screen bg-gray-50 pb-20 font-sans">
                {/* Header Navbar */}
                <div className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100 px-4 py-3 flex items-center">
                    <button onClick={() => setShowCartView(false)} className="mr-3 p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="font-bold text-gray-800 text-lg">Your Cart</h1>
                </div>

                <div className="max-w-md mx-auto px-4 mt-6 space-y-6">
                    {/* Cart Items List */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
                        {billDetails.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                                    <span className="text-gray-500 text-xs">₹{item.price} x {item.qty}</span>
                                </div>
                                <div className="flex items-center space-x-3 bg-white px-2 py-1.5 rounded-xl border border-gray-200 shadow-sm">
                                    <button onClick={() => handleRemoveFromCart(item.id)} className="text-orange-600 p-1 hover:bg-orange-50 rounded-lg">
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="font-bold text-gray-800 text-sm w-4 text-center">{item.qty}</span>
                                    <button onClick={() => handleAddToCart(item.id)} className="text-orange-600 p-1 hover:bg-orange-50 rounded-lg">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="w-16 text-right font-black text-gray-900 text-sm">
                                    ₹{item.itemSubtotal}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Delivery Form */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                        <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center">Delivery Details</h3>
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="pl-10 w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-3"
                                    placeholder="Your Name"
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={form.building}
                                    onChange={e => setForm({ ...form, building: e.target.value })}
                                    className="pl-10 w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-3"
                                    placeholder="Building & Office No."
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="tel"
                                    value={form.mobile}
                                    onChange={e => setForm({ ...form, mobile: e.target.value })}
                                    className="pl-10 w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 block p-3"
                                    placeholder="10-digit Mobile No."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bill Details */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
                        <h3 className="text-md font-bold text-gray-800 mb-2">Bill Details</h3>
                        <div className="flex justify-between text-gray-600 text-sm">
                            <span>Item Total</span>
                            <span>₹{billDetails.baseTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 text-xs">
                            <span>CGST (2.5%)</span>
                            <span>₹{billDetails.cgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 text-xs border-b border-gray-100 pb-3">
                            <span>SGST (2.5%)</span>
                            <span>₹{billDetails.sgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-black text-gray-900 pt-1">
                            <span>Total Amount</span>
                            <span>₹{billDetails.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Final Pay Button Stickied */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-50">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handleRazorpayPayment}
                            disabled={submitting}
                            className="w-full text-white font-bold rounded-2xl text-md px-5 py-4 text-center shadow-lg transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
                        >
                            {submitting ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <span>Pay ₹{billDetails.totalAmount.toFixed(2)} via Razorpay</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------
    // MAIN MENU VIEW
    // ----------------------------------------------------
    return (
        <div className="min-h-screen bg-gray-50 pb-24 font-sans relative">
            {/* Header Banner */}
            <div className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
                <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        {status?.appHeader?.logo ? (
                            <img src={status.appHeader.logo} alt="Logo" className="h-8 object-contain" />
                        ) : (
                            <img src="/logo.png" alt="Shree Shyam Rasoi Logo" className="h-8 object-contain" />
                        )}
                        <h1 className="font-bold text-gray-800 text-lg tracking-tight">
                            {status?.appHeader?.title || "Shree Shyam Rasoi"}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Hero Banner */}
            <div className="max-w-md mx-auto relative w-full aspect-square sm:aspect-[4/3] shadow-lg rounded-b-3xl overflow-hidden">
                <img src="/header-banner.jpg" alt="Hero Banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40"></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#FFF200] via-[#FFD700] to-[#E59400] drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-wide leading-tight">
                        Shree Shyam Rasoi
                    </h1>
                </div>
            </div>

            <main className="max-w-md mx-auto px-4 mt-6">

                <div className="mb-6 rounded-3xl overflow-hidden shadow-lg border border-gray-100 relative group">
                    <img src={status?.appHeader?.bgImage || "/customer_header.png"} alt="Delicious Food" className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-white font-bold text-xl drop-shadow-md">{status?.appHeader?.subtitle || "Authentic Taste of India"}</p>
                        <p className="text-gray-200 text-sm mt-1 opacity-90">{status?.appHeader?.bannerText || "Fresh, hot meals delivered to your desk."}</p>
                    </div>
                </div>

                {/* Alerts & Badges */}
                <div className="mb-6 space-y-3">
                    {timeCutoffHit && !isWeekend && (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl flex items-start space-x-3 shadow-sm">
                            <Clock className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-sm">Time's Up!</p>
                                <p className="text-xs mt-1">Orders close at 11:30 AM daily. We'll be back tomorrow!</p>
                            </div>
                        </div>
                    )}

                    {(isSoldOut || isShopClosed) && !timeCutoffHit && !isWeekend && (
                        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-start space-x-3 shadow-sm">
                            <AlertOctagon className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-semibold text-sm">Sold Out Today</p>
                                <p className="text-xs mt-1">We've reached our maximum capacity for today. Sorry about that!</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stock Warning */}
                {!isWeekend && status?.availableStock > 0 && status.availableStock <= 10 && !isShopClosed && !timeCutoffHit && (
                    <div className="mb-6 flex items-center justify-center space-x-2 text-sm font-semibold text-orange-700 bg-orange-100 px-4 py-2.5 rounded-xl shadow-sm border border-orange-200">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                        </span>
                        <span>Hurry! Only {status.availableStock} total servings left today!</span>
                    </div>
                )}

                {/* Menu Cards */}
                <div className="space-y-5 mb-8">
                    {status?.menu?.map((menuItem, idx) => {
                        const qtyInCart = cart[menuItem.id] || 0;
                        const isItemAvailable = menuItem.is_available !== false;
                        const canOrderItem = canOrder && isItemAvailable;

                        return (
                            <div
                                key={menuItem.id}
                                className={`bg-white rounded-3xl overflow-hidden border-2 transition-all duration-300 shadow-sm relative group
                                ${qtyInCart > 0 ? 'border-orange-500 shadow-xl ring-4 ring-orange-500/10' : 'border-gray-100 hover:border-orange-200 hover:shadow-md'}
                                ${(!canOrderItem || isWeekend) ? 'opacity-70 pointer-events-none' : ''}`}
                            >
                                <div className={`h-40 bg-gradient-to-r ${GRADIENTS[idx % GRADIENTS.length]} relative overflow-hidden flex items-end px-5 py-4`}>
                                    {menuItem.image_url ? (
                                        <img src={menuItem.image_url} alt={menuItem.name} className={`absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${!isItemAvailable ? 'grayscale opacity-60' : 'opacity-90'}`} />
                                    ) : (
                                        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white opacity-10 rounded-full blur-xl"></div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                                    {!isItemAvailable && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                                            <span className="bg-red-600 text-white px-6 py-2 rounded-full font-black text-lg shadow-2xl tracking-widest border border-red-400/50 transform -rotate-6">SOLD OUT</span>
                                        </div>
                                    )}
                                    <div className="relative z-10 w-full flex justify-between items-end">
                                        <h2 className="text-2xl font-black text-white drop-shadow-md tracking-tight leading-tight">{menuItem.name}</h2>
                                        <span className="bg-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-md shadow-sm uppercase tracking-wider border border-white/30 mb-1 ml-4 whitespace-nowrap">
                                            {menuItem.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <p className="text-gray-600 text-sm leading-relaxed mb-4 min-h-[40px]">
                                        {menuItem.description}
                                    </p>
                                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                        <div className="text-2xl font-black text-gray-900">₹{menuItem.price}</div>

                                        {/* Zomato-style Add/Remove Controls */}
                                        {qtyInCart > 0 ? (
                                            <div className="flex items-center space-x-4 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                                                <button onClick={() => handleRemoveFromCart(menuItem.id)} className="text-orange-600 p-1 hover:bg-white rounded-lg transition-colors">
                                                    <Minus className="h-5 w-5" />
                                                </button>
                                                <span className="font-black text-orange-700 w-4 text-center text-lg">{qtyInCart}</span>
                                                <button onClick={() => handleAddToCart(menuItem.id)} className="text-orange-600 p-1 hover:bg-white rounded-lg transition-colors">
                                                    <Plus className="h-5 w-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                className="px-6 py-2 rounded-xl text-sm font-bold transition-all bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 shadow-sm"
                                                onClick={() => {
                                                    if (canOrderItem && !isWeekend) handleAddToCart(menuItem.id);
                                                }}
                                            >
                                                ADD
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </main>

            {/* Floating 'View Cart' Bar bottom of Main View */}
            {billDetails.totalItems > 0 && !showCartView && canOrder && (
                <div className="fixed bottom-4 left-0 right-0 z-50 px-4 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={() => setShowCartView(true)}
                            className="w-full bg-orange-500 text-white font-bold rounded-2xl flex items-center justify-between p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-orange-600 transition-colors"
                        >
                            <div className="flex flex-col items-start text-left">
                                <span className="text-xs text-orange-100 uppercase tracking-widest font-semibold">{billDetails.totalItems} ITEM{billDetails.totalItems > 1 ? 'S' : ''}</span>
                                <span className="text-lg">₹{billDetails.totalAmount.toFixed(2)} plus taxes</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <span>View Cart</span>
                                <ChevronRight className="h-5 w-5" />
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
