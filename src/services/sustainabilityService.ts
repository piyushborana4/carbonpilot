import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { userRepository } from "../repositories/userRepository";
import { FootprintLog, ChallengeCompletion, SustainabilityChallenge } from "../types";

/**
 * Enterprise service layer managing high-level climate workflows, computations, and statistics.
 */
export const sustainabilityService = {
  /**
   * Securely saves and registers a carbon activity footprint footprint log.
   */
  async recordCarbonLog(userId: string, log: FootprintLog): Promise<void> {
    await setDoc(doc(db, "users", userId, "footprint_logs", log.logId), log);
  },

  /**
   * Handles a user challenge completion transaction, including updating points and annual carbon footprint.
   */
  async completeChallenge(
    userId: string,
    challenge: SustainabilityChallenge,
    onSuccessCall?: (pts: number, co2: number) => void
  ): Promise<ChallengeCompletion> {
    const completionId = "comp_" + Date.now();
    const completionDoc: ChallengeCompletion = {
      completionId,
      challengeId: challenge.challengeId,
      userId,
      completedAt: new Date().toISOString(),
    };

    // 1. Record completion
    await userRepository.saveChallengeCompletion(userId, challenge.challengeId, completionDoc);

    // 2. Fetch and optimize user profile changes
    const profile = await userRepository.getUserProfile(userId);
    if (profile) {
      const footprintReducedTons = challenge.co2eSaved / 1000;
      const updatedPoints = (profile.points || 0) + challenge.pointsValue;
      const updatedFootprint = Math.max(0, (profile.currentFootprint || 0) - footprintReducedTons);

      await userRepository.updateUserProfile(userId, {
        points: updatedPoints,
        currentFootprint: Number(updatedFootprint.toFixed(4)),
      });
    }

    if (onSuccessCall) {
      onSuccessCall(challenge.pointsValue, challenge.co2eSaved);
    }

    return completionDoc;
  }
};
