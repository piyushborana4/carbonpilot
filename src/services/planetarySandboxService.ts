import { collection, doc, setDoc, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { PlanetarySimulation } from "../types";
import { userRepository } from "../repositories/userRepository";

/**
 * Service orchestrator for the EarthScribe Planetary Sandbox & Decarbonization Blueprint engine.
 */
export const planetarySandboxService = {
  /**
   * Calls the server-side Gemini API sandbox simulator strategy.
   */
  async simulateSandbox(choices: {
    commutingMode: string;
    dietStyle: string;
    homeEnergyGrid: string;
    consumptionWaste: string;
  }, userId?: string): Promise<Partial<PlanetarySimulation>> {
    const response = await fetch("/api/gemini/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choices, userId }),
    });

    if (!response.ok) {
      throw new Error("Unable to contact planetary simulator. Working under offline scenario buffers.");
    }

    return response.json();
  },

  /**
   * Commits the custom green blueprint to the user's account and logs in Firestore.
   */
  async commitSimulationBlueprint(userId: string, simulation: PlanetarySimulation): Promise<void> {
    const simRef = doc(db, "users", userId, "simulations", simulation.simulationId);
    await setDoc(simRef, simulation);

    // Reward user for formulating & committing to a proactive global Greenprint Decarbonization Blueprint!
    const profile = await userRepository.getUserProfile(userId);
    if (profile) {
      const updatedPoints = (profile.points || 0) + 250; // Give a generous 250 blueprint setup award points!
      // Estimate general reduction from their green timeline
      const currentYear = new Date().getFullYear();
      const thisYrGreen = simulation.tenYearEmissionsGreen.find(f => f.year === currentYear)?.co2 || 4000;
      const computedFootprintTons = Number((thisYrGreen / 1000).toFixed(4));

      await userRepository.updateUserProfile(userId, {
        points: updatedPoints,
        currentFootprint: computedFootprintTons,
      });
    }
  },

  /**
   * Retrieves the user's latest active committed Greenprint simulation document.
   */
  async getLatestCommittedSimulation(userId: string): Promise<PlanetarySimulation | null> {
    try {
      const simsRef = collection(db, "users", userId, "simulations");
      const q = query(simsRef, orderBy("timestamp", "desc"), limit(1));
      const snaps = await getDocs(q);
      if (!snaps.empty) {
        return snaps.docs[0].data() as PlanetarySimulation;
      }
    } catch (err) {
      console.warn("Could not retrieve active green blueprint:", err);
    }
    return null;
  },

  /**
   * Evaluates any sustainable asset via Gemini multi-modal scanning on base64 content.
   */
  async scanSustainableAsset(imageBase64: string, mimeType?: string): Promise<{
    itemName: string;
    category: string;
    estimatedCO2: number;
    sustainabilityScore: number;
    notes: string;
    alternativeAction: string;
  }> {
    const response = await fetch("/api/gemini/sandbox-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType }),
    });

    if (!response.ok) {
      throw new Error("Failed to process multimodal visual audit. Image capture offline.");
    }

    return response.json();
  }
};
