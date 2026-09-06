import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "@/app/page";
import { PIPELINE_STAGES } from "@/lib/pipeline";

describe("HomePage", () => {
  it("renders the product tagline as the page heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("lists every pipeline stage", () => {
    render(<HomePage />);
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(PIPELINE_STAGES.length);
  });

  it("marks the user-approval stage as a human gate", () => {
    render(<HomePage />);
    expect(screen.getByText(/human gate/i)).toBeInTheDocument();
  });
});
