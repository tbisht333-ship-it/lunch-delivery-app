import { useState, useEffect } from 'react';
import { fetchAdminData, updateSettings } from '../services/api';
import { Settings, Users, ArrowRight, Activity, XOctagon, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);

    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(
        sessionStorage.getItem('isAdminAuth') === 'true'
    );
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [config, setConfig] = useState({
        maxStock: 50,
        shopOpen: true,
        dailyMenu: {
            mini: { desc: '', image: null },
            standard: { desc: '', image: null },
            deluxe: { desc: '', image: null }
        },
        appHeader: {},
        paymentSettings: {
            razorpayKey: '',
            upiId: '',
            bankName: '',
            accountName: '',
            accountNumber: '',
            ifscCode: ''
        }
    });

    const loadData = async (isPoll = false) => {
        try {
            const res = await fetchAdminData();
            if (res.success) {
                setData(res);
                if (!isPoll) {
                    setConfig({
                        maxStock: res.maxStock,
                        shopOpen: res.shopOpen,
                        dailyMenu: res.dailyMenu || {
                            mini: { desc: '', image: null },
                            standard: { desc: '', image: null },
                            deluxe: { desc: '', image: null }
                        },
                        appHeader: res.appHeader || {},
                        paymentSettings: res.paymentSettings || {
                            razorpayKey: '',
                            upiId: '',
                            bankName: '',
                            accountName: '',
                            accountNumber: '',
                            ifscCode: ''
                        }
                    });
                }
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(() => loadData(true), 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        setSavingConfig(true);
        try {
            const res = await updateSettings(config);
            if (res.success) {
                alert("Settings updated!");
                loadData();
            } else {
                alert("Failed to update: " + res.error);
            }
        } catch (err) {
            alert("Error saving settings.");
        }
        setSavingConfig(false);
    };

    const toggleShop = async () => {
        const newState = !config.shopOpen;
        setConfig(prev => ({ ...prev, shopOpen: newState }));
        setSavingConfig(true);
        try {
            await updateSettings({ shopOpen: newState });
            loadData();
        } catch (err) {
            alert("Error saving settings.");
        }
        setSavingConfig(false);
    };

    const handleImageUpload = (e, thaliType) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            if (thaliType === 'logo') {
                setConfig(prev => ({
                    ...prev,
                    appHeader: { ...prev.appHeader, logo: reader.result }
                }));
            } else if (thaliType === 'bgImage') {
                setConfig(prev => ({
                    ...prev,
                    appHeader: { ...prev.appHeader, bgImage: reader.result }
                }));
            } else {
                setConfig(prev => ({
                    ...prev,
                    dailyMenu: {
                        ...prev.dailyMenu,
                        [thaliType]: {
                            ...prev.dailyMenu[thaliType],
                            image: reader.result
                        }
                    }
                }));
            }
        };
        reader.readAsDataURL(file);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900">
                <img src="/logo.png" alt="Shree Shyam Rasoi Logo" className="h-24 md:h-32 object-contain animate-pulse mb-4" />
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const handleLogin = (e) => {
        e.preventDefault();
        // Hardcoded credentials for simplicity
        if (loginForm.username === 'Tarun' && loginForm.password === 'Cmpunk@786456') {
            sessionStorage.setItem('isAdminAuth', 'true');
            setIsAuthenticated(true);
            setLoginError('');
        } else {
            setLoginError('Invalid username or password');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
                <div className="bg-gray-800 p-8 rounded-3xl shadow-2xl border border-gray-700 w-full max-w-sm">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 mb-4">
                            <Users className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Admin Login</h2>
                        <p className="text-gray-400 text-sm mt-1">Please sign in to continue</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
                            <input
                                type="text"
                                value={loginForm.username}
                                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
                            <input
                                type="password"
                                value={loginForm.password}
                                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                required
                            />
                        </div>
                        {loginError && <p className="text-red-400 text-sm font-medium text-center bg-red-400/10 py-2 rounded-lg">{loginError}</p>}
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors mt-6 shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                        >
                            Log In
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="w-full h-48 md:h-64 rounded-3xl overflow-hidden mb-8 relative shadow-2xl border border-gray-800">
                    <img src="/dashboard_header.png" alt="Dashboard Header" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/60 to-transparent"></div>
                    <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-12">
                        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-lg">
                            Shree Shyam Rasoi
                        </h1>
                        <p className="text-blue-400 font-medium text-lg tracking-wide drop-shadow-md">Admin Dashboard</p>
                    </div>
                </div>

                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center">
                            <Activity className="h-5 w-5 mr-3 text-blue-400" />
                            Live Overview
                        </h2>
                        <p className="text-gray-400 mt-1 text-sm">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button onClick={() => loadData()} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition flex items-center text-sm font-medium text-gray-300">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Stats Card */}
                    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Users className="h-16 w-16" />
                        </div>
                        <p className="text-sm font-semibold tracking-wider text-gray-400 uppercase">Total Servings Sold</p>
                        <p className="text-5xl font-black text-white mt-2">{data?.totalServings || 0}</p>
                        <p className="text-sm text-gray-400 mt-4 leading-relaxed">
                            Target: {data?.maxStock || 0}
                            <span className="block w-full bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
                                <span
                                    className="block h-full bg-blue-500 rounded-full"
                                    style={{ width: `${Math.min(100, (data?.totalServings / data?.maxStock) * 100)}%` }}>
                                </span>
                            </span>
                        </p>
                    </div>

                    {/* Config Card */}
                    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-lg md:col-span-2 flex flex-col justify-between">
                        <div>
                            <h2 className="text-sm font-semibold tracking-wider text-gray-400 uppercase flex items-center mb-4">
                                <Settings className="h-4 w-4 mr-2" />
                                Store Operations
                            </h2>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6">
                            <form onSubmit={handleSaveConfig} className="flex-1 space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1.5">Today's Max Stock</label>
                                    <div className="flex space-x-3">
                                        <input
                                            type="number"
                                            value={config.maxStock}
                                            onChange={e => setConfig({ ...config, maxStock: parseInt(e.target.value) })}
                                            className="bg-gray-900 border border-gray-700 text-white text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                        />
                                        <button
                                            type="submit"
                                            disabled={savingConfig}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm px-4 py-2.5 transition"
                                        >
                                            Save All
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-gray-700">
                                    <h3 className="text-xs font-semibold tracking-wide text-gray-400 uppercase">App Header Configuration</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-blue-400 mb-1">App Title</label>
                                            <input
                                                type="text"
                                                value={config.appHeader?.title || ''}
                                                onChange={e => setConfig({ ...config, appHeader: { ...config.appHeader, title: e.target.value } })}
                                                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 mb-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-blue-400 mb-1">Banner Tagline / Subtitle</label>
                                            <input
                                                type="text"
                                                value={config.appHeader?.subtitle || ''}
                                                onChange={e => setConfig({ ...config, appHeader: { ...config.appHeader, subtitle: e.target.value } })}
                                                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 mb-2"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-blue-400 mb-1">Banner Welcome Text</label>
                                        <input
                                            type="text"
                                            value={config.appHeader?.bannerText || ''}
                                            onChange={e => setConfig({ ...config, appHeader: { ...config.appHeader, bannerText: e.target.value } })}
                                            className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 mb-2"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-blue-400 mb-1">Custom Logo</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => handleImageUpload(e, 'logo')}
                                                className="block w-full text-xs text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20"
                                            />
                                            {config.appHeader?.logo && <img src={config.appHeader.logo} alt="Logo" className="mt-2 h-8 object-contain" />}
                                        </div>
                                        <div>
                                            <label className="block text-xs text-blue-400 mb-1">Custom Banner Image</label>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={e => handleImageUpload(e, 'bgImage')}
                                                className="block w-full text-xs text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20"
                                            />
                                            {config.appHeader?.bgImage && <img src={config.appHeader.bgImage} alt="Cover" className="mt-2 h-8 object-cover rounded" />}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-gray-700">
                                    <h3 className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Payment Configuration</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-blue-400 mb-1">Razorpay Key ID</label>
                                            <input
                                                type="text"
                                                value={config.paymentSettings?.razorpayKey || ''}
                                                onChange={e => setConfig({ ...config, paymentSettings: { ...config.paymentSettings, razorpayKey: e.target.value } })}
                                                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 mb-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-blue-400 mb-1">Merchant UPI ID</label>
                                            <input
                                                type="text"
                                                value={config.paymentSettings?.upiId || ''}
                                                onChange={e => setConfig({ ...config, paymentSettings: { ...config.paymentSettings, upiId: e.target.value } })}
                                                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 mb-2"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-blue-400 mb-1">Bank Name</label>
                                            <input
                                                type="text"
                                                value={config.paymentSettings?.bankName || ''}
                                                onChange={e => setConfig({ ...config, paymentSettings: { ...config.paymentSettings, bankName: e.target.value } })}
                                                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 mb-2"
                                                placeholder="e.g. HDFC Bank"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-blue-400 mb-1">Account Holder Name</label>
                                            <input
                                                type="text"
                                                value={config.paymentSettings?.accountName || ''}
                                                onChange={e => setConfig({ ...config, paymentSettings: { ...config.paymentSettings, accountName: e.target.value } })}
                                                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 mb-2"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-blue-400 mb-1">Account Number</label>
                                            <input
                                                type="text"
                                                value={config.paymentSettings?.accountNumber || ''}
                                                onChange={e => setConfig({ ...config, paymentSettings: { ...config.paymentSettings, accountNumber: e.target.value } })}
                                                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 mb-2"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-blue-400 mb-1">IFSC Code</label>
                                            <input
                                                type="text"
                                                value={config.paymentSettings?.ifscCode || ''}
                                                onChange={e => setConfig({ ...config, paymentSettings: { ...config.paymentSettings, ifscCode: e.target.value } })}
                                                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 mb-2"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-gray-700">
                                    <h3 className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Daily Menu Configuration</h3>

                                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-bold text-yellow-500">Mini Thali Description</label>
                                            <div className="flex items-center space-x-2">
                                                <label className="text-xs font-semibold text-yellow-500">Price (₹):</label>
                                                <input
                                                    type="number"
                                                    value={config.dailyMenu?.mini?.price ?? 120}
                                                    onChange={e => setConfig({ ...config, dailyMenu: { ...config.dailyMenu, mini: { ...config.dailyMenu.mini, price: e.target.value === '' ? '' : parseInt(e.target.value) } } })}
                                                    className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-20 p-1.5"
                                                />
                                            </div>
                                        </div>
                                        <textarea
                                            value={config.dailyMenu?.mini?.desc || ''}
                                            onChange={e => setConfig({ ...config, dailyMenu: { ...config.dailyMenu, mini: { ...config.dailyMenu.mini, desc: e.target.value } } })}
                                            className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg focus:ring-yellow-500 focus:border-yellow-500 block w-full p-2 h-16 resize-none mb-2"
                                        />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleImageUpload(e, 'mini')}
                                            className="block w-full text-xs text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-yellow-500/10 file:text-yellow-500 hover:file:bg-yellow-500/20"
                                        />
                                        {config.dailyMenu?.mini?.image && <img src={config.dailyMenu.mini.image} alt="Mini Preview" className="mt-2 h-12 rounded object-cover border border-gray-700" />}
                                    </div>

                                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-bold text-emerald-500">Standard Thali Description</label>
                                            <div className="flex items-center space-x-2">
                                                <label className="text-xs font-semibold text-emerald-500">Price (₹):</label>
                                                <input
                                                    type="number"
                                                    value={config.dailyMenu?.standard?.price ?? 150}
                                                    onChange={e => setConfig({ ...config, dailyMenu: { ...config.dailyMenu, standard: { ...config.dailyMenu.standard, price: e.target.value === '' ? '' : parseInt(e.target.value) } } })}
                                                    className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-20 p-1.5"
                                                />
                                            </div>
                                        </div>
                                        <textarea
                                            value={config.dailyMenu?.standard?.desc || ''}
                                            onChange={e => setConfig({ ...config, dailyMenu: { ...config.dailyMenu, standard: { ...config.dailyMenu.standard, desc: e.target.value } } })}
                                            className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2 h-16 resize-none mb-2"
                                        />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleImageUpload(e, 'standard')}
                                            className="block w-full text-xs text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20"
                                        />
                                        {config.dailyMenu?.standard?.image && <img src={config.dailyMenu.standard.image} alt="Standard Preview" className="mt-2 h-12 rounded object-cover border border-gray-700" />}
                                    </div>

                                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700/50">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-xs font-bold text-purple-500">Deluxe Thali Description</label>
                                            <div className="flex items-center space-x-2">
                                                <label className="text-xs font-semibold text-purple-500">Price (₹):</label>
                                                <input
                                                    type="number"
                                                    value={config.dailyMenu?.deluxe?.price ?? 180}
                                                    onChange={e => setConfig({ ...config, dailyMenu: { ...config.dailyMenu, deluxe: { ...config.dailyMenu.deluxe, price: e.target.value === '' ? '' : parseInt(e.target.value) } } })}
                                                    className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-20 p-1.5"
                                                />
                                            </div>
                                        </div>
                                        <textarea
                                            value={config.dailyMenu?.deluxe?.desc || ''}
                                            onChange={e => setConfig({ ...config, dailyMenu: { ...config.dailyMenu, deluxe: { ...config.dailyMenu.deluxe, desc: e.target.value } } })}
                                            className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2 h-16 resize-none mb-2"
                                        />
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => handleImageUpload(e, 'deluxe')}
                                            className="block w-full text-xs text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-500 hover:file:bg-purple-500/20"
                                        />
                                        {config.dailyMenu?.deluxe?.image && <img src={config.dailyMenu.deluxe.image} alt="Deluxe Preview" className="mt-2 h-12 rounded object-cover border border-gray-700" />}
                                    </div>
                                </div>
                            </form>

                            <div className="flex-1 flex flex-col justify-end">
                                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                                    <p className="text-xs text-gray-400 mb-3 block">Manual Kill-Switch</p>
                                    <button
                                        onClick={toggleShop}
                                        disabled={savingConfig}
                                        className={`w-full flex items-center justify-center py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-300 ${config.shopOpen ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30'}`}
                                    >
                                        {config.shopOpen ? (
                                            <><XOctagon className="h-4 w-4 mr-2" /> Close Shop Now</>
                                        ) : (
                                            <><Activity className="h-4 w-4 mr-2" /> Re-open Shop</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Orders Table */}
                <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                        <h2 className="text-lg font-bold text-white">Live Orders</h2>
                        <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>Live Feed</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 border-b border-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-medium">Time</th>
                                    <th scope="col" className="px-6 py-4 font-medium">Customer</th>
                                    <th scope="col" className="px-6 py-4 font-medium">Location</th>
                                    <th scope="col" className="px-6 py-4 font-medium">Mobile</th>
                                    <th scope="col" className="px-6 py-4 font-medium">Thali Type</th>
                                    <th scope="col" className="px-6 py-4 font-medium">Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data?.orders && data.orders.length > 0 ? (
                                    data.orders.slice().reverse().map((order, idx) => (
                                        <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-mono text-xs">
                                                {new Date(order.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-white">
                                                {order.name}
                                            </td>
                                            <td className="px-6 py-4">
                                                {order.building}
                                            </td>
                                            <td className="px-6 py-4 font-mono">
                                                {order.mobile}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-300">
                                                {order.thaliType || "Unknown"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-blue-500/20 text-blue-400 py-1 px-3 rounded-full font-bold text-xs border border-blue-500/20">
                                                    {order.quantity}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                            No orders yet today.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
