import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Calendar, Clock, ChevronRight, ChevronDown } from 'lucide-react';
import type { LotData } from '../services/warehouseService';

interface LotCardProps {
    lot: LotData;
    onViewTimeline?: (lot: LotData) => void;
    onUpdateStatus?: (lot: LotData, newStatus: string) => void;
}

const conditionConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    good: { label: 'Good', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    watch: { label: 'Watch', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
    at_risk: { label: 'At Risk', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    spoiled: { label: 'Spoiled', bg: 'bg-gray-200', text: 'text-gray-700', dot: 'bg-gray-500' },
};

const statusConfig: Record<string, { label: string; color: string }> = {
    stored: { label: 'Stored', color: 'text-[#63A361]' },
    partially_dispatched: { label: 'Partially Sent', color: 'text-yellow-600' },
    dispatched: { label: 'Dispatched', color: 'text-blue-600' },
    sold: { label: 'Sold', color: 'text-gray-500' },
};

const statusTransitions: Record<string, string[]> = {
    stored: ['dispatched', 'sold'],
    partially_dispatched: ['dispatched', 'sold'],
    dispatched: ['sold'],
    sold: [],
};

export const LotCard: React.FC<LotCardProps> = ({ lot, onViewTimeline, onUpdateStatus }) => {
    const [statusOpen, setStatusOpen] = useState(false);
    const condition = conditionConfig[lot.currentCondition] || conditionConfig.good;
    const status = statusConfig[lot.status] || statusConfig.stored;

    const entryDate = new Date(lot.entryDate);
    const sellByDate = new Date(lot.recommendedSellByDate);
    const now = new Date();
    const daysStored = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(
        0,
        Math.floor((sellByDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    const totalDays = lot.expectedShelfLifeDays || 60;
    const progress = Math.min((daysStored / totalDays) * 100, 100);

    const warehouseName =
        typeof lot.warehouse === 'object' ? lot.warehouse.name : 'Unknown';

    const nextStatuses = statusTransitions[lot.status] || [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-[#5B532C]/10 p-4 hover:shadow-md transition-shadow"
        >
            {/* Header row */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#FDE7B3]/30">
                        <Package className="w-5 h-5 text-[#63A361]" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-[#5B532C] text-sm">{lot.cropName}</h3>
                        <p className="text-xs text-[#5B532C]/50">{lot.lotId} · {warehouseName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Condition badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${condition.bg} ${condition.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${condition.dot}`} />
                        {condition.label}
                    </span>
                </div>
            </div>

            {/* Quantity + status with dropdown */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-[#5B532C]">
                    {lot.quantityQuintals} <span className="text-xs font-normal text-[#5B532C]/50">quintals</span>
                </span>
                <div className="relative">
                    {onUpdateStatus && nextStatuses.length > 0 ? (
                        <>
                            <button
                                onClick={() => setStatusOpen(!statusOpen)}
                                className={`text-xs font-medium ${status.color} flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 border border-[#5B532C]/10 transition-colors`}
                            >
                                {status.label}
                                <ChevronDown className={`w-3 h-3 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {statusOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[#5B532C]/10 z-20 min-w-[130px] overflow-hidden"
                                    >
                                        {nextStatuses.map((s) => {
                                            const sc = statusConfig[s] || statusConfig.stored;
                                            return (
                                                <button
                                                    key={s}
                                                    onClick={() => {
                                                        setStatusOpen(false);
                                                        onUpdateStatus(lot, s);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-xs font-medium ${sc.color} hover:bg-gray-50 transition-colors`}
                                                >
                                                    Mark as {sc.label}
                                                </button>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    ) : (
                        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                    )}
                </div>
            </div>

            {/* Shelf life progress */}
            <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#5B532C]/50 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {daysStored}d stored
                    </span>
                    <span className="text-xs text-[#5B532C]/50">
                        {daysRemaining}d remaining
                    </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        className={`h-full rounded-full ${progress > 85 ? 'bg-red-400' : progress > 60 ? 'bg-yellow-400' : 'bg-[#63A361]'
                            }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </div>
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between pt-2 border-t border-[#5B532C]/5">
                <span className="text-xs text-[#5B532C]/40 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Sell by {sellByDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                {onViewTimeline && (
                    <button
                        onClick={() => onViewTimeline(lot)}
                        className="text-xs text-[#63A361] font-medium flex items-center gap-0.5 hover:underline"
                    >
                        Timeline
                        <ChevronRight className="w-3 h-3" />
                    </button>
                )}
            </div>
        </motion.div>
    );
};

export default LotCard;
