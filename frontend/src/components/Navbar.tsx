import React from "react";
import { Sparkles, Sun, Moon, LogOut, Settings, LayoutDashboard, ShoppingBag, Zap, Home, UserPlus, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const { user, logout } = useAuth();
  const { mode, setThemeMode } = useTheme();

  const toggleTheme = () => {
    setThemeMode(mode === "dark" ? "light" : "dark");
  };

  const remainingCredits = user?.ai_credits?.remaining ?? 10;
  const planName = user?.subscription?.plan || "free";
  const showMiddleNav = !user && currentPath !== "/login" && currentPath !== "/signup";

  return (
    <header className="sticky top-0 z-50 px-4 md:px-8 py-3.5 bg-transparent backdrop-blur-md border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/35 dark:bg-[#332D28]/95 flex items-center justify-between transition-colors shadow-sm">
      {/* Brand Logo (Left) */}
      <div 
        onClick={() => onNavigate("/")}
        className="flex items-center space-x-3 cursor-pointer group select-none"
      >
        <img 
          src="/images/logo.png" 
          alt="Presentation Maker Logo"
          className="w-10 h-10 rounded-xl object-cover shadow-md transition-transform duration-300 group-hover:scale-105 border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 bg-white"
        />
        <div>
          <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-[#4A3A34] dark:text-[#FFFFFF] flex items-center gap-2">
            Presentation Maker
          </h1>
          <p className="text-[11px] text-[#77574A] dark:text-[#F5EEE8] font-medium hidden sm:block">AI Presentation, Practice & Marketplace</p>
        </div>
      </div>

      {/* Center Navigation Links: Home, Marketplace, Signup (Middle) - Only shown for non-logged-in visitors outside login/signup */}
      {showMiddleNav && (
        <nav className="hidden lg:flex items-center p-1.5 rounded-2xl bg-[#EBD7BE]/40 dark:bg-[#3E3731]/90 border border-[#D0AE92]/40 dark:border-[#8C7D70]/35 backdrop-blur-md shadow-sm absolute left-1/2 -translate-x-1/2 space-x-1">
          {/* Home */}
          <button
            onClick={() => onNavigate("/")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentPath === "/"
                ? "bg-[#77574A] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] text-[#F9F2E4] dark:text-[#FFFFFF] shadow-sm dark:shadow-[0_2px_12px_rgba(140,125,112,0.4)]"
                : "text-[#4A3A34] dark:text-[#F5EEE8] hover:text-[#2D2320] hover:bg-[#EBD7BE]/60 dark:hover:bg-[#8C7D70]/25 dark:hover:text-[#FFFFFF]"
            }`}
          >
            <Home className="w-3.5 h-3.5 text-inherit" />
            <span>Home</span>
          </button>

          {/* Marketplace */}
          <button
            onClick={() => onNavigate("/marketplace")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentPath === "/marketplace"
                ? "bg-[#77574A] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] text-[#F9F2E4] dark:text-[#FFFFFF] shadow-sm dark:shadow-[0_2px_12px_rgba(140,125,112,0.4)]"
                : "text-[#4A3A34] dark:text-[#F5EEE8] hover:text-[#2D2320] hover:bg-[#EBD7BE]/60 dark:hover:bg-[#8C7D70]/25 dark:hover:text-[#FFFFFF]"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-inherit" />
            <span>Marketplace</span>
          </button>

          {/* Signup */}
          <button
            onClick={() => onNavigate("/signup")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              currentPath === "/signup"
                ? "bg-[#77574A] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] text-[#F9F2E4] dark:text-[#FFFFFF] shadow-sm dark:shadow-[0_2px_12px_rgba(140,125,112,0.4)]"
                : "text-[#4A3A34] dark:text-[#F5EEE8] hover:text-[#2D2320] hover:bg-[#EBD7BE]/60 dark:hover:bg-[#8C7D70]/25 dark:hover:text-[#FFFFFF]"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-inherit" />
            <span>Signup</span>
          </button>
        </nav>
      )}

      {/* Right Actions & User Account State */}
      <div className="flex items-center space-x-1.5 md:space-x-2">
        {/* Mobile/Tablet quick buttons for non-logged-in visitors */}
        {showMiddleNav && (
          <div className="flex lg:hidden items-center space-x-1">
            <button
              onClick={() => onNavigate("/")}
              title="Home"
              className="p-1.5 rounded-lg text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#8C7D70]/25"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate("/marketplace")}
              title="Marketplace"
              className="p-1.5 rounded-lg text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#8C7D70]/25"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate("/signup")}
              title="Signup"
              className="p-1.5 rounded-lg text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#8C7D70]/25"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mobile-only quick buttons for logged-in users */}
        {user && (
          <div className="flex sm:hidden items-center space-x-1">
            <button
              onClick={() => onNavigate("/create")}
              title="Create Presentation"
              className="p-1.5 rounded-lg text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#8C7D70]/25"
            >
              <Sparkles className="w-4 h-4 text-[#A8836C] dark:text-[#FFFFFF]" />
            </button>
            <button
              onClick={() => onNavigate("/dashboard")}
              title="Dashboard"
              className="p-1.5 rounded-lg text-[#4A3A34] dark:text-[#FFFFFF] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#8C7D70]/25"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          </div>
        )}

        {user ? (
          <>
            {/* Create Presentation - For Logged In Users */}
            <button
              onClick={() => onNavigate("/create")}
              className={`hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentPath === "/create" 
                  ? "bg-[#77574A] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] text-[#F9F2E4] dark:text-[#FFFFFF] shadow-sm dark:shadow-[0_2px_12px_rgba(140,125,112,0.4)]" 
                  : "text-[#4A3A34] dark:text-[#F5EEE8] hover:text-[#2D2320] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#8C7D70]/25 dark:hover:text-[#FFFFFF]"
              }`}
            >
              <Sparkles className="w-4 h-4 text-[#A8836C] dark:text-[#FFFFFF]" />
              <span>Create</span>
            </button>

            {/* Dashboard */}
            <button
              onClick={() => onNavigate("/dashboard")}
              className={`hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentPath === "/dashboard" 
                  ? "bg-[#77574A] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] text-[#F9F2E4] dark:text-[#FFFFFF] shadow-sm dark:shadow-[0_2px_12px_rgba(140,125,112,0.4)]" 
                  : "text-[#4A3A34] dark:text-[#F5EEE8] hover:text-[#2D2320] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#8C7D70]/25 dark:hover:text-[#FFFFFF]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#77574A] dark:text-[#FFFFFF]" />
              <span>Dashboard</span>
            </button>

            {/* Marketplace - For Logged In Users */}
            <button
              onClick={() => onNavigate("/marketplace")}
              className={`hidden md:flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                currentPath === "/marketplace" 
                  ? "bg-[#77574A] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] text-[#F9F2E4] dark:text-[#FFFFFF] shadow-sm dark:shadow-[0_2px_12px_rgba(140,125,112,0.4)]" 
                  : "text-[#4A3A34] dark:text-[#F5EEE8] hover:text-[#2D2320] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#8C7D70]/25 dark:hover:text-[#FFFFFF]"
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-[#77574A] dark:text-[#FFFFFF]" />
              <span>Marketplace</span>
            </button>

            {/* Super Admin Control Link */}
            {(String(user.role || "").toLowerCase().trim() === "admin" || Boolean((user as any).is_admin)) && (
              <button
                onClick={() => onNavigate("/admin")}
                title="Super Admin Panel"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentPath === "/admin"
                    ? "bg-amber-600 text-white shadow-md"
                    : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 border border-amber-500/30"
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Admin</span>
              </button>
            )}

            {/* AI Credits Badge */}
            <div
              onClick={() => onNavigate("/settings")}
              title="Click to manage subscription plan & AI credits"
              className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-[#EBD7BE]/50 dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 text-[#4A3A34] dark:text-[#FFFFFF] text-[11px] font-bold cursor-pointer hover:border-[#A8836C] dark:hover:border-[#8C7D70] transition-colors shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 dark:text-amber-300 dark:fill-amber-300" />
              <span>{remainingCredits} Credits</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#D0AE92]/40 dark:bg-[#8C7D70]/30 text-[#4A3A34] dark:text-[#FFFFFF] border border-transparent dark:border-[#8C7D70]/40">
                {planName}
              </span>
            </div>

            {/* Settings */}
            <button
              onClick={() => onNavigate("/settings")}
              title="Settings"
              className={`p-2 rounded-xl text-xs font-semibold transition-all ${
                currentPath === "/settings" 
                  ? "bg-[#77574A] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] text-[#F9F2E4] dark:text-[#FFFFFF] shadow-sm dark:shadow-[0_2px_12px_rgba(140,125,112,0.4)]" 
                  : "text-[#4A3A34] dark:text-[#F5EEE8] hover:text-[#2D2320] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#8C7D70]/25 dark:hover:text-[#FFFFFF]"
              }`}
            >
              <Settings className="w-4 h-4 text-[#77574A] dark:text-[#FFFFFF]" />
            </button>
          </>
        ) : null}

        {/* Quick Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${mode === "dark" ? "Light" : "Dark"} Mode`}
          className="p-2 rounded-xl bg-[#EBD7BE]/40 hover:bg-[#EBD7BE]/70 dark:bg-[#3E3731] hover:dark:bg-[#4D443D] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-[#4A3A34] dark:text-[#FFFFFF] transition-all shadow-sm"
        >
          {mode === "dark" ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-[#77574A]" />}
        </button>

        {/* User Account State */}
        {user ? (
          <div className="flex items-center space-x-2 border-l border-[#D0AE92]/40 dark:border-[#8C7D70]/35 pl-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-[#EBD7BE] dark:bg-[#3E3731] border border-[#D0AE92] dark:border-[#8C7D70]/40 text-[#4A3A34] dark:text-[#FFFFFF] flex items-center justify-center text-xs font-bold uppercase shadow-sm">
                {user.name.charAt(0)}
              </div>
              <div className="hidden 2xl:block text-left">
                <p className="text-xs font-bold text-[#4A3A34] dark:text-[#FFFFFF] leading-tight">{user.name}</p>
                <span className="text-[10px] uppercase font-semibold text-[#A8836C] dark:text-[#F5EEE8] tracking-wider">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                onNavigate("/");
              }}
              title="Logout"
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-700 dark:text-rose-300 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 border-l border-[#D0AE92]/40 dark:border-[#8C7D70]/35 pl-2">
            {currentPath === "/login" ? (
              <button
                onClick={() => onNavigate("/signup")}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#77574A] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] text-[#F9F2E4] dark:text-[#FFFFFF] hover:opacity-90 transition-all shadow-sm dark:shadow-[0_2px_12px_rgba(140,125,112,0.4)]"
              >
                Sign Up
              </button>
            ) : currentPath === "/signup" ? (
              <button
                onClick={() => onNavigate("/login")}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#77574A] dark:bg-gradient-to-r dark:from-[#A39487] dark:via-[#8C7D70] dark:to-[#736558] text-[#F9F2E4] dark:text-[#FFFFFF] hover:opacity-90 transition-all shadow-sm dark:shadow-[0_2px_12px_rgba(140,125,112,0.4)]"
              >
                Login
              </button>
            ) : (
              <button
                onClick={() => onNavigate("/login")}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#4A3A34] dark:text-[#F5EEE8] hover:text-[#2D2320] hover:bg-[#EBD7BE]/40 dark:hover:bg-[#8C7D70]/25 dark:hover:text-[#FFFFFF] transition-all"
              >
                Login
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
