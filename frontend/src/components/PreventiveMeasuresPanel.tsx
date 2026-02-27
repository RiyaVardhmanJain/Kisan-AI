import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Loader2, CheckCircle, ChevronLeft, AlertTriangle, Clock, Zap } from 'lucide-react';
import { getPreventiveMeasures, type PreventiveAnalysis } from '../ai/alertActionService';
import type { AlertData } from '../services/warehouseService';

interface PreventiveMeasuresPanelProps {
    alert: AlertData;
    daysStored?: number;
    warehouseType?: string;
    onConfirm: () => void; // Called when farmer confirms they took action
    onBack: () => void;
}

export const PreventiveMeasuresPanel: React.FC<PreventiveMeasuresPanelProps> = ({
    alert,
    daysStored = 0,
    warehouseType = 'dry',
    onConfirm,
    onBack,
}) => {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<PreventiveAnalysis | null>(null);
    const [confirming, setConfirming] = useState(false);

    const cropName = alert.lot?.cropName ?? 'Produce';

    const fetchAnalysis = async () => {
        setLoading(true);
        try {
            const result = await getPreventiveMeasures({
                cropName,
                alertType: alert.alertType,
                alertMessage: alert.message,
                daysStored,
                warehouseType,
            });
            setAnalysis(result);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch on mount
    React.useEffect(() => {
        fetchAnalysis();
    }, []);

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            await onConfirm();
        } finally {
            setConfirming(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
        >
            <div className="mt-3 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-teal-800 text-sm">AI Preventive Analysis</p>
                        <p className="text-[11px] text-teal-600">{cropName} · {alert.alertType.replace(/_/g, ' ')}</p>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {loading && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 py-4 text-teal-600"
                        >
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Analyzing storage conditions...</span>
                        </motion.div>
                    )}

                    {!loading && analysis && (
                        <motion.div
                            key="analysis"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                        >
                            {/* Why this alert */}
                            <div className="bg-white/60 rounded-lg p-3 border border-teal-100">
                                <p className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide mb-1">
                                    Why This Alert
                                </p>
                                <p className="text-sm text-[#5B532C]">{analysis.why}</p>
                            </div>

                            {/* Immediate steps */}
                            <div className="bg-white/60 rounded-lg p-3 border border-teal-100">
                                <p className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> Do Right Now
                                </p>
                                <ul className="space-y-1.5">
                                    {analysis.immediateSteps.map((step, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-[#5B532C]">
                                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                                {i + 1}
                                            </span>
                                            {step}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Outlook + risk */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                    <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> 48-Hour Outlook
                                    </p>
                                    <p className="text-xs text-blue-800">{analysis.outlook}</p>
                                </div>
                                <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                                    <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> If No Action
                                    </p>
                                    <p className="text-xs text-red-800">{analysis.riskIfNotActed}</p>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 pt-1">
                                <button
                                    onClick={onBack}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-teal-200 text-teal-700 text-sm hover:bg-teal-100 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={confirming}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                                >
                                    {confirming ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4" />
                                    )}
                                    {confirming ? 'Saving...' : 'Yes, I followed these steps'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default PreventiveMeasuresPanel;
