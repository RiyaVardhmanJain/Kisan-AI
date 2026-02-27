import { api } from './authService';

export interface WarehouseData {
    _id: string;
    name: string;
    location: { city: string; address?: string };
    type: 'dry' | 'cold_storage' | 'ventilated';
    capacityQuintals: number;
    usedCapacity: number;
    isActive: boolean;
    createdAt: string;
}

export interface LotData {
    _id: string;
    lotId: string;
    warehouse: { _id: string; name: string; location: { city: string }; type: string } | string;
    cropName: string;
    quantityQuintals: number;
    entryDate: string;
    expectedShelfLifeDays: number;
    recommendedSellByDate: string;
    source: string;
    currentCondition: 'good' | 'watch' | 'at_risk' | 'spoiled';
    status: 'stored' | 'partially_dispatched' | 'dispatched' | 'sold';
    createdAt: string;
}

export interface AlertData {
    _id: string;
    lot: { _id: string; lotId: string; cropName: string } | null;
    warehouse: { _id: string; name: string } | null;
    alertType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    recommendation: string;
    isRead: boolean;
    isResolved: boolean;
    triggeredAt: string;
}

export interface StorageEventData {
    _id: string;
    eventType: string;
    description: string;
    metadata: Record<string, unknown>;
    performedAt: string;
}

export interface ConditionsData {
    weather: { temp: number; humidity: number; description: string; city: string };
    conditions: { temp: number; humidity: number; source: string };
    warehouseType: string;
    activeLots: number;
    newAlerts: number;
}

export const warehouseService = {
    // Warehouses
    async getWarehouses(): Promise<WarehouseData[]> {
        const res = await api.get('/warehouses');
        return res.data.warehouses;
    },

    async createWarehouse(data: {
        name: string;
        location: { city: string; address?: string };
        type?: string;
        capacityQuintals: number;
    }): Promise<WarehouseData> {
        const res = await api.post('/warehouses', data);
        return res.data.warehouse;
    },

    async updateWarehouse(id: string, data: Partial<WarehouseData>): Promise<WarehouseData> {
        const res = await api.put(`/warehouses/${id}`, data);
        return res.data.warehouse;
    },

    async deleteWarehouse(id: string): Promise<void> {
        await api.delete(`/warehouses/${id}`);
    },

    async getConditions(id: string): Promise<ConditionsData> {
        const res = await api.get(`/warehouses/${id}/conditions`);
        return res.data;
    },

    // Lots
    async getLots(warehouseId?: string): Promise<LotData[]> {
        const params = warehouseId ? { warehouseId } : {};
        const res = await api.get('/lots', { params });
        return res.data.lots;
    },

    async createLot(data: {
        warehouse: string;
        cropName: string;
        quantityQuintals: number;
        source?: string;
        entryDate?: string;
    }): Promise<LotData> {
        const res = await api.post('/lots', data);
        return res.data.lot;
    },

    async updateLot(id: string, data: Partial<LotData>): Promise<LotData> {
        const res = await api.put(`/lots/${id}`, data);
        return res.data.lot;
    },

    async getLotTimeline(id: string): Promise<StorageEventData[]> {
        const res = await api.get(`/lots/${id}/timeline`);
        return res.data.events;
    },

    async addLotEvent(
        id: string,
        data: { eventType: string; description: string; metadata?: Record<string, unknown> }
    ): Promise<StorageEventData> {
        const res = await api.post(`/lots/${id}/events`, data);
        return res.data.event;
    },

    // Alerts
    async getAlerts(unreadOnly = false): Promise<AlertData[]> {
        const res = await api.get('/alerts', { params: { unreadOnly: unreadOnly ? 'true' : undefined } });
        return res.data.alerts;
    },

    async markAlertRead(id: string): Promise<AlertData> {
        const res = await api.put(`/alerts/${id}/read`);
        return res.data.alert;
    },

    async resolveAlert(id: string): Promise<AlertData> {
        const res = await api.put(`/alerts/${id}/resolve`);
        return res.data.alert;
    },
};

export default warehouseService;
