import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Clock, X, Loader2, CheckCircle, Package, IndianRupee } from 'lucide-react';
import toast from 'react-hot-toast';
import warehouseService from '../services/warehouseService';
import type { AlertData, LotData } from '../services/warehouseService';

interface DispatchConfirmFormProps {
    alert: AlertData;
    lot: LotData;
    isVisible: boolean;
    onDispatched: () => void;   // Called after successful dispatch — parent reloads data
    onDecideLater: () => void;  // Marks alert as read, hides bar until next visit
    onClose: () => void;
}

export const DispatchConfirmForm: React.FC<DispatchConfirmFormProps> = ({
    alert,
    lot,
    isVisible,
    onDispatched,
    onDecideLater,
    onClose,
}) => {
    const [showForm, setShowForm] = useState(false);
    const [dispatching, setDispatching] = useState(false);
    const [qty, setQty] = useState(String(lot.quantityQuintals));
    const [market, setMarket] = useState('');
    const [price, setPrice] = useState('');

    // Auto-calculate estimated revenue
    const estimatedRevenue = useMemo(() => {
        const q = parseFloat(qty);
        const p = parseFloat(price);
        if (q > 0 && p > 0) {
            return q * p;
        }
        return 0;
    }, [qty, price]);

    const handleDispatch = async () => {
        if (!market.trim()) {
            toast.error('Enter the market or buyer name');
            return;
        }
        const qtyNum = parseFloat(qty);
        if (!qtyNum || qtyNum <= 0 || qtyNum > lot.quantityQuintals) {
            toast.error(`Quantity must be between 0.1 and ${lot.quantityQuintals}`);
            return;
        }

        setDispatching(true);
        try {
            // Step 1: Update lot status
            await warehouseService.updateLot(lot._id, { status: 'dispatched' });

            // Step 2: Log traceability event
            const pricePerQ = price ? parseFloat(price) : undefined;
            const revenueStr = pricePerQ
                ? `₹${(qtyNum * pricePerQ).toLocaleString('en-IN')}`
                : 'amount TBD';
            const priceStr = pricePerQ ? ` at ₹${pricePerQ.toLocaleString('en-IN')}/q` : '';
            await warehouseService.addLotEvent(lot._id, {
                eventType: 'dispatched',
                description: `Dispatched ${qtyNum}q to ${market.trim()}${priceStr}. Est. revenue: ${revenueStr}`,
                metadata: { market: market.trim(), quantityDispatched: qtyNum, pricePerQuintal: pricePerQ, alertId: alert._id },
            });

            // Step 3: Resolve alert (non-blocking — don't fail the whole flow if this errors)
            try {
                await warehouseService.resolveAlert(alert._id, `Dispatched ${qtyNum}q to ${market.trim()}`);
            } catch (alertErr) {
                console.warn('Alert resolve failed (non-critical):', alertErr);
            }

            const toastRevenue = pricePerQ
                ? ` — Est. ₹${(qtyNum * pricePerQ).toLocaleString('en-IN')}`
                : '';
            toast.success(`✅ Dispatched ${qtyNum}q ${lot.cropName} to ${market.trim()}${toastRevenue}`);
            onDispatched();
        } catch (err) {
            console.error('Dispatch error:', err);
            toast.error('Failed to dispatch. Please try again.');
        } finally {
            setDispatching(false);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-40"
                >
                    {/* Expanded dispatch form */}
                    <AnimatePresence>
                        {showForm && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 20 }}
                                className="max-w-2xl mx-auto mb-0 px-4"
                            >
                                <div className="bg-white rounded-t-2xl shadow-2xl border border-b-0 border-[#5B532C]/15 p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-[#5B532C] flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-[#63A361]" />
                                            Confirm Your Dispatch
                                        </h3>
                                        <button
                                            onClick={() => setShowForm(false)}
                                            className="p-1 rounded-lg hover:bg-gray-100 text-[#5B532C]/40"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="mb-4 text-sm text-[#5B532C]/70 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-[#63A361]" />
                                        <span className="font-medium text-[#5B532C]">{lot.cropName}</span>
                                        <span>·</span>
                                        <span>Lot {lot.lotId}</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                                        <div>
                                            <label className="block text-xs font-medium text-[#5B532C]/60 mb-1">
                                                Quantity (quintals)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                min="0.1"
                                                max={lot.quantityQuintals}
                                                value={qty}
                                                onChange={(e) => setQty(e.target.value)}
                                                className="w-full px-3 py-2 border-2 border-[#5B532C]/15 rounded-lg text-sm focus:border-[#63A361] focus:outline-none"
                                            />
                                            <p className="text-[10px] text-[#5B532C]/40 mt-0.5">
                                                Max: {lot.quantityQuintals}q
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#5B532C]/60 mb-1">
                                                Market / Buyer
                                            </label>
                                            <input
                                                type="text"
                                                value={market}
                                                onChange={(e) => setMarket(e.target.value)}
                                                placeholder="e.g. Lasalgaon APMC"
                                                className="w-full px-3 py-2 border-2 border-[#5B532C]/15 rounded-lg text-sm focus:border-[#63A361] focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#5B532C]/60 mb-1">
                                                Price ₹/quintal (optional)
                                            </label>
                                            <input
                                                type="number"
                                                value={price}
                                                onChange={(e) => setPrice(e.target.value)}
                                                placeholder="e.g. 2100"
                                                className="w-full px-3 py-2 border-2 border-[#5B532C]/15 rounded-lg text-sm focus:border-[#63A361] focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Auto-calculated revenue */}
                                    {estimatedRevenue > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="mb-4 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200"
                                        >
                                            <div className="flex items-center gap-2">
                                                <IndianRupee className="w-4 h-4 text-green-600" />
                                                <span className="text-xs font-medium text-green-700">Estimated Revenue</span>
                                            </div>
                                            <p className="text-lg font-bold text-green-800 mt-1">
                                                ₹{estimatedRevenue.toLocaleString('en-IN')}
                                            </p>
                                            <p className="text-[10px] text-green-600/70">
                                                {qty}q × ₹{parseFloat(price).toLocaleString('en-IN')}/quintal
                                            </p>
                                        </motion.div>
                                    )}

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowForm(false)}
                                            className="px-4 py-2 rounded-lg border border-[#5B532C]/15 text-[#5B532C]/70 text-sm hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDispatch}
                                            disabled={dispatching}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#63A361] hover:bg-[#578f55] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
                                        >
                                            {dispatching ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-4 h-4" />
                                                    Confirm Dispatch
                                                    {estimatedRevenue > 0 && (
                                                        <span className="opacity-80">
                                                            · ₹{estimatedRevenue.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Floating bottom bar */}
                    <div className="bg-white/95 backdrop-blur-md border-t border-[#5B532C]/15 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                        <Truck className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-[#5B532C] truncate">
                                            Alert Action · {lot.cropName} ({lot.lotId})
                                        </p>
                                        <p className="text-xs text-[#5B532C]/50">
                                            You reviewed market options. What did you decide?
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={onDecideLater}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#5B532C]/15 text-[#5B532C]/60 text-sm hover:bg-gray-50 transition-colors"
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                        Decide Later
                                    </button>
                                    <button
                                        onClick={() => setShowForm(true)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-[#63A361] hover:bg-[#578f55] text-white rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        <Truck className="w-3.5 h-3.5" />
                                        I'm Dispatching
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-[#5B532C]/30"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DispatchConfirmForm;
