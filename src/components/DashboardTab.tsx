import React from "react";
import { FootprintLog, UserProfile } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, deleteDoc, updateDoc, increment } from "firebase/firestore";
import { Leaf, Award, Footprints, Trash, Car, Zap, Flame, RefreshCw, Trophy, TreePine, AlertCircle } from "lucide-react";
import { motion } from "motion/react";

interface DashboardTabProps {
  userId: string;
  profile: UserProfile | null;
  logs: FootprintLog[];
  completedChallengesCount: number;
  onLogDeleted: (logId: string, itemCO2: number) => void;
}

export default function DashboardTab({ userId, profile, logs, completedChallengesCount, onLogDeleted }: DashboardTabProps) {
  
  const totalLogsCO2 = React.useMemo(() => logs.reduce((sum, item) => sum + item.co2e, 0), [logs]);

  // Memoize division of logs by category for clean, O(1) proportional lookup during render
  const proportions = React.useMemo(() => {
    const total = totalLogsCO2 || 1;
    const categories = ["transport", "energy", "food", "waste"];
    const results: Record<string, number> = {};
    categories.forEach((cat) => {
      const catSum = logs
        .filter((l) => l.category === cat)
        .reduce((sum, item) => sum + item.co2e, 0);
      results[cat] = Number(((catSum / total) * 100).toFixed(0));
    });
    return results;
  }, [logs, totalLogsCO2]);

  const handleDeleteLog = async (log: FootprintLog) => {
    const targetPath = `users/${userId}/footprint_logs/${log.logId}`;
    try {
      // 1. Delete document from Firestore subcollection: users/{userId}/footprint_logs/{logId}
      await deleteDoc(doc(db, "users", userId, "footprint_logs", log.logId));
      
      // 2. Adjust current annual footprint upwards since they are removing a savings log (CO2 is in kg, converted to tons)
      const footprintTons = log.co2e / 1000;
      await updateDoc(doc(db, "users", userId), {
        currentFootprint: increment(footprintTons),
      });

      // 3. Callback parent component hook
      onLogDeleted(log.logId, log.co2e);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, targetPath);
    }
  };

  return (
    <div id="dashboard_tab_root" className="space-y-6">
      
      {/* Visual hero bar displaying circular gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Huge Metric Gauge Box */}
        <div className="lg:col-span-4 bg-brand-dark text-white rounded-[32px] p-6 flex flex-col justify-between space-y-6 shadow-md relative overflow-hidden">
          <div className="absolute top-[-40px] right-[-40px] w-36 h-36 rounded-full bg-brand-secondary/15 blur-xl pointer-events-none" />
          
          <div className="space-y-1">
            <span className="text-3xs uppercase tracking-widest font-bold text-brand-teal block">
              Calculated Footprint Benchmark
            </span>
            <span className="text-sm text-brand-secondary block">
              Your carbon emissions output:
            </span>
          </div>

          <div className="text-center space-y-2 py-4">
            <span className="text-4xl font-extrabold font-mono tracking-tight text-white block">
              {profile ? profile.currentFootprint.toFixed(2) : "..."} t
            </span>
            <span className="text-3xs text-brand-secondary uppercase font-bold tracking-widest">
              Metric Tons CO₂e / Year
            </span>
            
            {/* Visual dynamic gauge border depending on standing (e.g. standard US average is 16 tons, global is 4.5) */}
            <div className="w-[180px] h-2 bg-brand-darkgreen rounded-full mx-auto overflow-hidden">
              <div
                className="h-full bg-brand-teal rounded-full"
                style={{ width: `${Math.min(100, ((profile?.currentFootprint || 5.0) / 16) * 100)}%` }}
              />
            </div>
            <span className="text-3xs text-brand-teal block">
              Compare average target offset boundaries.
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-[#00382B]/60 pt-4">
            <div className="flex items-center gap-1.5 text-xs text-brand-secondary">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{profile?.points || 0} Climate points</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-brand-secondary">
              <TreePine className="w-4 h-4 text-brand-teal" />
              <span>{completedChallengesCount} Tasks done</span>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Category Proportionality Splits */}
        <div className="lg:col-span-8 bg-bg-card rounded-[32px] p-6 border border-border-brand shadow-sm flex flex-col justify-between space-y-6 theme-transition">
          <div>
            <h3 className="font-bold text-text-primary">
              Emissions Proportions by Category
            </h3>
            <p className="text-xs text-text-secondary">
              Allocated percentages representing total carbon footprints logs recorded.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Split 1: Transport */}
            <div className="p-4 bg-brand-bg rounded-2xl border border-border-brand space-y-2">
              <div className="flex items-center justify-between">
                <Car className="w-4 h-4 text-indigo-500" />
                <span className="font-mono text-sm font-bold text-text-primary">
                  {proportions["transport"] || 0}%
                </span>
              </div>
              <span className="text-2xs font-bold text-text-secondary uppercase tracking-widest block">
                Transport
              </span>
            </div>

            {/* Split 2: Energy */}
            <div className="p-4 bg-brand-bg rounded-2xl border border-border-brand space-y-2">
              <div className="flex items-center justify-between">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="font-mono text-sm font-bold text-text-primary">
                  {proportions["energy"] || 0}%
                </span>
              </div>
              <span className="text-2xs font-bold text-text-secondary uppercase tracking-widest block">
                Home Energy
              </span>
            </div>

            {/* Split 3: Food */}
            <div className="p-4 bg-brand-bg rounded-2xl border border-border-brand space-y-2">
              <div className="flex items-center justify-between">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-mono text-sm font-bold text-text-primary">
                  {proportions["food"] || 0}%
                </span>
              </div>
              <span className="text-2xs font-bold text-text-secondary uppercase tracking-widest block">
                Diet Eating
              </span>
            </div>

            {/* Split 4: Waste */}
            <div className="p-4 bg-brand-bg rounded-2xl border border-border-brand space-y-2">
              <div className="flex items-center justify-between">
                <RefreshCw className="w-4 h-4 text-brand-primary" />
                <span className="font-mono text-sm font-bold text-text-primary">
                  {proportions["waste"] || 0}%
                </span>
              </div>
              <span className="text-2xs font-bold text-text-secondary uppercase tracking-widest block">
                Waste Output
              </span>
            </div>
          </div>

          <p className="text-3xs text-text-secondary leading-relaxed italic border-t border-dashed border-border-brand pt-3">
            🎯 Pro-tip: Focus logging activity vectors with high emissions, like flights or fuel consumption, to receive refined optimization feedback from the predictive models!
          </p>
        </div>

      </div>

      {/* Low-carbon activity logs list */}
      <div className="bg-bg-card rounded-[32px] p-6 border border-border-brand shadow-sm space-y-4 theme-transition">
        <div className="flex items-center justify-between border-b border-border-brand pb-4">
          <div>
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              <Footprints className="w-5 h-5 text-brand-primary" />
              Your Logged Carbon Footprints Records ({logs.length})
            </h3>
            <p className="text-xs text-text-secondary">
              Individual registered items. You can scrub entries to rebuild annual equations.
            </p>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-10 border-2 border-dashed border-border-brand text-center text-xs text-text-secondary rounded-2xl">
            No carbon footprint logs currently recorded. Jump onto the <strong>Calculator Tab</strong> to record your transport commutes or energy bills!
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div
                key={log.logId}
                className="bg-brand-bg p-4 rounded-2xl border border-border-brand flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${
                    log.category === "transport" ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400" :
                    log.category === "energy" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400" :
                    log.category === "food" ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400" :
                    "bg-emerald-50 dark:bg-emerald-900/20 text-brand-primary dark:text-brand-teal"
                  }`}>
                    {log.category === "transport" && <Car className="w-4 h-4" />}
                    {log.category === "energy" && <Zap className="w-4 h-4" />}
                    {log.category === "food" && <Flame className="w-4 h-4" />}
                    {log.category === "waste" && <RefreshCw className="w-4 h-4" />}
                  </div>

                  <div>
                    <span className="text-xs font-bold text-text-primary block">
                      {log.note || `${log.subCategory.toUpperCase()} activity`}
                    </span>
                    <span className="text-3xs text-text-secondary">
                      Amount: {log.amount} {log.unit} • {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-bold text-text-primary">
                    {log.co2e} kg CO₂e
                  </span>
                  <button
                    id={`delete_log_${log.logId}`}
                    type="button"
                    onClick={() => handleDeleteLog(log)}
                    aria-label={`Delete audit log item for ${log.subCategory} activity of ${log.amount} ${log.unit}`}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
