import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle, Thermometer, Droplets, Clock, Bell, Check,
    ChevronDown, ChevronUp, Warehouse, Truck, ShieldAlert
} from 'lucide-react';
import type { AlertData } from '../services/warehouseService';

interface AlertPanelProps {
    alerts: AlertData[];
    onResolve?: (id: string) => void;
}

const severityConfig: Record<string, { accent: string; bg: string; border: string; text: string; iconColor: string; badge: string }> = {
    low: { accent: 'border-l-blue-400', bg: 'bg-blue-50/60', border: 'border-blue-100', text: 'text-blue-800', iconColor: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
    medium: { accent: 'border-l-amber-400', bg: 'bg-amber-50/60', border: 'border-amber-100', text: 'text-amber-800', iconColor: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
    high: { accent: 'border-l-orange-500', bg: 'bg-orange-50/60', border: 'border-orange-100', text: 'text-orange-800', iconColor: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' },
    critical: { accent: 'border-l-red-500', bg: 'bg-red-50/60', border: 'border-red-100', text: 'text-red-800', iconColor: 'text-red-500', badge: 'bg-red-100 text-red-700' },
};

const alertTypeConfig: Record<string, { icon: React.FC<{ className?: string }>; actionLabel: string }> = {
    humidity_breach: { icon: Droplets, actionLabel: 'Improve ventilation' },
    temp_breach: { icon: Thermometer, actionLabel: 'Check cooling system' },
    overdue: { icon: Clock, actionLabel: 'Dispatch soon' },
    spoilage_risk: { icon: AlertTriangle, actionLabel: 'Inspect produce' },
    capacity_warning: { icon: Warehouse, actionLabel: 'Shift stock' },
    custom: { icon: Bell, actionLabel: 'Review' },
};

export const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onResolve }) => {
    const [expanded, setExpanded] = React.useState(true);

    // Only show unresolved alerts
    const activeAlerts = alerts.filter((a) => !a.isResolved);
    const resolvedCount = alerts.filter((a) => a.isResolved).length;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-[#5B532C]/10 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-red-50">
                        <ShieldAlert className="w-4 h-4 text-red-500" />
                    </div>
                    <span className="font-semibold text-sm text-[#5B532C]">Alerts</span>
                    {activeAlerts.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold min-w-[20px] text-center animate-pulse">
                            {activeAlerts.length}
                        </span>
                    )}
                    {resolvedCount > 0 && (
                        <span className="text-xs text-[#63A361]/70 font-medium">
                            ✓ {resolvedCount} resolved
                        </span>
                    )}
                </div>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-[#5B532C]/40" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-[#5B532C]/40" />
                )}
            </button>

            {/* Alert list */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                    >
                        {activeAlerts.length === 0 ? (
                            <div className="p-6 text-center">
                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
                                    <Check className="w-5 h-5 text-[#63A361]" />
                                </div>
                                <p className="text-sm text-[#5B532C]/50 font-medium">All clear — no active alerts 🌿</p>
                            </div>
                        ) : (
                            <div className="space-y-2 p-3 max-h-96 overflow-y-auto">
                                {activeAlerts.map((alert, i) => {
                                    const severity = severityConfig[alert.severity] || severityConfig.medium;
                                    const typeConfig = alertTypeConfig[alert.alertType] || alertTypeConfig.custom;
                                    const Icon = typeConfig.icon;
                                    return (
                                        <motion.div
                                            key={alert._id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10, height: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className={`rounded-lg border ${severity.border} border-l-4 ${severity.accent} ${severity.bg} p-3.5`}
                                        >
                                            {/* Top row: icon + message + severity badge */}
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 flex-shrink-0">
                                                    <Icon className={`w-4.5 h-4.5 ${severity.iconColor}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <p className={`text-sm font-semibold ${severity.text} leading-snug`}>
                                                            {alert.message}
                                                        </p>
                                                        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${severity.badge}`}>
                                                            {alert.severity}
                                                        </span>
                                                    </div>

                                                    {/* Recommendation */}
                                                    {alert.recommendation && (
                                                        <p className="text-xs text-[#5B532C]/55 mt-1 leading-relaxed">
                                                            💡 {alert.recommendation}
                                                        </p>
                                                    )}

                                                    {/* Timestamp */}
                                                    <p className="text-[10px] text-[#5B532C]/30 mt-1.5">
                                                        {new Date(alert.triggeredAt).toLocaleString('en-IN', {
                                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </p>

                                                    {/* Action buttons */}
                                                    <div className="flex items-center gap-2 mt-2.5">
                                                        <button
                                                            onClick={() => onResolve?.(alert._id)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#63A361] hover:bg-[#63A361]/90 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                                                        >
                                                            <Check className="w-3 h-3" />
                                                            Resolve
                                                        </button>
                                                        <span className="flex items-center gap-1 px-2.5 py-1.5 bg-white/70 text-[#5B532C]/60 text-xs font-medium rounded-lg border border-[#5B532C]/10">
                                                            {alert.alertType === 'capacity_warning' && <Warehouse className="w-3 h-3" />}
                                                            {alert.alertType === 'overdue' && <Truck className="w-3 h-3" />}
                                                            {typeConfig.actionLabel}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AlertPanel;
