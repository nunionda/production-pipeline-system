import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge, phaseToStatus } from "@/components/status-badge";

describe("phaseToStatus", () => {
  it("DEVELOPMENT → waiting / 기획", () => {
    expect(phaseToStatus("DEVELOPMENT")).toEqual({ variant: "waiting", label: "기획" });
  });

  it("PRE_PRODUCTION → active / 프리프로덕션", () => {
    expect(phaseToStatus("PRE_PRODUCTION")).toEqual({ variant: "active", label: "프리프로덕션" });
  });

  it("PRODUCTION → active / 촬영", () => {
    expect(phaseToStatus("PRODUCTION")).toEqual({ variant: "active", label: "촬영" });
  });

  it("POST_PRODUCTION → active / 포스트", () => {
    expect(phaseToStatus("POST_PRODUCTION")).toEqual({ variant: "active", label: "포스트" });
  });

  it("DELIVERY → warning / 납품", () => {
    expect(phaseToStatus("DELIVERY")).toEqual({ variant: "warning", label: "납품" });
  });

  it("COMPLETED → complete / 완료", () => {
    expect(phaseToStatus("COMPLETED")).toEqual({ variant: "complete", label: "완료" });
  });

  it("unknown phase → waiting / original string", () => {
    const result = phaseToStatus("UNKNOWN_PHASE");
    expect(result.variant).toBe("waiting");
    expect(result.label).toBe("UNKNOWN_PHASE");
  });
});

describe("StatusBadge", () => {
  it("renders label text", () => {
    render(<StatusBadge variant="active" label="촬영" />);
    expect(screen.getByText("촬영")).toBeTruthy();
  });

  it("renders correct icon for complete variant", () => {
    render(<StatusBadge variant="complete" label="완료" />);
    expect(screen.getByText("●")).toBeTruthy();
  });

  it("renders correct icon for waiting variant", () => {
    render(<StatusBadge variant="waiting" label="대기" />);
    expect(screen.getByText("○")).toBeTruthy();
  });

  it("renders correct icon for warning variant", () => {
    render(<StatusBadge variant="warning" label="주의" />);
    expect(screen.getByText("▲")).toBeTruthy();
  });

  it("renders correct icon for blocked variant", () => {
    render(<StatusBadge variant="blocked" label="차단" />);
    expect(screen.getByText("✕")).toBeTruthy();
  });
});
