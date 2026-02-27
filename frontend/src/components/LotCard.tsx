import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Package,
  Calendar,
  Clock,
  ChevronRight,
  ChevronDown,
  Truck,
  Trash2,
  ArrowRightLeft,
  MoreVertical,
  X,
} from "lucide-react"
import type { LotData, WarehouseData } from "../services/warehouseService"

interface LotCardProps {
  lot: LotData
  warehouses?: WarehouseData[]
  onViewTimeline?: (lot: LotData) => void
  onUpdateStatus?: (lot: LotData, newStatus: string) => void
  onSellDispatch?: (lot: LotData) => void
  onDelete?: (lot: LotData) => void
  onShift?: (lot: LotData, targetWarehouseId: string) => void
}

const conditionConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  good: {
    label: "Good",
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  watch: {
    label: "Watch",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  at_risk: {
    label: "At Risk",
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
  spoiled: {
    label: "Spoiled",
    bg: "bg-gray-200",
    text: "text-gray-700",
    dot: "bg-gray-500",
  },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  stored: { label: "Stored", color: "text-[#63A361]" },
  partially_dispatched: { label: "Partially Sent", color: "text-yellow-600" },
  dispatched: { label: "Dispatched", color: "text-blue-600" },
  sold: { label: "Sold", color: "text-gray-500" },
}

const statusTransitions: Record<string, string[]> = {
  stored: ["dispatched", "sold"],
  partially_dispatched: ["dispatched", "sold"],
  dispatched: ["sold"],
  sold: [],
}

export const LotCard: React.FC<LotCardProps> = ({
  lot,
  warehouses,
  onViewTimeline,
  onUpdateStatus,
  onSellDispatch,
  onDelete,
  onShift,
}) => {
  const [statusOpen, setStatusOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const condition =
    conditionConfig[lot.currentCondition] || conditionConfig.good
  const status = statusConfig[lot.status] || statusConfig.stored

  const entryDate = new Date(lot.entryDate)
  const sellByDate = new Date(lot.recommendedSellByDate)
  const now = new Date()
  const daysStored = Math.floor(
    (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24),
  )
  const daysRemaining = Math.max(
    0,
    Math.floor((sellByDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  )
  const totalDays = lot.expectedShelfLifeDays || 60
  const progress = Math.min((daysStored / totalDays) * 100, 100)

  const warehouseName =
    typeof lot.warehouse === "object" ? lot.warehouse.name : "Unknown"
  const currentWarehouseId =
    typeof lot.warehouse === "object" ? lot.warehouse._id : lot.warehouse

  const nextStatuses = statusTransitions[lot.status] || []

  // Only show warehouses that are different from current
  const otherWarehouses = (warehouses || []).filter(
    (wh) => wh._id !== currentWarehouseId,
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-[#5B532C]/10 p-4 hover:shadow-md transition-shadow relative"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#FDE7B3]/30">
            <Package className="w-5 h-5 text-[#63A361]" />
          </div>
          <div>
            <h3 className="font-semibold text-[#5B532C] text-sm">
              {lot.cropName}
            </h3>
            <p className="text-xs text-[#5B532C]/50">
              {lot.lotId} · {warehouseName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Condition badge */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${condition.bg} ${condition.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${condition.dot}`} />
            {condition.label}
          </span>
          {/* More actions menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-lg hover:bg-gray-100 text-[#5B532C]/40 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[#5B532C]/10 z-30 min-w-[160px] overflow-hidden py-1"
                >
                  {onSellDispatch &&
                    lot.status !== "dispatched" &&
                    lot.status !== "sold" &&
                    lot.quantityQuintals > 0 && (
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          onSellDispatch(lot)
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-2"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Sell / Dispatch
                      </button>
                    )}
                  {onShift &&
                    otherWarehouses.length > 0 &&
                    lot.status !== "dispatched" &&
                    lot.status !== "sold" && (
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          setShowShiftModal(true)
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Shift Warehouse
                      </button>
                    )}
                  {onViewTimeline && (
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onViewTimeline(lot)
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-[#5B532C]/70 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                      View Timeline
                    </button>
                  )}
                  {onDelete && (
                    <>
                      <div className="border-t border-[#5B532C]/5 my-1" />
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          setShowDeleteConfirm(true)
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Lot
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Quantity + status with dropdown */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-lg font-bold text-[#5B532C]">
          {lot.quantityQuintals}{" "}
          <span className="text-xs font-normal text-[#5B532C]/50">
            quintals
          </span>
        </span>
        <div className="relative">
          {onUpdateStatus && nextStatuses.length > 0 ? (
            <>
              <button
                onClick={() => setStatusOpen(!statusOpen)}
                className={`text-xs font-medium ${status.color} flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-50 border border-[#5B532C]/10 transition-colors`}
              >
                {status.label}
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${statusOpen ? "rotate-180" : ""}`}
                />
              </button>
              <AnimatePresence>
                {statusOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[#5B532C]/10 z-20 min-w-[130px] overflow-hidden"
                  >
                    {nextStatuses.map((s) => {
                      const sc = statusConfig[s] || statusConfig.stored
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            setStatusOpen(false)
                            onUpdateStatus(lot, s)
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-medium ${sc.color} hover:bg-gray-50 transition-colors`}
                        >
                          Mark as {sc.label}
                        </button>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <span className={`text-xs font-medium ${status.color}`}>
              {status.label}
            </span>
          )}
        </div>
      </div>

      {/* Shelf life progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[#5B532C]/50 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {daysStored}d stored
          </span>
          <span className="text-xs text-[#5B532C]/50">
            {daysRemaining}d remaining
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              progress > 85
                ? "bg-red-400"
                : progress > 60
                  ? "bg-yellow-400"
                  : "bg-[#63A361]"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-2 border-t border-[#5B532C]/5">
        <span className="text-xs text-[#5B532C]/40 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Sell by{" "}
          {sellByDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </span>
        <div className="flex items-center gap-2">
          {onSellDispatch &&
            lot.status !== "dispatched" &&
            lot.status !== "sold" &&
            lot.quantityQuintals > 0 && (
              <button
                onClick={() => onSellDispatch(lot)}
                className="text-xs text-orange-600 font-medium flex items-center gap-0.5 hover:underline"
              >
                <Truck className="w-3 h-3" />
                Dispatch
              </button>
            )}
          {onViewTimeline && (
            <button
              onClick={() => onViewTimeline(lot)}
              className="text-xs text-[#63A361] font-medium flex items-center gap-0.5 hover:underline"
            >
              Timeline
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Click-outside overlay for menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Shift Warehouse Modal */}
      <AnimatePresence>
        {showShiftModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShiftModal(false)}
              className="fixed inset-0 bg-black/30 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-white rounded-2xl shadow-xl border border-[#5B532C]/10 w-full max-w-sm p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-[#5B532C] flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                    Shift Lot
                  </h3>
                  <button
                    onClick={() => setShowShiftModal(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 text-[#5B532C]/40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-[#5B532C]/60 mb-1">
                  <span className="font-medium text-[#5B532C]">
                    {lot.cropName}
                  </span>{" "}
                  · {lot.lotId} · {lot.quantityQuintals}q
                </p>
                <p className="text-xs text-[#5B532C]/40 mb-4">
                  Currently in: {warehouseName}
                </p>
                <p className="text-sm font-medium text-[#5B532C] mb-2">
                  Move to:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {otherWarehouses.map((wh) => {
                    const remaining = wh.capacityQuintals - wh.usedCapacity
                    const canFit = lot.quantityQuintals <= remaining
                    return (
                      <button
                        key={wh._id}
                        disabled={!canFit}
                        onClick={() => {
                          setShowShiftModal(false)
                          onShift?.(lot, wh._id)
                        }}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          canFit
                            ? "border-[#5B532C]/10 hover:border-blue-400 hover:bg-blue-50/50"
                            : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-[#5B532C]">
                            {wh.name}
                          </span>
                          <span className="text-xs text-[#5B532C]/50">
                            {wh.location.city}
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-0.5 ${canFit ? "text-green-600" : "text-red-500"}`}
                        >
                          {canFit
                            ? `${remaining}q available`
                            : `Only ${remaining}q available (need ${lot.quantityQuintals}q)`}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/30 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="bg-white rounded-2xl shadow-xl border border-red-200 w-full max-w-sm p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5B532C]">Delete Lot?</h3>
                    <p className="text-xs text-[#5B532C]/50">
                      This cannot be undone
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[#5B532C]/70 mb-4">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{lot.cropName}</span> (
                  {lot.lotId}) — {lot.quantityQuintals}q? The warehouse capacity
                  will be freed up.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2 rounded-lg border border-[#5B532C]/15 text-[#5B532C]/70 text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      onDelete?.(lot)
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default LotCard
