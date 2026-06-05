import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Trees,
  ClipboardList,
  Users,
  LogOut,
  Menu,
  Sprout,
  Grid3X3,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useAppStore } from "@/stores/app";
import { ROLE_LABELS } from "@/types";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "仪表盘", icon: LayoutDashboard },
  { to: "/zones", label: "棚区管理", icon: Trees },
  { to: "/slot-schedule", label: "盘位调度", icon: Grid3X3 },
  { to: "/tasks", label: "任务管理", icon: ClipboardList },
  { to: "/users", label: "用户管理", icon: Users, adminOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const filteredNav = navItems.filter(
    (item) => !item.adminOnly || user?.role === "admin"
  );

  return (
    <div className="flex h-screen bg-[#F1F8E9]">
      <aside
        className={cn(
          "bg-[#1B5E20] text-white flex flex-col transition-all duration-300 shrink-0",
          sidebarCollapsed ? "w-16" : "w-56"
        )}
      >
        <div className="flex items-center gap-2 px-4 py-5 border-b border-white/10">
          <Sprout className="w-7 h-7 text-[#A5D6A7] shrink-0" />
          {!sidebarCollapsed && (
            <span className="text-lg font-bold tracking-wide">苗棚管理</span>
          )}
        </div>
        <nav className="flex-1 py-4 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors text-sm",
                  isActive
                    ? "bg-white/20 text-white font-medium"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          {!sidebarCollapsed && user && (
            <div className="px-2 py-2 text-xs text-white/60 mb-2">
              <div className="font-medium text-white/90">{user.username}</div>
              <div>{ROLE_LABELS[user.role]}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>退出登录</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-[#C8E6C9] flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-[#E8F5E9] transition-colors"
          >
            <Menu className="w-5 h-5 text-[#37474F]" />
          </button>
          <h1 className="text-base font-semibold text-[#1B5E20]">
            苗棚任务状态与撤销复原平台
          </h1>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
