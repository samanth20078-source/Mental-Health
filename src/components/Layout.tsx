import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { LayoutDashboard, BookHeart, LineChart, Settings, Bot, Users, ShieldAlert } from 'lucide-react';

export const Layout = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-10">
        <div className="p-6">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <BookHeart className="text-blue-600" />
            ClearMind
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Overview" />
          <NavItem to="/history" icon={<LineChart size={20} />} label="Insights & History" />
          <NavItem to="/assistant" icon={<Bot size={20} />} label="AI Assistant" />
          <NavItem to="/professional" icon={<Users size={20} />} label="Professional" />
          <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
          <NavItem to="/privacy" icon={<ShieldAlert size={20} />} label="Privacy Center" />
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 h-[100dvh] md:h-auto overflow-hidden md:overflow-visible">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex items-center justify-around p-3 z-50 safe-area-bottom">
        <MobileNavItem to="/" icon={<LayoutDashboard size={24} />} label="Overview" />
        <MobileNavItem to="/history" icon={<LineChart size={24} />} label="Insights" />
        <MobileNavItem to="/assistant" icon={<Bot size={24} />} label="Assistant" />
        <MobileNavItem to="/professional" icon={<Users size={24} />} label="Prof." />
        <MobileNavItem to="/settings" icon={<Settings size={24} />} label="Settings" />
      </nav>
    </div>
  );
};

const NavItem = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        isActive 
          ? 'bg-blue-50 text-blue-700 font-medium' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`
    }
  >
    {icon}
    <span>{label}</span>
  </NavLink>
);

const MobileNavItem = ({ to, icon, label }: { to: string, icon: React.ReactNode, label: string }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex flex-col items-center gap-1 p-2 rounded-xl min-w-[4rem] transition-colors ${
        isActive 
          ? 'text-blue-600' 
          : 'text-slate-500 hover:text-slate-900'
      }`
    }
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </NavLink>
);
