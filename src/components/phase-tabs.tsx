"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface PhaseTabsProps {
  projectId: string;
}

const phases = [
  { name: "시나리오", segment: "script" },
  { name: "스케줄", segment: "schedule" },
  { name: "촬영", segment: "production" },
  { name: "포스트", segment: "post" },
  { name: "납품", segment: "delivery" },
];

export function PhaseTabs({ projectId }: PhaseTabsProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-0 px-4" aria-label="단계 탭">
        {phases.map((phase) => {
          const href = `${basePath}/${phase.segment}`;
          const isActive = pathname?.startsWith(href);
          return (
            <Link
              key={phase.segment}
              href={href}
              className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "text-primary-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {phase.name}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-800" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
