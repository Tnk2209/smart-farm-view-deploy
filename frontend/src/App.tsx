import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";


// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MapView from "./pages/MapView";
import StationsList from "./pages/StationsList";
import StationDetail from "./pages/StationDetail";
import SensorsList from "./pages/SensorsList";
import SensorDetail from "./pages/SensorDetail";
import Alerts from "./pages/Alerts";
import AdminUsers from "./pages/AdminUsers";
import AdminThresholds from "./pages/AdminThresholds";
import AdminSettings from "./pages/AdminSettings";
import RegisterPlot from "./pages/RegisterPlot";
import ApprovePlots from "./pages/ApprovePlots";
import DiseaseRisk from "./pages/DiseaseRisk";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/map" element={
                <ProtectedRoute><MapView /></ProtectedRoute>
              } />
              <Route path="/stations" element={
                <ProtectedRoute><StationsList /></ProtectedRoute>
              } />
              <Route path="/stations/:id" element={
                <ProtectedRoute><StationDetail /></ProtectedRoute>
              } />
              <Route path="/sensors" element={
                <ProtectedRoute requiredPermission="view_sensor_data"><SensorsList /></ProtectedRoute>
              } />
              <Route path="/sensors/:id" element={
                <ProtectedRoute requiredPermission="view_sensor_data"><SensorDetail /></ProtectedRoute>
              } />
              <Route path="/alerts" element={
                <ProtectedRoute><Alerts /></ProtectedRoute>
              } />
              
              {/* Farm Plot Routes (UC10, UC11) */}
              <Route path="/register-plot" element={
                <ProtectedRoute><RegisterPlot /></ProtectedRoute>
              } />
              <Route path="/admin/approve-plots" element={
                <ProtectedRoute requiredPermission="manage_user"><ApprovePlots /></ProtectedRoute>
              } />
              
              {/* Disease Risk Route (UC12) */}
              <Route path="/disease-risk" element={
                <ProtectedRoute><DiseaseRisk /></ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin/users" element={
                <ProtectedRoute requiredPermission="manage_user"><AdminUsers /></ProtectedRoute>
              } />
              <Route path="/admin/thresholds" element={
                <ProtectedRoute requiredPermission="configure_threshold"><AdminThresholds /></ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute requiredPermission="manage_station"><AdminSettings /></ProtectedRoute>
              } />

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
