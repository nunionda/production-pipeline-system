"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "대시보드", href: "/dashboard", icon: "📊" },
  { name: "프로젝트", href: "/projects", icon: "🎬" },
  { name: "설정", href: "/settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-surface">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-4">
        <span className="text-lg font-bold text-primary-800">누니온다</span>
        <span className="text-xs text-gray-400">Production</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-50 text-primary-800"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-600">
          <div className="h-7 w-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-800">
            U
          </div>
          <span className="truncate">사용자</span>
        </div>
      </div>
    </aside>
  );
}
