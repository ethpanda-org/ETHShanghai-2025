import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Data from './pages/Data'
import Marketplace from './pages/Marketplace'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Docs from './pages/Docs'
import Web3Demo from './pages/Web3Demo'
import MintSBTExample from './pages/MintSBTExample'
import NotFound from './pages/NotFound'
import WorldID from './pages/WorldID'
import SelfXyz from './pages/SelfXyz'
import Wallet from './pages/Wallet'
import OffchainVC from './pages/OffchainVC'
import StarBorderDemo from './pages/StarBorderDemo'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/data" element={<Data />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/web3-demo" element={<Web3Demo />} />
          <Route path="/mint-sbt" element={<MintSBTExample />} />
          <Route path="/worldid" element={<WorldID />} />
          <Route path="/selfxyz" element={<SelfXyz />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/offchain-vc" element={<OffchainVC />} />
          <Route path="/star-demo" element={<StarBorderDemo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

