import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Globe, Sparkles, TrendingDown, Camera, CheckCircle2, Zap, AlertCircle, UploadCloud, Award, Leaf, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { planetarySandboxService } from "../services/planetarySandboxService";
import { PlanetarySimulation, FootprintLog } from "../types";

interface PlanetarySandboxProps {
  userId: string;
  onLogAdded: () => void;
}

export default function PlanetarySandbox({ userId, onLogAdded }: PlanetarySandboxProps) {
  // Simulator state configurations
  const [commutingMode, setCommutingMode] = useState("cars_baseline");
  const [dietStyle, setDietStyle] = useState("meat_standard");
  const [homeEnergyGrid, setHomeEnergyGrid] = useState("fossil_grid");
  const [consumptionWaste, setConsumptionWaste] = useState("waste_high");

  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState<Partial<PlanetarySimulation> | null>(null);
  const [committedPlan, setCommittedPlan] = useState<PlanetarySimulation | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Vision scanner state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    itemName: string;
    category: string;
    estimatedCO2: number;
    sustainabilityScore: number;
    notes: string;
    alternativeAction: string;
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Active sub-tab state inside sandbox view
  const [activeSubTab, setActiveSubTab] = useState<"simulator" | "scanner">("simulator");

  // Load any existing committed simulation plan on mount
  useEffect(() => {
    async function loadCommitted() {
      const plan = await planetarySandboxService.getLatestCommittedSimulation(userId);
      if (plan) {
        setCommittedPlan(plan);
        // Pre-populate slider choices to match their committed plan
        setCommutingMode(plan.choices.commutingMode);
        setDietStyle(plan.choices.dietStyle);
        setHomeEnergyGrid(plan.choices.homeEnergyGrid);
        setConsumptionWaste(plan.choices.consumptionWaste);
        setSimulation(plan);
      } else {
        // Trigger initial preview simulation using default baseline values
        handleRunSimulation(true);
      }
    }
    loadCommitted();
  }, [userId]);

  const handleRunSimulation = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setSuccessMsg(null);
    try {
      const result = await planetarySandboxService.simulateSandbox(
        { commutingMode, dietStyle, homeEnergyGrid, consumptionWaste },
        userId
      );
      setSimulation(result);
    } catch (err) {
      console.error("Simulation run error", err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const handleCommitPlan = async () => {
    if (!simulation || !simulation.tenYearEmissionsBAU) return;
    setLoading(true);
    setSuccessMsg(null);
    try {
      const fullPlan: PlanetarySimulation = {
        simulationId: "sim_" + Date.now(),
        userId,
        choices: { commutingMode, dietStyle, homeEnergyGrid, consumptionWaste },
        tenYearEmissionsBAU: simulation.tenYearEmissionsBAU,
        tenYearEmissionsGreen: simulation.tenYearEmissionsGreen!,
        personalizedRecommendations: simulation.personalizedRecommendations!,
        verdictString: simulation.verdictString!,
        timestamp: new Date().toISOString(),
      };

      await planetarySandboxService.commitSimulationBlueprint(userId, fullPlan);
      setCommittedPlan(fullPlan);
      setSuccessMsg("Planetary Action Blueprint successfully authorized! +250 Climate Points awarded.");
      onLogAdded(); // Refresh general credentials/profile dashboard
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Convert files to base64 for multimodal processing
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setScanResult(null);
    setScanError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        const result = await planetarySandboxService.scanSustainableAsset(base64String, file.type);
        setScanResult(result);
      } catch (err: any) {
        setScanError(err.message || "Failed to parse file. Please upload a structured jpeg or png asset.");
      } finally {
        setScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogScannedEntry = async () => {
    if (!scanResult) return;
    try {
      const isOk = window.confirm(`Append ${scanResult.itemName} (${scanResult.estimatedCO2} kg CO2e) to your active footprint logs?`);
      if (!isOk) return;

      const newLog: FootprintLog = {
        logId: "log_" + Date.now(),
        userId,
        category: (scanResult.category || "food") as any,
        subCategory: scanResult.itemName,
        co2e: scanResult.estimatedCO2,
        amount: 1,
        unit: "scanned unit",
        note: scanResult.notes ? scanResult.notes.substring(0, 180) : "Scanned eco asset entry",
        timestamp: new Date().toISOString(),
      };

      // Call general sustainability logging system
      const { doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../firebase");
      await setDoc(doc(db, "users", userId, "footprint_logs", newLog.logId), newLog);

      // Reward points!
      const { userRepository } = await import("../repositories/userRepository");
      const profile = await userRepository.getUserProfile(userId);
      if (profile) {
        await userRepository.updateUserProfile(userId, {
          points: (profile.points || 0) + 30 // 30 points for photo scan logging
        });
      }

      alert("Scanned eco-friendly item logged! +30 points added.");
      setScanResult(null);
      onLogAdded();
    } catch (err) {
      console.error(err);
    }
  };

  const formatChartData = () => {
    if (!simulation || !simulation.tenYearEmissionsBAU) return [];
    return simulation.tenYearEmissionsBAU.map((bau, index) => {
      const green = simulation.tenYearEmissionsGreen?.[index];
      return {
        year: String(bau.year),
        "Business As Usual": Math.round(bau.co2 / 1000 * 10) / 10,
        "Green Blueprint": green ? Math.round(green.co2 / 1000 * 10) / 10 : null,
        "IPCC Consensus (2 Tons)": 2.0
      };
    });
  };

  return (
    <div id="sandbox_tab" className="bg-bg-card border border-border-brand rounded-[32px] p-6 shadow-sm space-y-6 theme-transition">
      
      {/* Tab Selector and Icon Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-brand pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl">
            <Globe className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-text-primary tracking-tight">
              EarthScribe Earth Twin Sandbox
            </h2>
            <p className="text-xs text-text-secondary">
              Predictive 10-Year Climate Sandbox & Gemini Multimodal Environmental Audit.
            </p>
          </div>
        </div>

        {/* Dual navigation tabs (Simulator style vs Scanner style) */}
        <div className="flex items-center bg-brand-secondary/30 p-1 rounded-xl w-fit border border-border-brand">
          <button
            onClick={() => setActiveSubTab("simulator")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "simulator"
                ? "bg-brand-secondary text-brand-dark shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Climatic Sandbox
          </button>
          <button
            onClick={() => setActiveSubTab("scanner")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "scanner"
                ? "bg-brand-secondary text-brand-dark shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Multimodal Scan Audit
          </button>
        </div>
      </div>

      {activeSubTab === "simulator" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* Controls Panel */}
          <div className="xl:col-span-5 space-y-5 bg-brand-bg/50 p-5 rounded-3xl border border-border-brand">
            <div className="flex items-center gap-1.5 text-brand-primary">
              <Leaf className="w-4 h-4" />
              <span className="text-2xs font-extrabold uppercase tracking-wider">Lifestyle Variables Sandbox</span>
            </div>

            {/* Selector: Commuting Mode */}
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1.5">
                Commuting Mode
              </label>
              <select
                value={commutingMode}
                onChange={(e) => setCommutingMode(e.target.value)}
                className="w-full text-xs bg-bg-card border border-border-brand p-2.5 rounded-xl text-text-primary focus:ring-brand-primary focus:border-brand-primary"
              >
                <option value="cars_baseline">Default Baseline Cars (Gasoline Commutes)</option>
                <option value="transit_hybrid">Clean Hybrid & Smart Ride Carpooling</option>
                <option value="bus_train">Regular Train Metro & Bus Transit</option>
                <option value="ev_clean">100% Electric Vehicle & Active Walking/Biking</option>
              </select>
            </div>

            {/* Selector: Diet Style */}
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1.5">
                Culinary Carbon Style
              </label>
              <select
                value={dietStyle}
                onChange={(e) => setDietStyle(e.target.value)}
                className="w-full text-xs bg-bg-card border border-border-brand p-2.5 rounded-xl text-text-primary focus:ring-brand-primary focus:border-brand-primary"
              >
                <option value="meat_standard">Standard Diet (Frequent Beef & Poultry)</option>
                <option value="protein_balanced">Moderate Meat & Fish diet</option>
                <option value="vegetarian_local">Vegetarian (Diet of Organic Local Dairy & Veg)</option>
                <option value="vegan">100% Plant-Based Vegan Zero-Emissions Baseline</option>
              </select>
            </div>

            {/* Selector: Home Grid proxy */}
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1.5">
                Home Grid Infrastructure
              </label>
              <select
                value={homeEnergyGrid}
                onChange={(e) => setHomeEnergyGrid(e.target.value)}
                className="w-full text-xs bg-bg-card border border-border-brand p-2.5 rounded-xl text-text-primary focus:ring-brand-primary focus:border-brand-primary"
              >
                <option value="fossil_grid">Fossil-Fuel Dependent Regional Grid</option>
                <option value="appliance_saving">Energy Star Certified Efficiency Appliances</option>
                <option value="solar_offset">Home Rooftop Solar Matrix Proxy</option>
              </select>
            </div>

            {/* Selector: Waste */}
            <div>
              <label className="block text-xs font-bold text-text-primary mb-1.5">
                Waste & Disposal Style
              </label>
              <select
                value={consumptionWaste}
                onChange={(e) => setConsumptionWaste(e.target.value)}
                className="w-full text-xs bg-bg-card border border-border-brand p-2.5 rounded-xl text-text-primary focus:ring-brand-primary focus:border-brand-primary"
              >
                <option value="waste_high">High Single-Use Plastic & Standard Landfill Discards</option>
                <option value="waste_recycling">Strict Household Resource Circular Sorting</option>
                <option value="waste_champion">Zero-Waste Lifestyle Champion (No Plastics)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 space-y-3">
              <button
                onClick={() => handleRunSimulation()}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold bg-brand-primary text-white hover:bg-brand-primary/90 rounded-2xl transition-all cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                {loading ? "Simulating Planetary Twin..." : "Compute Simulation Blueprint"}
              </button>

              {simulation && (
                <button
                  onClick={handleCommitPlan}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold bg-brand-secondary text-brand-dark hover:bg-brand-secondary/90 rounded-2xl border border-border-brand transition-all cursor-pointer shadow-sm"
                >
                  <Award className="w-4 h-4 text-brand-primary" />
                  Commit to Decarbonization Plan
                </button>
              )}
            </div>

            {committedPlan && (
              <div className="bg-brand-secondary/25 p-3.5 rounded-2xl border border-border-brand flex items-start gap-2 text-2xs font-semibold text-brand-dark text-left">
                <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-text-primary text-[11px]">Active Committed Blueprint Enabled!</span>
                  Your profile annual baseline carbon footprint target represents the committed simulated path, reducing future carbon burdens.
                </div>
              </div>
            )}
          </div>

          {/* Visual Display Panel */}
          <div className="xl:col-span-7 space-y-6">
            {successMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Projection Chart Card */}
            <div className="bg-brand-bg rounded-3xl p-5 border border-border-brand">
              <span className="text-2xs font-bold text-text-secondary uppercase tracking-widest block mb-4">
                10-Year Co2 Projection Sandbox Trend (Metric Tons CO₂e/yr)
              </span>
              
              <div className="h-[250px] w-full">
                {formatChartData().length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatChartData()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="year" fontSize={10} tickLine={false} />
                      <YAxis fontSize={10} tickLine={false} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line
                        type="monotone"
                        dataKey="Business As Usual"
                        stroke="#ef4444"
                        strokeWidth={2.5}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Green Blueprint"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                      <ReferenceLine
                        y={2.0}
                        stroke="#06b6d4"
                        strokeDasharray="4 4"
                        label={{ value: "IPCC 2T Target", fill: "#06b6d4", fontSize: 9, position: "top" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-xs text-text-secondary">Generating climate sandbox simulation...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Verdict text generated by Gemini */}
            {simulation && (
              <div className="bg-emerald-50/20 dark:bg-emerald-950/5 border border-brand-primary p-5 rounded-3xl text-left space-y-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-brand-primary animate-pulse" />
                  <span className="text-xs font-extrabold text-brand-primary uppercase tracking-widest">Planetary Blueprint Verdict</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {simulation.verdictString}
                </p>
              </div>
            )}

            {/* Actions Recommendations List */}
            {simulation && simulation.personalizedRecommendations && (
              <div className="space-y-3">
                <span className="text-2xs font-bold text-text-secondary uppercase tracking-widest block text-left pl-1">
                  Custom Daily Planet-Saving Habits
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {simulation.personalizedRecommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="bg-bg-card border border-border-brand p-4 rounded-2xl text-left flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text-primary block">{rec.title}</span>
                          <span className="px-2 py-0.5 rounded bg-brand-secondary text-brand-dark text-3xs font-mono font-medium">
                            {rec.impact}
                          </span>
                        </div>
                        <p className="text-3xs text-text-secondary leading-relaxed">{rec.action}</p>
                      </div>

                      <div className="pt-2 bg-transparent">
                        <span className="text-3xs text-brand-primary font-mono block">Difficulty: {rec.difficulty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Multi-Modal Asset scanner Tab view */
        <div className="max-w-2xl mx-auto space-y-6 text-center">
          <div className="p-6 bg-brand-bg/50 rounded-3xl border border-border-brand border-dashed flex flex-col items-center justify-center space-y-4">
            <Camera className="w-12 h-12 text-brand-primary" />
            
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-text-primary">Multimodal Climate Asset Audit</h3>
              <p className="text-xs text-text-secondary max-w-sm">
                Snap or upload anything - gas pump transaction logs, utility meter bills, smart thermostat photos, or diet plates. Gemini's vision extracts and logs environmental factors.
              </p>
            </div>

            <div className="relative">
              <input
                type="file"
                accept="image/*"
                id="sandbox_image_upload"
                onChange={handleImageFileChange}
                className="hidden"
                disabled={scanning}
              />
              <label
                htmlFor="sandbox_image_upload"
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-primary text-white hover:bg-brand-primary/95 text-xs font-bold rounded-2xl transition-all cursor-pointer shadow-md"
              >
                {scanning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Visual Footprint factors...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Select Photo to Audit
                  </>
                )}
              </label>
            </div>
          </div>

          {scanError && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-bg-card border border-border-brand p-5 rounded-3xl space-y-4 text-left shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2 py-0.5 bg-brand-primary/15 text-brand-primary text-3xs font-mono font-bold uppercase rounded">
                    Audit Result : {scanResult.category.toUpperCase()}
                  </span>
                  <h4 className="text-base font-extrabold text-text-primary mt-1">
                    {scanResult.itemName}
                  </h4>
                </div>

                <div className="text-right">
                  <span className="text-lg font-mono font-extrabold text-brand-primary block">
                    {scanResult.estimatedCO2} kg CO₂e
                  </span>
                  <span className="text-3xs text-text-secondary">Estimated carbon load</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-brand-bg rounded-2xl border border-border-brand">
                  <span className="text-3xs font-extrabold text-text-secondary uppercase tracking-wider block mb-1">
                    Sustainability Rating
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-mono font-extrabold text-brand-primary">
                      {scanResult.sustainabilityScore}/10
                    </span>
                    <span className="text-3xs text-text-secondary">
                      ({scanResult.sustainabilityScore >= 7 ? "Responsible Action" : "High Environmental Impact"})
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-brand-bg rounded-2xl border border-border-brand">
                  <span className="text-3xs font-extrabold text-text-secondary uppercase tracking-wider block mb-1">
                    AI Analysis Note
                  </span>
                  <p className="text-3xs text-text-secondary leading-relaxed">
                    {scanResult.notes}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-brand-secondary/20 rounded-2xl border border-border-brand">
                <span className="text-3xs font-extrabold text-text-secondary uppercase tracking-wider block mb-1">
                  Eco-Alternative Recommendation
                </span>
                <p className="text-xs text-text-secondary leading-relaxed font-medium">
                  {scanResult.alternativeAction}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleLogScannedEntry}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Log Scanned Carbon Loading (+30 pts)
                </button>
                <button
                  onClick={() => setScanResult(null)}
                  className="px-4 py-2.5 text-xs font-bold border border-border-brand text-text-secondary hover:text-text-primary rounded-xl transition-all cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
