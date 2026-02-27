import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Warehouse as WarehouseIcon,
  MapPin,
  Package,
  X,
  Filter,
  RefreshCw,
  Thermometer,
  Zap,
  Truck,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Clock as ClockIcon,
  AlertTriangle,
  Activity,
} from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import { useAuth } from "../context/AuthContext"
import warehouseService from "../services/warehouseService"
import type {
  WarehouseData,
  LotData,
  AlertData,
  StorageEventData,
  ConditionsData,
} from "../services/warehouseService"
import { StorageGauge } from "../components/StorageGauge"
import { LotCard } from "../components/LotCard"
import { AlertPanel } from "../components/AlertPanel"
import { LotTimeline } from "../components/LotTimeline"
import { DispatchConfirmForm } from "../components/DispatchConfirmForm"
import type { StorageUnit } from "../ai/storagePrompt"
import {
  getDistributionRecommendation,
  type DistributionResult,
  type StatePrice,
} from "../ai/marketService"

// State data for distribution
import mahaData from "../data/maha.json"
import karnatakaData from "../data/karnataka.json"
import keralaData from "../data/kerala.json"
import punjabData from "../data/punjab.json"
import tamilnaduData from "../data/tamilnadu.json"
import andraData from "../data/andra.json"
import teleganaData from "../data/telegana.json"
import cityData from "../data/cityData.json"

// ─── City → State mapping (built once from cityData.json) ───
const STATE_DATA_MAP: Record<string, { data: any; label: string }> = {
  Maharashtra: { data: mahaData, label: "Maharashtra" },
  Karnataka: { data: karnatakaData, label: "Karnataka" },
  Kerala: { data: keralaData, label: "Kerala" },
  Punjab: { data: punjabData, label: "Punjab" },
  "Tamil Nadu": { data: tamilnaduData, label: "Tamil Nadu" },
  "Andhra Pradesh": { data: andraData, label: "Andhra Pradesh" },
  Telangana: { data: teleganaData, label: "Telangana" },
}

const CITY_TO_STATE: Record<string, string> = {}
for (const [key, cities] of Object.entries(cityData)) {
  if (key === "crops") continue
  let stateName = ""
  if (key === "mahacities") stateName = "Maharashtra"
  else if (key === "andra cities") stateName = "Andhra Pradesh"
  else if (key === "punjab cities") stateName = "Punjab"
  else if (key === "karnataka cities") stateName = "Karnataka"
  else if (key === "kerala cities") stateName = "Kerala"
  else if (key === "tamilnadu cities") stateName = "Tamil Nadu"
  else if (key === "telangana cities") stateName = "Telangana"
  if (stateName && Array.isArray(cities)) {
    for (const city of cities) {
      CITY_TO_STATE[city.toLowerCase()] = stateName
    }
  }
}

function getStateForCity(cityName: string): string | null {
  return CITY_TO_STATE[cityName.toLowerCase()] || null
}

/* ─── Warehouse type badge config ─── */
const typeConfig = {
  dry: { label: "Dry / Godown", color: "bg-amber-100 text-amber-700" },
  cold_storage: { label: "Cold Storage", color: "bg-blue-100 text-blue-700" },
  ventilated: { label: "Ventilated", color: "bg-green-100 text-green-700" },
}

/* ─── Crop options for the add-lot form ─── */
const CROP_OPTIONS = [
  "Onion",
  "Potato",
  "Wheat",
  "Rice",
  "Tomato",
  "Cotton",
  "Sugarcane",
  "Garlic",
  "Maize",
  "Soybean",
  "Groundnut",
  "Banana",
  "Mango",
  "Grapes",
  "Pomegranate",
]

/* ─── Shelf life lookup (days) ─── */
const SHELF_LIFE_DAYS: Record<string, number> = {
  Onion: 30,
  Potato: 60,
  Wheat: 180,
  Rice: 365,
  Tomato: 7,
  Cotton: 365,
  Sugarcane: 14,
  Garlic: 60,
  Maize: 180,
  Soybean: 180,
  Groundnut: 120,
  Banana: 5,
  Mango: 10,
  Grapes: 7,
  Pomegranate: 30,
}

/* ─── Helpers (ported from StorageDashboard / DistributionPlanner) ─── */
function generateSensorData(warehouse: WarehouseData): StorageUnit {
  const baseTemp =
    warehouse.type === "cold_storage"
      ? 4
      : warehouse.type === "ventilated"
        ? 22
        : 28
  const baseHumidity =
    warehouse.type === "cold_storage"
      ? 85
      : warehouse.type === "ventilated"
        ? 55
        : 65

  return {
    unitId: warehouse._id,
    name: warehouse.name,
    type: warehouse.type,
    temperature: baseTemp + Math.round((Math.random() * 6 - 3) * 10) / 10,
    humidity: baseHumidity + Math.round((Math.random() * 10 - 5) * 10) / 10,
    co2Level: Math.round(400 + Math.random() * 600),
    ethyleneLevel: Math.round(Math.random() * 15 * 10) / 10,
    produceStored: [],
    capacityUsed:
      warehouse.capacityQuintals > 0
        ? Math.round(
          (warehouse.usedCapacity / warehouse.capacityQuintals) * 100,
        )
        : 0,
  }
}

function getShelfLifePercent(lot: LotData): number {
  const entryDate = new Date(lot.entryDate)
  const now = new Date()
  const daysStored = Math.floor(
    (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  const shelfLife =
    lot.expectedShelfLifeDays || SHELF_LIFE_DAYS[lot.cropName] || 30
  return Math.max(
    0,
    Math.min(100, Math.round(((shelfLife - daysStored) / shelfLife) * 100)),
  )
}

function getDaysStored(lot: LotData): number {
  const entryDate = new Date(lot.entryDate)
  const now = new Date()
  return Math.floor(
    (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24),
  )
}

function getConditionColor(condition: string): string {
  switch (condition) {
    case "good":
      return "text-green-600 bg-green-50 border-green-200"
    case "watch":
      return "text-amber-600 bg-amber-50 border-amber-200"
    case "at_risk":
      return "text-red-600 bg-red-50 border-red-200"
    case "spoiled":
      return "text-red-800 bg-red-100 border-red-300"
    default:
      return "text-gray-600 bg-gray-50 border-gray-200"
  }
}

function extractPricesFromStateData(
  stateData: any,
  stateName: string,
  cropName: string,
): StatePrice[] {
  const prices: StatePrice[] = []
  if (!stateData?.cities) return prices
  for (const city of stateData.cities) {
    for (const market of city.markets || []) {
      const cropPrice = market.cropPrices?.[cropName]
      if (cropPrice) {
        prices.push({
          state: stateName,
          market: market.name || city.city,
          price: cropPrice,
          distance: `${Math.round(100 + Math.random() * 800)} km`,
        })
      }
    }
  }
  return prices
}



const urgencyConfig = {
  low: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    badge: "bg-green-100 text-green-700",
  },
  medium: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
  high: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
  },
}

const Warehouse: React.FC = () => {
  const { user } = useAuth()

  /* ─── State ─── */
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([])
  const [lots, setLots] = useState<LotData[]>([])
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [conditions, setConditions] = useState<Record<string, ConditionsData>>(
    {},
  )
  const [loading, setLoading] = useState(true)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all")
  const [lotFilter, setLotFilter] = useState<"active" | "dispatched">("active")

  // Tab state
  const [activeTab, setActiveTab] = useState<
    "storage" | "monitor" | "distribution"
  >("storage")

  // Modals
  const [showAddWarehouse, setShowAddWarehouse] = useState(false)
  const [showAddLot, setShowAddLot] = useState(false)

  // Timeline drawer
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [timelineEvents, setTimelineEvents] = useState<StorageEventData[]>([])
  const [timelineLot, setTimelineLot] = useState<LotData | null>(null)

  // Forms
  const [whForm, setWhForm] = useState({
    name: "",
    city: "",
    type: "dry",
    capacity: "",
  })
  const [lotForm, setLotForm] = useState({
    warehouse: "",
    cropName: "",
    quantity: "",
    source: "",
  })

  // Monitor tab state
  const [sensorData, setSensorData] = useState<StorageUnit[]>([])

  // Distribution tab state
  const [selectedDistLot, setSelectedDistLot] = useState<LotData | null>(null)
  const [dispatchQty, setDispatchQty] = useState("")
  const [distAnalyzing, setDistAnalyzing] = useState(false)
  const [distResult, setDistResult] = useState<DistributionResult | null>(null)
  const [marketScope, setMarketScope] = useState<"all" | "state">("all")

  // Alert → Dispatch flow state
  const [dispatchAlert, setDispatchAlert] = useState<AlertData | null>(null)
  const [dispatchLotForAlert, setDispatchLotForAlert] =
    useState<LotData | null>(null)
  const [showDispatchBar, setShowDispatchBar] = useState(false)

  /* ─── Data loading ─── */
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [whData, lotData, alertData] = await Promise.all([
        warehouseService.getWarehouses(),
        warehouseService.getLots(),
        warehouseService.getAlerts(),
      ])
      setWarehouses(whData)
      setLots(lotData)
      setAlerts(alertData)

      // Load conditions for each warehouse
      const condMap: Record<string, ConditionsData> = {}
      for (const wh of whData) {
        try {
          condMap[wh._id] = await warehouseService.getConditions(wh._id)
        } catch {
          // silently skip
        }
      }
      setConditions(condMap)

      // Generate sensor data for monitor tab
      const sensors = whData.map((w: WarehouseData) => {
        const unit = generateSensorData(w)
        const warehouseLots = lotData.filter((l: LotData) => {
          const wId =
            typeof l.warehouse === "string" ? l.warehouse : l.warehouse?._id
          return wId === w._id
        })
        unit.produceStored = warehouseLots.map((l: LotData) => l.cropName)
        return unit
      })
      setSensorData(sensors)
    } catch (err) {
      console.error("Load error:", err)
      toast.error("Failed to load data. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  /* ─── Actions ─── */
  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!whForm.name || !whForm.city || !whForm.capacity) {
      toast.error("Please fill all fields")
      return
    }
    try {
      await warehouseService.createWarehouse({
        name: whForm.name,
        location: { city: whForm.city },
        type: whForm.type,
        capacityQuintals: Number(whForm.capacity),
      })
      toast.success("Warehouse created!")
      setShowAddWarehouse(false)
      setWhForm({ name: "", city: "", type: "dry", capacity: "" })
      loadData()
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to create warehouse"
      console.error("Add warehouse error:", err?.response?.data || err)
      toast.error(message)
    }
  }

  const handleAddLot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lotForm.warehouse || !lotForm.cropName || !lotForm.quantity) {
      toast.error("Please fill all required fields")
      return
    }
    try {
      await warehouseService.createLot({
        warehouse: lotForm.warehouse,
        cropName: lotForm.cropName,
        quantityQuintals: Number(lotForm.quantity),
        source: lotForm.source,
      })
      toast.success("Lot added!")
      setShowAddLot(false)
      setLotForm({ warehouse: "", cropName: "", quantity: "", source: "" })
      loadData()
    } catch (err: any) {
      const message =
        err?.response?.data?.error || err?.message || "Failed to add lot"
      console.error("Add lot error:", err?.response?.data || err)
      toast.error(message)
    }
  }

  const handleViewTimeline = async (lot: LotData) => {
    try {
      const events = await warehouseService.getLotTimeline(lot._id)
      setTimelineEvents(events)
      setTimelineLot(lot)
      setTimelineOpen(true)
    } catch {
      toast.error("Failed to load timeline")
    }
  }

  const handleResolveAlert = async (id: string) => {
    try {
      await warehouseService.resolveAlert(id)
      setAlerts((prev) => prev.filter((a) => a._id !== id))
      toast.success("Alert resolved")
    } catch {
      toast.error("Failed to resolve alert")
    }
  }

  /* ─── Alert "Sell / Dispatch" flow ─── */
  const handleSellDispatch = (alert: AlertData) => {
    const alertLotId =
      typeof alert.lot === "object" && alert.lot !== null ? alert.lot._id : null
    const linkedLot = alertLotId ? lots.find((l) => l._id === alertLotId) : null

    setActiveTab("distribution")

    if (linkedLot) {
      setSelectedDistLot(linkedLot)
      setDispatchQty(String(linkedLot.quantityQuintals))
      setDistResult(null)
    }

    setDispatchAlert(alert)
    setDispatchLotForAlert(linkedLot || null)
    setShowDispatchBar(true)
  }

  const handleSellDispatchStandalone = (lot: LotData) => {
    setActiveTab("distribution")
    setSelectedDistLot(lot)
    setDispatchQty(String(lot.quantityQuintals))
    setDistResult(null)
    setDispatchAlert(null)
    setDispatchLotForAlert(lot)
    setShowDispatchBar(true)
  }

  const handleDeleteLot = async (lot: LotData) => {
    try {
      await warehouseService.deleteLot(lot._id)
      toast.success(`Deleted ${lot.cropName} (${lot.lotId})`)
      loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete lot")
    }
  }

  const handleShiftLot = async (lot: LotData, targetWarehouseId: string) => {
    try {
      await warehouseService.shiftLot(lot._id, targetWarehouseId)
      toast.success(`Shifted ${lot.cropName} to new warehouse`)
      loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to shift lot")
    }
  }

  const handleUpdateStatus = async (lot: LotData, newStatus: string) => {
    try {
      await warehouseService.updateLot(lot._id, { status: newStatus } as any)
      toast.success(`${lot.cropName} marked as ${newStatus.replace("_", " ")}`)
      loadData()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update status")
    }
  }



  /* ─── Distribution tab: market recommendation ─── */
  const handleDistributionAnalyze = async () => {
    if (!selectedDistLot || !dispatchQty) {
      toast.error("Select a lot and enter quantity")
      return
    }
    setDistAnalyzing(true)
    try {
      const cropName = selectedDistLot.cropName
      const warehouseCity =
        typeof selectedDistLot.warehouse === "object"
          ? selectedDistLot.warehouse.location?.city || ""
          : ""
      const warehouseState = getStateForCity(warehouseCity)

      let allPrices: StatePrice[] = []

      if (marketScope === "state") {
        // Markets from the same state as the warehouse
        if (warehouseState && STATE_DATA_MAP[warehouseState]) {
          allPrices = extractPricesFromStateData(
            STATE_DATA_MAP[warehouseState].data,
            warehouseState,
            cropName,
          )
        }
        if (allPrices.length === 0) {
          toast.error(
            `No state market data found for ${cropName} in ${warehouseState || "unknown state"}. Try 'All India'.`,
          )
          setDistAnalyzing(false)
          return
        }
      } else {
        // All states
        for (const [stateName, { data }] of Object.entries(STATE_DATA_MAP)) {
          allPrices.push(
            ...extractPricesFromStateData(data, stateName, cropName),
          )
        }
      }

      if (allPrices.length === 0) {
        toast.error(`No market price data found for ${cropName}`)
        setDistAnalyzing(false)
        return
      }

      // Sort by price descending (best first) before sending to AI
      allPrices.sort((a, b) => {
        const parsePrice = (p: string) =>
          parseFloat(p.replace(/[^\d.]/g, "")) || 0
        return parsePrice(b.price) - parsePrice(a.price)
      })

      const recommendation = await getDistributionRecommendation(
        {
          cropName,
          quantity: parseFloat(dispatchQty),
          storageDays: getDaysStored(selectedDistLot),
        },
        allPrices.slice(0, 20), // Top 20 best-priced markets
      )

      setDistResult(recommendation)
      toast.success("Distribution plan ready")
    } catch {
      toast.error("Failed to generate plan")
    } finally {
      setDistAnalyzing(false)
    }
  }

  /* ─── Filtered lots ─── */
  const warehouseFiltered =
    selectedWarehouse === "all"
      ? lots
      : lots.filter((l) => {
        const whId =
          typeof l.warehouse === "object" ? l.warehouse._id : l.warehouse
        return whId === selectedWarehouse
      })

  // Storage tab: Active = has quantity, History = fully dispatched (qty 0)
  const filteredLots =
    lotFilter === "active"
      ? warehouseFiltered.filter((l) => l.quantityQuintals > 0)
      : warehouseFiltered.filter((l) => l.quantityQuintals <= 0)

  // For distribution & monitor tabs: any lot with qty > 0
  const activeLots = lots.filter((l: LotData) => l.quantityQuintals > 0)

  const dispatchedLotsCount = warehouseFiltered.filter(
    (l) => l.quantityQuintals <= 0,
  ).length


  /* ─── Render ─── */
  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white border-b border-[#5B532C]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#5B532C]">My Storage</h1>
              <p className="text-sm text-[#5B532C]/50 mt-1">
                Welcome, {user?.name || "Farmer"} · {warehouses.length}{" "}
                warehouse{warehouses.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadData()}
                className="p-2 rounded-lg border border-[#5B532C]/15 text-[#5B532C]/60 hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={() => setShowAddLot(true)}
                className="flex items-center gap-2 px-4 py-2 border border-[#5B532C]/20 text-[#5B532C] rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <Package className="w-4 h-4" />
                Add Lot
              </button>
              <button
                onClick={() => setShowAddWarehouse(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#63A361] hover:bg-[#578f55] text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Warehouse
              </button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab("storage")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "storage"
                ? "bg-[#63A361] text-white"
                : "bg-[#FDE7B3]/30 text-[#5B532C] hover:bg-[#FDE7B3]/50"
                }`}
            >
              <WarehouseIcon className="w-4 h-4 inline mr-2" />
              My Storage
            </button>
            <button
              onClick={() => setActiveTab("monitor")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "monitor"
                ? "bg-[#63A361] text-white"
                : "bg-[#FDE7B3]/30 text-[#5B532C] hover:bg-[#FDE7B3]/50"
                }`}
            >
              <Thermometer className="w-4 h-4 inline mr-2" />
              Storage Monitor
            </button>
            <button
              onClick={() => setActiveTab("distribution")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "distribution"
                ? "bg-[#63A361] text-white"
                : "bg-[#FDE7B3]/30 text-[#5B532C] hover:bg-[#FDE7B3]/50"
                }`}
            >
              <Truck className="w-4 h-4 inline mr-2" />
              Distribution
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-[#63A361] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#5B532C]/50 text-sm">
                Loading your storage data...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ════════════════════════════════════════════ */}
            {/* TAB: My Storage (existing warehouse view)   */}
            {/* ════════════════════════════════════════════ */}
            {activeTab === "storage" && (
              <>
                {/* Warehouse Cards */}
                {warehouses.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#5B532C]/20"
                  >
                    <WarehouseIcon className="w-12 h-12 text-[#5B532C]/20 mx-auto mb-3" />
                    <h3 className="font-semibold text-[#5B532C]/60">
                      No Warehouses Yet
                    </h3>
                    <p className="text-sm text-[#5B532C]/40 mt-1">
                      Add your first warehouse to get started
                    </p>
                    <button
                      onClick={() => setShowAddWarehouse(true)}
                      className="mt-4 px-4 py-2 bg-[#63A361] text-white rounded-xl text-sm font-semibold"
                    >
                      <Plus className="w-4 h-4 inline mr-1" /> Add Warehouse
                    </button>
                  </motion.div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {warehouses.map((wh, i) => {
                      const type = typeConfig[wh.type] || typeConfig.dry
                      const cond = conditions[wh._id]
                      const usedPct =
                        wh.capacityQuintals > 0
                          ? (wh.usedCapacity / wh.capacityQuintals) * 100
                          : 0

                      return (
                        <motion.div
                          key={wh._id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="bg-white rounded-xl shadow-sm border border-[#5B532C]/10 p-5 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-[#5B532C]">
                                {wh.name}
                              </h3>
                              <p className="text-xs text-[#5B532C]/50 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />{" "}
                                {wh.location.city}
                              </p>
                            </div>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${type.color}`}
                            >
                              {type.label}
                            </span>
                          </div>

                          {/* Capacity bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-[#5B532C]/50 mb-1">
                              <span>{wh.usedCapacity} used</span>
                              <span>{wh.capacityQuintals} qtl capacity</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${usedPct > 90
                                  ? "bg-red-400"
                                  : usedPct > 70
                                    ? "bg-yellow-400"
                                    : "bg-[#63A361]"
                                  }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${usedPct}%` }}
                                transition={{ duration: 0.8 }}
                              />
                            </div>
                          </div>

                          {/* Conditions gauges */}
                          {cond && (
                            <div className="flex items-center justify-center gap-6 pt-2 border-t border-[#5B532C]/5">
                              <StorageGauge
                                value={cond.conditions.temp}
                                max={50}
                                label="Temp"
                                unit="°C"
                                color="#63A361"
                                size={70}
                              />
                              <StorageGauge
                                value={cond.conditions.humidity}
                                max={100}
                                label="Humidity"
                                unit="%"
                                color="#3b82f6"
                                size={70}
                              />
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                )}

                {/* Alerts */}
                {alerts.filter((a) => !a.isResolved).length > 0 && (
                  <AlertPanel
                    alerts={alerts.filter((a) => !a.isResolved)}
                    onResolve={handleResolveAlert}
                    onSellDispatch={handleSellDispatch}
                  />
                )}

                {/* Lots Section */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setLotFilter("active")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${lotFilter === "active"
                          ? "bg-[#63A361] text-white"
                          : "bg-gray-100 text-[#5B532C]/60 hover:bg-gray-200"
                          }`}
                      >
                        Active Lots
                      </button>
                      <button
                        onClick={() => setLotFilter("dispatched")}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${lotFilter === "dispatched"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-[#5B532C]/60 hover:bg-gray-200"
                          }`}
                      >
                        Recently Dispatched
                        {dispatchedLotsCount > 0 && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${lotFilter === "dispatched"
                              ? "bg-white/20 text-white"
                              : "bg-blue-100 text-blue-700"
                              }`}
                          >
                            {dispatchedLotsCount}
                          </span>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[#5B532C]/40" />
                      <select
                        value={selectedWarehouse}
                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                        className="text-sm border border-[#5B532C]/15 rounded-lg px-3 py-1.5 text-[#5B532C] bg-white focus:outline-none focus:ring-2 focus:ring-[#63A361]/30"
                      >
                        <option value="all">All Warehouses</option>
                        {warehouses.map((wh) => (
                          <option key={wh._id} value={wh._id}>
                            {wh.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {filteredLots.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-[#5B532C]/15">
                      <Package className="w-10 h-10 text-[#5B532C]/20 mx-auto mb-2" />
                      <p className="text-sm text-[#5B532C]/40">
                        No produce lots found
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredLots.map((lot) => (
                        <LotCard
                          key={lot._id}
                          lot={lot}
                          warehouses={warehouses}
                          onViewTimeline={handleViewTimeline}
                          onSellDispatch={handleSellDispatchStandalone}
                          onDelete={handleDeleteLot}
                          onShift={handleShiftLot}
                          onUpdateStatus={handleUpdateStatus}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════ */}
            {/* TAB: Storage Monitor                        */}
            {/* ════════════════════════════════════════════ */}
            {activeTab === "monitor" && (
              <div className="space-y-6">
                {/* AI Analysis button + active alerts */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg font-bold text-[#5B532C]">
                    Real-time Storage Conditions
                  </h2>
                </div>

                {/* Storage Unit Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sensorData.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <WarehouseIcon className="w-16 h-16 text-[#5B532C]/20 mx-auto mb-4" />
                      <p className="text-[#5B532C]/60">
                        No storage units found. Add a warehouse first.
                      </p>
                    </div>
                  ) : (
                    sensorData.map((unit, idx) => {

                      return (
                        <motion.div
                          key={unit.unitId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white rounded-xl shadow-lg border border-[#5B532C]/10 overflow-hidden"
                        >
                          {/* Unit Header */}
                          <div
                            className={`p-4 ${unit.type === "cold_storage"
                              ? "bg-gradient-to-r from-blue-50 to-cyan-50"
                              : unit.type === "ventilated"
                                ? "bg-gradient-to-r from-green-50 to-emerald-50"
                                : "bg-gradient-to-r from-amber-50 to-yellow-50"
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="font-bold text-[#5B532C]">
                                  {unit.name}
                                </h3>
                                <p className="text-xs text-[#5B532C]/60 capitalize">
                                  {unit.type.replace("_", " ")}
                                </p>
                              </div>

                            </div>
                          </div>

                          {/* Gauges */}
                          <div className="p-4">
                            <div className="flex justify-around mb-4">
                              <StorageGauge
                                value={unit.temperature}
                                max={50}
                                label="Temp"
                                unit="°C"
                                color="#0ea5e9"
                              />
                              <StorageGauge
                                value={unit.humidity}
                                max={100}
                                label="Humidity"
                                unit="%"
                                color="#22c55e"
                              />
                              <StorageGauge
                                value={unit.capacityUsed}
                                max={100}
                                label="Capacity"
                                unit="%"
                                color="#f59e0b"
                              />
                            </div>

                            {/* Stored produce */}
                            {unit.produceStored.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1">
                                {unit.produceStored.map((p, i) => (
                                  <span
                                    key={i}
                                    className="text-xs bg-[#FDE7B3]/40 text-[#5B532C] px-2 py-0.5 rounded-full"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </div>

                {/* Inventory overview with shelf life */}
                {activeLots.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-bold text-[#5B532C]">
                      Inventory Shelf Life
                    </h2>
                    {activeLots.map((lot: LotData, idx: number) => {
                      const daysStored = getDaysStored(lot)
                      const shelfLifePct = getShelfLifePercent(lot)
                      const warehouseName =
                        typeof lot.warehouse === "string"
                          ? lot.warehouse
                          : lot.warehouse?.name || "Unknown"

                      return (
                        <motion.div
                          key={lot._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-white rounded-xl p-5 shadow-md border border-[#5B532C]/10"
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-bold text-[#5B532C] text-lg">
                                  {lot.cropName}
                                </h4>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getConditionColor(lot.currentCondition)}`}
                                >
                                  {lot.currentCondition}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${lot.status === "stored"
                                    ? "bg-blue-50 text-blue-700"
                                    : lot.status === "dispatched"
                                      ? "bg-green-50 text-green-700"
                                      : "bg-gray-50 text-gray-700"
                                    }`}
                                >
                                  {lot.status}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-[#5B532C]/70">
                                <span className="flex items-center gap-1">
                                  <Package className="w-3.5 h-3.5" />
                                  {lot.quantityQuintals} quintals
                                </span>
                                <span className="flex items-center gap-1">
                                  <WarehouseIcon className="w-3.5 h-3.5" />
                                  {warehouseName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  {daysStored} days stored
                                </span>
                                {lot.source && (
                                  <span className="flex items-center gap-1">
                                    <Truck className="w-3.5 h-3.5" />
                                    {lot.source}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Shelf Life Indicator */}
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <p className="text-xs text-[#5B532C]/60 mb-1">
                                  Shelf Life
                                </p>
                                <div className="w-24 bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className={`h-2.5 rounded-full transition-all ${shelfLifePct > 50
                                      ? "bg-green-500"
                                      : shelfLifePct > 25
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                      }`}
                                    style={{ width: `${shelfLifePct}%` }}
                                  />
                                </div>
                                <p
                                  className={`text-xs font-medium mt-1 ${shelfLifePct > 50
                                    ? "text-green-600"
                                    : shelfLifePct > 25
                                      ? "text-amber-600"
                                      : "text-red-600"
                                    }`}
                                >
                                  {shelfLifePct}% remaining
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* View Timeline Button */}
                          <div className="mt-4 pt-3 border-t border-[#5B532C]/5">
                            <button
                              onClick={() => handleViewTimeline(lot)}
                              className="flex items-center gap-2 text-xs font-medium text-[#63A361] hover:text-[#578f55] transition-colors"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              View Full Traceability History →
                            </button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════ */}
            {/* TAB: Distribution Planner                   */}
            {/* ════════════════════════════════════════════ */}
            {activeTab === "distribution" && (
              <div>
                {/* Alert context banner */}
                {dispatchAlert && dispatchLotForAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 rounded-xl border border-amber-300 bg-amber-50 flex items-start gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Alert Context: {dispatchLotForAlert.cropName} (
                        {dispatchLotForAlert.lotId}) is at{" "}
                        {dispatchAlert.severity.toUpperCase()} RISK
                      </p>
                      <p className="text-xs text-amber-700/70 mt-0.5">
                        {dispatchAlert.message}. Use the tool below to find the
                        best market, then confirm your dispatch.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setDispatchAlert(null)
                        setDispatchLotForAlert(null)
                        setShowDispatchBar(false)
                      }}
                      className="ml-auto flex-shrink-0 text-amber-400 hover:text-amber-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Lot Selection */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-lg border border-[#5B532C]/10 p-6">
                      <h3 className="font-bold text-[#5B532C] mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-[#63A361]" />
                        Select Lot to Dispatch
                      </h3>

                      {activeLots.length === 0 ? (
                        <p className="text-sm text-[#5B532C]/60">
                          No stored lots available.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {activeLots.map((lot: LotData) => {
                            const daysStored = getDaysStored(lot)
                            const isSelected = selectedDistLot?._id === lot._id
                            return (
                              <button
                                key={lot._id}
                                onClick={() => {
                                  setSelectedDistLot(lot)
                                  setDispatchQty(String(lot.quantityQuintals))
                                  setDistResult(null)
                                }}
                                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${isSelected
                                  ? "border-[#63A361] bg-[#63A361]/5"
                                  : "border-[#5B532C]/10 hover:border-[#FFC50F]/50"
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-[#5B532C]">
                                    {lot.cropName}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${daysStored > 14
                                      ? "bg-red-100 text-red-700"
                                      : daysStored > 7
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-green-100 text-green-700"
                                      }`}
                                  >
                                    {daysStored}d stored
                                  </span>
                                </div>
                                <div className="flex gap-3 mt-1 text-xs text-[#5B532C]/60">
                                  <span>{lot.quantityQuintals} qtl</span>
                                  <span>{lot.currentCondition}</span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {/* Dispatch Quantity + Market Scope */}
                      {selectedDistLot && (
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="block text-sm text-[#5B532C]/70 mb-1">
                              Dispatch Quantity (quintals)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={dispatchQty}
                              onChange={(e) => setDispatchQty(e.target.value)}
                              max={selectedDistLot.quantityQuintals}
                              className="w-full px-3 py-2 border-2 border-[#5B532C]/20 rounded-lg focus:border-[#FFC50F] focus:outline-none"
                            />
                          </div>

                          {/* Market Scope Tabs */}
                          <div>
                            <label className="block text-xs font-medium text-[#5B532C]/50 mb-1.5">
                              Market Scope
                            </label>
                            <div className="flex rounded-lg border border-[#5B532C]/15 overflow-hidden">
                              {(["all", "state"] as const).map((scope) => {
                                const warehouseCity =
                                  typeof selectedDistLot.warehouse === "object"
                                    ? selectedDistLot.warehouse.location
                                      ?.city || ""
                                    : ""
                                const warehouseState =
                                  getStateForCity(warehouseCity)
                                const labels: Record<string, string> = {
                                  all: "All India",
                                  state: warehouseState || "State",
                                }
                                return (
                                  <button
                                    key={scope}
                                    onClick={() => {
                                      setMarketScope(scope)
                                      setDistResult(null)
                                    }}
                                    className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${marketScope === scope
                                      ? "bg-[#63A361] text-white"
                                      : "bg-white text-[#5B532C]/60 hover:bg-gray-50"
                                      }`}
                                  >
                                    {labels[scope]}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <button
                            onClick={handleDistributionAnalyze}
                            disabled={distAnalyzing}
                            className="w-full px-4 py-2.5 bg-[#63A361] hover:bg-[#578f55] text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {distAnalyzing ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                Analyzing Markets...
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                Get Recommendation
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Results */}
                  <div className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                      {!distResult && !distAnalyzing && (
                        <motion.div
                          key="empty"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center h-full min-h-[400px] text-center"
                        >
                          <Truck className="w-20 h-20 text-[#5B532C]/10 mb-4" />
                          <h3 className="text-lg font-semibold text-[#5B532C]/40">
                            Select a lot and analyze
                          </h3>
                          <p className="text-sm text-[#5B532C]/30 mt-1">
                            AI will recommend the best markets for dispatch
                          </p>
                        </motion.div>
                      )}

                      {distAnalyzing && (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center h-full min-h-[400px]"
                        >
                          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#63A361] mb-4" />
                          <p className="text-[#5B532C]/70">
                            Analyzing markets across 7 states...
                          </p>
                        </motion.div>
                      )}

                      {distResult && !distAnalyzing && (
                        <motion.div
                          key="results"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-6"
                        >
                          {/* Urgency & Summary */}
                          <div
                            className={`${urgencyConfig[distResult.urgency].bg} ${urgencyConfig[distResult.urgency].border} border rounded-xl p-5`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h3
                                className={`font-bold ${urgencyConfig[distResult.urgency].text} flex items-center gap-2`}
                              >
                                {distResult.urgency === "high" ? (
                                  <AlertTriangle className="w-5 h-5" />
                                ) : (
                                  <CheckCircle className="w-5 h-5" />
                                )}
                                Dispatch Recommendation
                              </h3>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${urgencyConfig[distResult.urgency].badge}`}
                              >
                                {distResult.urgency.toUpperCase()} URGENCY
                              </span>
                            </div>
                            <p className="text-sm text-[#5B532C]/80">
                              {distResult.summary}
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-sm">
                              <ClockIcon className="w-4 h-4 text-[#5B532C]/50" />
                              <span className="text-[#5B532C]/70">
                                {distResult.dispatchWindow}
                              </span>
                            </div>
                          </div>

                          {/* Market Rankings */}
                          <div className="bg-white rounded-xl shadow-lg border border-[#5B532C]/10 p-6">
                            <h3 className="font-bold text-[#5B532C] mb-4 flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-[#63A361]" />
                              Ranked Market Options
                            </h3>

                            <div className="space-y-4">
                              {distResult.recommendedMarkets.map(
                                (market, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`p-4 rounded-lg border-2 ${idx === 0
                                      ? "border-[#63A361] bg-[#63A361]/5"
                                      : "border-[#5B532C]/10"
                                      }`}
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-start gap-3">
                                        <div
                                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0
                                            ? "bg-[#63A361] text-white"
                                            : "bg-[#FDE7B3] text-[#5B532C]"
                                            }`}
                                        >
                                          {idx + 1}
                                        </div>
                                        <div>
                                          <h4 className="font-semibold text-[#5B532C]">
                                            {market.market}
                                          </h4>
                                          <p className="text-sm text-[#5B532C]/60">
                                            {market.state}
                                          </p>
                                        </div>
                                      </div>
                                      {idx === 0 && (
                                        <span className="text-xs bg-[#63A361] text-white px-2 py-0.5 rounded-full">
                                          Best Pick
                                        </span>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                                      <div className="text-center p-2 bg-white rounded-lg border border-[#5B532C]/5">
                                        <DollarSign className="w-4 h-4 text-[#63A361] mx-auto mb-1" />
                                        <p className="text-xs text-[#5B532C]/60">
                                          Price
                                        </p>
                                        <p className="text-sm font-bold text-[#5B532C]">
                                          {market.price}
                                        </p>
                                      </div>
                                      <div className="text-center p-2 bg-white rounded-lg border border-[#5B532C]/5">
                                        <MapPin className="w-4 h-4 text-[#63A361] mx-auto mb-1" />
                                        <p className="text-xs text-[#5B532C]/60">
                                          Distance
                                        </p>
                                        <p className="text-sm font-bold text-[#5B532C]">
                                          {market.distance}
                                        </p>
                                      </div>
                                      <div className="text-center p-2 bg-white rounded-lg border border-[#5B532C]/5">
                                        <ClockIcon className="w-4 h-4 text-[#63A361] mx-auto mb-1" />
                                        <p className="text-xs text-[#5B532C]/60">
                                          Transport
                                        </p>
                                        <p className="text-sm font-bold text-[#5B532C]">
                                          {market.transportTime}
                                        </p>
                                      </div>
                                      <div className="text-center p-2 bg-white rounded-lg border border-[#5B532C]/5">
                                        <TrendingUp className="w-4 h-4 text-[#63A361] mx-auto mb-1" />
                                        <p className="text-xs text-[#5B532C]/60">
                                          Net Revenue
                                        </p>
                                        <p className="text-sm font-bold text-[#63A361]">
                                          {market.netRevenue}
                                        </p>
                                      </div>
                                    </div>

                                    {market.spoilageRisk && (
                                      <div className="mt-2 flex items-center gap-1.5">
                                        <AlertTriangle
                                          className={`w-3.5 h-3.5 ${market.spoilageRisk === "high"
                                            ? "text-red-500"
                                            : market.spoilageRisk === "medium"
                                              ? "text-amber-500"
                                              : "text-green-500"
                                            }`}
                                        />
                                        <span
                                          className={`text-xs ${market.spoilageRisk === "high"
                                            ? "text-red-600"
                                            : market.spoilageRisk === "medium"
                                              ? "text-amber-600"
                                              : "text-green-600"
                                            }`}
                                        >
                                          Spoilage risk: {market.spoilageRisk}
                                        </span>
                                      </div>
                                    )}
                                  </motion.div>
                                ),
                              )}
                            </div>

                            {/* Standalone Dispatch Button */}
                            <div className="mt-6 flex justify-end">
                              <button
                                onClick={() => {
                                  setDispatchLotForAlert(selectedDistLot)
                                  setShowDispatchBar(true)
                                }}
                                className="flex items-center gap-2 px-6 py-3 bg-[#63A361] hover:bg-[#578f55] text-white rounded-xl font-bold shadow-lg shadow-green-900/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <Truck className="w-5 h-5" />
                                Proceed to Dispatch
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Add Warehouse Modal ─── */}
      <AnimatePresence>
        {showAddWarehouse && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddWarehouse(false)}
              className="fixed inset-0 bg-black/30 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-white rounded-2xl shadow-xl border border-[#5B532C]/10 w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-[#5B532C]">
                    Add Warehouse
                  </h3>
                  <button
                    onClick={() => setShowAddWarehouse(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-[#5B532C]/40"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddWarehouse} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5B532C]/70 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={whForm.name}
                      onChange={(e) =>
                        setWhForm({ ...whForm, name: e.target.value })
                      }
                      placeholder="Main Godown"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#5B532C]/15 text-[#5B532C] bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30 focus:border-[#63A361]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5B532C]/70 mb-1">
                      City (for weather)
                    </label>
                    <input
                      type="text"
                      value={whForm.city}
                      onChange={(e) =>
                        setWhForm({ ...whForm, city: e.target.value })
                      }
                      placeholder="Nashik"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#5B532C]/15 text-[#5B532C] bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30 focus:border-[#63A361]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#5B532C]/70 mb-1">
                        Type
                      </label>
                      <select
                        value={whForm.type}
                        onChange={(e) =>
                          setWhForm({ ...whForm, type: e.target.value })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-[#5B532C]/15 text-[#5B532C] bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30"
                      >
                        <option value="dry">Dry / Godown</option>
                        <option value="cold_storage">Cold Storage</option>
                        <option value="ventilated">Ventilated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#5B532C]/70 mb-1">
                        Capacity (qtl)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={whForm.capacity}
                        onChange={(e) =>
                          setWhForm({ ...whForm, capacity: e.target.value })
                        }
                        placeholder="500"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#5B532C]/15 text-[#5B532C] bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#63A361] hover:bg-[#578f55] text-white font-semibold rounded-xl transition-colors"
                  >
                    Create Warehouse
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Add Lot Modal ─── */}
      <AnimatePresence>
        {showAddLot && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddLot(false)}
              className="fixed inset-0 bg-black/30 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-white rounded-2xl shadow-xl border border-[#5B532C]/10 w-full max-w-md p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-[#5B532C]">
                    Add Produce Lot
                  </h3>
                  <button
                    onClick={() => setShowAddLot(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-[#5B532C]/40"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddLot} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#5B532C]/70 mb-1">
                      Warehouse
                    </label>
                    <select
                      value={lotForm.warehouse}
                      onChange={(e) =>
                        setLotForm({ ...lotForm, warehouse: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-[#5B532C]/15 text-[#5B532C] bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30"
                    >
                      <option value="">Select warehouse</option>
                      {warehouses.map((wh) => (
                        <option key={wh._id} value={wh._id}>
                          {wh.name} — {wh.location.city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#5B532C]/70 mb-1">
                      Crop
                    </label>
                    <select
                      value={lotForm.cropName}
                      onChange={(e) =>
                        setLotForm({ ...lotForm, cropName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-[#5B532C]/15 text-[#5B532C] bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30"
                    >
                      <option value="">Select crop</option>
                      {CROP_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#5B532C]/70 mb-1">
                        Quantity (qtl)
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={lotForm.quantity}
                        onChange={(e) =>
                          setLotForm({ ...lotForm, quantity: e.target.value })
                        }
                        placeholder="54"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#5B532C]/15 text-[#5B532C] bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#5B532C]/70 mb-1">
                        Source (optional)
                      </label>
                      <input
                        type="text"
                        value={lotForm.source}
                        onChange={(e) =>
                          setLotForm({ ...lotForm, source: e.target.value })
                        }
                        placeholder="North Field"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#5B532C]/15 text-[#5B532C] bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-[#63A361]/30"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#63A361] hover:bg-[#578f55] text-white font-semibold rounded-xl transition-colors"
                  >
                    Store Produce
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Timeline Drawer ─── */}
      <LotTimeline
        events={timelineEvents}
        lotId={timelineLot?.lotId || ""}
        cropName={timelineLot?.cropName || ""}
        isOpen={timelineOpen}
        onClose={() => setTimelineOpen(false)}
      />

      {/* ─── Dispatch Decision Bar (Standalone or from alert flow) ─── */}
      {dispatchLotForAlert && (
        <DispatchConfirmForm
          alert={dispatchAlert}
          lot={dispatchLotForAlert}
          isVisible={showDispatchBar}
          onDispatched={() => {
            setDispatchAlert(null)
            setDispatchLotForAlert(null)
            setShowDispatchBar(false)
            loadData() // Reload all data to sync UI
          }}
          onDecideLater={async () => {
            if (dispatchAlert) {
              try {
                await warehouseService.markAlertRead(dispatchAlert._id)
              } catch { }
            }
            setShowDispatchBar(false)
          }}
          onClose={() => {
            setDispatchAlert(null)
            setDispatchLotForAlert(null)
            setShowDispatchBar(false)
          }}
        />
      )}
    </div>
  )
}

export default Warehouse
