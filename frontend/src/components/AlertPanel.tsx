import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle, Thermometer, Droplets, Clock, Bell,
    ChevronDown, ChevronUp, ShieldCheck, Truck,
} from 'lucide-react';
import type { AlertData } from '../services/warehouseService';
import warehouseService from '../services/warehouseService';
import { PreventiveMeasuresPanel } from './PreventiveMeasuresPanel';
import toast from 'react-hot-toast';

interface AlertPanelProps {
    alerts: AlertData[];
    onResolve?: (id: string) => void;
    /** Called when farmer clicks "Sell / Dispatch" on an alert */
    onSellDispatch?: (alert: AlertData) => void;
}

const severityConfig = {
    low: { icon: Bell, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', iconColor: 'text-blue-500' },
    medium: { icon: Bell, bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', iconColor: 'text-yellow-500' },
    high: { icon: AlertTriangle, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', iconColor: 'text-orange-500' },
    critical: { icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', iconColor: 'text-red-500' },
};

const alertTypeIcons: Record<string, React.FC<{ className?: string }>> = {
    humidity_breach: Droplets,
    temp_breach: Thermometer,
    overdue: Clock,
    spoilage_risk: AlertTriangle,
    custom: Bell,
};

export const AlertPanel: React.FC<AlertPanelProps> = ({ alerts, onResolve, onSellDispatch }) => {
    const [expanded, setExpanded] = React.useState(true);
    const [expandedPreventive, setExpandedPreventive] = React.useState<string | null>(null);
    const unreadCount = alerts.filter((a) => !a.isRead).length;

    const handlePreventiveConfirm = async (alert: AlertData) => {
        try {
            // 1. Resolve the alert with "Preventive measures taken"
            await warehouseService.resolveAlert(alert._id, 'Preventive measures taken');

            // 2. Downgrade lot condition to "watch" if it was worse
            if (alert.lot?._id) {
                await warehouseService.updateLot(alert.lot._id, { currentCondition: 'watch' });
                // 3. Log timeline event
                await warehouseService.addLotEvent(alert.lot._id, {
                    eventType: 'inspection_done',
                    description: `Farmer confirmed preventive measures for ${alert.alertType.replace(/_/g, ' ')} alert`,
                });
            }

            toast.success('✅ Preventive action recorded. Condition updated.');
            setExpandedPreventive(null);
            onResolve?.(alert._id);
        } catch (err) {
            toast.error('Failed to save action.');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-[#5B532C]/10 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#5B532C]/60" />
                    <span className="font-semibold text-sm text-[#5B532C]">Alerts</span>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold min-w-[20px] text-center">
                            {unreadCount}
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
                        {alerts.length === 0 ? (
                            <div className="p-4 text-center text-sm text-[#5B532C]/40">
                                No active alerts — everything looks great! 🌿
                            </div>
                        ) : (
                            <div className="divide-y divide-[#5B532C]/5 max-h-[600px] overflow-y-auto">
                                {alerts.map((alert) => {
                                    const severity = severityConfig[alert.severity] || severityConfig.medium;
                                    const Icon = alertTypeIcons[alert.alertType] || Bell;
                                    const isPreventiveOpen = expandedPreventive === alert._id;
                                    const warehouseName = alert.warehouse?.name || 'Warehouse';

                                    return (
                                        <motion.div
                                            key={alert._id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className={`px-4 py-3 ${severity.bg}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${severity.iconColor}`} />
                                                <div className="flex-1 min-w-0">
                                                    {/* Alert title + crop name */}
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className={`text-sm font-semibold ${severity.text}`}>
                                                            {alert.lot?.cropName || 'Produce'}
                                                            {alert.lot?.lotId ? ` (${alert.lot.lotId})` : ''}
                                                        </p>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${alert.severity === 'critical' ? 'bg-red-500 text-white' :
                                                                alert.severity === 'high' ? 'bg-orange-500 text-white' :
                                                                    alert.severity === 'medium' ? 'bg-yellow-400 text-yellow-900' :
                                                                        'bg-blue-400 text-white'
                                                            }`}>
                                                            {alert.severity.toUpperCase()} RISK
                                                        </span>
                                                    </div>

                                                    {/* Message */}
                                                    <p className={`text-sm ${severity.text} mt-0.5`}>
                                                        {alert.message}
                                                    </p>

                                                    {/* Meta: warehouse + time */}
                                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5B532C]/40">
                                                        <span>📍 {warehouseName}</span>
                                                        <span>{new Date(alert.triggeredAt).toLocaleString('en-IN')}</span>
                                                    </div>

                                                    {/* Two action buttons (only if preventive panel is NOT open) */}
                                                    {!isPreventiveOpen && (
                                                        <div className="flex gap-2 mt-3">
                                                            <button
                                                                onClick={() => setExpandedPreventive(alert._id)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-300 bg-teal-50 text-teal-700 text-xs font-medium hover:bg-teal-100 transition-colors"
                                                            >
                                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                                Preventive Measures
                                                            </button>
                                                            <button
                                                                onClick={() => onSellDispatch?.(alert)}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors"
                                                            >
                                                                <Truck className="w-3.5 h-3.5" />
                                                                Sell / Dispatch
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Preventive measures expanded panel */}
                                                    <AnimatePresence>
                                                        {isPreventiveOpen && (
                                                            <PreventiveMeasuresPanel
                                                                alert={alert}
                                                                warehouseType="dry"
                                                                onConfirm={() => handlePreventiveConfirm(alert)}
                                                                onBack={() => setExpandedPreventive(null)}
                                                            />
                                                        )}
                                                    </AnimatePresence>
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
