import { useState, useEffect } from "react";
import { User as FirebaseUser, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, query, collection, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import { UserProfile, FootprintLog } from "../types";
import { WEEKLY_CHALLENGES } from "../constants/challenges";

/**
 * Enterprise Custom Hook to manage authorization status, profile parameters, and real-time logs synchronization.
 * Completely isolates business state management from presentation layers.
 */
export function useUserProfile() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<FootprintLog[]>([]);
  const [completedChallengesCount, setCompletedChallengesCount] = useState<number>(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Monitor Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        await syncUserProfile(firebaseUser);
      } else {
        setUser(null);
        setProfile(null);
        setLogs([]);
        setCompletedChallengesCount(0);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Sync / Onboard newly logged in User
  const syncUserProfile = async (firebaseUser: FirebaseUser) => {
    setProfileLoading(true);
    const userRef = doc(db, "users", firebaseUser.uid);
    const targetPath = `users/${firebaseUser.uid}`;

    try {
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        const defaultProfile: UserProfile = {
          userId: firebaseUser.uid,
          displayName: firebaseUser.displayName || "Pilot Traveler",
          email: firebaseUser.email || "",
          points: 0,
          currentFootprint: Number((4.5 + Math.random() * 4).toFixed(2)),
          hasOnboarded: true,
          theme: "light",
          language: "en",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await setDoc(userRef, defaultProfile);
        setProfile(defaultProfile);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, targetPath);
    } finally {
      setProfileLoading(false);
    }
  };

  // Subscribe to Footprint Logs
  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/footprint_logs`;
    const q = query(collection(db, "users", user.uid, "footprint_logs"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: FootprintLog[] = [];
        snapshot.forEach((doc) => {
          list.push(doc.data() as FootprintLog);
        });
        setLogs(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Read challenges completions to calculate exact stats count
  useEffect(() => {
    if (!user) return;

    const fetchCompletedCount = async () => {
      try {
        const promises = WEEKLY_CHALLENGES.map((ch) =>
          getDoc(doc(db, "challenges", ch.challengeId, "completions", user.uid))
        );
        const snaps = await Promise.all(promises);
        const count = snaps.filter((snap) => snap.exists()).length;
        setCompletedChallengesCount(count);
      } catch (err) {
        console.error("Failed to fetch completed challenges stats count:", err);
      }
    };

    fetchCompletedCount();
  }, [user, profile?.points]);

  // Hook actions
  const handleLogAdded = (newLog: FootprintLog) => {
    setLogs((prev) => {
      if (prev.some((log) => log.logId === newLog.logId)) {
        return prev;
      }
      return [newLog, ...prev];
    });

    if (profile) {
      const savedTons = newLog.co2e / 1000;
      setProfile({
        ...profile,
        currentFootprint: Math.max(0, profile.currentFootprint - savedTons),
      });
    }
  };

  const handleLogDeleted = (logId: string, co2e: number) => {
    setLogs((prev) => prev.filter((item) => item.logId !== logId));
    if (profile) {
      const addedTons = co2e / 1000;
      setProfile({
        ...profile,
        currentFootprint: profile.currentFootprint + addedTons,
      });
    }
  };

  const handlePointsAwarded = (pts: number, co2Saved: number) => {
    if (profile) {
      setProfile({
        ...profile,
        points: (profile.points || 0) + pts,
        currentFootprint: Math.max(0, profile.currentFootprint - co2Saved / 1000),
      });
    }
  };

  return {
    user,
    profile,
    logs,
    completedChallengesCount,
    authLoading,
    profileLoading,
    syncUserProfile,
    handleLogAdded,
    handleLogDeleted,
    handlePointsAwarded,
  };
}
