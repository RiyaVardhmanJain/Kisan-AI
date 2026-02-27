import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Navbar } from "./components/Navbar"
import { Home } from "./pages/Home"
import Consult from "./pages/Consult"
import Monitoring from "./pages/Monitoring"
import { MarketInsights } from "./pages/MarketInsights"
import Water from "./pages/SmartFarming"
import Chatbot from "./components/Chatbot"

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Chatbot />
        <main className="pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/monitor"
              element={<Monitoring />}
            />
            <Route path="/consult" element={<Consult />} />
            <Route path="/market" element={<MarketInsights />} />
            <Route path="/farming" element={<Water />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
