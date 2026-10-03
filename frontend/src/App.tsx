import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';

import { HomePage } from './pages/HomePage';
import { RouteResultsPage } from './pages/RouteResultsPage';
import { MyTripsPage } from './pages/MyTripsPage';
import { SavedPlacesPage } from './pages/SavedPlacesPage';
import { ProfilePage } from './pages/ProfilePage';
import { HelpAboutPage } from './pages/HelpAboutPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { FamilySafetyPage } from './pages/FamilySafetyPage';
import { FamilyConsentPage } from './pages/FamilyConsentPage';

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-red-600 selection:text-white">
        <Navbar />
        
        <main className="flex-1">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/plan-route" element={<RouteResultsPage />} />
              <Route path="/family-safety" element={<FamilySafetyPage />} />
              <Route path="/family-safety/accept" element={<FamilyConsentPage />} />
              <Route path="/results" element={<RouteResultsPage />} />
              <Route path="/trips" element={<MyTripsPage />} />
              <Route path="/saved" element={<SavedPlacesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/help" element={<HelpAboutPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </ErrorBoundary>
        </main>

        <Footer />
      </div>
    </Router>
  );
};

export default App;
