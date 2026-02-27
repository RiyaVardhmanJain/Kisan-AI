import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Upload, Leaf, Mountain, Thermometer, Plane, Loader, Camera, Sparkles } from 'lucide-react';

// Simple cn utility
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');
import { 
  analyzeCropImage, 
  analyzeSoilImage, 
  analyzeThermalImage, 
  analyzeFieldImage,
  isValidImage
} from '../ai/monitoringService';
import { MonitoringType, CropMonitoringResult, SoilMonitoringResult, ThermalMonitoringResult, FieldMonitoringResult } from '../types';
import { InvalidImageResult } from '../components/monitoring/InvalidImageResult';
import { CropMonitoringResult as CropMonitoringResultComponent } from '../components/monitoring/CropMonitoringResult';
import { SoilMonitoringResult as SoilMonitoringResultComponent } from '../components/monitoring/SoilMonitoringResult';
import { ThermalMonitoringResult as ThermalMonitoringResultComponent } from '../components/monitoring/ThermalMonitoringResult';
import { FieldMonitoringResult as FieldMonitoringResultComponent } from '../components/monitoring/FieldMonitoringResult';
import toast, { Toaster } from 'react-hot-toast';

const DEFAULT_MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

const MONITORING_TYPES = [
  {
    type: 'crop' as MonitoringType,
    icon: Leaf,
    title: 'Crop Image',
    description: 'Detect diseases, pests, and nutrient deficiencies',
    color: 'consult-green',
    bgGradient: 'from-[#FDE7B3]/20 to-[#63A361]/10',
    iconColor: 'text-[#63A361]',
    borderColor: 'border-[#63A361]/20',
  },
  {
    type: 'soil' as MonitoringType,
    icon: Mountain,
    title: 'Soil Image',
    description: 'Analyze soil moisture, fertility, and composition',
    color: 'consult-yellow',
    bgGradient: 'from-[#FDE7B3]/20 to-[#FFC50F]/10',
    iconColor: 'text-[#FFC50F]',
    borderColor: 'border-[#FFC50F]/20',
  },
  {
    type: 'thermal' as MonitoringType,
    icon: Thermometer,
    title: 'Thermal Image',
    description: 'Identify water stress and irrigation issues',
    color: 'consult-brown',
    bgGradient: 'from-[#FDE7B3]/20 to-[#5B532C]/10',
    iconColor: 'text-[#5B532C]',
    borderColor: 'border-[#5B532C]/20',
  },
  {
    type: 'field' as MonitoringType,
    icon: Plane,
    title: 'Field Image (Drone)',
    description: 'Assess crop growth and field uniformity',
    color: 'consult-light-yellow',
    bgGradient: 'from-[#FDE7B3]/20 to-[#FDE7B3]/10',
    iconColor: 'text-[#63A361]',
    borderColor: 'border-[#FDE7B3]/20',
  },
];

const Monitoring: React.FC = () => {
  const [selectedType, setSelectedType] = useState<MonitoringType | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CropMonitoringResult | SoilMonitoringResult | ThermalMonitoringResult | FieldMonitoringResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxSize: DEFAULT_MAX_IMAGE_SIZE,
    disabled: isAnalyzing,
    onDrop: (acceptedFiles, rejectedFiles) => {
      setIsDragActive(false);
      if (rejectedFiles.length > 0) {
        const error = rejectedFiles[0].errors[0];
        setErrorMessage(
          error.code === 'file-too-large'
            ? 'File is too large. Maximum size is 10MB'
            : 'Invalid file type. Please upload a valid image.'
        );
        toast.error('Invalid file');
        return;
      }
      if (acceptedFiles.length > 0) {
        setErrorMessage(null);
        setSelectedType(null);
        setAnalysisResult(null);
        const reader = new FileReader();
        reader.onload = () => {
          setImage(reader.result as string);
        };
        reader.readAsDataURL(acceptedFiles[0]);
      }
    },
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const addProcessingStep = (step: string) => {
    setProcessingSteps((prev) => [...prev, step]);
  };

  const handleAnalysis = async (imageData: string, type: MonitoringType) => {
    if (!type || !imageData) return;

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      setAnalysisResult(null);
      setProcessingSteps([]);
      setCurrentStep(0);

      // Processing steps for monitoring analysis
      const steps = [
        { message: 'Preparing image for analysis...', duration: 800 },
        { message: 'Uploading to AI system...', duration: 1000 },
        { message: 'Running image recognition...', duration: 1500 },
        { message: 'Analyzing visual patterns...', duration: 1800 },
        { message: 'Generating insights...', duration: 1200 },
        { message: 'Finalizing report...', duration: 800 },
      ];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        setCurrentStep(i);
        addProcessingStep(step.message);
        await new Promise((r) => setTimeout(r, step.duration));
      }

      let result: CropMonitoringResult | SoilMonitoringResult | ThermalMonitoringResult | FieldMonitoringResult;

      switch (type) {
        case 'crop':
          result = await analyzeCropImage(imageData);
          break;
        case 'soil':
          result = await analyzeSoilImage(imageData);
          break;
        case 'thermal':
          result = await analyzeThermalImage(imageData);
          break;
        case 'field':
          result = await analyzeFieldImage(imageData);
          break;
        default:
          throw new Error('Invalid monitoring type');
      }

      addProcessingStep('Analysis complete!');
      setAnalysisResult(result);
      
      if (!isValidImage(result)) {
        toast.error('Invalid image detected');
      } else {
        toast.success('Analysis complete!');
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Analysis failed'
      );
      toast.error('Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTypeSelection = (type: MonitoringType) => {
    setSelectedType(type);
    if (image) {
      handleAnalysis(image, type);
    }
  };

  const resetAnalysis = () => {
    setImage(null);
    setAnalysisResult(null);
    setSelectedType(null);
    setErrorMessage(null);
    setProcessingSteps([]);
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <Toaster position="top-right" />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-[#5B532C] mb-4">
            Smart Monitoring System
          </h1>
          <p className="text-gray-600 text-lg">
            AI-powered agricultural monitoring for better farm management
          </p>
        </motion.div>

        {/* Upload Section - Show First */}
        <AnimatePresence mode="wait">
          {!image && !analysisResult && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-8"
            >
              <div className="p-8 bg-white rounded-2xl border border-[#5B532C]/10">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#5B532C]/10">
                  <div className="p-3 rounded-xl bg-[#63A361]">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#5B532C]">Upload Your Image</h2>
                    <p className="text-sm text-[#5B532C]/60">Start by uploading an image for AI analysis</p>
                  </div>
                </div>
                
                {/* Drop Zone */}
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <div
                    className={cn(
                      "p-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                    isDragActive
                        ? "border-[#63A361] bg-[#63A361]/5"
                        : "border-[#5B532C]/20 bg-[#FDE7B3]/10"
                    )}
                >
                  <div className="text-center">
                      <div className={cn(
                        "w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center",
                        isDragActive ? "bg-[#63A361]" : "bg-[#63A361]/10"
                      )}>
                        <Upload className={cn("w-8 h-8", isDragActive ? "text-white" : "text-[#63A361]")} />
                      </div>
                      <h3 className="text-lg font-bold text-[#5B532C] mb-2">
                        {isDragActive ? "Drop your image here" : "Upload Image for Monitoring"}
                    </h3>
                      <p className="text-[#5B532C]/60 mb-4 text-sm">
                      Drag & drop your image here, or click to browse
                    </p>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        {["JPEG", "PNG", "WebP"].map((format) => (
                          <span key={format} className="px-2 py-1 rounded text-xs font-medium bg-[#5B532C]/10 text-[#5B532C]">
                            {format}
                          </span>
                        ))}
                        <span className="px-2 py-1 rounded text-xs font-medium bg-[#63A361]/10 text-[#63A361]">
                          Max 10MB
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monitoring Types Preview */}
              <div className="mt-8 mb-6">
                <p className="text-center text-sm font-semibold text-[#5B532C]/60 mb-4">Analysis Types Available</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {MONITORING_TYPES.map((type) => (
                    <div
                      key={type.type}
                      className="p-4 rounded-xl bg-white border border-[#5B532C]/10 text-center"
                    >
                      <div className={cn(
                        "w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center",
                        type.type === 'crop' ? "bg-[#63A361]/10" :
                        type.type === 'soil' ? "bg-[#FFC50F]/10" :
                        type.type === 'thermal' ? "bg-red-100" :
                        "bg-blue-100"
                      )}>
                        <type.icon className={cn(
                          "w-6 h-6",
                          type.type === 'crop' ? "text-[#63A361]" :
                          type.type === 'soil' ? "text-[#FFC50F]" :
                          type.type === 'thermal' ? "text-red-500" :
                          "text-blue-500"
                        )} />
                      </div>
                      <h4 className="font-semibold text-[#5B532C] mb-1 text-sm">{type.title}</h4>
                      <p className="text-xs text-[#5B532C]/60">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features Preview Section */}
              <div className="space-y-6">
                {/* What You'll Get Section */}
                <div className="p-6 rounded-xl bg-[#FDE7B3]/10 border border-[#5B532C]/10">
                  <h3 className="text-center text-lg font-semibold text-[#5B532C] mb-6">
                    AI-Powered Insights Await
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                      { title: "Health Analysis", desc: "Disease detection & severity assessment", IconComp: Leaf },
                      { title: "Recommendations", desc: "Treatment plans & preventive measures", IconComp: Sparkles },
                      { title: "Visual Reports", desc: "Charts, metrics & confidence scores", IconComp: Mountain }
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl bg-white border border-[#5B532C]/10 text-center"
                      >
                        <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-[#63A361]/10 flex items-center justify-center">
                          <item.IconComp className="w-5 h-5 text-[#63A361]" />
                        </div>
                        <h4 className="font-semibold text-[#5B532C] mb-1">{item.title}</h4>
                        <p className="text-xs text-[#5B532C]/60">{item.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mock Results Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Mock Health Metrics */}
                    <div className="p-4 rounded-xl bg-white border border-[#5B532C]/10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[#63A361]/10 flex items-center justify-center">
                          <Leaf className="w-4 h-4 text-[#63A361]" />
                        </div>
                        <span className="font-semibold text-[#5B532C]">Health Metrics</span>
                      </div>
                      <div className="space-y-2">
                        {["Plant Health", "Leaf Condition", "Growth Stage"].map((label, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-xs text-[#5B532C]/60">{label}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-[#5B532C]/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#63A361] rounded-full"
                                  style={{ width: `${[85, 72, 90][i]}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-[#5B532C]/60">{[85, 72, 90][i]}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mock Detection */}
                    <div className="p-4 rounded-xl bg-white border border-[#5B532C]/10">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-[#FFC50F]/10 flex items-center justify-center">
                          <Mountain className="w-4 h-4 text-[#FFC50F]" />
                        </div>
                        <span className="font-semibold text-[#5B532C]">Detection Results</span>
                      </div>
                      <div className="space-y-2">
                        {["Primary Issue", "Severity", "Confidence"].map((label, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-xs text-[#5B532C]/60">{label}</span>
                            <div className="h-4 w-20 bg-[#5B532C]/10 rounded" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Type Selection - Show After Upload */}
          {image && !selectedType && !analysisResult && !isAnalyzing && (
            <motion.div
              key="type-selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-8"
            >
              <div className="p-8 bg-white rounded-2xl border border-[#5B532C]/10">
                {/* Image Preview Section */}
                <div className="flex flex-col md:flex-row gap-8 items-center mb-8 pb-8 border-b border-[#5B532C]/10">
                <img
                  src={image}
                  alt="Uploaded"
                    className="w-40 h-40 object-cover rounded-xl border border-[#5B532C]/10"
                  />
                  
                  <div className="flex-1 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#63A361]/10 text-[#63A361] text-sm font-medium mb-3">
                      <span className="w-2 h-2 rounded-full bg-[#63A361]" />
                      Image Ready
                    </div>
                    <h2 className="text-xl font-bold text-[#5B532C] mb-2">Choose Analysis Type</h2>
                    <p className="text-[#5B532C]/60 mb-4 text-sm">Select the type of monitoring for your image</p>
                    <button
                  onClick={resetAnalysis}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#5B532C] border border-[#5B532C]/20 bg-white"
                    >
                      <Upload className="w-4 h-4" />
                      Change Image
                    </button>
                  </div>
              </div>

                {/* Type Selection Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {MONITORING_TYPES.map((type) => (
                    <button
                    key={type.type}
                    onClick={() => handleTypeSelection(type.type)}
                    disabled={isAnalyzing}
                      className="p-5 rounded-xl border-2 border-[#5B532C]/10 bg-white text-center transition-colors hover:border-[#63A361] hover:bg-[#63A361]/5"
                    >
                      <div className={cn(
                        "w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center",
                        type.type === 'crop' ? "bg-[#63A361]/10" :
                        type.type === 'soil' ? "bg-[#FFC50F]/10" :
                        type.type === 'thermal' ? "bg-red-100" :
                        "bg-blue-100"
                      )}>
                        <type.icon className={cn(
                          "w-6 h-6",
                          type.type === 'crop' ? "text-[#63A361]" :
                          type.type === 'soil' ? "text-[#FFC50F]" :
                          type.type === 'thermal' ? "text-red-500" :
                          "text-blue-500"
                        )} />
                      </div>
                      <h3 className="font-semibold text-[#5B532C] mb-1">{type.title}</h3>
                      <p className="text-xs text-[#5B532C]/60">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Loading State with Processing Steps */}
          {isAnalyzing && selectedType && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto"
            >
                  <div className="bg-white rounded-2xl shadow-xl p-8 border border-[#63A361]/20">
                <div className="text-center mb-8">
                  <Loader className="w-16 h-16 mx-auto mb-4 text-[#63A361] animate-spin" />
                  <h3 className="text-2xl font-semibold text-[#5B532C] mb-2">
                    Analyzing {MONITORING_TYPES.find((t) => t.type === selectedType)?.title}
                  </h3>
                  <p className="text-[#5B532C]/70">AI processing in progress...</p>
                </div>

                {/* Processing Steps */}
                <div className="space-y-3">
                  {processingSteps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-[#FDE7B3]/10 rounded-lg border border-[#63A361]/10"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          index === currentStep
                            ? 'bg-[#63A361] animate-pulse'
                            : index < currentStep
                            ? 'bg-[#63A361]'
                            : 'bg-gray-300'
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          index <= currentStep
                            ? 'text-[#5B532C] font-medium'
                            : 'text-[#5B532C]/40'
                        }`}
                      >
                        {step}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Results */}
          {analysisResult && !isAnalyzing && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {isValidImage(analysisResult) ? (
                <>
                  {selectedType === 'crop' && (
                    <CropMonitoringResultComponent
                      result={analysisResult as CropMonitoringResult}
                      image={image}
                      onRetry={resetAnalysis}
                    />
                  )}
                  {selectedType === 'soil' && (
                    <SoilMonitoringResultComponent
                      result={analysisResult as SoilMonitoringResult}
                      image={image}
                      onRetry={resetAnalysis}
                    />
                  )}
                  {selectedType === 'thermal' && (
                    <ThermalMonitoringResultComponent
                      result={analysisResult as ThermalMonitoringResult}
                      image={image}
                      onRetry={resetAnalysis}
                    />
                  )}
                  {selectedType === 'field' && (
                    <FieldMonitoringResultComponent
                      result={analysisResult as FieldMonitoringResult}
                      image={image}
                      onRetry={resetAnalysis}
                    />
                  )}
                </>
              ) : (
                <InvalidImageResult onRetry={resetAnalysis} message={analysisResult.analysisSummary} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
          >
            {errorMessage}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Monitoring;
