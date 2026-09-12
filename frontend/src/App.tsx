import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import GISMap from './pages/GISMap';
import RiskAssessment from './pages/RiskAssessment';
import CarryingCapacity from './pages/CarryingCapacity';
import Relocation from './pages/Relocation';
import ComingSoon from './pages/ComingSoon';
import LoginPage from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicRoute><LoginPage /></PublicRoute>} path="/login" />
        <Route element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route path="/" element={<Dashboard />} />
          <Route path="/map" element={<GISMap />} />
          <Route path="/risk-assessment" element={<RiskAssessment />} />
          <Route path="/carrying-capacity" element={<CarryingCapacity />} />
          <Route path="/relocation" element={<Relocation />} />
          <Route path="/red-zones" element={<ComingSoon title="Red Zones" description="Automated identification of hazard-based red zones with severity classification." />} />
          <Route path="/alerts" element={<ComingSoon title="Alerts" description="Real-time alerting and notification system for disaster events." />} />
          <Route path="/reports" element={<ComingSoon title="Reports" description="Automated report generation for decision makers and stakeholders." />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;