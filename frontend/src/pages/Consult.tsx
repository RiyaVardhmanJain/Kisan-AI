import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  Sprout, MapPin, Calendar, Droplets,
  DollarSign, Package, Recycle, Activity, Target, Clock,
  Zap, Shield,
  ArrowRight, ArrowLeft, BarChart3
} from 'lucide-react';
import { getCropGrowthPhases, getConsultAnalysis, type ConsultAnalysisResponse } from '../ai/consultService';

interface FormData {
  cropName: string;
  cultivatedArea: number;
  currentPhase: string;
  tahsil: string;
}

const Consult: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    cropName: '',
    cultivatedArea: 0,
    currentPhase: '',
    tahsil: ''
  });
  const [growthPhases, setGrowthPhases] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<ConsultAnalysisResponse | null>(null);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cropName || formData.cultivatedArea <= 0) {
      toast.error('Enter valid crop details');
      return;
    }

    setLoading(true);
    try {
      const phases = await getCropGrowthPhases({
        cropName: formData.cropName,
        cultivatedArea: formData.cultivatedArea
      });
      setGrowthPhases(phases);
      setStep(2);
      toast.success('Phases loaded!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.currentPhase || !formData.tahsil) {
      toast.error('Complete all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await getConsultAnalysis({
        cropName: formData.cropName,
        cultivatedArea: formData.cultivatedArea,
        currentPhase: formData.currentPhase,
        tahsil: formData.tahsil
      });
      setAnalysis(result);
      setStep(3);
      toast.success('Analysis ready!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      cropName: '',
      cultivatedArea: 0,
      currentPhase: '',
      tahsil: ''
    });
    setGrowthPhases([]);
    setAnalysis(null);
  };

  const getRiskColor = (level: string) => {
    const l = level.toLowerCase();
    if (l === 'low') return 'bg-[#63A361] text-white';
    if (l === 'medium') return 'bg-[#FFC50F] text-[#5B532C]';
    if (l === 'high') return 'bg-red-500 text-white';
    return 'bg-gray-300 text-gray-700';
  };

  const getPriorityColor = (priority: string) => {
    const p = priority.toLowerCase();
    if (p === 'high') return 'bg-red-500';
    if (p === 'medium') return 'bg-[#FFC50F]';
    return 'bg-[#63A361]';
  };

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <Toaster position="top-center" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sprout className="w-12 h-12 text-[#63A361]" />
            <h1 className="text-5xl font-bold text-[#5B532C]">
              Consult
            </h1>
          </div>
          <p className="text-lg text-[#5B532C]/80">
            Business Intelligence for Smart Farming
          </p>
        </motion.div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                  step >= s ? 'bg-[#63A361] text-white' : 'bg-[#FDE7B3] text-[#5B532C] border-2 border-[#5B532C]/20'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 ${step > s ? 'bg-[#63A361]' : 'bg-[#5B532C]/20'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Crop & Area Input */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#5B532C]/10">
                <h2 className="text-2xl font-bold text-[#5B532C] mb-6 flex items-center gap-2">
                  <Sprout className="w-6 h-6 text-[#63A361]" />
                  Tell us about your crop
                </h2>

                <form onSubmit={handleStep1Submit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-[#5B532C] mb-2">
                      Crop Name
                    </label>
                    <input
                      type="text"
                      value={formData.cropName}
                      onChange={(e) => setFormData({ ...formData, cropName: e.target.value })}
                      placeholder="e.g., Tomato, Rice, Wheat"
                      className="w-full px-4 py-3 border-2 border-[#5B532C]/20 rounded-lg focus:border-[#FFC50F] focus:outline-none transition-colors bg-white"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#5B532C] mb-2">
                      Cultivated Area (in acres)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.cultivatedArea || ''}
                      onChange={(e) => setFormData({ ...formData, cultivatedArea: parseFloat(e.target.value) })}
                      placeholder="e.g., 2.5"
                      className="w-full px-4 py-3 border-2 border-[#5B532C]/20 rounded-lg focus:border-[#FFC50F] focus:outline-none transition-colors bg-white"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#FFC50F] text-[#5B532C] py-3 rounded-lg font-medium hover:bg-[#FFC50F]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Loading Growth Phases...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Preview What You'll Get */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-8 space-y-6"
              >
                <h3 className="text-center text-lg font-semibold text-[#5B532C]/70">
                  What You'll Discover
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: BarChart3, title: "Yield Forecast", desc: "Expected production", color: "#63A361" },
                    { icon: DollarSign, title: "Market Intel", desc: "Prices & buyers", color: "#FFC50F" },
                    { icon: Calendar, title: "Schedule", desc: "Farming timeline", color: "#63A361" },
                    { icon: Shield, title: "Risk Analysis", desc: "Weather & pests", color: "#5B532C" }
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-[#FDE7B3]/20 to-white border border-[#63A361]/10 text-center"
                    >
                      <div className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
                        <item.icon className="w-5 h-5" style={{ color: item.color }} />
                      </div>
                      <h4 className="font-semibold text-[#5B532C] text-sm">{item.title}</h4>
                      <p className="text-xs text-[#5B532C]/60">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Mock Dashboard Preview */}
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FDE7B3]/20 via-white to-[#63A361]/5 border border-[#63A361]/10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Mock Yield Card */}
                    <div className="p-4 rounded-xl bg-white border border-[#63A361]/10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[#63A361]/10 flex items-center justify-center">
                          <Target className="w-4 h-4 text-[#63A361]" />
                        </div>
                        <span className="font-semibold text-[#5B532C] text-sm">Expected Yield</span>
                      </div>
                      <div className="h-8 w-24 bg-[#FDE7B3]/40 rounded-lg animate-pulse mb-2" />
                      <div className="h-3 w-16 bg-[#5B532C]/10 rounded" />
                    </div>

                    {/* Mock Price Card */}
                    <div className="p-4 rounded-xl bg-white border border-[#FFC50F]/10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[#FFC50F]/10 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-[#FFC50F]" />
                        </div>
                        <span className="font-semibold text-[#5B532C] text-sm">Market Price</span>
                      </div>
                      <div className="h-8 w-20 bg-[#FDE7B3]/40 rounded-lg animate-pulse mb-2" />
                      <div className="h-3 w-14 bg-[#5B532C]/10 rounded" />
                    </div>

                    {/* Mock Revenue Card */}
                    <div className="p-4 rounded-xl bg-white border border-[#5B532C]/10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[#5B532C]/10 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-[#5B532C]" />
                        </div>
                        <span className="font-semibold text-[#5B532C] text-sm">Total Revenue</span>
                      </div>
                      <div className="h-8 w-28 bg-[#FDE7B3]/40 rounded-lg animate-pulse mb-2" />
                      <div className="h-3 w-20 bg-[#5B532C]/10 rounded" />
                    </div>
                  </div>
                </div>

                {/* Features List */}
                <div className="flex flex-wrap justify-center gap-3">
                  {[
                    "Irrigation Schedule",
                    "Fertilizer Plan",
                    "Processing Options",
                    "Buyer Connections",
                    "Storage Tips"
                  ].map((feature, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + i * 0.1 }}
                      className="px-4 py-2 bg-white/80 rounded-full border border-[#63A361]/10 text-sm text-[#5B532C]"
                    >
                      {feature}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Step 2: Phase & Location Selection */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#5B532C]/10">
                <button
                  onClick={() => setStep(1)}
                  className="mb-4 text-[#5B532C]/70 hover:text-[#5B532C] flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <h2 className="text-2xl font-bold text-[#5B532C] mb-6 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-[#63A361]" />
                  Growth Phase & Location
                </h2>

                <form onSubmit={handleStep2Submit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-[#5B532C] mb-2">
                      Current Growth Phase
                    </label>
                    <select
                      value={formData.currentPhase}
                      onChange={(e) => setFormData({ ...formData, currentPhase: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-[#5B532C]/20 rounded-lg focus:border-[#FFC50F] focus:outline-none transition-colors bg-white"
                      disabled={loading}
                    >
                      <option value="">Select phase</option>
                      {growthPhases.map((phase, idx) => (
                        <option key={idx} value={phase}>{phase}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#5B532C] mb-2">
                      Tahsil / Location
                    </label>
                    <input
                      type="text"
                      value={formData.tahsil}
                      onChange={(e) => setFormData({ ...formData, tahsil: e.target.value })}
                      placeholder="e.g., Pune, Maharashtra"
                      className="w-full px-4 py-3 border-2 border-[#5B532C]/20 rounded-lg focus:border-[#FFC50F] focus:outline-none transition-colors bg-white"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#FFC50F] text-[#5B532C] py-3 rounded-lg font-medium hover:bg-[#FFC50F]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Generating Analysis...
                      </>
                    ) : (
                      <>
                        Get Business Insights
                        <Zap className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {/* Step 3: Dashboard */}
          {step === 3 && analysis && (
            <motion.div
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Header with Reset Button */}
              <div className="flex justify-between items-center bg-white rounded-xl p-4 shadow-md border border-[#5B532C]/10">
                <div>
                  <h2 className="text-2xl font-bold text-[#5B532C]">
                    {formData.cropName} - Consult Dashboard
                  </h2>
                  <p className="text-[#5B532C]/70">
                    {formData.cultivatedArea} acres • {formData.tahsil}
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-[#FDE7B3] hover:bg-[#FDE7B3]/80 text-[#5B532C] rounded-lg font-medium transition-colors border border-[#5B532C]/20"
                >
                  New Analysis
                </button>
              </div>

              {/* Growth Progress */}
              <div className="bg-linear-to-br from-[#63A361]/20 to-[#63A361]/10 rounded-xl p-6 text-[#5B532C] shadow-lg border border-[#63A361]/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Activity className="w-6 h-6" />
                    Growth Progress
                  </h3>
                  <span className="text-3xl font-bold">{analysis.growthInsights.progressPercentage}%</span>
                </div>

                <div className="w-full bg-[#5B532C]/10 rounded-full h-4 mb-4">
                  <div
                    className="bg-[#63A361] rounded-full h-4 transition-all duration-1000"
                    style={{ width: `${analysis.growthInsights.progressPercentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="bg-white/60 rounded-lg p-3 border border-[#63A361]/20">
                    <Clock className="w-5 h-5 mb-2 text-[#63A361]" />
                    <p className="text-sm text-[#5B532C]/70">Days to Harvest</p>
                    <p className="text-2xl font-bold text-[#5B532C]">{analysis.growthInsights.daysToHarvest}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-[#63A361]/20">
                    <Calendar className="w-5 h-5 mb-2 text-[#63A361]" />
                    <p className="text-sm text-[#5B532C]/70">Current Day</p>
                    <p className="text-2xl font-bold text-[#5B532C]">{analysis.growthInsights.currentDayOfGrowth}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-[#63A361]/20">
                    <Target className="w-5 h-5 mb-2 text-[#63A361]" />
                    <p className="text-sm text-[#5B532C]/70">Total Duration</p>
                    <p className="text-lg font-bold text-[#5B532C]">{analysis.growthInsights.totalGrowthDuration}</p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-[#63A361]/20">
                    <ArrowRight className="w-5 h-5 mb-2 text-[#63A361]" />
                    <p className="text-sm text-[#5B532C]/70">Next Phase In</p>
                    <p className="text-2xl font-bold text-[#5B532C]">{analysis.growthInsights.daysToNextPhase}d</p>
                  </div>
                </div>
              </div>

              {/* Yield Forecast */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-[#5B532C]/10">
                <h3 className="text-xl font-bold text-[#5B532C] mb-4 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-[#63A361]" />
                  Yield Forecast
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-4 bg-[#FDE7B3]/50 rounded-lg border border-[#5B532C]/10">
                    <span className="text-[#5B532C] font-medium">Per Acre</span>
                    <span className="font-bold text-[#63A361] text-xl">{analysis.yieldForecast.expectedYieldPerAcre}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-[#63A361]/10 rounded-lg border border-[#63A361]/20">
                    <span className="text-[#5B532C] font-medium">Total Yield</span>
                    <span className="font-bold text-[#63A361] text-xl">{analysis.yieldForecast.totalYieldForecast}</span>
                  </div>
                </div>
              </div>

              {/* Market Intelligence */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-[#5B532C]/10">
                <h3 className="text-xl font-bold text-[#5B532C] mb-4 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-[#63A361]" />
                  Market Intelligence
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-[#63A361]/10 rounded-lg border border-[#63A361]/20">
                    <p className="text-sm text-[#5B532C]/70">Current Mandi Price</p>
                    <p className="text-2xl font-bold text-[#63A361]">{analysis.marketIntelligence.currentMandiPrice}</p>
                    <p className="text-sm text-[#5B532C]/70 mt-1">
                      Trend: <span className={`font-medium ${
                        analysis.marketIntelligence.pricetrend.toLowerCase() === 'rising' ? 'text-[#63A361]' :
                        analysis.marketIntelligence.pricetrend.toLowerCase() === 'falling' ? 'text-red-600' :
                        'text-[#FFC50F]'
                      }`}>{analysis.marketIntelligence.pricetrend}</span>
                    </p>
                  </div>
                  <div className="p-4 bg-[#FDE7B3]/50 rounded-lg border border-[#5B532C]/10">
                    <p className="text-sm text-[#5B532C]/70 mb-2">Peak Price Period</p>
                    <p className="font-bold text-[#5B532C] text-lg">{analysis.marketIntelligence.peakPricePeriod}</p>
                  </div>

                  {/* Nearby Bazar Samiti */}
                  <div>
                    <p className="text-sm font-semibold text-[#5B532C] mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#63A361]" />
                      Nearby Bazar Samiti
                    </p>
                    <div className="space-y-2">
                      {analysis.marketIntelligence.nearbyBazarSamiti.map((market, idx) => (
                        <div key={idx} className="p-3 bg-[#FFC50F]/20 rounded-lg border-l-4 border-[#FFC50F]">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-[#5B532C]">{market.name}</p>
                              <p className="text-xs text-[#5B532C]/60 mt-1">{market.distance} away</p>
                            </div>
                            <p className="text-sm font-bold text-[#63A361]">{market.currentPrice}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Buyer Opportunities */}
                  <div>
                    <p className="text-sm font-semibold text-[#5B532C] mb-3">Buyer Opportunities</p>
                    <div className="space-y-2">
                      {analysis.marketIntelligence.buyerOpportunities.slice(0, 2).map((buyer, idx) => (
                        <div key={idx} className="p-3 bg-[#63A361]/10 rounded-lg border-l-4 border-[#63A361]">
                          <p className="text-sm font-medium text-[#5B532C]">{buyer.type}</p>
                          <p className="text-xs text-[#5B532C]/70 mt-1">{buyer.description}</p>
                          <p className="text-xs text-[#63A361] font-medium mt-1">💰 {buyer.priceAdvantage}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Farming Schedule */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-[#5B532C]/10">
                <h3 className="text-xl font-bold text-[#5B532C] mb-4 flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-[#63A361]" />
                  Recommended Schedule
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fertilizers */}
                  <div>
                    <h4 className="font-semibold text-[#5B532C] mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5 text-[#63A361]" />
                      Fertilizers
                    </h4>
                    <div className="space-y-2">
                      {analysis.farmingSchedule.fertilizers.slice(0, 3).map((fert, idx) => (
                        <div key={idx} className="p-3 bg-[#63A361]/10 rounded-lg border-l-4 border-[#63A361]">
                          <p className="font-medium text-[#5B532C]">{fert.name}</p>
                          <p className="text-sm text-[#5B532C]/70">Quantity: {fert.quantity}</p>
                          <p className="text-sm text-[#5B532C]/70">Timing: {fert.timing}</p>
                          <p className="text-xs text-[#5B532C]/60 mt-1">{fert.purpose}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Irrigation */}
                  <div>
                    <h4 className="font-semibold text-[#5B532C] mb-3 flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-[#63A361]" />
                      Irrigation
                    </h4>
                    <div className="space-y-3 p-4 bg-[#FDE7B3]/50 rounded-lg border border-[#5B532C]/10">
                      <div className="flex justify-between">
                        <span className="text-sm text-[#5B532C]/70">Frequency:</span>
                        <span className="font-medium text-[#5B532C]">{analysis.farmingSchedule.irrigation.frequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#5B532C]/70">Method:</span>
                        <span className="font-medium text-[#5B532C]">{analysis.farmingSchedule.irrigation.method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-[#5B532C]/70">Daily Need:</span>
                        <span className="font-medium text-[#5B532C]">{analysis.farmingSchedule.irrigation.waterRequirement}</span>
                      </div>
                      <div className="mt-3">
                        <p className="text-xs font-medium text-[#5B532C] mb-1">Critical Periods:</p>
                        {analysis.farmingSchedule.irrigation.criticalPeriods.map((period, idx) => (
                          <span key={idx} className="inline-block text-xs bg-[#FFC50F]/20 text-[#5B532C] px-2 py-1 rounded mr-1 mb-1 border border-[#FFC50F]/30">
                            {period}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Value Addition */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-[#5B532C]/10">
                <h3 className="text-xl font-bold text-[#5B532C] mb-4 flex items-center gap-2">
                  <Recycle className="w-6 h-6 text-[#63A361]" />
                  Value Addition Opportunities
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Processing Options */}
                  <div>
                    <h4 className="font-semibold text-[#5B532C] mb-3">Processing Options</h4>
                    {analysis.valueAddition.processingOptions.slice(0, 2).map((option, idx) => (
                      <div key={idx} className="mb-3 p-4 bg-[#FFC50F]/20 rounded-lg border border-[#FFC50F]/30">
                        <p className="font-medium text-[#5B532C]">{option.process} → {option.product}</p>
                        <p className="text-sm text-[#63A361] font-medium mt-1">+{option.profitIncrease} profit</p>
                        <p className="text-xs text-[#5B532C]/70 mt-1">{option.requirements}</p>
                      </div>
                    ))}
                  </div>

                  {/* Byproducts */}
                  <div>
                    <h4 className="font-semibold text-[#5B532C] mb-3">Byproduct Opportunities</h4>
                    {analysis.valueAddition.byproducts.map((byproduct, idx) => (
                      <div key={idx} className="mb-3 p-4 bg-[#63A361]/10 rounded-lg border-l-4 border-[#63A361]">
                        <p className="font-medium text-[#5B532C]">{byproduct.name}</p>
                        <p className="text-sm text-[#5B532C]/70">{byproduct.use}</p>
                        <p className="text-sm text-[#63A361] font-medium mt-1">{byproduct.revenue}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Storage */}
                <div className="mt-4 p-4 bg-[#FDE7B3]/50 rounded-lg border border-[#5B532C]/10">
                  <h4 className="font-semibold text-[#5B532C] mb-2">Storage Strategy</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-[#5B532C]/70">Method</p>
                      <p className="font-medium text-[#5B532C]">{analysis.valueAddition.storageRecommendations.method}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5B532C]/70">Duration</p>
                      <p className="font-medium text-[#5B532C]">{analysis.valueAddition.storageRecommendations.duration}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5B532C]/70">Cost</p>
                      <p className="font-medium text-[#5B532C]">{analysis.valueAddition.storageRecommendations.costPerQuintal}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#5B532C]/70">Advantage</p>
                      <p className="font-medium text-[#63A361]">{analysis.valueAddition.storageRecommendations.priceAdvantage}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Assessment */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-[#5B532C]/10">
                <h3 className="text-xl font-bold text-[#5B532C] mb-4 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-red-600" />
                  Risk Forecast
                </h3>

                <div className="mb-4 p-4 bg-[#FDE7B3]/50 rounded-lg border border-[#5B532C]/10">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#5B532C]">Overall Risk Level:</span>
                    <span className={`px-4 py-2 rounded-lg font-bold ${getRiskColor(analysis.riskForecast.overallRisk)}`}>
                      {analysis.riskForecast.overallRisk}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(analysis.riskForecast.riskBreakdown).map(([key, risk]) => (
                    <div key={key} className="p-4 border-2 border-[#5B532C]/10 rounded-lg hover:border-[#FFC50F]/50 transition-colors bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-[#5B532C] capitalize">
                          {key.replace('Risk', '')}
                        </h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(risk.level)}`}>
                          {risk.level}
                        </span>
                      </div>
                      <p className="text-sm text-[#5B532C]/70 mb-2">{risk.description}</p>
                      <div className="p-2 bg-[#63A361]/10 rounded border border-[#63A361]/20">
                        <p className="text-xs text-[#5B532C]/80">
                          <strong>Mitigation:</strong> {risk.mitigation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 3 Recommendations */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-[#5B532C]/10">
                <h3 className="text-2xl font-bold text-[#5B532C] mb-4 flex items-center gap-2">
                  <Target className="w-7 h-7 text-[#63A361]" />
                  Top 3 Action Items
                </h3>

                <div className="space-y-3">
                  {analysis.actionableRecommendations.slice(0, 3).map((rec, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-[#FFC50F]/10 rounded-lg p-4 flex gap-4 border border-[#FFC50F]/20"
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${getPriorityColor(rec.priority)}`}>
                          {idx + 1}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                            {rec.priority} Priority
                          </span>
                          <span className="text-xs text-[#5B532C]/70">{rec.timeline}</span>
                        </div>
                        <p className="font-semibold mb-1 text-[#5B532C]">{rec.action}</p>
                        <p className="text-sm text-[#5B532C]/80">{rec.expectedImpact}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Consult;