import React from 'react';
import { motion } from 'framer-motion';

interface StorageGaugeProps {
    value: number;
    max: number;
    label: string;
    unit: string;
    color: string;
    size?: number;
}

export const StorageGauge: React.FC<StorageGaugeProps> = ({
    value,
    max,
    label,
    unit,
    color,
    size = 80,
}) => {
    const percentage = Math.min((value / max) * 100, 100);
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const getStatusColor = () => {
        if (percentage > 85) return '#ef4444'; // red — danger
        if (percentage > 65) return '#f59e0b'; // amber — watch
        return color;
    };

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative" style={{ width: size, height: size }}>
                {/* Background circle */}
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth={5}
                    />
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke={getStatusColor()}
                        strokeWidth={5}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                </svg>
                {/* Value display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-[#5B532C]">
                        {value.toFixed(0)}
                    </span>
                    <span className="text-[9px] text-[#5B532C]/50">{unit}</span>
                </div>
            </div>
            <span className="text-xs text-[#5B532C]/60 font-medium">{label}</span>
        </div>
    );
};

export default StorageGauge;
