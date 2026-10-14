import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProtectedRoute } from './components/ProtectedRoute';

import { HomePage } from './pages/HomePage';
import { RouteResultsPage } from './pages/RouteResultsPage';
import { MyTripsPage } from './pages/MyTripsPage';
import { SavedPlacesPage } from './pages/SavedPlacesPage';
import { ProfilePage } from './pages/ProfilePage';
import { HelpAboutPage } from './pages/HelpAboutPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { FamilySafetyPage } from './pages/FamilySafetyPage';
import { FamilyConsentPage } from './pages/FamilyConsentPage';
import { LocationConsentPage } from './pages/LocationConsentPage';
import { PlanJourneyPage } from './pages/PlanJourneyPage';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[#071C14] text-slate-100 font-sans selection:bg-[#D4AF37] selection:text-[#071C14]">
        <Navbar />
        
        <main className="flex-1">
          <ErrorBoundary>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/plan-journey" element={<PlanJourneyPage />} />
              <Route path="/plan-route" element={<RouteResultsPage />} />
              <Route path="/results" element={<RouteResultsPage />} />
              <Route path="/help" element={<HelpAboutPage />} />
              <Route path="/family-safety/accept" element={<FamilyConsentPage />} />
              <Route path="/location/share/:token" element={<LocationConsentPage />} />

              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Protected Routes */}
              <Route
                path="/family-safety"
                element={
                  <ProtectedRoute>
                    <FamilySafetyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trips"
                element={
                  <ProtectedRoute>
                    <MyTripsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saved"
                element={
                  <ProtectedRoute>
                    <SavedPlacesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </ErrorBoundary>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;
