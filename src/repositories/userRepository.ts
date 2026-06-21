import { doc, getDoc, updateDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { UserProfile, ChallengeCompletion } from "../types";

/**
 * Repository layer for persistence access on Firebase Users collection and sub-hierarchies.
 */
export const userRepository = {
  /**
   * Retrieves user profile from database server or cache context.
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(doc(db, "users", userId));
      return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    }
  },

  /**
   * Updates discrete profile metrics (points, footprints, settings) of the active user.
   */
  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
    try {
      await updateDoc(doc(db, "users", userId), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  },

  /**
   * Records active challenge completion documentation.
   */
  async saveChallengeCompletion(
    userId: string,
    challengeId: string,
    completionDoc: ChallengeCompletion
  ): Promise<void> {
    const targetPath = `challenges/${challengeId}/completions/${userId}`;
    try {
      await setDoc(doc(db, "challenges", challengeId, "completions", userId), completionDoc);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, targetPath);
    }
  },

  /**
   * Drops a specific footprint log record from sub-collection securely.
   */
  async deleteFootprintLog(userId: string, logId: string): Promise<void> {
    const targetPath = `users/${userId}/footprint_logs/${logId}`;
    try {
      await deleteDoc(doc(db, "users", userId, "footprint_logs", logId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, targetPath);
    }
  }
};
