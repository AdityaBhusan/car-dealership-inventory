import { Route, Routes } from 'react-router-dom'

import AdminRoute from './components/AdminRoute'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminInventoryPage from './pages/AdminInventoryPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'
import VehicleDetailsPage from './pages/VehicleDetailsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/vehicles/:id" element={<VehicleDetailsPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminInventoryPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
