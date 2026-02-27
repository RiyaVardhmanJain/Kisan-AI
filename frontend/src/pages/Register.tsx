import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Lock, User, MapPin, Sprout, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';

const Register: React.FC = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        name: '',
        phone: '',
        password: '',
        confirmPassword: '',
        state: '',
        district: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const updateField = (field: string, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const fillDemo = () => {
        setForm({
            name: 'Ramesh Patil',
            phone: '9999999999',
            password: 'demo123',
            confirmPassword: 'demo123',
            state: 'Maharashtra',
            district: 'Nashik',
        });
        toast.success('Demo data filled! Click Create Account');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.phone || !form.password) {
            toast.error('Please fill in all required fields');
            return;
        }
        if (form.password !== form.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        if (form.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await register({
                name: form.name,
                phone: form.phone,
                password: form.password,
                location: {
                    state: form.state || undefined,
                    district: form.district || undefined,
                },
            });
            toast.success('Account created! Welcome to Kisan AI');
            navigate('/warehouse');
        } catch (err: unknown) {
            const msg =
                err && typeof err === 'object' && 'response' in err
                    ? (err as { response: { data: { error: string } } }).response?.data?.error
                    : 'Registration failed';
            toast.error(msg || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-[#FDE7B3]/20 px-4 py-12">
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
                    <p className="mt-3 text-[#5B532C]/60 text-sm">Create your farmer account</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-[#5B532C]/10 p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-[#5B532C]">Create Account</h2>
                        <button
                            type="button"
                            onClick={fillDemo}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFC50F]/20 hover:bg-[#FFC50F]/40 text-[#5B532C] text-xs font-semibold transition-colors border border-[#FFC50F]/30"
                        >
                            <Zap className="w-3 h-3" />
                            Demo User
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-[#5B532C]/70 mb-1.5">Full Name *</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B532C]/40" />
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    placeholder="Ramesh Patil"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#5B532C]/15 bg-gray-50/50 text-[#5B532C] placeholder:text-[#5B532C]/30 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30 focus:border-[#63A361] transition-all"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-[#5B532C]/70 mb-1.5">Phone Number *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B532C]/40" />
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    placeholder="9876543210"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#5B532C]/15 bg-gray-50/50 text-[#5B532C] placeholder:text-[#5B532C]/30 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30 focus:border-[#63A361] transition-all"
                                />
                            </div>
                        </div>

                        {/* Location row */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-[#5B532C]/70 mb-1.5">State</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B532C]/40" />
                                    <input
                                        type="text"
                                        value={form.state}
                                        onChange={(e) => updateField('state', e.target.value)}
                                        placeholder="Maharashtra"
                                        className="w-full pl-10 pr-3 py-3 rounded-xl border border-[#5B532C]/15 bg-gray-50/50 text-[#5B532C] text-sm placeholder:text-[#5B532C]/30 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30 focus:border-[#63A361] transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#5B532C]/70 mb-1.5">District</label>
                                <input
                                    type="text"
                                    value={form.district}
                                    onChange={(e) => updateField('district', e.target.value)}
                                    placeholder="Nashik"
                                    className="w-full px-4 py-3 rounded-xl border border-[#5B532C]/15 bg-gray-50/50 text-[#5B532C] text-sm placeholder:text-[#5B532C]/30 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30 focus:border-[#63A361] transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-[#5B532C]/70 mb-1.5">Password *</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B532C]/40" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => updateField('password', e.target.value)}
                                    placeholder="Min 6 characters"
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

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-[#5B532C]/70 mb-1.5">Confirm Password *</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B532C]/40" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.confirmPassword}
                                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                                    placeholder="Re-enter password"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#5B532C]/15 bg-gray-50/50 text-[#5B532C] placeholder:text-[#5B532C]/30 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30 focus:border-[#63A361] transition-all"
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#63A361] hover:bg-[#578f55] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </motion.button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-[#5B532C]/50">
                            Already have an account?{' '}
                            <Link to="/login" className="text-[#63A361] font-semibold hover:underline">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
