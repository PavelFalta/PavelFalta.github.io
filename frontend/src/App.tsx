import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import TrafficLight from './pages/TrafficLight'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/traffic-light/:sessionId" element={<TrafficLight />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
