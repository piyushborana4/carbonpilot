import React, { useState, useEffect } from "react";
import { FootprintLog, UserProfile, SustainabilityReport } from "../types";
import { FileHeart, AlertCircle, FileCheck, CheckCircle2, Award, Zap, Compass, RefreshCw, Loader2 } from "lucide-react";

interface SustainabilityReportsProps {
  logs: FootprintLog[];
  profile: UserProfile | null;
  challengesCompletedCount: number;
}

export default function SustainabilityReports({ logs, profile, challengesCompletedCount }: SustainabilityReportsProps) {
  const [report, setReport] = useState<SustainabilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/gemini/sustainability-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logs,
          profile,
          challengesCompleted: challengesCompletedCount,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to formulate report. Working with offline metrics.");
      }

      const data = await response.json();
      setReport(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to query reporting system.");
      generateFallbackReport();
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackReport = () => {
    // Elegant fallback report for offline capabilities
    const footprint = profile?.currentFootprint || 4.8;
    const globalComparison = ((footprint - 4.5) / 4.5) * 100;

    const fallback: SustainabilityReport = {
      reportDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      scoreCardRating: footprint < 3.0 ? "Eco Guardian" : footprint < 5.0 ? "Carbon Pilot Extraordinaire" : "Climate Novice Apprentice",
      comparisonToGlobalPercent: Number(globalComparison.toFixed(1)),
      strengths: [
        "Logged active transport alternatives, indicating high awareness of driving emissions factors.",
        "Demonstrated active commitment toward phantom lock electrical draw shutdowns.",
      ],
      improvements: [
        "Household heating or laundry machine temperature parameters represent a significant emission pocket.",
        "Average meal logging habits reveal moderate beef consumption.",
      ],
      bespokeActionPlan: [
        {
          actionableTask: "Wash clothes in cold water cycles exclusively for 30 days.",
          co2eSavingsEstKg: 12.5,
          difficulty: "Easy",
        },
        {
          actionableTask: "Switch single weekday commute to bicycle transit.",
          co2eSavingsEstKg: 24.0,
          difficulty: "Medium",
        },
        {
          actionableTask: "Reduce high-carbon beef intake in diet by 50%.",
          co2eSavingsEstKg: 38.5,
          difficulty: "Hard",
        },
      ],
      cheeringCloser: "Small, daily lifestyle updates yield monumental collective carbon draw-down! You are on a magnificent path.",
    };
    setReport(fallback);
  };

  useEffect(() => {
    // Generate an initial report automatically if none exists on load
    if (logs.length > 0 && !report) {
      generateReport();
    } else {
      generateFallbackReport();
    }
  }, [logs.length, profile?.userId]);

  return (
    <div id="reports_panel" className="bg-bg-card rounded-[32px] p-6 shadow-sm border border-border-brand space-y-6 theme-transition">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-secondary text-brand-dark rounded-2xl">
            <FileHeart className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              Monthly AI Sustainability Report
            </h2>
            <p className="text-xs text-text-secondary">
              Comprehensive carbon audits, comparative global indices, and customized action items synthesized by Gemini.
            </p>
          </div>
        </div>

        <button
          id="generate_report_btn"
          onClick={generateReport}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-primary bg-brand-secondary hover:bg-brand-secondary/80 rounded-xl border border-border-brand transition-all self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Synthesizing Report..." : "Re-generate Report"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl text-xs flex items-center gap-2 border border-rose-100 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-brand-primary animate-spin mx-auto" />
          <p className="text-sm text-text-primary font-bold">
            Gemini is compiling your ecological history and synthesizing carbon comparisons...
          </p>
        </div>
      ) : report ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Main stats card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="p-5 rounded-[24px] bg-brand-secondary/30 border border-border-brand flex items-center gap-4">
              <Award className="w-10 h-10 text-brand-primary" />
              <div>
                <span className="text-3xs uppercase tracking-widest font-extrabold text-brand-primary block mb-0.5">
                  Assigned Scorecard Standing
                </span>
                <h3 className="text-base font-extrabold text-text-primary">
                  {report.scoreCardRating}
                </h3>
              </div>
            </div>

            <div className="p-5 rounded-[24px] bg-brand-bg border border-border-brand">
              <span className="text-3xs uppercase tracking-widest font-extrabold text-brand-primary block mb-1">
                Global Carbon Footprint Benchmark
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-xl font-mono font-black ${
                  report.comparisonToGlobalPercent <= 0 ? "text-brand-primary" : "text-rose-500"
                }`}>
                  {report.comparisonToGlobalPercent <= 0 ? "" : "+"}
                  {report.comparisonToGlobalPercent}%
                </span>
                <span className="text-3xs text-text-secondary font-medium">
                  {report.comparisonToGlobalPercent <= 0 ? "below" : "above"} global annual average of 4.5 tons
                </span>
              </div>
            </div>

          </div>

          {/* Strengths & Weaknesses list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths list */}
            <div className="p-5 rounded-[24px] bg-brand-bg border border-border-brand space-y-3">
              <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider flex items-center gap-1">
                <FileCheck className="w-4 h-4" /> Eco-Stewardship Strengths
              </h4>
              <ul className="space-y-2">
                {report.strengths.map((str, idx) => (
                  <li key={idx} className="text-xs text-text-primary flex items-start gap-2 leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-primary shrink-0 mt-0.5" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Growth Areas list */}
            <div className="p-5 rounded-[24px] bg-brand-bg border border-border-brand space-y-3">
              <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Emissions Critical Points
              </h4>
              <ul className="space-y-2">
                {report.improvements.map((imp, idx) => (
                  <li key={idx} className="text-xs text-text-primary flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 mt-1.5" />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Customized bespoke 3-point action items */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-primary" />
              Your Tailored Ecological 3-Point Action Plan
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.bespokeActionPlan.map((action, idx) => (
                <div
                  key={idx}
                  className="bg-bg-card p-4 rounded-[24px] border border-border-brand shadow-xs space-y-3 theme-transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-brand-secondary text-brand-primary flex items-center justify-center font-extrabold text-2xs">
                      0{idx + 1}
                    </span>
                    <span className={`text-3xs font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      action.difficulty === "Easy" ? "bg-brand-secondary text-brand-dark" :
                      action.difficulty === "Medium" ? "bg-yellow-50 text-yellow-700" :
                      "bg-rose-50 text-rose-500"
                    }`}>
                      {action.difficulty}
                    </span>
                  </div>

                  <p className="text-xs text-text-primary font-bold leading-relaxed">
                    {action.actionableTask}
                  </p>

                  <div className="text-3xs text-brand-primary font-semibold flex items-center gap-0.5">
                    <Compass className="w-3.5 h-3.5" /> Saves {action.co2eSavingsEstKg} kg CO₂ / mo
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Closure Cheer bubble */}
          {report.cheeringCloser && (
            <div className="p-4 bg-brand-secondary/20 border border-dashed border-brand-primary/50 rounded-2xl text-center text-xs italic text-brand-primary leading-relaxed font-bold">
              ✨ "{report.cheeringCloser}"
            </div>
          )}

        </div>
      ) : (
        <div className="p-8 text-center text-xs text-text-secondary">
          No records could be parsed. Log standard footprint activity cards first.
        </div>
      )}

    </div>
  );
}
export { };
