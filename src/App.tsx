import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter as Router } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

import { CartProvider } from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { SeoProvider } from "./context/SeoContext";
import AnalyticsScripts from "./components/seo/AnalyticsScripts";
import { ThemeProvider } from "./context/ThemeContext";
import AppRoutes from "./AppRoutes";
import NoInternet from "./pages/NoInternet";
import ScrollToTop from "./components/ScrollToTop";
import { WishlistProvider } from "./context/WishlistContext";
import { UserNotificationProvider } from "./context/UserNotificationContext";

import { GLOBAL_COLORS } from "./utils/colors";

import { Toaster } from "react-hot-toast";
import ToastDeduplicator from "./components/ToastDeduplicator";

// Single QueryClient instance — created outside the component to avoid re-creation on re-renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Inject global colors as custom properties to easy handle color styling globally
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--sidebar-start", GLOBAL_COLORS.sidebarStart);
    root.style.setProperty("--sidebar-end", GLOBAL_COLORS.sidebarEnd);
    root.style.setProperty("--primary-color", GLOBAL_COLORS.primary);
    root.style.setProperty("--primary-hover", GLOBAL_COLORS.primaryHover);
    root.style.setProperty("--primary-light", GLOBAL_COLORS.primaryLight);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <BrandingProvider>
      <SeoProvider>
      <AnalyticsScripts />
      <ThemeProvider>
      <CartProvider>
        <WishlistProvider isAuthenticated={user.isAuthenticated}>
          <UserNotificationProvider>
            <Toaster
                position="top-right"
                reverseOrder={false}
                toastOptions={{
                  duration: 3000,
                  style: {
                    borderRadius: "12px",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "13px",
                    background: "#ffffff",
                    color: "#1e293b",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                  },
                }}
              />
              <ToastDeduplicator />
              {isOnline ? (
                user.isInitialLoad ? (
                  <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 font-sans">
                    <p className="text-sm uppercase font-bold tracking-widest text-slate-400 font-mono text-center select-none">
                      Loading...
                    </p>
                  </div>
                ) : (
                  <AppRoutes />
                )
              ) : (
                <NoInternet />
              )}
          </UserNotificationProvider>
        </WishlistProvider>
      </CartProvider>
      </ThemeProvider>
      </SeoProvider>
    </BrandingProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <ScrollToTop />
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
