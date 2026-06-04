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

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/Login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/projecrnews" element={<ProjectNews />} />
        <Route path="/projects" element={<Project />} />
        <Route path="/usermanagement" element={<UserManagement />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<DailyReports />} />
      </Routes>
    </Router>
  );
}
