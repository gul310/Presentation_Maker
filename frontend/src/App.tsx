import { useState, useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CreatePage } from "./pages/CreatePage";
import { PresentationStudioPage } from "./pages/PresentationStudioPage";
import { PresentationModePage } from "./pages/PresentationModePage";
import { PracticeModePage } from "./pages/PracticeModePage";
import { PracticeReportPage } from "./pages/PracticeReportPage";
import { DiscoveryPage } from "./pages/DiscoveryPage";
import { MarketplacePage } from "./pages/MarketplacePage";
import { PublicPresentationViewPage } from "./pages/PublicPresentationViewPage";
import { AdminPage } from "./pages/AdminPage";

export function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || "/";
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Fullscreen Present Mode check (supports MongoDB ObjectId string and numeric IDs)
  if (currentPath.match(/^\/presentation\/[^/]+\/present$/)) {
    const id = currentPath.split("/")[2];
    if (id) {
      return <PresentationModePage presentationId={id as any} onNavigate={navigate} />;
    }
  }

  // Fullscreen Practice Mode check
  if (currentPath.match(/^\/presentation\/[^/]+\/practice$/)) {
    const id = currentPath.split("/")[2];
    if (id) {
      return <PracticeModePage presentationId={id as any} onNavigate={navigate} />;
    }
  }

  // Practice Report check
  if (currentPath.match(/^\/practice\/[^/]+\/report$/)) {
    const id = currentPath.split("/")[2];
    if (id) {
      return <PracticeReportPage sessionId={id as any} onNavigate={navigate} />;
    }
  }

  // Public Presentation View check
  if (currentPath.match(/^\/p\/[^/]+$/)) {
    const id = currentPath.split("/")[2];
    if (id) {
      return (
        <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col font-sans transition-colors duration-200">
          <Navbar currentPath={currentPath} onNavigate={navigate} />
          <main className="flex-1 px-4 md:px-8 pt-6">
            <PublicPresentationViewPage presentationId={id} onNavigate={navigate} />
          </main>
          <footer className="glass-panel border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40 py-5 px-6 text-center text-xs text-[#77574A] dark:text-[#F5EEE8]">
            Presentation Maker &copy; {new Date().getFullYear()} — AI Presentation, Learning & Practice Platform
          </footer>
        </div>
      );
    }
  }

  const renderContent = () => {
    if (currentPath.startsWith("/presentation/")) {
      const id = currentPath.replace("/presentation/", "");
      if (id) {
        return <PresentationStudioPage presentationId={id as any} onNavigate={navigate} />;
      }
    }

    switch (currentPath) {
      case "/discover":
      case "/community":
        return <DiscoveryPage onNavigate={navigate} />;
      case "/marketplace":
        return <MarketplacePage onNavigate={navigate} />;
      case "/login":
        return <LoginPage onNavigate={navigate} />;
      case "/signup":
        return <SignupPage onNavigate={navigate} />;
      case "/create":
        return <CreatePage onNavigate={navigate} />;
      case "/dashboard":
        return (
          <ProtectedRoute onNavigate={navigate}>
            <DashboardPage onNavigate={navigate} />
          </ProtectedRoute>
        );
      case "/settings":
        return (
          <ProtectedRoute onNavigate={navigate}>
            <SettingsPage onNavigate={navigate} />
          </ProtectedRoute>
        );
      case "/admin":
        return (
          <ProtectedRoute onNavigate={navigate}>
            <AdminPage onNavigate={navigate} />
          </ProtectedRoute>
        );
      case "/":
      default:
        return <LandingPage onNavigate={navigate} />;
    }
  };

  const isAuthPage = currentPath === "/login" || currentPath === "/signup";

  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-color)] flex flex-col font-sans transition-colors duration-200">
      {!isAuthPage && <Navbar currentPath={currentPath} onNavigate={navigate} />}
      <main className="flex-1 px-4 md:px-8 pt-6">
        {renderContent()}
      </main>
      {currentPath !== "/" && !isAuthPage && (
        <footer className="glass-panel border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/40 py-5 px-6 text-center text-xs text-[#77574A] dark:text-[#F5EEE8]">
          Presentation Maker &copy; {new Date().getFullYear()} — AI Presentation, Learning & Practice Platform
        </footer>
      )}
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
