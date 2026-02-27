import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, XCircle, X, ShieldAlert } from 'lucide-react';

interface SpoilageAlertProps {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  recommendation: string;
  onDismiss?: () => void;
}

const severityConfig = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-800',
    textColor: 'text-blue-700',
    recBg: 'bg-blue-100/50',
    Icon: Info,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-800',
    textColor: 'text-amber-700',
    recBg: 'bg-amber-100/50',
    Icon: AlertTriangle,
  },
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-red-800',
    textColor: 'text-red-700',
    recBg: 'bg-red-100/50',
    Icon: ShieldAlert,
  },
};

export const SpoilageAlert: React.FC<SpoilageAlertProps> = ({
  severity,
  title,
  message,
  recommendation,
  onDismiss,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const config = severityConfig[severity];
  const { Icon } = config;

  const handleDismiss = () => {
    setDismissed(true);
    setTimeout(() => onDismiss?.(), 300);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className={`${config.bg} ${config.border} border rounded-xl p-4`}
        >
          <div className="flex items-start gap-3">
            <div className={`${config.iconBg} p-2 rounded-lg flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className={`font-semibold ${config.titleColor}`}>{title}</h4>
                {onDismiss && (
                  <button
                    onClick={handleDismiss}
                    className={`${config.textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className={`text-sm ${config.textColor} mt-1`}>{message}</p>
              <div className={`${config.recBg} rounded-lg p-2 mt-2`}>
                <p className={`text-xs font-medium ${config.titleColor}`}>
                  Recommended: {recommendation}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SpoilageAlert;
