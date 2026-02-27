import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Eye, AlertTriangle, Truck, DollarSign, CheckCircle } from 'lucide-react';
import type { StorageEventData } from '../services/warehouseService';

interface LotTimelineProps {
    events: StorageEventData[];
    lotId: string;
    cropName: string;
    isOpen: boolean;
    onClose: () => void;
}

const eventConfig: Record<string, { icon: React.FC<{ className?: string }>; color: string; bg: string }> = {
    lot_created: { icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
    inspection_done: { icon: Eye, color: 'text-blue-600', bg: 'bg-blue-100' },
    alert_fired: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    condition_updated: { icon: CheckCircle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    partially_dispatched: { icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100' },
    dispatched: { icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100' },
    sold: { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
};

export const LotTimeline: React.FC<LotTimelineProps> = ({
    events,
    lotId,
    cropName,
    isOpen,
    onClose,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/30 z-50"
                    />
                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#5B532C]/10">
                            <div>
                                <h3 className="font-bold text-[#5B532C]">Traceability Timeline</h3>
                                <p className="text-xs text-[#5B532C]/50 mt-0.5">
                                    {cropName} · {lotId}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-gray-100 text-[#5B532C]/60 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Timeline */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {events.length === 0 ? (
                                <p className="text-center text-sm text-[#5B532C]/40 py-10">No events recorded yet</p>
                            ) : (
                                <div className="relative">
                                    {/* Vertical line */}
                                    <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-[#5B532C]/10" />

                                    <div className="space-y-6">
                                        {events.map((event, i) => {
                                            const config = eventConfig[event.eventType] || eventConfig.lot_created;
                                            const Icon = config.icon;
                                            return (
                                                <motion.div
                                                    key={event._id}
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.08 }}
                                                    className="flex gap-4 relative"
                                                >
                                                    {/* Icon dot */}
                                                    <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 z-10`}>
                                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 pt-1">
                                                        <p className="font-medium text-sm text-[#5B532C]">
                                                            {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                                        </p>
                                                        {event.description && (
                                                            <p className="text-xs text-[#5B532C]/60 mt-0.5">{event.description}</p>
                                                        )}
                                                        <p className="text-[10px] text-[#5B532C]/30 mt-1">
                                                            {new Date(event.performedAt).toLocaleString('en-IN')}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default LotTimeline;
