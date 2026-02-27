import React from 'react';
import { motion } from 'framer-motion';
import {
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Target,
  Sparkles,
  Activity,
  TrendingUp,
  Shield,
  Zap,
  MapPin,
} from 'lucide-react';
import { ThermalMonitoringResult as ThermalResultType } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell } from 'recharts';

interface Props {
  result: ThermalResultType;
  image: string | null;
  onRetry: () => void;
}

export const ThermalMonitoringResult: React.FC<Props> = ({ result, image, onRetry }) => {
  const getStatusColor = (status: string) => {
    const colors = {
      low: { bg: 'bg-[#FDE7B3]/20', text: 'text-[#63A361]', border: 'border-[#63A361]/20', icon: 'text-[#63A361]' },
      medium: { bg: 'bg-[#FDE7B3]/30', text: 'text-[#FFC50F]', border: 'border-[#FFC50F]/30', icon: 'text-[#FFC50F]' },
      high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-600' },
      none: { bg: 'bg-[#FDE7B3]/20', text: 'text-[#63A361]', border: 'border-[#63A361]/20', icon: 'text-[#63A361]' },
      suspected: { bg: 'bg-[#FDE7B3]/30', text: 'text-[#FFC50F]', border: 'border-[#FFC50F]/30', icon: 'text-[#FFC50F]' },
      evident: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-600' },
    };
    return colors[status as keyof typeof colors] || colors.low;
  };

  // Prepare chart data - Professional Color Scheme (Green dominant)
  const temperatureData = [
    { name: 'Min Temp', value: result.realTimeMetrics.minTemperature, fill: '#63A361' },
    { name: 'Avg Temp', value: result.realTimeMetrics.averageTemperature, fill: '#63A361' },
    { name: 'Max Temp', value: result.realTimeMetrics.maxTemperature, fill: '#FFC50F' },
  ];

  const spotsData = [
    { name: 'Hot Spots', value: result.hotSpots, fill: '#FFC50F' },
    { name: 'Cold Spots', value: result.coldSpots, fill: '#63A361' },
  ];
  
  // Environmental factors data
  const environmentData = result.environmentalFactors.map(factor => ({
    name: factor.factor,
    status: factor.status,
    value: factor.status === 'optimal' ? 100 : factor.status === 'warning' ? 60 : 30,
    fill: factor.status === 'optimal' ? '#63A361' : factor.status === 'warning' ? '#FFC50F' : '#f59e0b'
  }));

  const radarData = [
    { metric: 'Temp Avg', value: (result.realTimeMetrics.averageTemperature / 50) * 100 },
    { metric: 'Hot Spots', value: (result.hotSpots / 20) * 100 },
    { metric: 'Cold Spots', value: (result.coldSpots / 20) * 100 },
    { metric: 'Stress Index', value: result.realTimeMetrics.stressIndex },
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
        <span className="font-medium text-[#63A361]">Thermal analysis completed successfully</span>
      </motion.div>

      {/* Image Preview */}
      {image && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 bg-white/90 rounded-2xl shadow-xl border backdrop-blur-md border-white/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Thermometer className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Analyzed Thermal Image</h3>
          </div>
          <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
            <img src={image} alt="Analyzed thermal" className="w-full h-auto object-contain max-h-80" />
          </div>
        </motion.div>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Temperature Range */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
              <Thermometer className="w-6 h-6 text-[#5B532C]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Temperature</h3>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600 mb-2">{result.temperatureRange}</div>
            <div className="text-sm text-gray-600">Range</div>
          </div>
        </motion.div>

        {/* Water Stress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 bg-white rounded-2xl border ${getStatusColor(result.waterStressZones).border}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 ${getStatusColor(result.waterStressZones).bg} rounded-xl border ${getStatusColor(result.waterStressZones).border}`}>
              <Droplets className={`w-6 h-6 ${getStatusColor(result.waterStressZones).icon}`} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Water Stress</h3>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${getStatusColor(result.waterStressZones).text} mb-2 uppercase`}>
              {result.waterStressZones}
            </div>
            <div className="text-sm text-gray-600">Stress Zones</div>
          </div>
        </motion.div>

        {/* Irrigation Leaks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-6 bg-white rounded-2xl border ${getStatusColor(result.irrigationLeaks).border}`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 ${getStatusColor(result.irrigationLeaks).bg} rounded-xl border ${getStatusColor(result.irrigationLeaks).border}`}>
              <AlertTriangle className={`w-6 h-6 ${getStatusColor(result.irrigationLeaks).icon}`} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Irrigation</h3>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold ${getStatusColor(result.irrigationLeaks).text} mb-2 uppercase`}>
              {result.irrigationLeaks === 'none' ? 'No Leaks' : result.irrigationLeaks}
            </div>
            <div className="text-sm text-gray-600">Leak Status</div>
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

      {/* Temperature Analysis and Spots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Temperature Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border shadow-xl backdrop-blur-sm border-white/30"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <Thermometer className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Temperature Distribution</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={temperatureData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }} barCategoryGap="10%">
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
                  label={{ value: '°C', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666', fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {temperatureData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-3 bg-white/80 rounded-lg border border-[#63A361]/20 backdrop-blur-sm">
              <div className="text-2xl font-bold text-[#63A361]">{result.realTimeMetrics.minTemperature}°C</div>
              <div className="text-xs text-gray-600 mt-1">Minimum</div>
            </div>
            <div className="text-center p-3 bg-white/80 rounded-lg border border-green-200/50 backdrop-blur-sm">
              <div className="text-2xl font-bold text-[#63A361]">{result.realTimeMetrics.averageTemperature}°C</div>
              <div className="text-xs text-gray-600 mt-1">Average</div>
            </div>
            <div className="text-center p-3 bg-white/80 rounded-lg border border-purple-200/50 backdrop-blur-sm">
              <div className="text-2xl font-bold text-purple-600">{result.realTimeMetrics.maxTemperature}°C</div>
              <div className="text-xs text-gray-600 mt-1">Maximum</div>
            </div>
          </div>
        </motion.div>

        {/* Hot & Cold Spots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Temperature Anomalies</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spotsData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }} barCategoryGap="30%">
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
                  label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666', fontSize: '12px' } }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid rgba(251, 146, 60, 0.2)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {spotsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-3 bg-white/80 rounded-lg border border-purple-200/50 backdrop-blur-sm">
              <div className="text-3xl font-bold text-purple-600">{result.hotSpots}</div>
              <div className="text-xs text-gray-600 mt-1">Hot Spots</div>
            </div>
            <div className="text-center p-3 bg-white/80 rounded-lg border border-[#63A361]/20 backdrop-blur-sm">
              <div className="text-3xl font-bold text-[#63A361]">{result.coldSpots}</div>
              <div className="text-xs text-gray-600 mt-1">Cold Spots</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Stress Index and Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stress Index */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Environmental Stress Index</h3>
          </div>
          <div className="text-center mb-6">
            <div className="text-6xl font-bold text-purple-600 mb-4">{result.realTimeMetrics.stressIndex}</div>
            <div className="text-sm text-gray-600 mb-6">Stress Level (0-100)</div>
            <div className="relative h-4 bg-gradient-to-r from-[#63A361] via-[#FFC50F] to-red-500 rounded-full">
              <motion.div
                initial={{ left: '0%' }}
                animate={{ left: `${result.realTimeMetrics.stressIndex}%` }}
                transition={{ duration: 1, delay: 0.8 }}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white border-4 border-purple-600 rounded-full shadow-lg"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Low (0)</span>
              <span>Medium (50)</span>
              <span>High (100)</span>
            </div>
          </div>
        </motion.div>

        {/* Performance Radar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#63A361]/10 rounded-lg">
              <Activity className="w-5 h-5 text-[#63A361]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Performance Overview</h3>
          </div>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" opacity={0.6} />
                <PolarAngleAxis 
                  dataKey="metric" 
                  fontSize={12}
                  tick={{ fill: '#666' }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  fontSize={10}
                  tick={{ fill: '#999' }}
                />
                <Radar 
                  name="Metrics" 
                  dataKey="value" 
                  stroke="#63A361" 
                  fill="#63A361" 
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Analysis Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="p-6 bg-[#FDE7B3]/10 rounded-2xl border border-[#5B532C]/20"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-100 rounded-xl">
            <Activity className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Analysis Summary</h3>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-gray-700">{result.analysisSummary}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">Temperature Variations</div>
              <div className="text-base font-semibold text-gray-900">{result.temperatureVariations}</div>
            </div>
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">Crop Health Impact</div>
              <div className="text-base font-semibold text-gray-900">{result.cropHealthImpact}</div>
            </div>
          </div>
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
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="w-5 h-5 text-blue-600" />
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
        {/* Mitigation Strategies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="p-6 bg-white rounded-2xl border border-[#5B532C]/20"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
              <Shield className="w-6 h-6 text-[#63A361]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Mitigation Strategies</h3>
          </div>
          <ul className="space-y-3">
            {result.mitigationStrategies.map((strategy, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                <span className="text-sm text-gray-700">{strategy}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Monitoring Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="p-6 bg-white/90 rounded-2xl border shadow-xl backdrop-blur-md border-white/30"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-purple-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Monitoring Recommendations</h3>
          </div>
          <ul className="space-y-3">
            {result.monitoringRecommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 shrink-0"></div>
                <span className="text-sm text-gray-700">{rec}</span>
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
          Analyze Another Thermal Image
        </motion.button>
      </motion.div>
    </motion.div>
  );
};
