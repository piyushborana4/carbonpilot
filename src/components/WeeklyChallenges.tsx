import React, { useState, useEffect } from "react";
import { SustainabilityChallenge, ChallengeCompletion } from "../types";
import { WEEKLY_CHALLENGES } from "../challengesData";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, increment, collection, collectionGroup, query, where, getDocs } from "firebase/firestore";
import { Trophy, CheckCircle2, Circle, Flame, ArrowUpRight, Award, Zap, Trees } from "lucide-react";

interface WeeklyChallengesProps {
  userId: string;
  userPoints: number;
  onPointsAwarded: (points: number, co2eSaved: number) => void;
}

export default function WeeklyChallenges({ userId, userPoints, onPointsAwarded }: WeeklyChallengesProps) {
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Fetch completions history for user from Firestore in parallel
  const fetchCompletions = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const promises = WEEKLY_CHALLENGES.map((ch) =>
        getDoc(doc(db, "challenges", ch.challengeId, "completions", userId))
      );
      const snaps = await Promise.all(promises);
      const completedList: string[] = [];
      snaps.forEach((snap, idx) => {
        if (snap.exists()) {
          completedList.push(WEEKLY_CHALLENGES[idx].challengeId);
        }
      });
      setCompletedIds(completedList);
    } catch (e) {
      console.error("Error reading challenge completions catalog:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletions();
  }, [userId]);

  const handleComplete = async (challenge: SustainabilityChallenge) => {
    if (completedIds.includes(challenge.challengeId)) return;
    setCompletingId(challenge.challengeId);

    const completionId = "comp_" + Date.now();
    const completionDoc: ChallengeCompletion = {
      completionId,
      challengeId: challenge.challengeId,
      userId,
      completedAt: new Date().toISOString(),
    };

    try {
      // 1. Save completion to Firestore
      const targetPath = `challenges/${challenge.challengeId}/completions/${userId}`;
      await setDoc(doc(db, "challenges", challenge.challengeId, "completions", userId), completionDoc);

      // 2. Increment points & decrement currentFootprint of user profile in Firestore
      const userRef = doc(db, "users", userId);
      // Ensure current annual footprint registers the decrease (CO2eSaved is in kg, converted to metric tons: kg / 1000)
      const footprintReducedTons = challenge.co2eSaved / 1000;

      await updateDoc(userRef, {
        points: increment(challenge.pointsValue),
        currentFootprint: increment(-footprintReducedTons)
      });

      // 3. Inform parent component layout
      onPointsAwarded(challenge.pointsValue, challenge.co2eSaved);
      setCompletedIds([...completedIds, challenge.challengeId]);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `challenges/${challenge.challengeId}/completions/${userId}`);
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div id="challenges_container" className="bg-bg-card rounded-[32px] p-6 shadow-sm border border-border-brand space-y-6 theme-transition">
      
      {/* Top points display bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-brand pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-secondary text-brand-dark rounded-2xl">
            <Trophy className="w-6 h-6 animate-bounce text-brand-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              Weekly Sustainability Challenges
            </h2>
            <p className="text-xs text-text-secondary animate-pulse">
              Complete ecological, light-footprint tasks to earn rewards points and lower your metrics.
            </p>
          </div>
        </div>

        <div className="bg-brand-secondary/30 border border-border-brand px-4 py-2 rounded-2xl flex items-center gap-2 self-start sm:self-auto">
          <Award className="w-5 h-5 text-brand-primary" />
          <span className="font-mono text-sm font-bold text-brand-dark">
            {userPoints} Reward Points Earned
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-xs text-text-secondary animate-pulse">
          Syncing sustainability challenge progressions...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WEEKLY_CHALLENGES.map((ch) => {
            const isCompleted = completedIds.includes(ch.challengeId);
            const isWorking = completingId === ch.challengeId;

            return (
              <div
                key={ch.challengeId}
                className={`p-5 rounded-[28px] border transition-all flex flex-col justify-between space-y-4 ${
                  isCompleted
                    ? "bg-brand-bg border-border-brand/60 opacity-80"
                    : "bg-bg-card border-border-brand shadow-sm hover:shadow-md theme-transition"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-2xs font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                      ch.category === "food" ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400" :
                      ch.category === "energy" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400" :
                      ch.category === "transport" ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" :
                      "bg-brand-secondary text-brand-dark"
                    }`}>
                      {ch.category}
                    </span>

                    <span className="text-2xs font-mono font-bold text-brand-primary flex items-center gap-1">
                      <Trees className="w-3.5 h-3.5" /> -{ch.co2eSaved} kg CO₂e
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-text-primary">
                    {ch.title}
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {ch.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dashed border-border-brand">
                  <span className="text-2xs font-bold text-text-secondary flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> +{ch.pointsValue} Pts
                  </span>

                  <button
                    id={`btn_complete_${ch.challengeId}`}
                    type="button"
                    disabled={isCompleted || isWorking}
                    onClick={() => handleComplete(ch)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isCompleted
                        ? "text-brand-primary bg-brand-secondary cursor-default"
                        : "text-white bg-brand-primary hover:bg-brand-primary/95"
                    }`}
                  >
                    {isWorking ? (
                      "Recording..."
                    ) : isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5" /> Mark Task done
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
