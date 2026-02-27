import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Lock, Sprout, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

const Login: React.FC = () => {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const [demoLoading, setDemoLoading] = useState(false);

    const loginAsDemo = async () => {
        const DEMO = { phone: '9999999999', password: 'demo123', name: 'Ramesh Patil' };
        setDemoLoading(true);
        try {
            // Try login first (if demo user already exists)
            await login(DEMO.phone, DEMO.password);
            toast.success('Logged in as Demo User! 🌾');
            navigate('/warehouse');
        } catch {
            // Account doesn't exist — auto-register then login
            try {
                await register({
                    name: DEMO.name,
                    phone: DEMO.phone,
                    password: DEMO.password,
                    location: { state: 'Maharashtra', district: 'Nashik' },
                });
                toast.success('Demo account created & logged in! 🌾');
                navigate('/warehouse');
            } catch (regErr: unknown) {
                const msg =
                    regErr && typeof regErr === 'object' && 'response' in regErr
                        ? (regErr as { response: { data: { error: string } } }).response?.data?.error
                        : 'Demo setup failed';
                toast.error(msg || 'Demo setup failed');
            }
        } finally {
            setDemoLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone || !password) {
            toast.error('Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            await login(phone, password);
            toast.success('Welcome back!');
            navigate('/warehouse');
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response: { data: { error: string } } }).response?.data?.error
                    : 'Login failed';
            toast.error(msg || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-[#FDE7B3]/20 px-4">
            <Toaster position="top-center" />
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-3 group">
                        <div className="p-3 rounded-xl bg-[#FDE7B3]/30 group-hover:bg-[#FDE7B3]/50 transition-colors">
                            <Sprout className="w-10 h-10 text-[#63A361]" />
                        </div>
                        <span className="text-3xl font-bold text-[#5B532C]">Kisan AI</span>
                    </Link>
                    <p className="mt-3 text-[#5B532C]/60 text-sm">Sign in to manage your storage</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-[#5B532C]/10 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-[#5B532C]">Welcome Back</h2>
                        <button
                            type="button"
                            onClick={loginAsDemo}
                            disabled={demoLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFC50F]/20 hover:bg-[#FFC50F]/40 text-[#5B532C] text-xs font-semibold transition-colors border border-[#FFC50F]/30 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {demoLoading ? (
                                <div className="w-3 h-3 border border-[#5B532C] border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Zap className="w-3 h-3" />
                            )}
                            {demoLoading ? 'Loading...' : 'One-click Demo'}
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-[#5B532C]/70 mb-1.5">Phone Number</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B532C]/40" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="9876543210"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#5B532C]/15 bg-gray-50/50 text-[#5B532C] placeholder:text-[#5B532C]/30 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30 focus:border-[#63A361] transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-[#5B532C]/70 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B532C]/40" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full pl-11 pr-12 py-3 rounded-xl border border-[#5B532C]/15 bg-gray-50/50 text-[#5B532C] placeholder:text-[#5B532C]/30 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30 focus:border-[#63A361] transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B532C]/40 hover:text-[#5B532C]/70 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#63A361] hover:bg-[#578f55] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-[#5B532C]/50">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-[#63A361] font-semibold hover:underline">
                                Register
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
