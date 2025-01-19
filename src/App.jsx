import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ComplaintProvider } from './context/ComplaintContext';
import Header from './components/layout/Header';
import Home from './pages/Home';
import SubmitComplaint from './pages/SubmitComplaint';
import TrackComplaint from './pages/TrackComplaint';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminComplaintDetails from './pages/AdminComplaintDetails';

function App() {
  return (
    <ComplaintProvider>
      <Router>
        <div dir="rtl" className="min-h-screen bg-gray-50">
          <Toaster position="top-center" />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<><Header /><Home /></>} />
            <Route path="/submit" element={<><Header /><SubmitComplaint /></>} />
            <Route path="/track" element={<><Header /><TrackComplaint /></>} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/complaints/:complaintId" element={<AdminComplaintDetails />} />
          </Routes>
        </div>
      </Router>
    </ComplaintProvider>
  );
}

export default App;
