"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Leaf,
  Fish,
  TrendingUp,
  AlertCircle,
  Database,
  TreePine,
  Settings2,
  CheckCircle2,
  Sparkles,
  Brain,
  DollarSign,
  Target,
  Shield,
  Zap,
  Calendar,
  Activity,
} from "lucide-react"
import {
  getModernFarmingAnalysis,
  type ModernFarmingResponse,
  type ModernFarmingRequest,
} from "../ai/modernFarmingService"
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { toast, Toaster } from "react-hot-toast"
import { cn } from "../utils/cn"
import { loadResult, saveResult } from "../utils/storage"

// Add custom styles
import "./SmartFarming.css"

const techniques = [
  {
    id: "organic_farming",
    name: "Organic Farming",
    icon: Leaf,
  },
  {
    id: "rainwater_farming",
    name: "Rainwater Farming",
    icon: TreePine,
  },
  {
    id: "integrated_farming",
    name: "Fish Farming",
    icon: Fish,
  },
  {
    id: "other_farming",
    name: "Other",
    icon: Settings2,
  },
] as const

const budgetOptions = [
  { value: "low", label: "Small Scale (< ₹5L)" },
  { value: "medium", label: "Medium Scale (₹5L - ₹20L)" },
  { value: "high", label: "Large Scale (> ₹20L)" },
] as const

const SmartFarming: React.FC = () => {
  const [selectedTechnique, setSelectedTechnique] = useState<string>("")
  const [selectedBudget, setSelectedBudget] =
    useState<ModernFarmingRequest["budget"]>("medium")
  const [farmSize, setFarmSize] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(false)
  const [analysisData, setAnalysisData] =
    useState<ModernFarmingResponse | null>(null)
  const [customFarmingType, setCustomFarmingType] = useState<string>("")
  const [showResults, setShowResults] = useState<boolean>(false)

  useEffect(() => {
    // Hydrate cached analysis on mount
    const cached = loadResult<{
      inputs: { technique: string; farmSize: string; budget: ModernFarmingRequest["budget"]; custom?: string }
      analysisData: ModernFarmingResponse | null
      showResults: boolean
    }>("smart")
    if (cached) {
      setSelectedTechnique(cached.inputs?.technique || "")
      setFarmSize(cached.inputs?.farmSize || "")
      setSelectedBudget(cached.inputs?.budget || "medium")
      setCustomFarmingType(cached.inputs?.custom || "")
      setAnalysisData(cached.analysisData || null)
      setShowResults(Boolean(cached.showResults && cached.analysisData))
    }
  }, []) // Only run on mount

  // Separate effect for auto-refresh (removed to prevent infinite loops)
  // Auto-refresh functionality can be re-added later if needed with proper dependency management

  // Memoize chart data to prevent infinite re-renders
  const pieChartData = useMemo(() => {
    if (!analysisData) return []
    return [
      { name: "Infrastructure", value: analysisData.techniqueAnalysis.costBreakdown.infrastructure, color: "#3b82f6" },
      { name: "Equipment", value: analysisData.techniqueAnalysis.costBreakdown.equipment, color: "#10b981" },
      { name: "Seeds", value: analysisData.techniqueAnalysis.costBreakdown.seeds, color: "#f59e0b" },
      { name: "Labor", value: analysisData.techniqueAnalysis.costBreakdown.labor, color: "#ef4444" },
      { name: "Maintenance", value: analysisData.techniqueAnalysis.costBreakdown.maintenance, color: "#8b5cf6" },
      { name: "Miscellaneous", value: analysisData.techniqueAnalysis.costBreakdown.miscellaneous, color: "#06b6d4" }
    ]
  }, [analysisData])

  const radarChartData = useMemo(() => {
    if (!analysisData) return []
    return [
      { subject: "Water", A: analysisData.metrics.resourceEfficiency.water, fullMark: 100 },
      { subject: "Labor", A: analysisData.metrics.resourceEfficiency.labor, fullMark: 100 },
      { subject: "Energy", A: analysisData.metrics.resourceEfficiency.energy, fullMark: 100 },
      { subject: "Yield", A: analysisData.metrics.resourceEfficiency.yield, fullMark: 100 },
      { subject: "Sustainability", A: analysisData.metrics.resourceEfficiency.sustainability, fullMark: 100 },
      { subject: "Fertilizer", A: analysisData.metrics.resourceEfficiency.fertilizer, fullMark: 100 },
      { subject: "Pesticide", A: analysisData.metrics.resourceEfficiency.pesticide, fullMark: 100 }
    ]
  }, [analysisData])

  const financialProjectionsData = useMemo(() => {
    if (!analysisData) return []
    return [
      { year: "Year 1", revenue: analysisData.financialProjections.year1.revenue, expenses: analysisData.financialProjections.year1.expenses, profit: analysisData.financialProjections.year1.profit },
      { year: "Year 2", revenue: analysisData.financialProjections.year2.revenue, expenses: analysisData.financialProjections.year2.expenses, profit: analysisData.financialProjections.year2.profit },
      { year: "Year 3", revenue: analysisData.financialProjections.year3.revenue, expenses: analysisData.financialProjections.year3.expenses, profit: analysisData.financialProjections.year3.profit }
    ]
  }, [analysisData])

  // Check if all required inputs are provided and valid
  const isFormValid = () => {
    if (!selectedTechnique || !farmSize || farmSize === '0' || Number(farmSize) <= 0) {
      return false
    }
    if (selectedTechnique === "other_farming" && !customFarmingType.trim()) {
      return false
    }
    return true
  }

  // Validate farming relevance on client side
  const isFarmingRelated = (technique: string): boolean => {
    const farmingKeywords = [
      'organic', 'farming', 'agriculture', 'crop', 'soil', 'irrigation', 'harvest',
      'rainwater', 'fish', 'aquaculture', 'hydroponic', 'vertical', 'greenhouse',
      'sustainable', 'permaculture', 'biodynamic', 'precision', 'smart', 'modern',
      'traditional', 'conventional', 'natural', 'ecological', 'regenerative',
      'livestock', 'dairy', 'poultry', 'aquaponics', 'aeroponics', 'container',
      'rooftop', 'urban', 'rural', 'farm', 'field', 'plantation', 'orchard',
      'vineyard', 'garden', 'cultivation', 'planting', 'seeding', 'fertilizer',
      'compost', 'pesticide', 'herbicide', 'weed', 'pest', 'disease', 'yield',
      'production', 'harvesting', 'storage', 'processing', 'marketing', 'distribution'
    ]

    const techniqueLower = technique.toLowerCase()

    // Check if technique contains farming-related keywords
    const hasFarmingKeyword = farmingKeywords.some(keyword =>
      techniqueLower.includes(keyword)
    )

    // Check for obvious non-farming content
    const nonFarmingKeywords = [
      'porn', 'sex', 'adult', 'gambling', 'casino', 'drug', 'illegal', 'hack',
      'crack', 'virus', 'malware', 'spam', 'scam', 'fraud', 'theft', 'robbery',
      'murder', 'kill', 'violence', 'weapon', 'bomb', 'terrorist', 'extremist',
      'political', 'election', 'vote', 'government', 'policy', 'law', 'legal',
      'medical', 'health', 'disease', 'cancer', 'treatment', 'therapy', 'surgery',
      'finance', 'investment', 'stock', 'trading', 'crypto', 'bitcoin', 'money',
      'entertainment', 'movie', 'music', 'game', 'sport', 'football', 'basketball',
      'technology', 'programming', 'coding', 'software', 'app', 'website', 'internet',
      'social', 'facebook', 'twitter', 'instagram', 'tiktok', 'youtube', 'video'
    ]

    const hasNonFarmingKeyword = nonFarmingKeywords.some(keyword =>
      techniqueLower.includes(keyword)
    )

    // Check for gibberish (too many random characters, no vowels, etc.)
    const hasVowels = /[aeiou]/i.test(techniqueLower)
    const hasConsonants = /[bcdfghjklmnpqrstvwxyz]/i.test(techniqueLower)
    const isGibberish = technique.length > 10 && (!hasVowels || !hasConsonants)

    return hasFarmingKeyword && !hasNonFarmingKeyword && !isGibberish
  }

  const handleAnalysis = async () => {
    if (!isFormValid()) {
      if (!selectedTechnique) {
        toast.error("Please select a farming technique", {
          style: {
            background: "#FF5757",
            color: "#fff",
            padding: "16px",
            borderRadius: "8px",
          },
        })
      } else if (!farmSize || farmSize === '0' || Number(farmSize) <= 0) {
        toast.error("Please enter a valid farm size", {
          style: {
            background: "#FF5757",
            color: "#fff",
            padding: "16px",
            borderRadius: "8px",
          },
        })
      } else if (selectedTechnique === "other_farming" && !customFarmingType.trim()) {
        toast.error("Please specify your farming technique", {
          style: {
            background: "#FF5757",
            color: "#fff",
            padding: "16px",
            borderRadius: "8px",
          },
        })
      }
      return
    }

    // Client-side validation for farming relevance
    const techniqueToValidate = selectedTechnique === "other_farming" ? customFarmingType : selectedTechnique
    if (!isFarmingRelated(techniqueToValidate)) {
      toast.error("Not Applicable: Please enter a valid farming technique related to agriculture.", {
        style: {
          background: "#FF8C00",
          color: "#fff",
          padding: "16px",
          borderRadius: "8px",
        },
        duration: 6000,
      })
      // Clear the form to prevent further invalid queries
      setSelectedTechnique("")
      setFarmSize("")
      setCustomFarmingType("")
      return
    }

    setLoading(true)
    const analysisPromise = getModernFarmingAnalysis({
      technique:
        selectedTechnique === "other_farming"
          ? customFarmingType
          : selectedTechnique,
      farmSize,
      budget: selectedBudget,
    })

    toast.promise(
      analysisPromise,
      {
        loading: "Generating farming analysis...",
        success: "Analysis completed successfully",
        error: "Failed to generate analysis",
      },
      {
        style: {
          minWidth: "250px",
          padding: "16px",
          borderRadius: "8px",
        },
      }
    )

    try {
      const data = await analysisPromise
      setAnalysisData(data)
      setShowResults(true)
      // Persist successful results
      saveResult("smart", {
        inputs: {
          technique: selectedTechnique === "other_farming" ? customFarmingType : selectedTechnique,
          farmSize,
          budget: selectedBudget,
          custom: selectedTechnique === "other_farming" ? customFarmingType : undefined,
        },
        analysisData: data as any,
        showResults: true,
      })
    } catch (err) {
      console.error("Analysis Error:", err)

      // Check if it's a NOT_APPLICABLE error
      if (err instanceof Error && err.message.includes("NOT_APPLICABLE")) {
        toast.error(
          "Not Applicable: Please enter a valid farming technique related to agriculture.",
          {
            style: {
              background: "#FF8C00",
              color: "#fff",
              padding: "16px",
              borderRadius: "8px",
            },
            duration: 6000,
          }
        )
        // Clear the form to prevent further invalid queries
        setSelectedTechnique("")
        setFarmSize("")
        setCustomFarmingType("")
      } else {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to generate analysis. Please try again.",
          {
            style: {
              background: "#FF5757",
              color: "#fff",
              padding: "16px",
              borderRadius: "8px",
            },
            duration: 5000,
          }
        )
      }
    } finally {
      setLoading(false)
    }
  }

  // For scrolling to results
  const analysisResultsRef = React.useRef<HTMLDivElement>(null)

  // Scroll to results function
  const scrollToResults = () => {
    if (analysisResultsRef.current) {
      analysisResultsRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    // Scroll to results when analysis is completed or loaded
    if (!loading && analysisData) {
      setTimeout(() => scrollToResults(), 200)
    }
  }, [loading, analysisData])

  // Animation variants
  const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  }

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const slideIn = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.4 },
  }

  return (
    <div className="overflow-auto relative h-screen bg-white">
      <Toaster position="top-right" />

      <motion.div
        initial="initial"
        animate="animate"
        variants={staggerContainer}
        className="px-4 py-8 mx-auto max-w-7xl md:py-12 sm:px-6 lg:px-8"
      >
        {/* Input Form Section - Only show when not showing results */}
        {!showResults && (
          <>
            {/* Header Section */}
            <motion.div variants={fadeIn} className="mb-8 text-center md:mb-10">
              <motion.div
                variants={slideIn}
                className="inline-flex gap-2 items-center px-4 py-2 mb-3 bg-[#FDE7B3]/30 rounded-full border border-[#63A361]/30 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-[#63A361]" />
                <span className="text-sm font-medium text-[#63A361]">
                  AI-Powered Analysis
                </span>
              </motion.div>
              <motion.h1
                variants={slideIn}
                className="text-3xl font-bold text-[#5B532C] md:text-4xl"
              >
                Smart Farming Techniques
              </motion.h1>
              <motion.p
                variants={slideIn}
                className="mx-auto mt-3 max-w-2xl text-gray-600 md:text-lg"
              >
                Optimize your agricultural practices with cutting-edge AI insights
                for modern farming implementation
              </motion.p>
            </motion.div>

            {/* Clean Selection Panel */}
            <motion.div
              variants={fadeIn}
              className="px-4 mx-auto mb-10 max-w-4xl md:mb-12 sm:px-0"
            >
              <div className="p-8 bg-white rounded-2xl border border-[#5B532C]/10">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#5B532C]/10">
                  <div className="p-3 rounded-xl bg-[#63A361]">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#5B532C]">Configure Your Analysis</h2>
                    <p className="text-sm text-[#5B532C]/60">Select options to get personalized farming insights</p>
                  </div>
                </div>

                {/* Step 1: Technique Selection */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#63A361] text-white text-xs font-bold">1</div>
                    <label className="text-sm font-semibold text-[#5B532C]">Choose Farming Technique</label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {techniques.map((tech) => (
                      <button
                        key={tech.id}
                        onClick={() => {
                          setSelectedTechnique(tech.id)
                          if (tech.id !== "other_farming") {
                            setCustomFarmingType("")
                          }
                        }}
                        className={cn(
                          "relative p-4 rounded-xl border-2 flex flex-col items-center text-center transition-colors",
                          selectedTechnique === tech.id
                            ? "border-[#63A361] bg-[#63A361]/5"
                            : "border-[#5B532C]/10 bg-white"
                        )}
                      >
                        {selectedTechnique === tech.id && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-4 h-4 text-[#63A361]" />
                          </div>
                        )}
                        <div className={cn(
                          "mb-3 w-12 h-12 rounded-xl flex items-center justify-center",
                          selectedTechnique === tech.id ? "bg-[#63A361]" : "bg-[#FDE7B3]/50"
                        )}>
                          <tech.icon className={cn(
                            "w-6 h-6",
                            selectedTechnique === tech.id ? "text-white" : "text-[#63A361]"
                          )} />
                        </div>
                        <span className={cn(
                          "text-sm font-medium",
                          selectedTechnique === tech.id ? "text-[#63A361]" : "text-[#5B532C]"
                        )}>
                          {tech.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Farming Type Input */}
                <AnimatePresence>
                  {selectedTechnique === "other_farming" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-8"
                    >
                      <div className="p-4 rounded-xl bg-[#FDE7B3]/20 border border-[#FFC50F]/20">
                        <label className="flex items-center gap-2 mb-2 text-sm font-medium text-[#5B532C]">
                          <AlertCircle className="w-4 h-4 text-[#FFC50F]" />
                          Specify Your Farming Technique
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Vertical Farming, Hydroponics..."
                          value={customFarmingType}
                          onChange={(e) => setCustomFarmingType(e.target.value)}
                          className={cn(
                            "w-full px-4 py-3 rounded-lg border bg-white text-[#5B532C] placeholder-[#5B532C]/40 focus:outline-none",
                            customFarmingType && !isFarmingRelated(customFarmingType)
                              ? "border-red-400"
                              : "border-[#5B532C]/20 focus:border-[#63A361]"
                          )}
                        />
                        {customFarmingType && !isFarmingRelated(customFarmingType) && (
                          <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Please enter a farming technique related to agriculture
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 2: Farm Details */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#63A361] text-white text-xs font-bold">2</div>
                    <label className="text-sm font-semibold text-[#5B532C]">Farm Details</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Farm Size */}
                    <div>
                      <label className="block mb-2 text-sm font-medium text-[#5B532C]/70">Farm Size</label>
                      <div className="relative">
                        <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#63A361]" />
                        <input
                          type="number"
                          placeholder="Enter farm size"
                          value={farmSize}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
                              setFarmSize(value)
                            }
                          }}
                          min="0"
                          className="w-full py-3 pl-11 pr-16 rounded-lg border border-[#5B532C]/20 bg-white text-[#5B532C] placeholder-[#5B532C]/40 focus:outline-none focus:border-[#63A361]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#5B532C]/60">acres</span>
                      </div>
                    </div>

                    {/* Budget */}
                    <div>
                      <label className="block mb-2 text-sm font-medium text-[#5B532C]/70">Budget Range</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FFC50F]" />
                        <select
                          value={selectedBudget}
                          onChange={(e) => setSelectedBudget(e.target.value as ModernFarmingRequest["budget"])}
                          className="w-full py-3 pl-11 pr-4 rounded-lg border border-[#5B532C]/20 bg-white text-[#5B532C] appearance-none cursor-pointer focus:outline-none focus:border-[#63A361]"
                        >
                          {budgetOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B532C]/50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleAnalysis}
                  disabled={loading || !isFormValid()}
                  className={cn(
                    "w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-colors",
                    isFormValid() && !loading
                      ? "bg-[#63A361] text-white"
                      : "bg-[#5B532C]/10 text-[#5B532C]/40 cursor-not-allowed"
                  )}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5" />
                      <span>{isFormValid() ? "Generate AI Analysis" : "Complete all fields above"}</span>
                    </>
                  )}
                </button>

                {/* Form Status */}
                {!isFormValid() && (
                  <div className="mt-4 p-4 rounded-lg bg-[#FDE7B3]/20 border border-[#FFC50F]/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[#FFC50F] flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-[#5B532C]">
                        <p className="font-medium mb-1">Please complete:</p>
                        <ul className="space-y-1 text-[#5B532C]/70">
                          {!selectedTechnique && <li>Select a farming technique</li>}
                          {selectedTechnique === "other_farming" && !customFarmingType.trim() && <li>Specify your farming technique</li>}
                          {(!farmSize || farmSize === '0' || Number(farmSize) <= 0) && <li>Enter your farm size</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Preview Placeholder - What You'll Get */}
            <motion.div
              variants={fadeIn}
              className="px-4 mx-auto max-w-6xl sm:px-0"
            >
              <div className="mb-6 text-center">
                <h3 className="text-lg font-semibold text-[#5B532C]/70">What You'll Discover</h3>
                <p className="text-sm text-[#5B532C]/50">AI-powered insights tailored to your farming needs</p>
              </div>

              {/* Skeleton Preview Cards */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {[
                  { icon: DollarSign, title: "ROI Analysis", desc: "Expected returns & payback" },
                  { icon: Target, title: "Resource Efficiency", desc: "Water, energy & labor optimization" },
                  { icon: TrendingUp, title: "Financial Projections", desc: "3-year revenue forecast" },
                  { icon: Leaf, title: "Recommended Crops", desc: "Best suited varieties" }
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-[#FDE7B3]/20 to-white border border-[#63A361]/10 group hover:border-[#63A361]/30 transition-all"
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000" />
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-[#63A361]/10">
                        <item.icon className="w-5 h-5 text-[#63A361]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#5B532C] mb-1">{item.title}</h4>
                        <p className="text-xs text-[#5B532C]/60">{item.desc}</p>
                        <div className="mt-3 space-y-2">
                          <div className="h-3 w-full bg-[#FDE7B3]/40 rounded animate-pulse" />
                          <div className="h-3 w-3/4 bg-[#FDE7B3]/30 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Mock Charts Preview */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Mock Pie Chart */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="relative p-6 rounded-xl bg-white border border-[#63A361]/10 overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-[#FDE7B3]/30">
                      <Shield className="w-5 h-5 text-[#63A361]/50" />
                    </div>
                    <div className="h-5 w-32 bg-[#5B532C]/10 rounded" />
                  </div>
                  <div className="flex items-center justify-center h-48">
                    <svg className="w-40 h-40" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#FDE7B3" strokeWidth="20" />
                      <motion.circle
                        cx="50" cy="50" r="40" fill="none" stroke="#63A361" strokeWidth="20"
                        strokeDasharray="251.2" strokeDashoffset="62.8"
                        initial={{ strokeDashoffset: 251.2 }}
                        animate={{ strokeDashoffset: 62.8 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
                      />
                      <motion.circle
                        cx="50" cy="50" r="40" fill="none" stroke="#FFC50F" strokeWidth="20"
                        strokeDasharray="251.2" strokeDashoffset="188.4"
                        initial={{ strokeDashoffset: 251.2 }}
                        animate={{ strokeDashoffset: 188.4 }}
                        transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                        style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
                      />
                    </svg>
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    {[{ color: "#63A361", label: "Infrastructure" }, { color: "#FFC50F", label: "Equipment" }, { color: "#FDE7B3", label: "Other" }].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-[#5B532C]/60">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Mock Bar Chart */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="relative p-6 rounded-xl bg-white border border-[#63A361]/10 overflow-hidden"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-[#FDE7B3]/30">
                      <TrendingUp className="w-5 h-5 text-[#63A361]/50" />
                    </div>
                    <div className="h-5 w-40 bg-[#5B532C]/10 rounded" />
                  </div>
                  <div className="flex items-end justify-around h-48 px-4 pt-4">
                    {["Year 1", "Year 2", "Year 3"].map((year, i) => (
                      <div key={year} className="flex flex-col items-center gap-2 flex-1">
                        <div className="flex gap-1 items-end h-36">
                          <motion.div
                            className="w-6 bg-[#63A361]/30 rounded-t"
                            initial={{ height: 0 }}
                            animate={{ height: [40, 70, 100][i] }}
                            transition={{ duration: 1, delay: 0.2 * i }}
                          />
                          <motion.div
                            className="w-6 bg-[#FFC50F]/30 rounded-t"
                            initial={{ height: 0 }}
                            animate={{ height: [30, 50, 80][i] }}
                            transition={{ duration: 1, delay: 0.3 + 0.2 * i }}
                          />
                        </div>
                        <span className="text-xs text-[#5B532C]/50">{year}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Features Preview */}
              <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-[#63A361]/5 via-[#FDE7B3]/10 to-[#FFC50F]/5 border border-[#63A361]/10">
                <div className="flex flex-wrap justify-center gap-6">
                  {[
                    { icon: Zap, text: "Implementation Timeline" },
                    { icon: Activity, text: "Risk Assessment" },
                    { icon: Calendar, text: "Seasonal Planning" },
                    { icon: AlertCircle, text: "Challenges & Solutions" }
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                      className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-[#63A361]/10"
                    >
                      <item.icon className="w-4 h-4 text-[#63A361]" />
                      <span className="text-sm text-[#5B532C]">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}

        {/* Results Section - Only show when results are displayed */}
        {showResults && analysisData && (
          <>
            {/* Results Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex gap-2 items-center px-4 py-2 mb-3 bg-[#FDE7B3]/30 rounded-full border border-[#63A361]/30"
              >
                <CheckCircle2 className="w-4 h-4 text-[#63A361]" />
                <span className="text-sm font-medium text-[#63A361]">
                  Analysis Complete
                </span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-[#5B532C] md:text-4xl"
              >
                {analysisData.techniqueAnalysis.overview.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Analysis
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mx-auto mt-3 max-w-2xl text-gray-600 md:text-lg"
              >
                Comprehensive farming analysis with detailed insights and recommendations
              </motion.p>
            </motion.div>

            {/* Analysis Display */}
            <div ref={analysisResultsRef}></div>
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 text-center rounded-2xl border border-[#63A361]/20 shadow-md bg-white"
                >
                  <div className="flex flex-col justify-center items-center">
                    <div className="relative mb-6 w-24 h-24">
                      <div className="absolute top-0 left-0 w-full h-full rounded-full border-8 border-[#FDE7B3]/50"></div>
                      <div className="absolute top-0 left-0 w-full h-full rounded-full border-8 border-transparent animate-spin border-t-[#63A361]"></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <Brain className="w-10 h-10 text-[#63A361]" />
                      </div>
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-gray-800">
                      AI Analysis in Progress
                    </h3>
                    <p className="mb-6 max-w-lg text-gray-600">
                      Our AI system is working through multiple phases to provide
                      optimal farming insights...
                    </p>
                    <div className="flex flex-col gap-4 w-full max-w-md">
                      {/* Phase 1: Thinking */}
                      <motion.div
                        className="p-3 bg-white rounded-lg border border-[#63A361]/20"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="flex gap-3 items-center mb-2">
                          <div className="flex justify-center items-center w-6 h-6 bg-[#FDE7B3]/50 rounded-full">
                            <div className="w-2.5 h-2.5 bg-[#63A361] rounded-full animate-pulse"></div>
                          </div>
                          <span className="font-medium text-gray-700">
                            Phase 1: Thinking
                          </span>
                          <div className="ml-auto">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 2.5, duration: 0.3 }}
                            >
                              <CheckCircle2 className="w-5 h-5 text-[#63A361]" />
                            </motion.div>
                          </div>
                        </div>
                        <div className="mb-2 ml-9 text-sm text-gray-600">
                          Analyzing your input parameters and context
                        </div>
                        <div className="overflow-hidden flex-1 ml-9 h-2 bg-[#FDE7B3]/50 rounded-full">
                          <motion.div
                            className="h-full bg-[#63A361] rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 2.5, ease: "easeInOut" }}
                          />
                        </div>
                      </motion.div>

                      {/* Phase 2: Gathering */}
                      <motion.div
                        className="p-3 bg-white rounded-lg border border-[#63A361]/20"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 2.7, duration: 0.5 }}
                      >
                        <div className="flex gap-3 items-center mb-2">
                          <div className="flex justify-center items-center w-6 h-6 bg-[#FDE7B3]/50 rounded-full">
                            <div className="w-2.5 h-2.5 bg-[#63A361] rounded-full animate-pulse"></div>
                          </div>
                          <span className="font-medium text-gray-700">
                            Phase 2: Gathering Data
                          </span>
                          <div className="ml-auto">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 5.5, duration: 0.3 }}
                            >
                              <CheckCircle2 className="w-5 h-5 text-[#63A361]" />
                            </motion.div>
                          </div>
                        </div>
                        <div className="mb-2 ml-9 text-sm text-gray-600">
                          Collecting relevant agriculture metrics and case studies
                        </div>
                        <div className="overflow-hidden flex-1 ml-9 h-2 bg-[#FDE7B3]/50 rounded-full">
                          <motion.div
                            className="h-full bg-[#63A361] rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{
                              delay: 2.7,
                              duration: 2.8,
                              ease: "easeInOut",
                            }}
                          />
                        </div>
                      </motion.div>

                      {/* Phase 3: Planning */}
                      <motion.div
                        className="p-3 bg-white rounded-lg border border-[#63A361]/20"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 5.7, duration: 0.5 }}
                      >
                        <div className="flex gap-3 items-center mb-2">
                          <div className="flex justify-center items-center w-6 h-6 bg-[#FDE7B3]/50 rounded-full">
                            <div className="w-2.5 h-2.5 bg-[#63A361] rounded-full animate-pulse"></div>
                          </div>
                          <span className="font-medium text-gray-700">
                            Phase 3: Planning
                          </span>
                          <div className="ml-auto">
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 8.5, duration: 0.3 }}
                            >
                              <CheckCircle2 className="w-5 h-5 text-[#63A361]" />
                            </motion.div>
                          </div>
                        </div>
                        <div className="mb-2 ml-9 text-sm text-gray-600">
                          Creating implementation plan and resource allocation
                        </div>
                        <div className="overflow-hidden flex-1 ml-9 h-2 bg-[#FDE7B3]/50 rounded-full">
                          <motion.div
                            className="h-full bg-[#63A361] rounded-full"
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{
                              delay: 5.7,
                              duration: 2.8,
                              ease: "easeInOut",
                            }}
                          />
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ) : analysisData ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-12"
                >
                  {/* Success Banner */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex justify-center items-center p-4 bg-[#FDE7B3]/30 rounded-xl border border-[#63A361]/30"
                  >
                    <CheckCircle2 className="mr-2 w-5 h-5 text-[#63A361]" />
                    <span className="font-medium text-[#63A361]">
                      Analysis completed successfully
                    </span>
                  </motion.div>

                  {/* Enhanced Results Display */}
                  <div className="space-y-8">
                    {/* Key Metrics Overview */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 md:grid-cols-2">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 bg-white rounded-2xl border border-[#63A361]/30"
                      >
                        <div className="flex gap-3 items-center mb-4">
                          <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
                            <DollarSign className="w-5 h-5 text-[#63A361]" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800">Total Investment</h3>
                        </div>
                        <div className="mb-2 text-3xl font-bold text-[#63A361]">
                          ₹{analysisData.techniqueAnalysis.overview.estimatedCost.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {analysisData.techniqueAnalysis.overview.timeToRoi} ROI
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 bg-white rounded-2xl border border-[#63A361]/30"
                      >
                        <div className="flex gap-3 items-center mb-4">
                          <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-[#63A361]" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800">ROI</h3>
                        </div>
                        <div className="mb-2 text-3xl font-bold text-[#63A361]">
                          {analysisData.techniqueAnalysis.overview.roi}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {analysisData.techniqueAnalysis.overview.successRate}% Success Rate
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 bg-white rounded-2xl border border-[#FFC50F]/30"
                      >
                        <div className="flex gap-3 items-center mb-4">
                          <div className="p-3 bg-[#FFC50F]/20 rounded-xl">
                            <Target className="w-5 h-5 text-[#5B532C]" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800">Market Demand</h3>
                        </div>
                        <div className="mb-2 text-3xl font-bold text-[#5B532C]">
                          {analysisData.techniqueAnalysis.overview.marketDemand}%
                        </div>
                        <div className="text-sm text-gray-600">
                          {analysisData.techniqueAnalysis.overview.riskLevel} Risk
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-6 bg-white rounded-2xl border border-[#63A361]/30"
                      >
                        <div className="flex gap-3 items-center mb-4">
                          <div className="p-3 bg-[#FDE7B3]/30 rounded-xl">
                            <Shield className="w-5 h-5 text-[#63A361]" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-800">Sustainability</h3>
                        </div>
                        <div className="mb-2 text-3xl font-bold text-[#63A361]">
                          {analysisData.techniqueAnalysis.overview.sustainabilityScore}%
                        </div>
                        <div className="text-sm text-gray-600">
                          Environmental Impact
                        </div>
                      </motion.div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                      {/* Cost Breakdown Chart */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="p-6 bg-white rounded-2xl border border-[#63A361]/30"
                      >
                        <div className="flex gap-3 items-center mb-6">
                          <div className="p-2 bg-[#FDE7B3]/30 rounded-lg">
                            <PieChart className="w-5 h-5 text-[#63A361]" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Cost Breakdown</h3>
                        </div>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieChartData}
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                              >
                                {pieChartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>

                      {/* Resource Efficiency Radar Chart */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="p-6 bg-white rounded-2xl border border-[#63A361]/30"
                      >
                        <div className="flex gap-3 items-center mb-6">
                          <div className="p-2 bg-[#FDE7B3]/30 rounded-lg">
                            <Activity className="w-5 h-5 text-[#63A361]" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Resource Efficiency</h3>
                        </div>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarChartData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="subject" />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} />
                              <Radar name="Efficiency" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    </div>

                    {/* Financial Projections */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="p-6 bg-white rounded-2xl border border-[#63A361]/30"
                    >
                      <div className="flex gap-3 items-center mb-6">
                        <div className="p-2 bg-[#FDE7B3]/30 rounded-lg">
                          <BarChart className="w-5 h-5 text-[#63A361]" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">3-Year Financial Projections</h3>
                      </div>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={financialProjectionsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis />
                            <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                            <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                            <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                            <Bar dataKey="profit" fill="#3b82f6" name="Profit" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>

                    {/* Implementation Timeline */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="p-6 bg-white rounded-2xl border border-[#63A361]/30"
                    >
                      <div className="flex gap-3 items-center mb-6">
                        <div className="p-2 bg-[#FDE7B3]/30 rounded-lg">
                          <Calendar className="w-5 h-5 text-[#5B532C]" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Implementation Timeline</h3>
                      </div>
                      <div className="space-y-4">
                        {analysisData.implementation.phases.map((phase, index) => (
                          <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex flex-col items-center">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                                phase.priority === "High" ? "bg-red-500" :
                                  phase.priority === "Medium" ? "bg-[#FFC50F]" :
                                    "bg-[#63A361]"
                              )}>
                                {index + 1}
                              </div>
                              {index < analysisData.implementation.phases.length - 1 && (
                                <div className="w-0.5 h-16 bg-gray-200 mt-2"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-gray-900">{phase.name}</h4>
                                <div className="flex gap-2">
                                  <span className="px-2 py-1 text-xs font-medium text-[#5B532C] bg-[#FDE7B3] rounded-full">
                                    {phase.duration}
                                  </span>
                                  <span className={cn(
                                    "px-2 py-1 text-xs font-medium rounded-full",
                                    phase.priority === "High" ? "bg-red-100 text-red-800" :
                                      phase.priority === "Medium" ? "bg-yellow-100 text-yellow-800" :
                                        "bg-[#FDE7B3] text-[#63A361]"
                                  )}>
                                    {phase.priority}
                                  </span>
                                </div>
                              </div>
                              <p className="mb-3 text-sm text-gray-600">{phase.description}</p>
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                  <h5 className="mb-1 text-xs font-medium text-gray-500">Key Milestones:</h5>
                                  <ul className="space-y-1 text-xs text-gray-600">
                                    {phase.keyMilestones.map((milestone, idx) => (
                                      <li key={idx} className="flex gap-1 items-center">
                                        <div className="w-1 h-1 bg-[#63A361] rounded-full"></div>
                                        {milestone}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h5 className="mb-1 text-xs font-medium text-gray-500">Success Metrics:</h5>
                                  <ul className="space-y-1 text-xs text-gray-600">
                                    {phase.successMetrics.map((metric, idx) => (
                                      <li key={idx} className="flex gap-1 items-center">
                                        <div className="w-1 h-1 bg-[#63A361] rounded-full"></div>
                                        {metric}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              <div className="mt-3 text-sm font-semibold text-gray-900">
                                Cost: ₹{phase.estimatedCost.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Recommended Crops & Technology */}
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                        className="p-6 bg-white rounded-2xl border border-[#63A361]/30"
                      >
                        <div className="flex gap-3 items-center mb-6">
                          <div className="p-2 bg-[#FDE7B3]/30 rounded-lg">
                            <Leaf className="w-5 h-5 text-[#63A361]" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Recommended Crops</h3>
                        </div>
                        <div className="space-y-3">
                          {analysisData.techniqueAnalysis.overview.recommendedCrops.map((crop, index) => (
                            <div key={index} className="flex gap-3 items-center p-3 bg-[#FDE7B3]/20 rounded-lg">
                              <div className="w-2 h-2 bg-[#63A361] rounded-full"></div>
                              <span className="font-medium text-gray-900">{crop.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0 }}
                        className="p-6 bg-white rounded-2xl border border-[#63A361]/30"
                      >
                        <div className="flex gap-3 items-center mb-6">
                          <div className="p-2 bg-[#FDE7B3]/30 rounded-lg">
                            <Zap className="w-5 h-5 text-[#63A361]" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Essential Technology</h3>
                        </div>
                        <div className="space-y-3">
                          {analysisData.technologyRecommendations.essential.map((tech, index) => (
                            <div key={index} className="flex gap-3 items-center p-3 bg-[#FDE7B3]/20 rounded-lg">
                              <div className="w-2 h-2 bg-[#63A361] rounded-full"></div>
                              <span className="font-medium text-gray-900">{tech}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 text-center rounded-2xl border border-[#63A361]/20 shadow-lg backdrop-blur-sm bg-white"
                >
                  <div className="inline-flex justify-center items-center p-4 mb-6 bg-[#FDE7B3]/30 rounded-full">
                    <AlertCircle className="w-8 h-8 text-[#63A361]" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-gray-800">
                    Ready for Analysis
                  </h3>
                  <p className="mx-auto max-w-lg text-gray-600">
                    Select a farming technique and specify your farm size to receive
                    AI-powered insights for implementation
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="mt-12 text-center">
              <div className="inline-flex gap-2 items-center px-4 py-2 rounded-full border border-[#63A361]/20 bg-white">
                <Database className="w-4 h-4 text-[#63A361]" />
                <span className="text-sm text-gray-600">
                  Powered by Advanced AI Analytics
                </span>
              </div>
            </div>
          </>
        )}

        {/* Empty State - Show when no results and not showing input form */}
        {!showResults && !analysisData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 text-center rounded-2xl border border-[#63A361]/20 shadow-lg backdrop-blur-sm bg-white"
          >
            <div className="inline-flex justify-center items-center p-4 mb-6 bg-[#FDE7B3]/30 rounded-full">
              <AlertCircle className="w-8 h-8 text-[#63A361]" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-800">
              Ready for Analysis
            </h3>
            <p className="mx-auto max-w-lg text-gray-600">
              Select a farming technique and specify your farm size to receive
              AI-powered insights for implementation
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default SmartFarming