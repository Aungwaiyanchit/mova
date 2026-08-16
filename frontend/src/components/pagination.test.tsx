import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { accessiblePageCount, Pagination } from "./pagination";

describe("Pagination", () => {
  it("caps advertised pages at the provider result boundary", () => {
    expect(accessiblePageCount(60_000, 20)).toBe(500);
    expect(accessiblePageCount(10, 20)).toBe(10);
  });

  it("moves to an adjacent page", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={10} pageSize={20} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
