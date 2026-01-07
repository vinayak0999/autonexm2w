import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import TestInterface from './pages/TestInterface';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import UserReport from './pages/UserReport';
import { useSelector } from 'react-redux';

// Protected Route Component for Users
const PrivateRoute = ({ children }) => {
  const { token } = useSelector((state) => state.auth);
  return token ? children : <Navigate to="/" />;
};

// Admin Route - Only allows logged-in admin users
const AdminRoute = ({ children }) => {
  const { user, token } = useSelector((state) => state.auth);
  if (token && user && user.is_admin) {
    return children;
  }
  return <Navigate to="/admin-login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* User Login */}
        <Route path="/" element={<Login />} />

        {/* Admin Login */}
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Admin routes - Protected by AdminRoute */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/report/:sessionId" element={<AdminRoute><UserReport /></AdminRoute>} />

        {/* User Test Interface */}
        <Route
          path="/test"
          element={
            <PrivateRoute>
              <TestInterface />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
