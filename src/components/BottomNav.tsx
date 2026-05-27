import { Link, useLocation } from "@tanstack/react-router";
import { Home, BookOpen, BarChart3, User } from "lucide-react";

const items = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/diary", label: "Diary", icon: BookOpen },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 border-t border-white/10 bg-[#0a0a0f]/95 backdrop-blur">
      <div className="mx-auto flex max-w-md justify-around px-4 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = loc.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs transition ${
                active ? "text-[#ff6b35]" : "text-white/50"
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}