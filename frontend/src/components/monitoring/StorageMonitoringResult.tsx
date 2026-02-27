import React from 'react';
import { motion } from 'framer-motion';
import {
    Package,
    Droplets,
    Wind,
    Bug,
    AlertTriangle,
    CheckCircle2,
    Target,
    Sparkles,
    Shield,
    Clock,
    TrendingUp,
    Activity,
} from 'lucide-react';
import { StorageMonitoringResult as StorageResultType } from '../../types';

interface Props {
    result: StorageResultType;
    image: string | null;
    onRetry: () => void;
}

const riskColors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    low: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: 'text-green-600' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-600' },
    high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', icon: 'text-orange-600' },
    critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-600' },
};

const conditionColors: Record<string, { bg: string; text: string; border: string }> = {
    excellent: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    good: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    fair: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    poor: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const statusColors: Record<string, string> = {
    none: 'text-green-600',
    adequate: 'text-green-600',
    suspected: 'text-amber-600',
    insufficient: 'text-amber-600',
    mild: 'text-amber-600',
    moderate: 'text-orange-600',
    confirmed: 'text-red-600',
    poor: 'text-red-600',
    severe: 'text-red-600',
};

export const StorageMonitoringResult: React.FC<Props> = ({ result, image, onRetry }) => {
    const risk = riskColors[result.storageRisk] || riskColors.medium;
    const condition = conditionColors[result.produceCondition] || conditionColors.fair;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Success Banner */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center items-center p-4 bg-[#FDE7B3]/30 rounded-xl border border-[#63A361]/30"
            >
                <CheckCircle2 className="mr-2 w-5 h-5 text-[#63A361]" />
                <span className="font-medium text-[#63A361]">Storage analysis completed successfully</span>
            </motion.div>

            {/* Image Preview */}
            {image && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-white/90 rounded-2xl shadow-xl border backdrop-blur-md border-white/30"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#FDE7B3]/50 rounded-lg">
                            <Package className="w-5 h-5 text-[#5B532C]" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Analyzed Storage Image</h3>
                    </div>
                    <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                        <img src={image} alt="Analyzed storage" className="w-full h-auto object-contain max-h-80" />
                    </div>
                </motion.div>
            )}

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Produce Condition */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`p-6 rounded-2xl border ${condition.border} ${condition.bg}`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-white/60 rounded-xl">
                            <Package className={`w-6 h-6 ${condition.text}`} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Condition</h3>
                    </div>
                    <div className="text-center">
                        <div className={`text-2xl font-bold ${condition.text} mb-2 uppercase`}>
                            {result.produceCondition}
                        </div>
                        <div className="text-sm text-gray-600">Produce Quality</div>
                    </div>
                </motion.div>

                {/* Storage Risk */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`p-6 rounded-2xl border ${risk.border} ${risk.bg}`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-white/60 rounded-xl">
                            <AlertTriangle className={`w-6 h-6 ${risk.icon}`} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Risk Level</h3>
                    </div>
                    <div className="text-center">
                        <div className={`text-3xl font-bold ${risk.text} mb-2 uppercase`}>
                            {result.storageRisk}
                        </div>
                        <div className="text-sm text-gray-600">Storage Risk</div>
                    </div>
                </motion.div>

                {/* Shelf Life */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
                            <Clock className="w-6 h-6 text-[#5B532C]" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Shelf Life</h3>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-bold text-[#5B532C] mb-2">{result.shelfLifeEstimate}</div>
                        <div className="text-sm text-gray-600">Estimated Remaining</div>
                    </div>
                </motion.div>

                {/* Confidence */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
                            <Target className="w-6 h-6 text-[#5B532C]" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Confidence</h3>
                    </div>
                    <div className="text-center">
                        <div className="text-4xl font-bold text-[#63A361] mb-2">{result.confidenceLevel}%</div>
                        <div className="text-sm text-gray-600">AI Accuracy</div>
                    </div>
                </motion.div>
            </div>

            {/* Detection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Mold Detection', value: result.moldDetected, icon: Droplets },
                    { label: 'Moisture Damage', value: result.moistureDamage, icon: Droplets },
                    { label: 'Pest Signs', value: result.pestSigns, icon: Bug },
                    { label: 'Ventilation', value: result.ventilationStatus, icon: Wind },
                ].map((item, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + idx * 0.1 }}
                        className="p-5 bg-white rounded-xl border border-[#5B532C]/10"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <item.icon className="w-4 h-4 text-[#5B532C]/60" />
                            <span className="text-sm font-medium text-[#5B532C]/70">{item.label}</span>
                        </div>
                        <div className={`text-xl font-bold capitalize ${statusColors[item.value] || 'text-gray-700'}`}>
                            {item.value === 'none' ? '✓ None' : item.value}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Analysis Summary */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
                        <Activity className="w-6 h-6 text-[#5B532C]" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Analysis Summary</h3>
                </div>
                <p className="text-base text-gray-700">{result.analysisSummary}</p>
            </motion.div>

            {/* Environmental Factors */}
            {result.environmentalFactors && result.environmentalFactors.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                    className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
                            <Activity className="w-6 h-6 text-[#5B532C]" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Environmental Factors</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {result.environmentalFactors.map((factor, idx) => (
                            <div key={idx} className="p-3 bg-white rounded-lg border border-[#5B532C]/10">
                                <div className="text-sm font-medium text-[#5B532C] mb-1">{factor.factor}</div>
                                <span className={`text-xs font-semibold uppercase ${factor.status === 'optimal' ? 'text-green-600' :
                                        factor.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                                    }`}>
                                    {factor.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Recommendations + Prevention */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="p-6 bg-white/90 rounded-2xl border shadow-xl backdrop-blur-md border-white/30"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-[#63A361]/10 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-[#63A361]" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Recommendations</h3>
                    </div>
                    <ul className="space-y-3">
                        {result.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-[#63A361] rounded-full mt-2 shrink-0"></div>
                                <span className="text-sm text-gray-700">{rec}</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="p-6 bg-white/90 rounded-2xl border shadow-xl backdrop-blur-md border-white/30"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-purple-100 rounded-xl">
                            <Shield className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Preventive Measures</h3>
                    </div>
                    <ul className="space-y-3">
                        {result.preventiveMeasures.map((measure: string, index: number) => (
                            <li key={index} className="flex items-start gap-3">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></div>
                                <span className="text-sm text-gray-700">{measure}</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>

            {/* Action Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 }}
                className="flex justify-center"
            >
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRetry}
                    className="px-8 py-3 bg-[#63A361] hover:bg-[#5B532C] text-white font-medium rounded-full flex items-center gap-2"
                >
                    <Sparkles className="w-5 h-5" />
                    Analyze Another Image
                </motion.button>
            </motion.div>
        </motion.div>
    );
};
