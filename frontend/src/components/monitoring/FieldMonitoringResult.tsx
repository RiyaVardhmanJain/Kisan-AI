import React from 'react';
import { motion } from 'framer-motion';
import {
  Sprout,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Target,
  Sparkles,
  Activity,
  Shield,
  BarChart3,
  Map,
  Leaf,
} from 'lucide-react';
import { FieldMonitoringResult as FieldResultType } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell } from 'recharts';

interface Props {
  result: FieldResultType;
  image: string | null;
  onRetry: () => void;
}

export const FieldMonitoringResult: React.FC<Props> = ({ result, image, onRetry }) => {
  const getStatusColor = (status: string) => {
    const colors = {
      low: { bg: 'bg-[#FDE7B3]/20', text: 'text-[#63A361]', border: 'border-[#63A361]/20', icon: 'text-[#63A361]' },
      medium: { bg: 'bg-[#FDE7B3]/30', text: 'text-[#FFC50F]', border: 'border-[#FFC50F]/30', icon: 'text-[#FFC50F]' },
      high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-600' },
      uniform: { bg: 'bg-[#FDE7B3]/20', text: 'text-[#63A361]', border: 'border-[#63A361]/20', icon: 'text-[#63A361]' },
      patchy: { bg: 'bg-[#FDE7B3]/30', text: 'text-[#FFC50F]', border: 'border-[#FFC50F]/30', icon: 'text-[#FFC50F]' },
      irregular: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-600' },
    };
    return colors[status as keyof typeof colors] || colors.low;
  };

  // Prepare chart data - Professional Color Scheme (Green dominant)
  const coverageData = [
    { name: 'Crop Coverage', value: result.realTimeMetrics.coveragePercentage, fill: '#63A361' },
    { name: 'Weed Coverage', value: result.realTimeMetrics.weedCoverage, fill: '#FFC50F' },
    { name: 'Bare Soil', value: result.realTimeMetrics.bareSoil, fill: '#5B532C' },
  ];
  
  // Field performance data for second chart
  const performanceData = [
    { name: 'Vegetation', value: result.vegetationIndex, fill: '#63A361' },
    { name: 'Weed Control', value: 100 - result.realTimeMetrics.weedCoverage, fill: '#63A361' },
    { name: 'Uniformity', value: result.fieldUniformity === 'uniform' ? 100 : result.fieldUniformity === 'patchy' ? 60 : 30, fill: '#FFC50F' },
  ];

  const radarData = [
    { metric: 'Coverage', value: result.realTimeMetrics.coveragePercentage },
    { metric: 'Vegetation', value: result.vegetationIndex },
    { metric: 'Weed Control', value: 100 - result.realTimeMetrics.weedCoverage },
    { metric: 'Uniformity', value: result.fieldUniformity === 'uniform' ? 100 : result.fieldUniformity === 'patchy' ? 60 : 30 },
    { metric: 'Confidence', value: result.confidenceLevel },
  ];

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
        <span className="font-medium text-[#63A361]">Field analysis completed successfully</span>
      </motion.div>

      {/* Image Preview */}
      {image && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-white/90 rounded-2xl shadow-xl border backdrop-blur-md border-white/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Map className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Analyzed Field Image</h3>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
            <img src={image} alt="Analyzed field" className="w-full h-auto object-contain max-h-80" />
          </div>
        </motion.div>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Crop Growth Stage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
              <Sprout className="w-6 h-6 text-[#63A361]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Growth Stage</h3>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#63A361] mb-2">{result.cropGrowthStage}</div>
            <div className="text-sm text-gray-600">Current Phase</div>
          </div>
        </motion.div>

        {/* Weed Density */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 bg-white rounded-2xl border ${getStatusColor(result.weedDensity).border}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 ${getStatusColor(result.weedDensity).bg} rounded-xl border ${getStatusColor(result.weedDensity).border}`}>
              <AlertTriangle className={`w-6 h-6 ${getStatusColor(result.weedDensity).icon}`} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Weeds</h3>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getStatusColor(result.weedDensity).text} mb-2 uppercase`}>
              {result.weedDensity}
            </div>
            <div className="text-sm text-gray-600">Density Level</div>
          </div>
        </motion.div>

        {/* Field Uniformity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-6 bg-white rounded-2xl border ${getStatusColor(result.fieldUniformity).border}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 ${getStatusColor(result.fieldUniformity).bg} rounded-xl border ${getStatusColor(result.fieldUniformity).border}`}>
              <BarChart3 className={`w-6 h-6 ${getStatusColor(result.fieldUniformity).icon}`} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Uniformity</h3>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getStatusColor(result.fieldUniformity).text} mb-2 uppercase`}>
              {result.fieldUniformity}
            </div>
            <div className="text-sm text-gray-600">Distribution</div>
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
            <div className="p-3 bg-[#63A361]/10 rounded-xl">
              <Target className="w-6 h-6 text-[#63A361]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Confidence</h3>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-[#63A361] mb-2">{result.confidenceLevel}%</div>
            <div className="text-sm text-gray-600">AI Accuracy</div>
          </div>
        </motion.div>
      </div>

      {/* Field Coverage Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#FDE7B3]/30 rounded-lg">
              <Map className="w-5 h-5 text-[#63A361]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Field Coverage Analysis</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coverageData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }} barCategoryGap="10%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.6} />
                <XAxis 
                  dataKey="name" 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#999' }}
                />
                <YAxis 
                  fontSize={12}
                  stroke="#666"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#999' }}
                  label={{ value: 'Percentage %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666', fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid rgba(34, 197, 94, 0.2)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {coverageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-white/80 rounded-lg border border-[#63A361]/20 backdrop-blur-sm">
              <div className="text-2xl font-bold text-[#63A361]">{result.realTimeMetrics.coveragePercentage}%</div>
              <div className="text-xs text-gray-600 mt-1">Crop Coverage</div>
            </div>
            <div className="text-center p-3 bg-white/80 rounded-lg border border-[#FFC50F]/20 backdrop-blur-sm">
              <div className="text-2xl font-bold text-[#FFC50F]">{result.realTimeMetrics.weedCoverage}%</div>
              <div className="text-xs text-gray-600 mt-1">Weed Coverage</div>
            </div>
            <div className="text-center p-3 bg-white/80 rounded-lg border border-purple-200/50 backdrop-blur-sm">
              <div className="text-2xl font-bold text-purple-600">{result.realTimeMetrics.bareSoil}%</div>
              <div className="text-xs text-gray-600 mt-1">Bare Soil</div>
            </div>
          </div>
        </motion.div>

        {/* Field Performance Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#FDE7B3]/30 rounded-lg">
              <Activity className="w-5 h-5 text-[#63A361]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Field Performance</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }} barCategoryGap="10%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.6} />
                <XAxis 
                  dataKey="name" 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#999' }}
                />
                <YAxis 
                  domain={[0, 100]}
                  fontSize={12}
                  stroke="#666"
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#999' }}
                  label={{ value: 'Percentage %', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666', fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Yield Prediction and Vegetation Index */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yield Prediction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
              <TrendingUp className="w-6 h-6 text-[#63A361]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Yield Prediction</h3>
          </div>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-[#63A361] mb-2">{result.yieldPrediction}</div>
            <p className="text-sm text-gray-600">Expected harvest output</p>
          </div>
        </motion.div>

        {/* Vegetation Index */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
              <Leaf className="w-6 h-6 text-[#63A361]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Vegetation Index (NDVI)</h3>
          </div>
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-[#63A361] mb-4">{result.vegetationIndex}</div>
            <div className="text-sm text-gray-600 mb-6">Health Indicator</div>
            <div className="relative h-4 bg-gradient-to-r from-red-500 via-[#FFC50F] to-[#63A361] rounded-full">
              <motion.div
                initial={{ left: '0%' }}
                animate={{ left: `${result.vegetationIndex}%` }}
                transition={{ duration: 1, delay: 0.9 }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border-4 border-[#63A361] rounded-full shadow-lg"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Poor (0)</span>
              <span>Fair (50)</span>
              <span>Excellent (100)</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Visible Issues */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-[#5B532C]" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Visible Issues</h3>
        </div>
        <div className="text-center">
          <p className="text-base text-gray-700 mb-2">{result.visibleIssues}</p>
          <p className="text-sm text-gray-600">{result.analysisSummary}</p>
        </div>
      </motion.div>

      {/* Environmental Factors */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="p-6 bg-white/90 rounded-2xl border shadow-xl backdrop-blur-md border-white/30"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-[#63A361]/10 rounded-lg">
            <Activity className="w-5 h-5 text-[#63A361]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Environmental Factors</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.environmentalFactors.map((factor, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                factor.status === 'optimal'
                  ? 'bg-green-50 border-green-200'
                  : factor.status === 'warning'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{factor.factor}</span>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    factor.status === 'optimal'
                      ? 'bg-[#FDE7B3]/30 text-[#63A361]'
                      : factor.status === 'warning'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {factor.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Precision Farming Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="p-6 bg-white/90 rounded-2xl border shadow-xl backdrop-blur-md border-white/30"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
              <Target className="w-6 h-6 text-[#63A361]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Precision Farming Tips</h3>
          </div>
          <ul className="space-y-3">
            {result.precisionFarmingTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span className="text-sm text-gray-700">{tip}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Intervention Plans */}
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
            <h3 className="text-lg font-bold text-gray-900">Intervention Plans</h3>
          </div>
          <ul className="space-y-3">
            {result.interventionPlans.map((plan, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></div>
                <span className="text-sm text-gray-700">{plan}</span>
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
          Analyze Another Field
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
