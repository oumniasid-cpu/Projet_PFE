import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import ProjectNews from "./pages/ProjectNews";
import RegisterPage from "./pages/Register";
import Project from "./pages/Projects";
import UserManagement from "./AdminPages/UserManagement";
import Settings from "./pages/Settings";
import DailyReports from "./components/DailyReports";
import PrivateRoute from "./components/PrivateRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        {/* Corrigé : "/Login" -> "/login" (minuscule), pour matcher tous les
            navigate('/login') utilisés ailleurs (SideBar, Dashboard, Register,
            Login lui-même). React Router est sensible à la casse par défaut :
            une route "/Login" ne matche jamais un navigate('/login'). */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/projecrnews" element={<PrivateRoute><ProjectNews /></PrivateRoute>} />

        
        <Route path="/projects" element={<PrivateRoute><Project /></PrivateRoute>} />
        <Route path="/usermanagement" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><DailyReports /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}