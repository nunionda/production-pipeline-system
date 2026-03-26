/**
 * 상태 시각 언어 — 디자인 리뷰 결정사항
 *
 * ● 완료/승인  Green 600
 * ● 진행중     Blue 600
 * ○ 대기       Gray 500
 * ▲ 주의       Amber 600
 * ✕ 차단       Red 600
 */

type StatusVariant = "complete" | "active" | "waiting" | "warning" | "blocked";

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
  className?: string;
}

const variantStyles: Record<StatusVariant, { icon: string; classes: string }> = {
  complete: { icon: "●", classes: "text-status-complete bg-green-50" },
  active: { icon: "●", classes: "text-status-active bg-blue-50" },
  waiting: { icon: "○", classes: "text-status-waiting bg-gray-50" },
  warning: { icon: "▲", classes: "text-status-warning bg-amber-50" },
  blocked: { icon: "✕", classes: "text-status-blocked bg-red-50" },
};

export function StatusBadge({ variant, label, className = "" }: StatusBadgeProps) {
  const style = variantStyles[variant];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${style.classes} ${className}`}
    >
      <span aria-hidden="true">{style.icon}</span>
      {label}
    </span>
  );
}

// Helper: ProjectPhase → StatusBadge props
export function phaseToStatus(phase: string): { variant: StatusVariant; label: string } {
  switch (phase) {
    case "DEVELOPMENT":
      return { variant: "waiting", label: "기획" };
    case "PRE_PRODUCTION":
      return { variant: "active", label: "프리프로덕션" };
    case "PRODUCTION":
      return { variant: "active", label: "촬영" };
    case "POST_PRODUCTION":
      return { variant: "active", label: "포스트" };
    case "DELIVERY":
      return { variant: "warning", label: "납품" };
    case "COMPLETED":
      return { variant: "complete", label: "완료" };
    default:
      return { variant: "waiting", label: phase };
  }
}
