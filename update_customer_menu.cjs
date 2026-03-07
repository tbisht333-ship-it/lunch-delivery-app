const fs = require('fs');
const file = 'c:/Users/Dell/Desktop/lunch-delivery-app/src/pages/CustomerMenu.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update imports
content = content.replace(
    "import { Clock, MapPin, Phone, User, ShoppingBag, CheckCircle, AlertOctagon } from 'lucide-react';",
    "import { Clock, MapPin, Phone, User, ShoppingBag, CheckCircle, AlertOctagon, Download } from 'lucide-react';\nimport jsPDF from 'jspdf';\nimport 'jspdf-autotable';"
);

// 2. Update paymentMethod state to showInvoice
content = content.replace(
    "    const [paymentMethod, setPaymentMethod] = useState('upi');",
    "    const [showInvoice, setShowInvoice] = useState(false);"
);

// 3. Replace handleRazorpayPayment, handleUPIPayment, handleBankTransfer 
const startRazorpay = content.indexOf("    const handleRazorpayPayment = async (orderPayload) => {");
const endBankTransfer = content.indexOf("    const handleSubmit = async (e) => {");
if (startRazorpay !== -1 && endBankTransfer !== -1) {
    const newHandles = `    const handleRazorpayPayment = async () => {
        setSubmitting(true);
        const thaliPrice = status?.dailyMenu?.[selectedThali]?.price || THALI_OPTIONS[selectedThali].price;
        const baseTotal = thaliPrice * form.quantity;
        const cgst = baseTotal * 0.025;
        const sgst = baseTotal * 0.025;
        const totalAmount = baseTotal + cgst + sgst;

        const orderPayload = { ...form, thaliType: THALI_OPTIONS[selectedThali].title, paymentMethod: 'razorpay', totalAmount };

        const razorpayKey = status?.paymentSettings?.razorpayKey || "rzp_test_YourTestKeyHere";
        const options = {
            key: razorpayKey, // Dynamic key from Admin
            amount: Math.round(totalAmount * 100), // Amount in paise
            currency: "INR",
            name: "Tarun Enterprise",
            description: \`Order for \${form.quantity}x \${THALI_OPTIONS[selectedThali].title}\`,
            image: status?.appHeader?.logo || "https://example.com/your_logo",
            handler: async function (response) {
                const res = await placeOrder(orderPayload);
                if (res.success) {
                    setOrderSuccess(true);
                    setShowInvoice(false);
                    setStatus(prev => ({ ...prev, availableStock: res.newStock }));
                } else {
                    alert("Order placed, but failed to sync: " + res.error);
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
    };\n\n`;
    content = content.substring(0, startRazorpay) + newHandles + content.substring(endBankTransfer);
} else { throw new Error("Could not find handleRazorpayPayment block"); }

// 4. Update handleSubmit
const startSubmit = content.indexOf("    const handleSubmit = async (e) => {");
const endSubmit = content.indexOf("    if (loading) {");
if (startSubmit !== -1 && endSubmit !== -1) {
    const newSubmit = `    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canOrder) return;
        if (form.mobile.length !== 10) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }
        setShowInvoice(true);
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        
        const thaliPrice = status?.dailyMenu?.[selectedThali]?.price || THALI_OPTIONS[selectedThali].price;
        const baseTotal = thaliPrice * form.quantity;
        const cgst = baseTotal * 0.025;
        const sgst = baseTotal * 0.025;
        const totalAmount = baseTotal + cgst + sgst;

        doc.setFontSize(18);
        doc.text("Tax Invoice", 105, 20, null, null, "center");
        
        doc.setFontSize(12);
        doc.text("Trade Name: Tarun Enterprise ( Shree Shyam Rasoi)", 14, 30);
        doc.text("GSTIN: 07CNDPB2494M1ZT", 14, 38);
        doc.text("HSN Code: 9963", 14, 46);
        
        doc.setFontSize(10);
        doc.text(\`Customer Name: \${form.name}\`, 14, 60);
        doc.text(\`Mobile: \${form.mobile}\`, 14, 66);
        doc.text(\`Delivery Location: \${form.building}\`, 14, 72);
        doc.text(\`Date: \${new Date().toLocaleDateString('en-IN')}\`, 14, 78);

        doc.autoTable({
            startY: 85,
            head: [['Description', 'Rate', 'Qty', 'Amount']],
            body: [
                [\`\${THALI_OPTIONS[selectedThali].title}\`, \`Rs. \${thaliPrice.toFixed(2)}\`, form.quantity, \`Rs. \${baseTotal.toFixed(2)}\`],
                ['CGST (2.5%)', '', '', \`Rs. \${cgst.toFixed(2)}\`],
                ['SGST (2.5%)', '', '', \`Rs. \${sgst.toFixed(2)}\`],
            ],
            foot: [['Total Amount', '', '', \`Rs. \${totalAmount.toFixed(2)}\`]],
            theme: 'grid',
            headStyles: { fillColor: [249, 115, 22] }
        });

        doc.save(\`Invoice_\${form.name || 'Order'}.pdf\`);
    };\n\n`;
    content = content.substring(0, startSubmit) + newSubmit + content.substring(endSubmit);
} else { throw new Error("Could not find handleSubmit block"); }

// 5. Update PDF download button
content = content.replace(
    `<button
                            onClick={() => {
                                setOrderSuccess(false);
                                setForm({ ...form, quantity: 1 });
                            }}
                            className="w-full py-3 px-4 bg-white border border-emerald-200 text-emerald-700 font-bold rounded-xl shadow-sm hover:bg-emerald-50 transition-colors"
                        >
                            Order Another
                        </button>`,
    `<div className="space-y-3">
                            <button
                                onClick={generatePDF}
                                className="w-full py-3 px-4 bg-orange-500 text-white font-bold rounded-xl shadow-md hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
                            >
                                <Download className="h-5 w-5" />
                                <span>Download PDF Invoice</span>
                            </button>
                            
                            <button
                                onClick={() => {
                                    setOrderSuccess(false);
                                    setForm({ name: '', building: '', mobile: '', quantity: 1 });
                                }}
                                className="w-full py-3 px-4 bg-white border border-emerald-200 text-emerald-700 font-bold rounded-xl shadow-sm hover:bg-emerald-50 transition-colors"
                            >
                                Order Another
                            </button>
                        </div>`
);

// 6. Update payment method HTML / button text
const startFormBlock = content.indexOf(`                            <div className="space-y-1.5 pt-4 border-t border-gray-100">`);
const endFormBlock = content.indexOf(`                        </form>`, startFormBlock);
if (startFormBlock !== -1 && endFormBlock !== -1) {
    const newFormBlock = `                            <button
                                type="submit"
                                disabled={!canOrder}
                                className={\`w-full text-white font-bold rounded-xl text-md px-5 py-4 text-center shadow-lg transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2
                  \${(!canOrder)
                                        ? 'bg-gray-400 shadow-none'
                                        : 'bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 hover:shadow-orange-500/25'}\`}
                            >
                                <span>View Invoice & Checkout</span>
                            </button>
                        </form>`;
    content = content.substring(0, startFormBlock) + newFormBlock + content.substring(endFormBlock + 31); // 31 is length of "</form>" space etc... wait, I just replace to endFormBlock then insert </form>
} else { throw new Error("Could not find FormBlock block"); }

// 7. Add Modal at bottom
const modalBlock = `
            {/* Invoice Modal */}
            {showInvoice && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="bg-orange-500 p-4 text-white text-center">
                            <h3 className="font-bold text-lg">Tax Invoice Summary</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="text-sm text-gray-600 border-b border-gray-100 pb-4">
                                <p><strong>Trade Name:</strong> Tarun Enterprise ( Shree Shyam Rasoi)</p>
                                <p><strong>GSTIN:</strong> 07CNDPB2494M1ZT</p>
                                <p><strong>HSN Code:</strong> 9963</p>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-800">
                                    <span>{THALI_OPTIONS[selectedThali].title} (x{form.quantity})</span>
                                    <span>₹{(status?.dailyMenu?.[selectedThali]?.price || THALI_OPTIONS[selectedThali].price) * form.quantity}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 text-xs">
                                    <span>CGST (2.5%)</span>
                                    <span>₹{((status?.dailyMenu?.[selectedThali]?.price || THALI_OPTIONS[selectedThali].price) * form.quantity * 0.025).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500 text-xs border-b border-gray-100 pb-2">
                                    <span>SGST (2.5%)</span>
                                    <span>₹{((status?.dailyMenu?.[selectedThali]?.price || THALI_OPTIONS[selectedThali].price) * form.quantity * 0.025).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-black text-gray-900 pt-2">
                                    <span>Total Amount</span>
                                    <span>₹{((status?.dailyMenu?.[selectedThali]?.price || THALI_OPTIONS[selectedThali].price) * form.quantity * 1.05).toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div className="pt-4 flex space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowInvoice(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRazorpayPayment}
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl shadow-md hover:bg-orange-600 transition-colors flex justify-center items-center"
                                >
                                    {submitting ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    ) : (
                                        "Pay via Razorpay"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}`;

content = content.replace("        </div>\r\n    );\r\n}", modalBlock);
content = content.replace("        </div>\n    );\n}", modalBlock);

fs.writeFileSync(file, content);
console.log("Written successfully");
