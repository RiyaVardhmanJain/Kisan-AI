import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Microscope,
  Leaf,
  Shield,
  Upload,
  Check,
  Send,
  X,
  ScanLine,
  BrainCircuit,
  ZoomIn,
  AlertTriangle,
  Activity,
  TrendingUp,
  Target,
  Clock,
  Star,
  AlertCircle,
  CheckCircle2,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  Gauge,
  Zap,
  Calendar,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import {
  analyzePlantImage,
  DiseaseAnalysisResult,
} from "../ai/diseaseDetectionService";
import { DiseasePromptConfig } from "../ai/diseasePrompt";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  AreaChart,
} from "recharts";
import toast, { Toaster } from "react-hot-toast";
interface DiseaseDetectionProps {
  onAnalysisComplete?: (result: DiseaseAnalysisResult) => void;
  maxImageSize?: number;
  cropType?: string;
  severityLevel?: "mild" | "medium" | "severe";
}
const DEFAULT_MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.5 },
};
const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};
const itemVariant = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};
const DiseaseDetection: React.FC<DiseaseDetectionProps> = ({
  onAnalysisComplete,
  maxImageSize = DEFAULT_MAX_IMAGE_SIZE,
  cropType,
  severityLevel,
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isResultsVisible, setIsResultsVisible] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] =
    useState<DiseaseAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isImageUploaded, setIsImageUploaded] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const addProcessingStep = (step: string) => {
    setProcessingSteps((prev) => [...prev, step]);
  };

  // Helper function to get severity color and urgency
  const getSeverityInfo = (severity: string) => {
    const severityMap = {
      mild: {
        color: "green",
        bgColor: "green-50",
        borderColor: "green-200",
        urgency: "Low",
        icon: CheckCircle2,
      },
      medium: {
        color: "yellow",
        bgColor: "yellow-50",
        borderColor: "yellow-200",
        urgency: "Medium",
        icon: AlertTriangle,
      },
      severe: {
        color: "red",
        bgColor: "red-50",
        borderColor: "red-200",
        urgency: "High",
        icon: AlertCircle,
      },
    };
    return (
      severityMap[severity as keyof typeof severityMap] || severityMap.mild
    );
  };

  // Helper function to get confidence level with color
  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 90)
      return { level: "Excellent", color: "green", bgColor: "green-50" };
    if (confidence >= 80)
      return { level: "Good", color: "blue", bgColor: "blue-50" };
    if (confidence >= 70)
      return { level: "Fair", color: "yellow", bgColor: "yellow-50" };
    return { level: "Poor", color: "red", bgColor: "red-50" };
  };

  // Helper function to generate disease progression chart data
  const generateProgressionData = (result: DiseaseAnalysisResult) => {
    const days = ["Today", "Day 3", "Day 7", "Day 14", "Day 21", "Day 30"];
    const baseSeverity =
      result.severityLevel === "mild"
        ? 20
        : result.severityLevel === "medium"
          ? 50
          : 80;
    const progressionRate = result.realTimeMetrics.diseaseProgression.rate;

    return days.map((day, index) => ({
      day,
      severity: Math.min(100, baseSeverity + index * progressionRate * 2),
      spread: Math.min(100, index * 10 + Math.random() * 20),
      recovery:
        result.severityLevel === "severe"
          ? Math.max(0, 100 - index * 8)
          : result.severityLevel === "medium"
            ? Math.max(0, 100 - index * 5)
            : Math.max(0, 100 - index * 3),
    }));
  };

  // Helper function to get treatment urgency
  const getTreatmentUrgency = (result: DiseaseAnalysisResult) => {
    const severity = result.severityLevel;
    const confidence = result.confidenceLevel;
    const spreadRisk = result.realTimeMetrics.spreadRisk.value;

    if (severity === "severe" || spreadRisk > 70)
      return { urgency: "Immediate", color: "red", hours: "0-6" };
    if (severity === "medium" || spreadRisk > 50)
      return { urgency: "Within 24h", color: "orange", hours: "6-24" };
    if (severity === "mild" || spreadRisk > 30)
      return { urgency: "Within 3 days", color: "yellow", hours: "24-72" };
    return { urgency: "Monitor", color: "green", hours: "72+" };
  };

  const processFile = async () => {
    if (!image) return;
    try {
      setErrorMessage(null);
      setIsAnalyzing(true);
      setIsResultsVisible(false);
      setAnalysisProgress(0);
      setProcessingSteps([]);
      setCurrentStep(0);
      
      const steps = [
        {
          message: "Initializing processing pipeline...",
          duration: 1000,
        },
        { message: "Uploading image...", duration: 1500 },
        { message: "Performing image analysis...", duration: 2000 },
        { message: "Running AI model predictions...", duration: 2500 },
        { message: "Analyzing disease patterns...", duration: 2000 },
        { message: "Generating recommendations...", duration: 1500 },
        { message: "Finalizing analysis report...", duration: 1000 },
      ];
      let progress = 0;
      const progressIncrement = 100 / steps.length;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        setCurrentStep(i);
        addProcessingStep(step.message);
        const startProgress = progress;
        const endProgress = progress + progressIncrement;
        const duration = step.duration;
        const startTime = Date.now();
        while (progress < endProgress) {
          const elapsed = Date.now() - startTime;
          const percentage = Math.min(elapsed / duration, 1);
          progress = startProgress + progressIncrement * percentage;
          setAnalysisProgress(Math.min(progress, 99));
          await new Promise((r) => setTimeout(r, 50));
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      const config: DiseasePromptConfig = { cropType, severityLevel };
      let result = await analyzePlantImage(image, config);
      // Update lastUpdated to use current date
      result = {
        ...result,
        realTimeMetrics: {
          ...result.realTimeMetrics,
          environmentalConditions: {
            ...result.realTimeMetrics.environmentalConditions,
            lastUpdated: new Date().toLocaleDateString(),
          },
        },
      };
      setAnalysisProgress(100);
      await new Promise((r) => setTimeout(r, 500));
      addProcessingStep("Analysis complete!");
      setAnalysisResult(result);

      // Create a lightweight preview (to avoid storing very large images)
      const createPreview = async (dataUrl: string, maxW = 600, maxH = 600): Promise<string> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const scale = Math.min(maxW / img.width, maxH / img.height, 1);
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              try {
                const preview = canvas.toDataURL('image/jpeg', 0.85);
                resolve(preview);
              } catch {
                resolve(dataUrl);
              }
            } else {
              resolve(dataUrl);
            }
          };
          img.onerror = () => resolve(dataUrl);
          img.src = dataUrl;
        });
      };

      const preview = image ? await createPreview(image) : null;
      if (preview) setImagePreview(preview);

      setIsResultsVisible(true);
      onAnalysisComplete?.(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Analysis failed",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };
  const { getRootProps, getInputProps } = useDropzone({
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxSize: maxImageSize,
    disabled: isAnalyzing,
    onDrop: (acceptedFiles, rejectedFiles) => {
      setIsDragActive(false);
      if (rejectedFiles.length > 0) {
        const error = rejectedFiles[0].errors[0];
        setErrorMessage(
          error.code === "file-too-large"
            ? `File is too large. Maximum size is ${maxImageSize / (1024 * 1024)}MB`
            : "Invalid file type. Please upload a valid image.",
        );
        return;
      }
      if (acceptedFiles.length > 0) {
        setErrorMessage(null);
        const reader = new FileReader();
        reader.onload = () => {
          setImage(reader.result as string);
          setIsImageUploaded(true);
        };
        reader.readAsDataURL(acceptedFiles[0]);
      }
    },
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });
  const resetAnalysis = () => {
    setImage(null);
    setIsImageUploaded(false);
    setIsResultsVisible(false);
    setAnalysisResult(null);
    setAnalysisProgress(0);
    setProcessingSteps([]);
    setCurrentStep(0);
    setErrorMessage(null);
  };
  const solutions = [
    {
      title: "Chemical Solutions",
      icon: Microscope,
      solutions: analysisResult?.organicTreatments || [
        "Solution 1",
        "Solution 2",
        "Solution 3",
      ],
      color: "blue",
    },
    {
      title: "Organic Solutions",
      icon: Leaf,
      solutions: analysisResult?.ipmStrategies || [
        "Solution 1",
        "Solution 2",
        "Solution 3",
      ],
      color: "green",
    },
    {
      title: "Preventive Measures",
      icon: Shield,
      solutions: analysisResult?.preventionPlan || [
        "Solution 1",
        "Solution 2",
        "Solution 3",
      ],
      color: "purple",
    },
  ];
  return (
    <div className="relative min-h-screen bg-white">
      <Toaster position="top-right" />

      <div className="px-4 py-8 mx-auto max-w-7xl md:py-12 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center md:mb-12"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex gap-2 items-center px-4 py-2 mb-4 rounded-full border shadow-lg backdrop-blur-md bg-white/80 border-[#63A361]/20"
          >
            <div className="w-2 h-2 bg-[#63A361] rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-[#63A361]">
              AI-Powered Monitoring
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-extrabold text-[#5B532C] md:text-4xl"
          >
            Smart Plant Health Analysis
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-sm text-[#5B532C]/70 md:mt-4 md:text-base"
          >
            Advanced AI-powered plant Monitoring with real-time
            monitoring and treatment recommendations
          </motion.p>

          {/* API Mode Selector */}
        </motion.div>
        {/* Upload Section (Hidden after analysis until reset) */}
        <AnimatePresence mode="wait">
          {!isImageUploaded && !isResultsVisible && (
            <motion.div
              key="upload-section"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="mb-8"
            >
              <div {...getRootProps()} className="relative">
                <motion.div
                  whileHover={{
                    boxShadow: isAnalyzing
                      ? "none"
                      : "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                  }}
                  animate={
                    isDragActive
                      ? {
                        borderColor: "#2563EB",
                        backgroundColor: "#EFF6FF",
                      }
                      : {
                        borderColor: "#D1D5DB",
                        backgroundColor: "#FFFFFF",
                      }
                  }
                  className="relative p-6 rounded-xl border-2 border-dashed transition-all duration-300 bg-gradient-to-r from-gray-50 to-white"
                  style={{ opacity: isAnalyzing ? 0.6 : 1 }}
                >
                  <input {...getInputProps()} disabled={isAnalyzing} />
                  <div className="flex flex-col items-center">
                    <motion.div
                      className={clsx(
                        "p-4 mb-4 rounded-full transition-all duration-300",
                        isDragActive ? "bg-primary-100" : "bg-gray-100",
                      )}
                      whileHover={{
                        backgroundColor: isAnalyzing ? "#F3F4F6" : "#E5E7EB",
                      }}
                    >
                      <Upload className="w-10 h-10 text-primary-600" />
                    </motion.div>
                    <motion.h3
                      className="mb-2 text-xl font-semibold text-gray-900"
                      animate={{ scale: isDragActive ? 1.1 : 1 }}
                    >
                      Drag and drop your image here
                    </motion.h3>
                    <motion.p
                      className="mb-4 text-sm text-gray-600"
                      animate={{ opacity: isDragActive ? 0.7 : 1 }}
                    >
                      or click to select a file
                    </motion.p>
                    <motion.button
                      className="px-6 py-2 text-sm font-medium text-white rounded-full bg-primary-600"
                      whileHover={{
                        backgroundColor: isAnalyzing ? "#6B7280" : "#10B981",
                      }}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? "Processing..." : "Select File"}
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Image Preview and Send Button */}
        <AnimatePresence mode="wait">
          {isImageUploaded && image && !isAnalyzing && !isResultsVisible && (
            <motion.div
              key="preview-section"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="mb-8 p-6 bg-white rounded-xl shadow-lg border border-gray-200"
            >
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    Image Preview
                  </h3>
                  <div className="relative h-64 w-full overflow-hidden rounded-lg shadow-md aspect-[4/3]">
                    <img
                      src={image}
                      alt="Uploaded plant"
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedImage(image)}
                      className="absolute bottom-2 right-2 bg-primary-500 text-white p-2 rounded-full shadow-md hover:bg-primary-600 transition-colors duration-200"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <motion.button
                    className="px-6 py-3 text-white font-medium rounded-full flex items-center gap-2 bg-primary-600"
                    whileHover={{ backgroundColor: "#059669" }} // Shade of green on hover
                    onClick={processFile}
                  >
                    <Send className="w-5 h-5" /> Analyze Image
                  </motion.button>
                </div>
              </div>
              <motion.button
                className="mt-4 p-2 rounded-full bg-red-100 absolute top-2 right-2"
                whileHover={{ backgroundColor: "#FECACA" }}
                onClick={resetAnalysis}
              >
                <X className="w-5 h-5 text-red-700" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Analysis Component */}
        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div
              key="analysis-section"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="mb-8 p-8 flex flex-col items-center justify-center text-center bg-white rounded-xl shadow-lg border border-gray-200"
            >
              <h3 className="text-2xl font-bold text-gray-900">
                Analyzing Plant Health
              </h3>
              <p className="mt-2 mb-8 text-base text-gray-600">
                Please wait while our AI examines your image...
              </p>
              {/* Circular Progress Indicator with Animated Icon */}
              <div className="relative w-40 h-40 mb-6">
                <svg
                  className="absolute top-0 left-0 w-full h-full"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="#E5E7EB"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="url(#progressGradient)"
                    strokeWidth="10"
                    fill="transparent"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{
                      strokeDasharray: "282.74",
                      strokeDashoffset: "282.74",
                    }}
                    animate={{
                      strokeDashoffset:
                        282.74 - (analysisProgress / 100) * 282.74,
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                  <defs>
                    <linearGradient
                      id="progressGradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#10B981" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.3, ease: "backInOut" }}
                    >
                      <div className="w-20 h-20 rounded-full flex items-center justify-center bg-primary-50">
                        {[
                          <Upload className="w-10 h-10 text-primary-600" />,
                          <ScanLine className="w-10 h-10 text-primary-600" />,
                          <Leaf className="w-10 h-10 text-green-600" />,
                          <Shield className="w-10 h-10 text-purple-600" />,
                          <BrainCircuit className="w-10 h-10 text-primary-600" />,
                          <Microscope className="w-10 h-10 text-blue-600" />,
                          <Check className="w-10 h-10 text-green-600" />,
                        ][currentStep] || (
                            <Check className="w-10 h-10 text-green-600" />
                          )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
              <div className="h-12 w-full max-w-xs mx-auto">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentStep}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="text-lg font-medium text-gray-900"
                  >
                    {processingSteps[currentStep] || "Finalizing report..."}
                  </motion.p>
                </AnimatePresence>
              </div>
              <span className="text-xl font-bold mt-2 text-primary-600">
                {analysisProgress.toFixed(0)}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Enhanced Results Section */}
        <AnimatePresence mode="wait">
          {isResultsVisible && analysisResult && analysisProgress === 100 && (
            <motion.div
              key="results-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Analyzed Image Preview */}
              {imagePreview && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="p-4 bg-white rounded-xl shadow-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ScanLine className="w-5 h-5 text-primary-600" />
                      <h3 className="text-base font-semibold text-gray-900">Analyzed Image</h3>
                    </div>
                    <button
                      className="text-sm text-primary-600 hover:underline"
                      onClick={() => setSelectedImage(imagePreview)}
                    >
                      View Fullscreen
                    </button>
                  </div>
                  <div className="relative overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    <img src={imagePreview} alt="Analyzed" className="w-full h-auto object-contain max-h-80" />
                  </div>
                </motion.div>
              )}
              {/* Success Banner */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center items-center p-4 bg-[#FDE7B3]/30 rounded-xl border border-[#63A361]/30 shadow-sm"
              >
                <CheckCircle2 className="mr-2 w-5 h-5 text-[#63A361]" />
                <span className="font-medium text-[#63A361]">
                  Disease Analysis completed successfully
                </span>
              </motion.div>

              {/* Top Row - Key Metrics */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 md:grid-cols-2">
                {/* Monitoring Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border shadow-xl backdrop-blur-sm border-red-100/50"
                >
                  <div className="flex gap-3 items-center mb-4">
                    <div className="p-3 bg-red-100 rounded-xl">
                      <Microscope className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Disease Detected
                    </h3>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600 mb-2">
                      {analysisResult.diseaseName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {analysisResult.cropName}
                    </div>
                  </div>
                </motion.div>

                {/* Severity Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`p-6 rounded-2xl border shadow-xl backdrop-blur-sm bg-gradient-to-br ${getSeverityInfo(analysisResult.severityLevel).bgColor
                    } border-${getSeverityInfo(analysisResult.severityLevel).borderColor}/50`}
                >
                  <div className="flex gap-3 items-center mb-4">
                    <div
                      className={`p-3 rounded-xl bg-${getSeverityInfo(analysisResult.severityLevel).color}-100`}
                    >
                      <AlertTriangle
                        className={`w-6 h-6 text-${getSeverityInfo(analysisResult.severityLevel).color}-600`}
                      />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Severity Level
                    </h3>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-4xl font-bold text-${getSeverityInfo(analysisResult.severityLevel).color}-600 mb-2`}
                    >
                      {analysisResult.severityLevel.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {getSeverityInfo(analysisResult.severityLevel).urgency}{" "}
                      Priority
                    </div>
                  </div>
                </motion.div>

                {/* Confidence Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`p-6 rounded-2xl border shadow-xl backdrop-blur-sm bg-gradient-to-br ${getConfidenceLevel(analysisResult.confidenceLevel).bgColor
                    } border-blue-100/50`}
                >
                  <div className="flex gap-3 items-center mb-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Target className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      AI Confidence
                    </h3>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {analysisResult.confidenceLevel.toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">
                      {getConfidenceLevel(analysisResult.confidenceLevel).level}{" "}
                      Accuracy
                    </div>
                  </div>
                </motion.div>

                {/* Treatment Urgency Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-6 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl border shadow-xl backdrop-blur-sm border-orange-100/50"
                >
                  <div className="flex gap-3 items-center mb-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Treatment Urgency
                    </h3>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-2">
                      {getTreatmentUrgency(analysisResult).urgency}
                    </div>
                    <div className="text-sm text-gray-600">
                      {getTreatmentUrgency(analysisResult).hours} hours
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Disease Progression Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-gray-200"
              >
                <div className="flex gap-3 items-center mb-6">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Disease Progression Forecast
                  </h3>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={generateProgressionData(analysisResult)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="severity"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.3}
                        strokeWidth={3}
                        name="Disease Severity (%)"
                      />
                      <Area
                        type="monotone"
                        dataKey="spread"
                        stroke="#f59e0b"
                        fill="#f59e0b"
                        fillOpacity={0.3}
                        strokeWidth={3}
                        name="Spread Risk (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
              {/* Enhanced Environmental Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-gray-200"
              >
                <div className="flex gap-3 items-center mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Environmental Conditions
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {analysisResult.environmentalFactors
                    .slice(0, 4)
                    .map((factor, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-gray-200"
                      >
                        <div className="flex gap-2 items-center mb-2">
                          {factor.factor
                            .toLowerCase()
                            .includes("temperature") && (
                              <Thermometer className="w-4 h-4 text-orange-600" />
                            )}
                          {factor.factor.toLowerCase().includes("humidity") && (
                            <Droplets className="w-4 h-4 text-blue-600" />
                          )}
                          {factor.factor.toLowerCase().includes("soil") && (
                            <Gauge className="w-4 h-4 text-green-600" />
                          )}
                          {factor.factor.toLowerCase().includes("light") && (
                            <Sun className="w-4 h-4 text-yellow-600" />
                          )}
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {factor.factor}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-gray-900 mb-1">
                          {factor.currentValue}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {factor.optimalRange}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${factor.status === "optimal"
                            ? "bg-green-100 text-green-700"
                            : factor.status === "warning"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                            }`}
                        >
                          {factor.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>

              {/* Treatment Timeline & Impact */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-gray-200"
              >
                <div className="flex gap-3 items-center mb-6">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Treatment Timeline & Impact
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                    <Clock className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">Time to Treat</p>
                    <p className="text-lg font-bold text-red-600">
                      {analysisResult.timeToTreat}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Estimated Recovery
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      {analysisResult.estimatedRecovery}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
                    <TrendingUp className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-1">Yield Impact</p>
                    <p className="text-lg font-bold text-orange-600">
                      {analysisResult.yieldImpact}
                    </p>
                  </div>
                </div>
              </motion.div>
              {/* Enhanced Treatment Solutions */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {solutions.map((solution, index) => (
                  <motion.div
                    key={solution.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + index * 0.1 }}
                    className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-gray-200"
                  >
                    <div
                      className={clsx("p-3 w-fit rounded-xl mb-4", {
                        "bg-blue-100": solution.color === "blue",
                        "bg-green-100": solution.color === "green",
                        "bg-purple-100": solution.color === "purple",
                      })}
                    >
                      <solution.icon
                        className={clsx("w-6 h-6", {
                          "text-blue-600": solution.color === "blue",
                          "text-green-600": solution.color === "green",
                          "text-purple-600": solution.color === "purple",
                        })}
                      />
                    </div>
                    <h3 className="text-lg font-bold mb-4 text-gray-900">
                      {solution.title}
                    </h3>
                    <ul className="space-y-3">
                      {solution.solutions.map((item, i) => (
                        <li key={i} className="flex gap-3 items-start">
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                          <span className="text-sm text-gray-700">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>

              {/* Real-time Monitoring Dashboard */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-gray-200"
              >
                <div className="flex gap-3 items-center justify-between mb-6">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Activity className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Real-time Monitoring
                    </h3>
                  </div>
                  <span className="flex gap-2 items-center text-green-600">
                    <span className="w-2 h-2 rounded-full animate-pulse bg-green-600"></span>
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex gap-2 items-center mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-medium text-gray-700">
                        Spread Risk
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-red-600 mb-1">
                      {analysisResult.realTimeMetrics.spreadRisk.level}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {analysisResult.realTimeMetrics.spreadRisk.value}% •{" "}
                      {analysisResult.realTimeMetrics.spreadRisk.trend}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className="bg-red-500 h-2 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{
                          width: `${analysisResult.realTimeMetrics.spreadRisk.value}%`,
                        }}
                        transition={{ duration: 1, delay: 1.2 }}
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                    <div className="flex gap-2 items-center mb-2">
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                      <p className="text-sm font-medium text-gray-700">
                        Disease Progression
                      </p>
                    </div>
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {analysisResult.realTimeMetrics.diseaseProgression.stage}
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {analysisResult.realTimeMetrics.diseaseProgression.rate}%
                      / day
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex gap-2 items-center mb-2">
                      <Gauge className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-medium text-gray-700">
                        Environmental
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Temp</span>
                        <span className="font-medium">
                          {
                            analysisResult.realTimeMetrics
                              .environmentalConditions.temperature
                          }
                          °C
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Humidity</span>
                        <span className="font-medium">
                          {
                            analysisResult.realTimeMetrics
                              .environmentalConditions.humidity
                          }
                          %
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">Soil</span>
                        <span className="font-medium">
                          {
                            analysisResult.realTimeMetrics
                              .environmentalConditions.soilMoisture
                          }
                          %
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Updated:{" "}
                      {
                        analysisResult.realTimeMetrics.environmentalConditions
                          .lastUpdated
                      }
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Next Check Date */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="flex justify-center items-center p-4 bg-[#FDE7B3]/30 rounded-xl border border-[#63A361]/30 shadow-sm"
              >
                <Calendar className="mr-2 w-5 h-5 text-[#63A361]" />
                <span className="font-medium text-[#63A361]">
                  Next Analysis:{" "}
                  {new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000,
                  ).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </motion.div>

              {/* Restart Analysis Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 }}
                className="flex justify-center"
              >
                <motion.button
                  className="px-8 py-3 text-white font-medium rounded-full flex items-center gap-2 bg-[#63A361] hover:bg-[#5B532C] transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetAnalysis}
                >
                  <Sparkles className="w-5 h-5" />
                  New Analysis
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Handling */}
        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg"
            >
              {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Preview Modal */}
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative bg-white rounded-2xl p-6 max-w-3xl w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
              >
                <div className="bg-red-600 rounded-full p-2">
                  <X className="text-xl text-white" />
                </div>
              </motion.button>
              <img
                src={selectedImage}
                alt="Expanded Image"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              <p className="text-center text-gray-600 mt-4 italic">
                Expanded View
              </p>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
export default DiseaseDetection;
