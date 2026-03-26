"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

const subNav = [
  { name: "개요", segment: "" },
  { name: "등장인물", segment: "characters" },
  { name: "로케이션", segment: "locations" },
  { name: "소품", segment: "props" },
  { name: "의상", segment: "costumes" },
  { name: "예산", segment: "budget" },
];

export default function PreProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <div className="border-b border-gray-100 bg-gray-50 px-6">
        <nav className="flex gap-0 -mb-px" aria-label="프리프로덕션 섹션">
          {subNav.map((item) => {
            const base = `/projects/${id}/pre-production`;
            const href = item.segment ? `${base}/${item.segment}` : base;
            const isActive = item.segment
              ? pathname === href || pathname.startsWith(href + "/")
              : pathname === base;
            return (
              <Link
                key={item.segment || "overview"}
                href={href}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-primary-800 text-primary-800"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
