const SHELF_LIFE_DAYS = {
    Onion: 120,
    Potato: 90,
    Wheat: 365,
    Rice: 365,
    Tomato: 14,
    Cotton: 180,
    Sugarcane: 7,
    Garlic: 180,
    Maize: 270,
    Soybean: 180,
    Groundnut: 150,
    Banana: 10,
    Mango: 12,
    Grapes: 14,
    Pomegranate: 60,
    default: 60,
};

const getShelfLife = (cropName) => {
    return SHELF_LIFE_DAYS[cropName] || SHELF_LIFE_DAYS.default;
};

const getRecommendedSellByDate = (entryDate, cropName) => {
    const days = getShelfLife(cropName);
    const sellBy = new Date(entryDate);
    sellBy.setDate(sellBy.getDate() + days);
    return sellBy;
};

module.exports = { SHELF_LIFE_DAYS, getShelfLife, getRecommendedSellByDate };
