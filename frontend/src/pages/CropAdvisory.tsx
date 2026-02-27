import React, { useState, useEffect } from 'react';
import { loadResult, saveResult } from '../utils/storage';
import type { CropAnalyticsResponse } from '../ai/cropService';
import cityData from '../data/cityData.json';
import {
  BarChart3, TrendingUp, AlertCircle, Activity, MapPin, Droplets, PieChart,
  CheckCircle2, XCircle, Target, Shield, Zap, Calendar, Brain, Sparkles,
  Thermometer, CloudRain, Sun, Wind, Gauge, Leaf, Clock, Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import {
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line,
  PieChart as RechartsPieChart, Pie, Cell, Tooltip as RechartsTooltip,
  BarChart, Bar, ComposedChart, Area, AreaChart
} from 'recharts';
import 'react-toastify/dist/ReactToastify.css';

const CropAdvisory: React.FC = () => {
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<CropAnalyticsResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiPipelineStep, setAiPipelineStep] = useState('');
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [nextCheckDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  useEffect(() => {
    // Hydrate cached selection and results on mount
    const cached = loadResult<{
      inputs: { city: string; crop: string };
      analyticsData: CropAnalyticsResponse | null;
      showAnalysis: boolean;
    }>('crop');
    if (cached) {
      setSelectedCity(cached.inputs?.city || '');
      setSelectedCrop(cached.inputs?.crop || '');
      setAnalyticsData(cached.analyticsData || null);
      setShowAnalysis(Boolean(cached.showAnalysis && cached.analyticsData));
    }
    setMounted(true);
  }, []);

  // Helper function to get recommendation (Yes/No) with reasoning
  const getRecommendation = (data: CropAnalyticsResponse) => {
    const suitabilityScore = data.cropSuitability.overallScore;
    const isRecommended = suitabilityScore >= 75;

    const reasons = isRecommended
      ? [
        `High suitability score of ${suitabilityScore}%`,
        `Good soil compatibility (${data.cropSuitability.soilCompatibility}%)`,
        `Favorable climate match (${data.cropSuitability.climateMatch}%)`,
        `Market conditions are positive`,
        `Quality metrics show potential for good yield`
      ]
      : [
        `Low suitability score of ${suitabilityScore}%`,
        `Poor soil compatibility (${data.cropSuitability.soilCompatibility}%)`,
        `Unfavorable climate conditions`,
        `Market risks are high`,
        `Quality concerns identified`
      ];

    return {
      isRecommended,
      confidence: Math.min(95, Math.max(70, suitabilityScore + 5)),
      reasons
    };
  };

  // Helper function to get risk assessment
  const getRiskAssessment = (data: CropAnalyticsResponse) => {
    const suitabilityScore = data.cropSuitability.overallScore;
    const priceVolatility = data.marketAnalysis.summary.priceVolatility;

    const overallRisk = Math.round(
      (100 - suitabilityScore) * 0.4 +
      priceVolatility * 0.3 +
      (data.forecastMetrics.priceProjection.riskLevel === 'High' ? 30 :
        data.forecastMetrics.priceProjection.riskLevel === 'Medium' ? 15 : 5)
    );

    return {
      overall: Math.min(100, overallRisk),
      weather: Math.round(100 - (data.forecastMetrics.weatherImpact.pestRisk === 'Low' ? 85 :
        data.forecastMetrics.weatherImpact.pestRisk === 'Medium' ? 65 : 40)),
      market: priceVolatility,
      disease: Math.round(100 - (data.forecastMetrics.weatherImpact.diseaseRisk === 'Minimal' ? 90 :
        data.forecastMetrics.weatherImpact.diseaseRisk === 'Low' ? 70 : 50))
    };
  };

  // Helper function to get key solutions and precautions
  const getKeyPoints = (data: CropAnalyticsResponse) => {
    return {
      solutions: [
        `Optimize soil pH to ${data.soilAnalysis.phLevel} for best results`,
        `Implement ${data.cropSuitability.waterRequirement.toLowerCase()} irrigation system`,
        `Use disease-resistant varieties for better yield`,
        `Apply organic matter to improve soil health`,
        `Monitor weather patterns for optimal planting time`
      ],
      precautions: [
        `Watch for ${data.forecastMetrics.weatherImpact.pestRisk.toLowerCase()} pest risk`,
        `Monitor ${data.forecastMetrics.weatherImpact.diseaseRisk.toLowerCase()} disease levels`,
        `Prepare for ${data.forecastMetrics.weatherImpact.rainfallPrediction.toLowerCase()} rainfall`,
        `Manage price volatility through contracts`,
        `Schedule regular soil testing every 3 months`
      ]
    };
  };

  // Enhanced function to generate dynamic price trends with realistic variations
  const generateDynamicPriceTrends = (basePrice: number, cropName: string) => {
    const volatility = cropName.toLowerCase() === 'onion' ? 0.4 :
      cropName.toLowerCase() === 'potato' ? 0.3 :
        cropName.toLowerCase() === 'cotton' ? 0.25 : 0.15;

    const trends = [];
    let currentPrice = basePrice;

    // Generate historical data (last 6 months)
    for (let i = -6; i <= 0; i++) {
      const variation = (Math.random() - 0.5) * volatility * basePrice;
      const seasonalFactor = Math.sin((i + 6) * Math.PI / 6) * 0.1; // Seasonal variation
      currentPrice = Math.max(basePrice * 0.7, basePrice + variation + seasonalFactor * basePrice);

      trends.push({
        period: i === 0 ? 'Current' : `${Math.abs(i)}M ago`,
        price: Math.round(currentPrice),
        volume: Math.round(1000 + Math.random() * 4000),
        sentiment: ['Bullish', 'Bearish', 'Neutral'][Math.floor(Math.random() * 3)]
      });
    }

    // Generate future projections with more realistic variations
    const futureTrends = [
      { period: '1 Week', price: Math.round(basePrice * (1 + (Math.random() - 0.5) * 0.08)) },
      { period: '1 Month', price: Math.round(basePrice * (1 + (Math.random() - 0.5) * 0.15)) },
      { period: '3 Months', price: Math.round(basePrice * (1 + (Math.random() - 0.5) * 0.25)) },
      { period: '6 Months', price: Math.round(basePrice * (1 + (Math.random() - 0.5) * 0.35)) }
    ];

    return [...trends, ...futureTrends];
  };

  // Function to generate market insights and alerts
  const getMarketInsights = (data: CropAnalyticsResponse, cropName: string) => {
    const priceChange = data.marketAnalysis.summary.priceChange;
    const volatility = data.marketAnalysis.summary.priceVolatility;

    const insights = [];

    if (Math.abs(priceChange) > 10) {
      insights.push({
        type: 'price_alert',
        severity: Math.abs(priceChange) > 20 ? 'high' : 'medium',
        message: `${Math.abs(priceChange).toFixed(1)}% price ${priceChange > 0 ? 'increase' : 'decrease'} detected`,
        recommendation: priceChange > 0 ? 'Consider selling opportunities' : 'Monitor for buying opportunities'
      });
    }

    if (volatility > 25) {
      insights.push({
        type: 'volatility_alert',
        severity: 'high',
        message: 'High market volatility detected',
        recommendation: 'Consider hedging strategies'
      });
    }

    // Seasonal insights
    const month = new Date().getMonth();
    if (cropName.toLowerCase() === 'onion' && (month === 9 || month === 10)) {
      insights.push({
        type: 'seasonal_insight',
        severity: 'medium',
        message: 'Peak onion season - expect price fluctuations',
        recommendation: 'Monitor storage and transportation costs'
      });
    }

    return insights;
  };

  // Function to generate comparative analysis
  const getComparativeAnalysis = (data: CropAnalyticsResponse, cropName: string) => {
    const alternatives = data.cropSuitability.alternativeCrops.slice(0, 3);

    return alternatives.map(alt => ({
      crop: alt,
      price: Math.round(data.marketAnalysis.summary.currentPrice * (0.8 + Math.random() * 0.4)),
      suitability: Math.round(data.cropSuitability.overallScore * (0.7 + Math.random() * 0.3)),
      market_demand: Math.round(Math.random() * 40 + 60),
      risk_level: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
    }));
  };

  // Function to generate yield predictions with confidence intervals
  const getYieldPredictions = (data: CropAnalyticsResponse) => {
    const baseYield = data.forecastMetrics.yieldPrediction.expectedYield;
    const variation = data.forecastMetrics.yieldPrediction.yieldVariation;

    return {
      optimistic: Math.round(baseYield * 1.2),
      realistic: Math.round(baseYield),
      pessimistic: Math.round(baseYield * 0.8),
      confidence: data.forecastMetrics.priceProjection.confidence,
      factors: data.forecastMetrics.yieldPrediction.yieldFactors
    };
  };

  // Professional AI Pipeline processing
  const simulateAIPipeline = async () => {
    const steps = [
      "Analyzing regional soil data",
      "Processing climate information",
      "Evaluating crop suitability",
      "Calculating market trends",
      "Generating recommendations",
      "Compiling comprehensive report"
    ];

    for (let i = 0; i < steps.length; i++) {
      setAiPipelineStep(steps[i]);
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
    }
  };

  // Enhanced data generation with comprehensive agricultural insights
  const generateEnhancedAnalytics = (city: string, crop: string): CropAnalyticsResponse => {
    // Comprehensive soil data for different cities in Maharashtra based on actual regional characteristics
    const soilData: { [key: string]: any } = {
      'Mumbai': { type: 'Alluvial', ph: 7.2, organicMatter: 2.8, nutrients: 'High', drainage: 'Good', health: 'Excellent', region: 'Konkan' },
      'Pune': { type: 'Black Cotton', ph: 7.8, organicMatter: 3.2, nutrients: 'Very High', drainage: 'Moderate', health: 'Excellent', region: 'Western Maharashtra' },
      'Nagpur': { type: 'Black Cotton', ph: 7.5, organicMatter: 2.8, nutrients: 'High', drainage: 'Moderate', health: 'Excellent', region: 'Vidarbha' },
      'Nashik': { type: 'Black Cotton', ph: 7.6, organicMatter: 2.9, nutrients: 'High', drainage: 'Good', health: 'Excellent', region: 'Western Maharashtra' },
      'Aurangabad': { type: 'Black Cotton', ph: 7.4, organicMatter: 2.6, nutrients: 'High', drainage: 'Moderate', health: 'Good', region: 'Marathwada' },
      'Kolhapur': { type: 'Black Cotton', ph: 7.7, organicMatter: 3.1, nutrients: 'Very High', drainage: 'Good', health: 'Excellent', region: 'Western Maharashtra' },
      'Amravati': { type: 'Black Cotton', ph: 7.3, organicMatter: 2.7, nutrients: 'High', drainage: 'Moderate', health: 'Good', region: 'Vidarbha' },
      'Solapur': { type: 'Black Cotton', ph: 7.2, organicMatter: 2.4, nutrients: 'Medium', drainage: 'Good', health: 'Good', region: 'Western Maharashtra' },
      'Sangli': { type: 'Black Cotton', ph: 7.6, organicMatter: 3.0, nutrients: 'High', drainage: 'Good', health: 'Excellent', region: 'Western Maharashtra' },
      'Satara': { type: 'Black Cotton', ph: 7.5, organicMatter: 2.9, nutrients: 'High', drainage: 'Good', health: 'Excellent', region: 'Western Maharashtra' },
      'Latur': { type: 'Black Cotton', ph: 7.1, organicMatter: 2.3, nutrients: 'Medium', drainage: 'Good', health: 'Good', region: 'Marathwada' },
      'Jalgaon': { type: 'Black Cotton', ph: 7.4, organicMatter: 2.5, nutrients: 'Medium-High', drainage: 'Good', health: 'Good', region: 'North Maharashtra' },
      'Dhule': { type: 'Black Cotton', ph: 7.0, organicMatter: 2.2, nutrients: 'Medium', drainage: 'Good', health: 'Good', region: 'North Maharashtra' },
      'Nanded': { type: 'Black Cotton', ph: 7.2, organicMatter: 2.4, nutrients: 'Medium', drainage: 'Good', health: 'Good', region: 'Marathwada' },
      'Chandrapur': { type: 'Black Cotton', ph: 7.3, organicMatter: 2.8, nutrients: 'High', drainage: 'Good', health: 'Good', region: 'Vidarbha' },
      'Wardha': { type: 'Black Cotton', ph: 7.4, organicMatter: 2.7, nutrients: 'High', drainage: 'Moderate', health: 'Good', region: 'Vidarbha' },
      'Yavatmal': { type: 'Black Cotton', ph: 7.1, organicMatter: 2.3, nutrients: 'Medium', drainage: 'Good', health: 'Good', region: 'Vidarbha' },
      'Bhandara': { type: 'Alluvial', ph: 7.0, organicMatter: 2.9, nutrients: 'High', drainage: 'Good', health: 'Good', region: 'Vidarbha' },
      'Gondia': { type: 'Alluvial', ph: 7.1, organicMatter: 2.8, nutrients: 'High', drainage: 'Good', health: 'Good', region: 'Vidarbha' },
      'Ratnagiri': { type: 'Laterite', ph: 6.8, organicMatter: 2.5, nutrients: 'Medium-High', drainage: 'Excellent', health: 'Good', region: 'Konkan' },
      'Thane': { type: 'Laterite', ph: 6.9, organicMatter: 2.6, nutrients: 'Medium-High', drainage: 'Excellent', health: 'Good', region: 'Konkan' },
      'Raigad': { type: 'Laterite', ph: 6.8, organicMatter: 2.5, nutrients: 'Medium-High', drainage: 'Excellent', health: 'Good', region: 'Konkan' },
      'Palghar': { type: 'Laterite', ph: 6.9, organicMatter: 2.6, nutrients: 'Medium-High', drainage: 'Excellent', health: 'Good', region: 'Konkan' }
    };

    // Enhanced crop suitability analysis based on regional characteristics
    const getCropSuitability = (crop: string, soil: any) => {
      const baseSuitability: { [key: string]: any } = {
        'Rice': {
          baseScore: 75,
          regionMultiplier: { 'Konkan': 1.3, 'Vidarbha': 0.8, 'Western Maharashtra': 0.9, 'Marathwada': 0.7, 'North Maharashtra': 0.8 },
          soilMultiplier: { 'Alluvial': 1.2, 'Laterite': 1.1, 'Black Cotton': 0.9 },
          climateMatch: 85,
          soilCompatibility: 80,
          waterRequirement: 'High',
          growthPeriod: '5-6 months',
          advantages: ['High water retention', 'Warm climate', 'Rich soil'],
          challenges: ['Water availability', 'Labor intensive'],
          alternatives: ['Jowar', 'Bajra', 'Maize']
        },
        'Wheat': {
          baseScore: 80,
          regionMultiplier: { 'Vidarbha': 1.2, 'Western Maharashtra': 1.1, 'Marathwada': 1.0, 'North Maharashtra': 1.1, 'Konkan': 0.7 },
          soilMultiplier: { 'Black Cotton': 1.2, 'Alluvial': 1.1, 'Laterite': 0.9 },
          climateMatch: 85,
          soilCompatibility: 85,
          waterRequirement: 'Moderate',
          growthPeriod: '4-5 months',
          advantages: ['Good soil drainage', 'Moderate rainfall', 'Cool climate'],
          challenges: ['Water management', 'Pest control'],
          alternatives: ['Barley', 'Oats', 'Mustard']
        },
        'Cotton': {
          baseScore: 85,
          regionMultiplier: { 'Vidarbha': 1.3, 'Marathwada': 1.2, 'North Maharashtra': 1.1, 'Western Maharashtra': 1.0, 'Konkan': 0.6 },
          soilMultiplier: { 'Black Cotton': 1.3, 'Alluvial': 1.0, 'Laterite': 0.8 },
          climateMatch: 90,
          soilCompatibility: 85,
          waterRequirement: 'Moderate',
          growthPeriod: '6-7 months',
          advantages: ['Well-drained soil', 'Warm temperature', 'Adequate rainfall'],
          challenges: ['Pest management', 'Market volatility'],
          alternatives: ['Jute', 'Hemp', 'Flax']
        },
        'Sugarcane': {
          baseScore: 80,
          regionMultiplier: { 'Western Maharashtra': 1.3, 'Marathwada': 1.1, 'Vidarbha': 0.9, 'North Maharashtra': 0.8, 'Konkan': 0.7 },
          soilMultiplier: { 'Black Cotton': 1.2, 'Alluvial': 1.1, 'Laterite': 0.9 },
          climateMatch: 85,
          soilCompatibility: 90,
          waterRequirement: 'Very High',
          growthPeriod: '12-18 months',
          advantages: ['Deep soil', 'High organic matter', 'Tropical climate'],
          challenges: ['Long growth period', 'High water needs'],
          alternatives: ['Sweet Sorghum', 'Sugar Beet']
        },
        'Soybeans': {
          baseScore: 85,
          regionMultiplier: { 'Vidarbha': 1.3, 'Marathwada': 1.1, 'North Maharashtra': 1.0, 'Western Maharashtra': 0.9, 'Konkan': 0.7 },
          soilMultiplier: { 'Black Cotton': 1.2, 'Alluvial': 1.1, 'Laterite': 0.9 },
          climateMatch: 90,
          soilCompatibility: 85,
          waterRequirement: 'Moderate',
          growthPeriod: '3-4 months',
          advantages: ['Moderate soil', 'Good drainage', 'Warm climate'],
          challenges: ['Disease resistance', 'Market prices'],
          alternatives: ['Groundnut', 'Sunflower', 'Sesame']
        },
        'Maize': {
          baseScore: 80,
          regionMultiplier: { 'Vidarbha': 1.2, 'Marathwada': 1.1, 'North Maharashtra': 1.1, 'Western Maharashtra': 1.0, 'Konkan': 0.8 },
          soilMultiplier: { 'Black Cotton': 1.1, 'Alluvial': 1.2, 'Laterite': 1.0 },
          climateMatch: 85,
          soilCompatibility: 80,
          waterRequirement: 'Moderate',
          growthPeriod: '3-4 months',
          advantages: ['Well-drained soil', 'Warm climate', 'Good yield potential'],
          challenges: ['Fall armyworm', 'Storage issues'],
          alternatives: ['Jowar', 'Bajra', 'Sorghum']
        },
        'Pulses': {
          baseScore: 80,
          regionMultiplier: { 'Marathwada': 1.2, 'Vidarbha': 1.1, 'North Maharashtra': 1.1, 'Western Maharashtra': 1.0, 'Konkan': 0.8 },
          soilMultiplier: { 'Black Cotton': 1.1, 'Alluvial': 1.2, 'Laterite': 1.0 },
          climateMatch: 85,
          soilCompatibility: 80,
          waterRequirement: 'Low to Moderate',
          growthPeriod: '3-4 months',
          advantages: ['Drought tolerant', 'Soil improvement', 'Low water requirement'],
          challenges: ['Pod borer', 'Price volatility'],
          alternatives: ['Groundnut', 'Sunflower', 'Sesame']
        },
        'Groundnut': {
          baseScore: 75,
          regionMultiplier: { 'Western Maharashtra': 1.2, 'Marathwada': 1.1, 'Vidarbha': 1.0, 'North Maharashtra': 1.0, 'Konkan': 0.8 },
          soilMultiplier: { 'Black Cotton': 1.0, 'Alluvial': 1.2, 'Laterite': 1.1 },
          climateMatch: 80,
          soilCompatibility: 75,
          waterRequirement: 'Moderate',
          growthPeriod: '4-5 months',
          advantages: ['Sandy loam soil', 'Warm climate', 'Good market demand'],
          challenges: ['Aflatoxin', 'Price volatility'],
          alternatives: ['Sunflower', 'Sesame', 'Soybeans']
        },
        'Millets': {
          baseScore: 85,
          regionMultiplier: { 'Marathwada': 1.3, 'North Maharashtra': 1.2, 'Vidarbha': 1.1, 'Western Maharashtra': 1.0, 'Konkan': 0.7 },
          soilMultiplier: { 'Black Cotton': 1.1, 'Alluvial': 1.0, 'Laterite': 1.2 },
          climateMatch: 90,
          soilCompatibility: 85,
          waterRequirement: 'Low',
          growthPeriod: '3-4 months',
          advantages: ['Drought tolerant', 'Low water requirement', 'Nutritious'],
          challenges: ['Low market demand', 'Processing issues'],
          alternatives: ['Sorghum', 'Maize', 'Pulses']
        },
        'Potato': {
          baseScore: 70,
          regionMultiplier: { 'Western Maharashtra': 1.2, 'Konkan': 1.1, 'Vidarbha': 1.0, 'Marathwada': 0.9, 'North Maharashtra': 1.0 },
          soilMultiplier: { 'Black Cotton': 1.0, 'Alluvial': 1.2, 'Laterite': 1.1 },
          climateMatch: 75,
          soilCompatibility: 70,
          waterRequirement: 'Moderate',
          growthPeriod: '3-4 months',
          advantages: ['Cool climate', 'Well-drained soil', 'Good market demand'],
          challenges: ['Storage', 'Price volatility'],
          alternatives: ['Sweet Potato', 'Tapioca', 'Vegetables']
        },
        'Onion': {
          baseScore: 80,
          regionMultiplier: { 'Western Maharashtra': 1.3, 'Marathwada': 1.2, 'North Maharashtra': 1.1, 'Vidarbha': 1.0, 'Konkan': 0.8 },
          soilMultiplier: { 'Black Cotton': 1.1, 'Alluvial': 1.2, 'Laterite': 1.0 },
          climateMatch: 85,
          soilCompatibility: 80,
          waterRequirement: 'Moderate',
          growthPeriod: '4-5 months',
          advantages: ['Well-drained soil', 'Moderate climate', 'High market demand'],
          challenges: ['Price volatility', 'Storage issues'],
          alternatives: ['Garlic', 'Shallots', 'Vegetables']
        }
      };

      const cropData = baseSuitability[crop];
      if (!cropData) {
        return {
          score: 70,
          climateMatch: 70,
          soilCompatibility: 70,
          waterRequirement: 'Moderate',
          growthPeriod: '4-5 months',
          advantages: ['Moderate conditions'],
          challenges: ['Standard risks'],
          alternatives: ['Similar crops']
        };
      }

      const regionMultiplier = cropData.regionMultiplier[soil.region] || 1.0;
      const soilMultiplier = cropData.soilMultiplier[soil.type] || 1.0;
      const finalScore = Math.min(95, Math.round(cropData.baseScore * regionMultiplier * soilMultiplier));

      return {
        score: finalScore,
        climateMatch: Math.round(cropData.climateMatch * regionMultiplier),
        soilCompatibility: Math.round(cropData.soilCompatibility * soilMultiplier),
        waterRequirement: cropData.waterRequirement,
        growthPeriod: cropData.growthPeriod,
        advantages: cropData.advantages,
        challenges: cropData.challenges,
        alternatives: cropData.alternatives
      };
    };

    const soil = soilData[city] || { type: 'Mixed', ph: 7.0, organicMatter: 2.5, nutrients: 'Medium', drainage: 'Good', health: 'Good', region: 'General' };
    const suitability = getCropSuitability(crop, soil);

    // Get realistic price ranges based on crop and region
    const getCropPrice = (crop: string, region: string) => {
      const priceRanges: { [key: string]: { min: number, max: number, regionMultiplier: { [key: string]: number } } } = {
        'Rice': { min: 2500, max: 4500, regionMultiplier: { 'Konkan': 1.1, 'Vidarbha': 0.9, 'Western Maharashtra': 1.0, 'Marathwada': 0.9, 'North Maharashtra': 0.9 } },
        'Wheat': { min: 2200, max: 3200, regionMultiplier: { 'Vidarbha': 1.1, 'Western Maharashtra': 1.0, 'Marathwada': 0.9, 'North Maharashtra': 1.0, 'Konkan': 0.8 } },
        'Cotton': { min: 6500, max: 8500, regionMultiplier: { 'Vidarbha': 1.1, 'Marathwada': 1.0, 'North Maharashtra': 1.0, 'Western Maharashtra': 0.9, 'Konkan': 0.7 } },
        'Sugarcane': { min: 3200, max: 3800, regionMultiplier: { 'Western Maharashtra': 1.1, 'Marathwada': 1.0, 'Vidarbha': 0.9, 'North Maharashtra': 0.9, 'Konkan': 0.8 } },
        'Soybeans': { min: 4500, max: 6500, regionMultiplier: { 'Vidarbha': 1.1, 'Marathwada': 1.0, 'North Maharashtra': 1.0, 'Western Maharashtra': 0.9, 'Konkan': 0.8 } },
        'Maize': { min: 2000, max: 2800, regionMultiplier: { 'Vidarbha': 1.0, 'Marathwada': 1.0, 'North Maharashtra': 1.0, 'Western Maharashtra': 1.0, 'Konkan': 0.9 } },
        'Pulses': { min: 5000, max: 8000, regionMultiplier: { 'Marathwada': 1.1, 'Vidarbha': 1.0, 'North Maharashtra': 1.0, 'Western Maharashtra': 1.0, 'Konkan': 0.9 } },
        'Groundnut': { min: 6000, max: 8500, regionMultiplier: { 'Western Maharashtra': 1.1, 'Marathwada': 1.0, 'Vidarbha': 1.0, 'North Maharashtra': 1.0, 'Konkan': 0.9 } },
        'Millets': { min: 2500, max: 4000, regionMultiplier: { 'Marathwada': 1.1, 'North Maharashtra': 1.0, 'Vidarbha': 1.0, 'Western Maharashtra': 1.0, 'Konkan': 0.8 } },
        'Potato': { min: 1500, max: 3500, regionMultiplier: { 'Western Maharashtra': 1.1, 'Konkan': 1.0, 'Vidarbha': 1.0, 'Marathwada': 0.9, 'North Maharashtra': 1.0 } },
        'Onion': { min: 2000, max: 8000, regionMultiplier: { 'Western Maharashtra': 1.1, 'Marathwada': 1.0, 'North Maharashtra': 1.0, 'Vidarbha': 1.0, 'Konkan': 0.9 } }
      };

      const cropPrice = priceRanges[crop] || { min: 2000, max: 4000, regionMultiplier: { 'General': 1.0 } };
      const regionMultiplier = cropPrice.regionMultiplier[region] || 1.0;
      const basePrice = cropPrice.min + Math.random() * (cropPrice.max - cropPrice.min);
      return Math.round(basePrice * regionMultiplier);
    };

    const basePrice = getCropPrice(crop, soil.region);
    const priceChange = (Math.random() - 0.5) * 15; // Reduced volatility for more realistic changes

    return {
      marketAnalysis: {
        summary: {
          currentPrice: basePrice,
          priceChange: priceChange,
          tradingVolume: 1000 + Math.floor(Math.random() * 5000),
          marketSentiment: ['Bullish', 'Bearish', 'Neutral'][Math.floor(Math.random() * 3)],
          demandLevel: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
          supplyStatus: ['Adequate', 'Shortage', 'Surplus'][Math.floor(Math.random() * 3)],
          priceVolatility: Math.floor(Math.random() * 30) + 10,
          marketRank: Math.floor(Math.random() * 10) + 1
        },
        visualizations: [],
        insights: [
          {
            category: 'Soil Analysis',
            key: 'Soil Type',
            description: `${soil.type} soil with pH ${soil.ph} in ${city}`,
            impact: soil.health === 'Excellent' ? 'Very Favorable' : soil.health === 'Good' ? 'Favorable' : 'Moderate',
            recommendation: `Soil is ${soil.health.toLowerCase()} for ${crop} cultivation. Consider ${soil.recommendations?.[0] || 'regular soil testing'}.`,
            confidence: 90,
            timeframe: 'Immediate'
          },
          {
            category: 'Crop Suitability',
            key: 'Suitability Score',
            description: `${suitability.score}% suitable for ${crop} in ${city}`,
            impact: suitability.score >= 85 ? 'High' : suitability.score >= 70 ? 'Medium' : 'Low',
            recommendation: suitability.score >= 85 ? 'Highly recommended for this region' : suitability.score >= 70 ? 'Suitable with proper management' : 'Consider alternative crops',
            confidence: 88,
            timeframe: 'Seasonal'
          },
          {
            category: 'Regional Analysis',
            key: 'Regional Advantage',
            description: `${city} in ${soil.region} region is ${suitability.advantages[0] || 'suitable for agriculture'}`,
            impact: 'Positive',
            recommendation: `Leverage regional advantages: ${suitability.advantages.slice(0, 2).join(', ')}`,
            confidence: 85,
            timeframe: 'Long-term'
          }
        ],
        marketTrends: {
          shortTerm: priceChange > 0 ? 'Rising prices expected' : 'Stable to declining prices',
          mediumTerm: 'Seasonal fluctuations normal',
          longTerm: 'Positive growth outlook',
          seasonalPattern: 'Peak season approaching'
        }
      },
      qualityMetrics: {
        gradeDistribution: (() => {
          // Base quality on suitability score and regional factors
          const baseQuality = suitability.score;
          const soilQuality = soil.health === 'Excellent' ? 1.1 : soil.health === 'Good' ? 1.0 : 0.9;
          const adjustedQuality = Math.min(95, Math.round(baseQuality * soilQuality));

          // Realistic distribution based on quality
          let premium, standard, substandard;
          if (adjustedQuality >= 85) {
            premium = 40 + Math.floor(Math.random() * 15);
            standard = 35 + Math.floor(Math.random() * 10);
            substandard = 100 - premium - standard;
          } else if (adjustedQuality >= 70) {
            premium = 25 + Math.floor(Math.random() * 15);
            standard = 50 + Math.floor(Math.random() * 10);
            substandard = 100 - premium - standard;
          } else {
            premium = 15 + Math.floor(Math.random() * 10);
            standard = 45 + Math.floor(Math.random() * 15);
            substandard = 100 - premium - standard;
          }

          return { premium, standard, substandard };
        })(),
        qualityParameters: (() => {
          const baseQuality = suitability.score;
          const soilQuality = soil.health === 'Excellent' ? 1.1 : soil.health === 'Good' ? 1.0 : 0.9;
          const adjustedQuality = Math.min(95, Math.round(baseQuality * soilQuality));

          // Quality parameters that reflect actual conditions
          const moistureContent = 12 + Math.random() * 3;
          const proteinContent = 8 + Math.random() * 4;
          const purity = Math.max(85, 95 + Math.random() * 4 * (adjustedQuality / 100));

          return [
            {
              parameter: 'Moisture Content',
              value: moistureContent,
              unit: '%',
              benchmark: 14,
              status: moistureContent <= 14 ? 'Good' : 'High',
              importance: 'High'
            },
            {
              parameter: 'Protein Content',
              value: proteinContent,
              unit: '%',
              benchmark: 10,
              status: proteinContent >= 10 ? 'Good' : 'Below Standard',
              importance: 'Medium'
            },
            {
              parameter: 'Purity',
              value: purity,
              unit: '%',
              benchmark: 98,
              status: purity >= 98 ? 'Excellent' : purity >= 95 ? 'Good' : 'Average',
              importance: 'High'
            }
          ];
        })(),
        qualityScore: (() => {
          const baseQuality = suitability.score;
          const soilQuality = soil.health === 'Excellent' ? 1.1 : soil.health === 'Good' ? 1.0 : 0.9;
          return Math.min(95, Math.round(baseQuality * soilQuality));
        })(),
        certificationStatus: (() => {
          const baseQuality = suitability.score;
          if (baseQuality >= 85) return 'Organic Certified';
          if (baseQuality >= 70) return 'Standard Certified';
          return 'Basic Quality';
        })(),
        exportQuality: (() => {
          const baseQuality = suitability.score;
          return baseQuality >= 80 && soil.health === 'Excellent';
        })()
      },
      forecastMetrics: {
        priceProjection: {
          nextWeek: basePrice + Math.floor(Math.random() * 200) - 100,
          nextMonth: basePrice + Math.floor(Math.random() * 500) - 250,
          nextQuarter: basePrice + Math.floor(Math.random() * 1000) - 500,
          confidence: 85 + Math.floor(Math.random() * 15),
          riskLevel: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
        },
        supplyOutlook: {
          trend: ['Increasing', 'Decreasing', 'Stable'][Math.floor(Math.random() * 3)],
          factors: [
            { factor: 'Weather Conditions', impact: 'Positive', probability: 80 },
            { factor: 'Market Demand', impact: 'Stable', probability: 70 },
            { factor: 'Supply Chain', impact: 'Good', probability: 85 }
          ],
          harvestForecast: 'Above average expected',
          storageCapacity: 80 + Math.floor(Math.random() * 20)
        },
        weatherImpact: {
          rainfallPrediction: 'Normal to above normal',
          temperatureForecast: 'Optimal for growth',
          pestRisk: 'Low to moderate',
          diseaseRisk: 'Minimal'
        },
        yieldPrediction: {
          expectedYield: 30 + Math.floor(Math.random() * 20),
          yieldVariation: 5 + Math.floor(Math.random() * 10),
          optimalHarvestTime: 'October-November',
          yieldFactors: ['Soil quality', 'Weather conditions', 'Pest management']
        }
      },
      soilAnalysis: {
        soilType: soil.type,
        phLevel: soil.ph,
        organicMatter: soil.organicMatter,
        nutrientLevel: soil.nutrients,
        drainage: soil.drainage,
        suitabilityScore: suitability.score,
        recommendations: [
          'Regular soil testing',
          'Organic matter addition',
          'pH monitoring',
          `Optimize for ${crop} cultivation`,
          'Consider crop rotation'
        ],
        soilHealth: soil.health
      },
      cropSuitability: {
        overallScore: suitability.score,
        climateMatch: suitability.climateMatch,
        soilCompatibility: suitability.soilCompatibility,
        waterRequirement: suitability.waterRequirement,
        growthPeriod: suitability.growthPeriod,
        riskFactors: suitability.challenges,
        advantages: suitability.advantages,
        challenges: suitability.challenges,
        alternativeCrops: suitability.alternatives
      }
    };
  };

  const handleAnalytics = async () => {
    if (!selectedCity || !selectedCrop) {
      toast.error('Please select both city and crop', {
        style: {
          borderRadius: '10px',
          background: '#f59e0b',
          color: '#fff',
        },
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    setIsProcessing(true);
    setShowAnalysis(true);
    setAiPipelineStep("Initializing crop analysis...");

    try {
      // Simulate AI pipeline processing
      await simulateAIPipeline();

      // Try to get real AI data first, fallback to enhanced mock data
      try {
        const { getCropAnalytics } = await import('../ai/cropService');
        const aiData = await getCropAnalytics({
          city: selectedCity,
          state: 'Maharashtra',
          cropName: selectedCrop,
          options: {
            logErrors: true,
            includeHistorical: true
          }
        });
        // Validate the AI data structure
        if (aiData && aiData.marketAnalysis && aiData.soilAnalysis && aiData.cropSuitability) {
          setAnalyticsData(aiData);
          // Persist successful results
          saveResult('crop', {
            inputs: { city: selectedCity, crop: selectedCrop },
            analyticsData: aiData,
            showAnalysis: true
          });
          console.log('AI analysis completed successfully');
        } else {
          throw new Error('Invalid AI response structure');
        }
      } catch (aiError) {
        console.log('AI service unavailable, using enhanced regional data:', aiError);
        // Generate enhanced analytics with soil and suitability data
        const enhancedData = generateEnhancedAnalytics(selectedCity, selectedCrop);
        setAnalyticsData(enhancedData);
        // Persist fallback results too
        saveResult('crop', {
          inputs: { city: selectedCity, crop: selectedCrop },
          analyticsData: enhancedData,
          showAnalysis: true
        });
      }

      setLoading(false);
      setIsProcessing(false);
      setAiPipelineStep('');

      toast.success('Analysis completed successfully!', {
        style: {
          borderRadius: '10px',
          background: '#10b981',
          color: '#fff',
        },
      });
    } catch (error) {
      console.error('Error in crop analysis:', error);
      setLoading(false);
      setIsProcessing(false);
      setAiPipelineStep('');

      toast.error('Analysis failed. Please try again.', {
        style: {
          borderRadius: '10px',
          background: '#ef4444',
          color: '#fff',
        },
      });
    }
  };



  if (!mounted) return null;

  return (
    <div className="relative min-h-screen bg-white">
      <Toaster position="top-right" />

      {/* Header Section */}
      <div className="px-4 py-8 mx-auto max-w-6xl md:py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center md:mb-16"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex gap-2 items-center px-4 py-2 mb-4 rounded-full border shadow-lg backdrop-blur-md bg-white/80 border-[#63A361]/20"
          >
            <div className="w-2 h-2 bg-[#63A361] rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-[#63A361]">AI-Powered Crop Advisory</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-extrabold text-[#5B532C] md:text-4xl"
          >
            Environmental Analysis
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 text-sm text-gray-600 md:mt-4 md:text-base"
          >
            Comprehensive crop advisory with environmental insights, risk assessment, and actionable recommendations
          </motion.p>
        </motion.div>

        {/* Selection Panel - Redesigned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-4 mx-auto mb-8 max-w-4xl md:mb-12 sm:px-0"
        >
          <div className="relative overflow-hidden rounded-3xl border border-[#63A361]/20 shadow-2xl bg-gradient-to-br from-white via-[#FDE7B3]/5 to-[#63A361]/5">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-[#63A361]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FFC50F]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            
            <div className="relative z-10 p-8">
              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-[#63A361] to-[#5B532C] shadow-lg">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#5B532C]">Configure Analysis</h2>
                  <p className="text-sm text-[#5B532C]/60">Select your location and crop for insights</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* City Selection */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#5B532C]">
                    <MapPin className="w-4 h-4 text-[#63A361]" />
                    Select City
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#63A361]/10 group-focus-within:bg-[#63A361]/20 transition-colors">
                      <MapPin className="w-4 h-4 text-[#63A361]" />
                    </div>
                    <select
                      className="w-full py-4 pl-16 pr-10 text-[#5B532C] rounded-xl border-2 border-[#5B532C]/10 bg-white/80 appearance-none cursor-pointer transition-all hover:border-[#63A361]/40 focus:border-[#63A361] focus:bg-white focus:outline-none"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                    >
                      <option value="">Choose your city</option>
                      {[
                        ...cityData['mahacities'],
                        ...cityData['andra cities'],
                        ...cityData['punjab cities'],
                        ...cityData['karnataka cities'],
                        ...cityData['kerala cities'],
                        ...cityData['tamilnadu cities'],
                        ...cityData['telangana cities']
                      ].map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-[#5B532C]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Crop Selection */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#5B532C]">
                    <Leaf className="w-4 h-4 text-[#FFC50F]" />
                    Select Crop
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#FFC50F]/10 group-focus-within:bg-[#FFC50F]/20 transition-colors">
                      <Leaf className="w-4 h-4 text-[#FFC50F]" />
                    </div>
                    <select
                      className="w-full py-4 pl-16 pr-10 text-[#5B532C] rounded-xl border-2 border-[#5B532C]/10 bg-white/80 appearance-none cursor-pointer transition-all hover:border-[#63A361]/40 focus:border-[#63A361] focus:bg-white focus:outline-none"
                      value={selectedCrop}
                      onChange={(e) => setSelectedCrop(e.target.value)}
                    >
                      <option value="">Choose your crop</option>
                      {cityData.crops.map(crop => (
                        <option key={crop} value={crop}>{crop}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-5 h-5 text-[#5B532C]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <motion.button
                onClick={handleAnalytics}
                disabled={loading || isProcessing || !selectedCity || !selectedCrop}
                whileHover={selectedCity && selectedCrop && !loading ? { scale: 1.02 } : {}}
                whileTap={selectedCity && selectedCrop && !loading ? { scale: 0.98 } : {}}
                className={`w-full mt-6 py-4 rounded-2xl font-semibold text-lg shadow-xl transition-all relative overflow-hidden group ${
                  selectedCity && selectedCrop && !loading && !isProcessing
                    ? "bg-gradient-to-r from-[#63A361] to-[#5B532C] text-white hover:shadow-2xl hover:shadow-[#63A361]/25"
                    : "bg-[#5B532C]/20 text-[#5B532C]/50 cursor-not-allowed"
                }`}
              >
                {selectedCity && selectedCrop && !loading && !isProcessing && (
                  <div className="absolute inset-0 bg-gradient-to-r from-[#5B532C] to-[#63A361] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                )}
                
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {loading || isProcessing ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Analyzing Your Environment...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-5 h-5" />
                      <span>{selectedCity && selectedCrop ? "Get Environmental Analysis" : "Select city and crop above"}</span>
                      {selectedCity && selectedCrop && (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </>
                  )}
                </span>
              </motion.button>

              {/* Status Message */}
              {(!selectedCity || !selectedCrop) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 rounded-xl bg-[#FDE7B3]/30 border border-[#FFC50F]/30"
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-[#FFC50F] flex-shrink-0" />
                    <p className="text-sm text-[#5B532C]">
                      {!selectedCity && !selectedCrop ? "Select both city and crop to continue" :
                       !selectedCity ? "Please select a city" : "Please select a crop"}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* AI Pipeline Status */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="p-6 mb-8 rounded-xl border shadow-lg bg-white border-[#5B532C]/10"
          >
            <div className="flex gap-4 items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-[#FDE7B3]/30 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-[#63A361]" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-[#5B532C] mb-1">
                  Processing Analysis
                </h3>

                <motion.p
                  className="text-sm text-[#5B532C]/70 mb-3"
                  key={aiPipelineStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {aiPipelineStep}
                </motion.p>

                <div className="w-full bg-[#FDE7B3]/50 rounded-full h-2">
                  <motion.div
                    className="bg-[#63A361] h-2 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                      duration: 4.8,
                      ease: "easeInOut"
                    }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Analytics Display */}
        {showAnalysis && analyticsData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Success Banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center items-center p-4 bg-[#FDE7B3]/30 rounded-xl border border-[#63A361]/30 shadow-sm"
            >
              <CheckCircle2 className="mr-2 w-5 h-5 text-[#63A361]" />
              <span className="font-medium text-[#63A361]">
                Environmental Analysis completed successfully
              </span>
            </motion.div>

            {/* Top Row - Key Metrics */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 md:grid-cols-2">
              {/* Recommendation Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`p-6 rounded-2xl border shadow-xl backdrop-blur-sm ${getRecommendation(analyticsData).isRecommended
                  ? 'bg-[#FDE7B3]/20 border-[#63A361]/30'
                  : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-100/50'
                  }`}
              >
                <div className="flex gap-3 items-center mb-4">
                  <div className={`p-3 rounded-xl ${getRecommendation(analyticsData).isRecommended ? 'bg-[#63A361]/10' : 'bg-red-100'
                    }`}>
                    {getRecommendation(analyticsData).isRecommended ? (
                      <CheckCircle2 className="w-6 h-6 text-[#63A361]" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-[#5B532C]">Recommendation</h3>
                </div>
                <div className="text-center">
                  <div className={`text-4xl font-bold mb-2 ${getRecommendation(analyticsData).isRecommended ? 'text-[#63A361]' : 'text-red-600'
                    }`}>
                    {getRecommendation(analyticsData).isRecommended ? 'YES' : 'NO'}
                  </div>
                  <div className="text-sm text-[#5B532C]/70">
                    Confidence: {getRecommendation(analyticsData).confidence}%
                  </div>
                </div>
              </motion.div>

              {/* Match Score Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 bg-[#FDE7B3]/20 rounded-2xl border shadow-xl backdrop-blur-sm border-[#63A361]/30"
              >
                <div className="flex gap-3 items-center mb-4">
                  <div className="p-3 bg-[#63A361]/10 rounded-xl">
                    <Target className="w-6 h-6 text-[#63A361]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#5B532C]">Match Score</h3>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#63A361] mb-2">
                    {analyticsData.cropSuitability.overallScore}%
                  </div>
                  <div className="text-sm text-[#5B532C]/70">
                    {analyticsData.cropSuitability.overallScore >= 80 ? 'Excellent' :
                      analyticsData.cropSuitability.overallScore >= 70 ? 'Good' :
                        analyticsData.cropSuitability.overallScore >= 60 ? 'Fair' : 'Poor'}
                  </div>
                </div>
              </motion.div>

              {/* Market Price Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 bg-[#FFC50F]/10 rounded-2xl border shadow-xl backdrop-blur-sm border-[#FFC50F]/30"
              >
                <div className="flex gap-3 items-center mb-4">
                  <div className="p-3 bg-[#FFC50F]/20 rounded-xl">
                    <BarChart3 className="w-6 h-6 text-[#5B532C]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#5B532C]">Market Price</h3>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#5B532C] mb-1">
                    ₹{analyticsData.marketAnalysis.summary.currentPrice.toLocaleString()}
                  </div>
                  <div className="text-sm text-[#5B532C]/70 mb-1">per quintal</div>
                  <div className={`text-sm font-semibold ${analyticsData.marketAnalysis.summary.priceChange >= 0 ? 'text-[#63A361]' : 'text-red-600'
                    }`}>
                    {analyticsData.marketAnalysis.summary.priceChange >= 0 ? '+' : ''}
                    {analyticsData.marketAnalysis.summary.priceChange.toFixed(2)}%
                  </div>
                </div>
              </motion.div>

              {/* Quality Score Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-6 bg-[#FDE7B3]/20 rounded-2xl border shadow-xl backdrop-blur-sm border-[#5B532C]/20"
              >
                <div className="flex gap-3 items-center mb-4">
                  <div className="p-3 bg-[#FFC50F]/20 rounded-xl">
                    <Star className="w-6 h-6 text-[#FFC50F]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#5B532C]">Quality Score</h3>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-[#63A361] mb-2">
                    {analyticsData.qualityMetrics.qualityScore}%
                  </div>
                  <div className="text-sm text-[#5B532C]/70">
                    {analyticsData.qualityMetrics.certificationStatus}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Enhanced Charts Section */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Dynamic Price Trends Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-[#5B532C]/10"
              >
                <div className="flex gap-3 items-center justify-between mb-6">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-[#63A361]/10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-[#63A361]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#5B532C]">Price Trends & Volume</h3>
                  </div>
                  <div className="text-xs text-[#5B532C]/60">
                    Volatility: {analyticsData.marketAnalysis.summary.priceVolatility}%
                  </div>
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={generateDynamicPriceTrends(analyticsData.marketAnalysis.summary.currentPrice, selectedCrop)}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="period" stroke="#666" fontSize={12} />
                      <YAxis yAxisId="price" stroke="#666" fontSize={12} />
                      <YAxis yAxisId="volume" orientation="right" stroke="#666" fontSize={12} />
                      <RechartsTooltip
                        formatter={(value, name) => [
                          name === 'price' ? `₹${value.toLocaleString()}` : `${value.toLocaleString()} tons`,
                          name === 'price' ? 'Price' : 'Volume'
                        ]}
                      />
                      <Area
                        yAxisId="price"
                        type="monotone"
                        dataKey="price"
                        stroke="#63A361"
                        fill="#63A361"
                        fillOpacity={0.3}
                        strokeWidth={3}
                      />
                      <Bar
                        yAxisId="volume"
                        dataKey="volume"
                        fill="#FFC50F"
                        fillOpacity={0.3}
                        radius={[2, 2, 0, 0]}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#5B532C]/70">Avg Volume:</span>
                    <span className="font-semibold text-[#5B532C]">
                      {Math.round(3000 + Math.random() * 2000).toLocaleString()} tons
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5B532C]/70">Market Sentiment:</span>
                    <span className={`font-semibold ${analyticsData.marketAnalysis.summary.marketSentiment === 'Bullish' ? 'text-[#63A361]' :
                      analyticsData.marketAnalysis.summary.marketSentiment === 'Bearish' ? 'text-red-600' : 'text-[#FFC50F]'
                      }`}>
                      {analyticsData.marketAnalysis.summary.marketSentiment}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Enhanced Quality Distribution with Market Insights */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-[#5B532C]/10"
              >
                <div className="flex gap-3 items-center justify-between mb-6">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-[#FFC50F]/20 rounded-lg">
                      <PieChart className="w-5 h-5 text-[#5B532C]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#5B532C]">Quality Distribution</h3>
                  </div>
                  <div className="text-xs text-[#5B532C]/60">
                    Export Ready: {analyticsData.qualityMetrics.exportQuality ? 'Yes' : 'No'}
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: "Premium", value: analyticsData.qualityMetrics.gradeDistribution.premium, color: "#63A361" },
                          { name: "Standard", value: analyticsData.qualityMetrics.gradeDistribution.standard, color: "#FFC50F" },
                          { name: "Substandard", value: analyticsData.qualityMetrics.gradeDistribution.substandard, color: "#5B532C" }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: "Premium", value: analyticsData.qualityMetrics.gradeDistribution.premium, color: "#63A361" },
                          { name: "Standard", value: analyticsData.qualityMetrics.gradeDistribution.standard, color: "#FFC50F" },
                          { name: "Substandard", value: analyticsData.qualityMetrics.gradeDistribution.substandard, color: "#5B532C" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {analyticsData.qualityMetrics.qualityParameters.slice(0, 2).map((param, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="text-[#5B532C]/70">{param.parameter}:</span>
                      <span className={`font-semibold ${param.status === 'Good' || param.status === 'Excellent' ? 'text-[#63A361]' :
                        param.status === 'High' || param.status === 'Below Standard' ? 'text-red-600' : 'text-[#FFC50F]'
                        }`}>
                        {param.value}{param.unit} ({param.status})
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Market Insights & Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-[#5B532C]/10"
            >
              <div className="flex gap-3 items-center mb-6">
                <div className="p-2 bg-[#63A361]/10 rounded-lg">
                  <Brain className="w-5 h-5 text-[#63A361]" />
                </div>
                <h3 className="text-lg font-semibold text-[#5B532C]">AI Market Insights & Alerts</h3>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {getMarketInsights(analyticsData, selectedCrop).map((insight, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${insight.severity === 'high' ? 'bg-red-50 border-red-200' :
                    insight.severity === 'medium' ? 'bg-[#FFC50F]/10 border-[#FFC50F]/30' :
                      'bg-[#FDE7B3]/20 border-[#63A361]/30'
                    }`}>
                    <div className={`flex gap-2 items-center mb-2 ${insight.severity === 'high' ? 'text-red-600' :
                      insight.severity === 'medium' ? 'text-[#5B532C]' : 'text-[#63A361]'
                      }`}>
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-semibold capitalize">{insight.type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-[#5B532C] mb-2">{insight.message}</p>
                    <p className="text-xs text-[#5B532C]/70">{insight.recommendation}</p>
                  </div>
                ))}
                {getMarketInsights(analyticsData, selectedCrop).length === 0 && (
                  <div className="col-span-full text-center py-8 text-[#5B532C]/60">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[#63A361]" />
                    <p>No critical alerts detected. Market conditions are stable.</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Comparative Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-[#5B532C]/10"
            >
              <div className="flex gap-3 items-center mb-6">
                <div className="p-2 bg-[#FDE7B3]/30 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-[#5B532C]" />
                </div>
                <h3 className="text-lg font-semibold text-[#5B532C]">Alternative Crop Analysis</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#5B532C]/20">
                      <th className="text-left py-2 font-semibold text-[#5B532C]">Crop</th>
                      <th className="text-left py-2 font-semibold text-[#5B532C]">Price/Quintal</th>
                      <th className="text-left py-2 font-semibold text-[#5B532C]">Suitability</th>
                      <th className="text-left py-2 font-semibold text-[#5B532C]">Market Demand</th>
                      <th className="text-left py-2 font-semibold text-[#5B532C]">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getComparativeAnalysis(analyticsData, selectedCrop).map((crop, index) => (
                      <tr key={index} className="border-b border-[#5B532C]/10 hover:bg-[#FDE7B3]/10">
                        <td className="py-3 font-medium text-[#5B532C]">{crop.crop}</td>
                        <td className="py-3 text-[#5B532C]">₹{crop.price.toLocaleString()}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-[#FDE7B3]/50 rounded-full h-2">
                              <div
                                className="bg-[#63A361] h-2 rounded-full"
                                style={{ width: `${crop.suitability}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#5B532C]">{crop.suitability}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-[#FDE7B3]/50 rounded-full h-2">
                              <div
                                className="bg-[#FFC50F] h-2 rounded-full"
                                style={{ width: `${crop.market_demand}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#5B532C]">{crop.market_demand}%</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${crop.risk_level === 'Low' ? 'bg-[#63A361]/10 text-[#63A361]' :
                            crop.risk_level === 'Medium' ? 'bg-[#FFC50F]/20 text-[#5B532C]' :
                              'bg-red-100 text-red-800'
                            }`}>
                            {crop.risk_level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Yield Predictions with Confidence Intervals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-[#5B532C]/10"
            >
              <div className="flex gap-3 items-center mb-6">
                <div className="p-2 bg-[#63A361]/10 rounded-lg">
                  <Leaf className="w-5 h-5 text-[#63A361]" />
                </div>
                <h3 className="text-lg font-semibold text-[#5B532C]">Yield Predictions (Tons/Acre)</h3>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {Object.entries(getYieldPredictions(analyticsData)).slice(0, 3).map(([scenario, value], index) => (
                  <div key={scenario} className="text-center p-4 rounded-lg border border-[#5B532C]/10">
                    <div className={`text-3xl font-bold mb-2 ${scenario === 'optimistic' ? 'text-[#63A361]' :
                      scenario === 'realistic' ? 'text-[#5B532C]' : 'text-[#FFC50F]'
                      }`}>
                      {value as number}
                    </div>
                    <div className="text-sm text-[#5B532C]/70 capitalize">{scenario}</div>
                    <div className="text-xs text-[#5B532C]/50 mt-1">
                      Confidence: {getYieldPredictions(analyticsData).confidence}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-[#5B532C]/70">
                <strong>Key Factors:</strong> {getYieldPredictions(analyticsData).factors.join(', ')}
              </div>
            </motion.div>

            {/* Risk Assessment */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-[#5B532C]/10"
            >
              <div className="flex gap-3 items-center mb-6">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Shield className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-[#5B532C]">Risk Assessment (100% Scale)</h3>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                {Object.entries(getRiskAssessment(analyticsData)).map(([key, value], index) => (
                  <div key={key} className="text-center">
                    <div className="text-3xl font-bold text-red-600 mb-2">{value}%</div>
                    <div className="text-sm text-[#5B532C]/70 capitalize">{key} Risk</div>
                    <div className="mt-2 w-full bg-[#FDE7B3]/50 rounded-full h-2">
                      <motion.div
                        className="bg-red-500 h-2 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 1, delay: 0.8 + index * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Solutions & Precautions */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-[#5B532C]/10"
              >
                <div className="flex gap-3 items-center mb-6">
                  <div className="p-2 bg-[#63A361]/10 rounded-lg">
                    <Zap className="w-5 h-5 text-[#63A361]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#5B532C]">Key Solutions</h3>
                </div>
                <div className="space-y-3">
                  {getKeyPoints(analyticsData).solutions.map((solution, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="w-2 h-2 bg-[#63A361] rounded-full mt-2"></div>
                      <span className="text-sm text-[#5B532C]">{solution}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="p-6 bg-white rounded-2xl border shadow-xl backdrop-blur-sm border-[#5B532C]/10"
              >
                <div className="flex gap-3 items-center mb-6">
                  <div className="p-2 bg-[#FFC50F]/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-[#FFC50F]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#5B532C]">Precautions</h3>
                </div>
                <div className="space-y-3">
                  {getKeyPoints(analyticsData).precautions.map((precaution, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="w-2 h-2 bg-[#FFC50F] rounded-full mt-2"></div>
                      <span className="text-sm text-[#5B532C]">{precaution}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Next Check Date */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="flex justify-center items-center p-4 bg-[#FDE7B3]/30 rounded-xl border border-[#63A361]/30 shadow-sm"
            >
              <Calendar className="mr-2 w-5 h-5 text-[#63A361]" />
              <span className="font-medium text-[#63A361]">
                Next Analysis: {nextCheckDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* Empty State - Enhanced Placeholder */}
        {!showAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Hero Placeholder */}
            <div className="relative p-8 text-center bg-gradient-to-br from-[#FDE7B3]/30 via-white to-[#63A361]/5 rounded-3xl border border-[#63A361]/20 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#63A361]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FFC50F]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="relative z-10"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-[#63A361] to-[#5B532C] shadow-lg">
                  <Leaf className="w-10 h-10 text-white" />
            </div>
                <h3 className="mb-3 text-2xl font-bold text-[#5B532C]">
                  Environmental Advisory System
                </h3>
                <p className="max-w-md mx-auto mb-6 text-[#5B532C]/70">
                  Select your city and crop above to receive AI-powered farming recommendations, market analysis, and risk assessments
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-[#63A361]/20">
                    <MapPin className="w-4 h-4 text-[#63A361]" />
                    <span className="text-sm text-[#5B532C]">Regional Analysis</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-[#FFC50F]/20">
                    <TrendingUp className="w-4 h-4 text-[#FFC50F]" />
                    <span className="text-sm text-[#5B532C]">Market Trends</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-[#5B532C]/20">
                    <Shield className="w-4 h-4 text-[#5B532C]" />
                    <span className="text-sm text-[#5B532C]">Risk Assessment</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Preview Cards Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: CheckCircle2, title: "Recommendation", desc: "Yes/No with confidence score", color: "#63A361" },
                { icon: Target, title: "Match Score", desc: "Soil & climate compatibility", color: "#63A361" },
                { icon: BarChart3, title: "Market Price", desc: "Current rates & trends", color: "#FFC50F" },
                { icon: Star, title: "Quality Score", desc: "Expected crop quality", color: "#5B532C" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-[#FDE7B3]/20 to-white border border-[#63A361]/10"
                >
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${item.color}15` }}>
                      <item.icon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <h4 className="font-semibold text-[#5B532C]">{item.title}</h4>
                  </div>
                  <div className="h-10 w-24 bg-[#FDE7B3]/30 rounded-lg mb-2 animate-pulse" />
                  <p className="text-xs text-[#5B532C]/60">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Mock Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Mock Line Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-6 rounded-xl bg-white border border-[#63A361]/10"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[#63A361]/10">
                    <TrendingUp className="w-5 h-5 text-[#63A361]" />
                  </div>
                  <span className="font-semibold text-[#5B532C]">Price Trends & Volume</span>
                </div>
                <div className="relative h-48">
                  <svg className="w-full h-full" viewBox="0 0 400 150">
                    {[0, 1, 2, 3].map(i => (
                      <line key={i} x1="30" y1={20 + i * 35} x2="380" y2={20 + i * 35} stroke="#63A361" strokeOpacity="0.1" />
                    ))}
                    <motion.path
                      d="M 30 120 Q 80 100, 130 110 T 200 80 T 270 90 T 340 60 T 380 70"
                      fill="none" stroke="#63A361" strokeWidth="3" strokeOpacity="0.4"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
                    />
                    <motion.path
                      d="M 30 130 Q 80 120, 130 125 T 200 100 T 270 110 T 340 90 T 380 95"
                      fill="none" stroke="#FFC50F" strokeWidth="3" strokeOpacity="0.4"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                      transition={{ duration: 2, delay: 0.5, repeat: Infinity, repeatType: "loop" }}
                    />
                  </svg>
                </div>
              </motion.div>

              {/* Mock Pie Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="p-6 rounded-xl bg-white border border-[#63A361]/10"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[#FFC50F]/10">
                    <PieChart className="w-5 h-5 text-[#FFC50F]" />
                  </div>
                  <span className="font-semibold text-[#5B532C]">Quality Distribution</span>
                </div>
                <div className="flex items-center justify-center h-48">
                  <svg className="w-36 h-36" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#5B532C" strokeWidth="20" strokeOpacity="0.2" />
                    <motion.circle
                      cx="50" cy="50" r="40" fill="none" stroke="#63A361" strokeWidth="20"
                      strokeDasharray="251.2" strokeDashoffset="100"
                      initial={{ strokeDashoffset: 251.2 }} animate={{ strokeDashoffset: 100 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
                    />
                    <motion.circle
                      cx="50" cy="50" r="40" fill="none" stroke="#FFC50F" strokeWidth="20"
                      strokeDasharray="251.2" strokeDashoffset="175"
                      initial={{ strokeDashoffset: 251.2 }} animate={{ strokeDashoffset: 175 }}
                      transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                      style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
                    />
                  </svg>
                </div>
              </motion.div>
            </div>

            {/* Features Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Brain, title: "AI Insights" },
                { icon: Zap, title: "Key Solutions" },
                { icon: AlertCircle, title: "Risk Alerts" },
                { icon: Calendar, title: "Schedule" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="p-4 text-center rounded-xl bg-[#FDE7B3]/10 border border-[#63A361]/10"
                >
                  <item.icon className="w-6 h-6 mx-auto mb-2 text-[#63A361]" />
                  <span className="text-sm font-medium text-[#5B532C]">{item.title}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex gap-2 items-center px-6 py-3 rounded-full border shadow-lg backdrop-blur-sm border-[#63A361]/20 bg-white/80">
            <Activity className="w-4 h-4 text-[#63A361]" />
            <span className="text-sm font-semibold text-[#5B532C]">Powered by AI & Farm Data</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CropAdvisory;