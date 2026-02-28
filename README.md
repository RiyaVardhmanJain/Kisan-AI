# 🌾 Kisan AI

> **AI-powered agricultural intelligence platform for Indian farmers**

🚀 **Live Demo:** [https://kisan-ai-26.vercel.app/](https://kisan-ai-26.vercel.app/)

---

## 👥 Team

| Name | Role |
|---|---|
| **Riya Jain** | Full Stack Developer |
| **Sumeet Gond** | Full Stack Developer |

---

## 📖 Project Overview

**Kisan AI** is a comprehensive full-stack agricultural technology platform that empowers Indian farmers with AI-driven insights. From warehouse management and disease detection to market intelligence and multilingual chat support — Kisan AI covers the complete farming lifecycle.

---

## 🏗️ Tech Stack

### Frontend
- **React 19** + **TypeScript** · Vite
- **Framer Motion** (animations) · **Lucide React** (icons)
- **Recharts** (data visualization) · **React Dropzone** (file uploads)
- **React Hot Toast** (notifications) · **Axios** (HTTP)

### Backend
- **Node.js** + **Express.js**
- **MongoDB Atlas** (via Mongoose)
- **JWT Authentication**
- **bcryptjs** (password hashing)

### AI / APIs
- **Google Gemini 2.5 Pro** — Disease & Storage image analysis
- **Groq API + Kimi K2** — Chatbot, eConsultant, Market intelligence
- **OpenWeatherMap** — Real-time weather data
- **Mandi price data** — Niti-Ayog API (JSON-based)

---

## ✨ Feature Flows

### 🔐 Authentication
- Register with phone + password (JWT issued on success)
- Login / Logout with persistent token in localStorage
- Protected routes — all warehouse/lot features require login

---

### 🏠 Home
- Overview dashboard with feature navigation
- Animated landing components

---

### 🏗️ Warehouse Management *(Full CRUD — authenticated)*
**My Storage tab:**
- View all warehouses with capacity, used space, type (dry / cold storage / ventilated)
- Add new warehouse (name, type, location, capacity)
- View stored produce lots — crop name, quantity (quintals), condition, shelf life, sell-by date
- Add a new lot → auto-calculates shelf life and recommended sell-by date
- Merge lots, shift lots between warehouses, delete lots

**Distribution tab:**
- Select a lot → get AI-powered market distribution recommendation
- Uses **Maharashtra mandi price data** exclusively
- AI returns: best markets, transport cost, optimal dispatch time, urgency level
- Sell vs. Store analysis

**Alerts tab:**
- Auto-generated spoilage and condition alerts per lot
- Alert-to-dispatch flow: farmer can dispatch directly from an alert
- Option to sell produce or take preventive action
- Alert history tracking

---

### 🤖 AI Chatbot *(Warehouse-aware)*
- Multilingual (50+ languages) with voice input support
- **CRUD via chat:** `"Add 200 qtl onion to Patil warehouse"` → consent prompt → executes on `"yes"`
- Supported chat commands:
  - `add_lot` — add produce to a warehouse
  - `add_warehouse` — create a new warehouse
  - `update_lot_status` — mark as sold / dispatched / at-risk / spoiled
  - `delete_lot` — remove a lot (with confirmation)
- View queries: lots, warehouses, alerts, conditions, summary
- Falls back to general AI advice for unrecognized queries

---

### 🔍 Disease Detection
- Upload or drag-and-drop crop/plant images
- AI (Gemini 2.5 Pro) returns: disease name, severity, organic & chemical treatment, prevention plan
- Storage spoilage analysis mode

---

### 📊 Market Insights
- Real-time mandi prices across Maharashtra
- Interactive charts — price trends, district comparisons
- Crop-wise price history and peak price period

---

### 🌱 eConsultant *(Phase-Aware)*
3-step flow:
1. Enter crop name + cultivated area → AI fetches growth phases
2. Select current phase + location (tahsil)
3. AI generates full business analysis:

| Phase Type | Sections shown |
|---|---|
| Pre-harvest (seeding, vegetative, flowering) | Growth progress, Yield forecast, Farming schedule, Market intel, Value addition, Risk forecast, Action items |
| Harvest / Post-harvest | All above **+ Storage Strategy** (method, temp, humidity, cost, spoilage risk, emergency actions) |

---

### 📡 Monitoring *(Storage Detection)*
- Upload warehouse/godown images
- Gemini AI detects: mold, moisture damage, pest signs, ventilation status, produce condition
- Returns: storage risk level, shelf life estimate, recommendations, preventive measures

---

### 🌿 Smart Farming
- AI advice on organic farming, integrated farming, rainwater harvesting
- Cost-benefit analysis for modern techniques

---

### 🌾 Crop Advisory
- AI crop recommendations based on season, soil, and location
- Yield optimization and seasonal planting calendar

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- API keys: Gemini, Groq, OpenWeatherMap

### 1. Clone the repo
```bash
git clone https://github.com/RiyaVardhmanJain/Kisan-AI.git
cd Kisan-AI
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret
PORT=3001
```

Start backend:
```bash
node index.js
```

### 3. Frontend setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GROQ_API_KEY=your_groq_api_key
VITE_WEATHER_KEY=your_openweathermap_key
```

Start frontend:
```bash
npm run dev
```

App runs at **http://localhost:5173**

---

## 🌐 Deployment

| Service | Platform |
|---|---|
| Frontend | [Vercel](https://kisan-ai-26.vercel.app/) |
| Backend | Railway / Render |
| Database | MongoDB Atlas |

---

## 📁 Project Structure

```
Kisan-AI/
├── backend/
│   ├── chatbot/          # Intent detection, mutation handler, DB context builder
│   ├── models/           # Mongoose schemas (User, Warehouse, ProduceLot, Alert, StorageEvent)
│   ├── routes/           # Auth, warehouse, lot, alert, chatbot routes
│   ├── utils/            # Shelf life calculator, spoilage engine, weather client
│   └── index.js
├── frontend/
│   ├── src/
│   │   ├── ai/           # Gemini & Groq service + prompt files
│   │   ├── components/   # Reusable UI components (Chatbot, monitoring results, alerts)
│   │   ├── pages/        # Route-level pages
│   │   ├── services/     # Auth service (HTTP)
│   │   ├── hooks/        # Custom hooks (DB chat context)
│   │   ├── data/         # Maharashtra mandi price JSON
│   │   └── types/        # TypeScript type definitions
│   └── index.html
└── README.md
```

---

*Built with ❤️ for Indian farmers by Riya Jain & Sumeet Gond*
