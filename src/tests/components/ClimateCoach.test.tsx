// Inject mocks first
import "../mocks/firebaseMock";

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ClimateCoach from "../../components/ClimateCoach";

const mockOnAddPoints = jest.fn();

describe("ClimateCoach Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as any;
  });

  it("renders headers and pre-populated conversation triggers cleanly", () => {
    render(
      <ClimateCoach
        userId="test-user-123"
      />
    );

    expect(screen.getByText("Personal Climate Coach")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask climate coach/i)).toBeInTheDocument();
  });

  it("submits the chat input and calls the coach Express API endpoint successfully", async () => {
    const mockResponseText = { text: "To reduce transport impact, consider active commuting like walking or bicycling." };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponseText,
    });

    render(
      <ClimateCoach
        userId="test-user-123"
      />
    );

    const input = screen.getByPlaceholderText(/Ask climate coach/i);
    const submitBtn = screen.getByRole("button", { name: /Send message/i });

    fireEvent.change(input, { target: { value: "Suggest ways to save travel emissions" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/gemini/coach",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Suggest ways to save travel emissions"),
        })
      );
    });
  });

  it("gracefully displays error warnings if API server is offline", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Server offline"));

    render(
      <ClimateCoach
        userId="test-user-123"
      />
    );

    const input = screen.getByPlaceholderText(/Ask climate coach/i);
    const submitBtn = screen.getByRole("button", { name: /Send message/i });

    fireEvent.change(input, { target: { value: "Hello Coach" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Server offline/i)).toBeInTheDocument();
    });
  });
});
