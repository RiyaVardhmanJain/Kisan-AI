import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Navbar } from "./components/Navbar"
import { Home } from "./pages/Home"
import Consult from "./pages/Consult"
import Monitoring from "./pages/Monitoring"
import { MarketInsights } from "./pages/MarketInsights"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Warehouse from "./pages/Warehouse"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { AuthProvider } from "./context/AuthContext"

import Chatbot from "./components/Chatbot"

function App() {
  return (
    <AuthProvider>
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
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/warehouse"
                element={
                  <ProtectedRoute>
                    <Warehouse />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
