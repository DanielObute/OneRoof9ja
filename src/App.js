import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import HouseDetail from './pages/HouseDetail';
import AgentProfile from './pages/AgentProfile';
import AboutUs from './pages/AboutUs';
import AgentRegister from './pages/AgentRegister';
import AgentDashboard from './pages/AgentDashboard';
import AgentVerify from './pages/AgentVerify';
import Login from './pages/Login';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/houses/:id" element={<HouseDetail />} />
        <Route path="/agents/:id" element={<AgentProfile />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/agent/register" element={<AgentRegister />} />
        <Route path="/agent/dashboard" element={<AgentDashboard />} />
        <Route path="/agent/verify" element={<AgentVerify />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </>
  );
}

export default App;