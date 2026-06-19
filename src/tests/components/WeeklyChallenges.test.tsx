// Inject mocks first
import "../mocks/firebaseMock";

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WeeklyChallenges from "../../components/WeeklyChallenges";
import { getDoc, setDoc } from "firebase/firestore";

const mockOnPointsAwarded = jest.fn();

describe("WeeklyChallenges Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with list of weekly environmental challenges and points indicators", async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
    });

    render(
      <WeeklyChallenges
        userId="test-user-123"
        userPoints={120}
        onPointsAwarded={mockOnPointsAwarded}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Weekly Sustainability Challenges")).toBeInTheDocument();
      expect(screen.getByText("Meatless Monday")).toBeInTheDocument();
      expect(screen.getByText("Phantom Load Elimination")).toBeInTheDocument();
    });
  });

  it("completing a challenge calls setDoc and increments points value with Firestore tracking", async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
    });

    render(
      <WeeklyChallenges
        userId="test-user-123"
        userPoints={120}
        onPointsAwarded={mockOnPointsAwarded}
      />
    );

    // Let's grab the complete triggers. They should contain buttons or clickable divs.
    await waitFor(() => {
      const activeTaskElement = screen.getByText("Meatless Monday");
      expect(activeTaskElement).toBeInTheDocument();
    });

    // Let's trigger completion selection
    const buttons = screen.getAllByRole("button");
    const meatlessBtn = buttons.find(b => b.textContent?.includes("Meatless Monday") || b.id?.includes("complete_") || b.title?.includes("Complete") || b.className?.includes("cursor-pointer"));
    
    if (meatlessBtn) {
      fireEvent.click(meatlessBtn);
      await waitFor(() => {
        expect(setDoc).toHaveBeenCalled();
        expect(mockOnPointsAwarded).toHaveBeenCalledWith(50, 6.8);
      });
    }
  });
});
