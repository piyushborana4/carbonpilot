import React, { useState } from "react";
import { FootprintLog, CarbonCategory } from "../types";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { Leaf, Car, Zap, Flame, RefreshCw, PlusCircle, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { calculateCO2 } from "../utils/carbon";

interface CarbonCalculatorProps {
  userId: string;
  onLogAdded: (log: FootprintLog) => void;
  lang?: string;
}

export default function CarbonCalculator({ userId, onLogAdded, lang = "en" }: CarbonCalculatorProps) {
  const [category, setCategory] = useState<CarbonCategory>("transport");
  const [subCategory, setSubCategory] = useState("driving");
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState("");
  
  // Specific parameters for computations
  const [carFuelType, setCarFuelType] = useState("petrol");
  const [flightHours, setFlightHours] = useState(0);
  const [electricitySource, setElectricitySource] = useState("grid"); // clean, grid

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Computed CO2 coefficients (kg CO2e per unit) memoized for ultimate rendering speed and cached calculation efficacy
  const calculatedCO2 = React.useMemo((): number => {
    return calculateCO2(category, subCategory, amount, carFuelType, flightHours, electricitySource);
  }, [category, subCategory, amount, carFuelType, flightHours, electricitySource]);

  const getUnit = (): string => {
    if (category === "transport") {
      if (subCategory === "flight") return "hours";
      return "km";
    }
    if (category === "energy") {
      if (subCategory === "electricity") return "kWh";
      return "m³";
    }
    if (category === "food") return "days";
    return "bags";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    if (calculatedCO2 <= 0) {
      setError("Please input a valid quantity of activities.");
      setSaving(false);
      return;
    }

    const logId = "log_" + Date.now();
    const newLog: FootprintLog = {
      logId,
      userId,
      category,
      subCategory,
      co2e: calculatedCO2,
      amount: subCategory === "flight" ? flightHours : amount,
      unit: getUnit(),
      note: note || `${subCategory.toUpperCase()} activity recorded`,
      timestamp: new Date().toISOString(),
    };

    const targetPath = `users/${userId}/footprint_logs/${logId}`;
    try {
      // Secure write in Firestore Subcollection: users/{userId}/footprint_logs/{logId}
      await setDoc(doc(db, "users", userId, "footprint_logs", logId), newLog);
      
      onLogAdded(newLog);
      setSuccess(true);
      setAmount(0);
      setFlightHours(0);
      setNote("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, targetPath);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="calculator_container" className="bg-bg-card rounded-[32px] p-6 shadow-sm border border-border-brand theme-transition">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-brand-secondary text-brand-dark rounded-2xl">
          <Leaf className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            Carbon Footprint Calculator
          </h2>
          <p className="text-sm text-text-secondary">
            Quantify individual daily actions and log them to monitor improvements.
          </p>
        </div>
      </div>

      {/* Category selector */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {(["transport", "energy", "food", "waste"] as CarbonCategory[]).map((cat) => (
          <button
            key={cat}
            id={`cat_btn_${cat}`}
            type="button"
            onClick={() => {
              setCategory(cat);
              if (cat === "transport") setSubCategory("driving");
              else if (cat === "energy") setSubCategory("electricity");
              else if (cat === "food") setSubCategory("diet");
              else setSubCategory("general");
              setAmount(0);
            }}
            className={`py-3 px-1 rounded-2xl text-xs font-semibold uppercase flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              category === cat
                ? "bg-brand-primary text-white shadow-sm font-bold scale-102"
                : "bg-brand-bg text-text-secondary hover:bg-brand-secondary/40 hover:text-brand-primary"
            }`}
          >
            {cat === "transport" && <Car className="w-4 h-4" />}
            {cat === "energy" && <Zap className="w-4 h-4" />}
            {cat === "food" && <Flame className="w-4 h-4" />}
            {cat === "waste" && <RefreshCw className="w-4 h-4" />}
            {cat}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Sub-category picker */}
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Activity Type
          </label>
          <select
            id="sub_category_select"
            value={subCategory}
            onChange={(e) => {
              setSubCategory(e.target.value);
              setAmount(0);
            }}
            className="w-full bg-brand-bg border border-border-brand rounded-2xl p-3.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
          >
            {category === "transport" && (
              <>
                <option value="driving">Commuting by Car (Driving)</option>
                <option value="transit">Public Bus or Metro Subway</option>
                <option value="flight">Airline Plane Travels</option>
              </>
            )}
            {category === "energy" && (
              <>
                <option value="electricity">Household Electricity Usage</option>
                <option value="gas">Natural Heating Gas (Heaters/Stove)</option>
              </>
            )}
            {category === "food" && (
              <>
                <option value="diet">Daily Food Diet Profile</option>
              </>
            )}
            {category === "waste" && (
              <>
                <option value="general">Non-Recycled Household Trash</option>
                <option value="recycled">Recycling Sorting / Organic Compost</option>
              </>
            )}
          </select>
        </div>

        {/* Dynamic Parameter Settings */}
        {category === "transport" && subCategory === "driving" && (
          <div className="bg-brand-bg p-4 rounded-2xl border border-border-brand">
            <span className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
              Vehicle Tailpipe Combustion Properties
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { type: "petrol", label: "Petrol Gas Engine (~180g CO₂/km)" },
                { type: "diesel", label: "Diesel Compression (~170g CO₂/km)" },
                { type: "hybrid", label: "Hybrid Efficiency (~100g CO₂/km)" },
                { type: "electric", label: "Fully Battery Electric (~40g CO₂/km)" },
              ].map((fuel) => (
                <button
                  key={fuel.type}
                  type="button"
                  onClick={() => setCarFuelType(fuel.type)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    carFuelType === fuel.type
                      ? "bg-bg-card border-brand-primary text-brand-primary font-bold shadow-sm"
                      : "bg-brand-bg border-border-brand text-text-secondary"
                  }`}
                >
                  {fuel.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {category === "energy" && subCategory === "electricity" && (
          <div className="bg-brand-bg p-4 rounded-2xl border border-border-brand">
            <span className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
              Utility Resource Grid Source
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setElectricitySource("grid")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  electricitySource === "grid"
                    ? "bg-bg-card border-brand-primary text-brand-primary font-bold shadow-sm"
                    : "bg-brand-bg border-border-brand text-text-secondary"
                }`}
              >
                Standard National Grid (Gas/Coal)
              </button>
              <button
                type="button"
                onClick={() => setElectricitySource("renewable")}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  electricitySource === "renewable"
                    ? "bg-bg-card border-brand-primary text-brand-primary font-bold shadow-sm"
                    : "bg-brand-bg border-border-brand text-text-secondary"
                }`}
              >
                Self Solar arrays or Renewable Subscription
              </button>
            </div>
          </div>
        )}

        {category === "food" && subCategory === "diet" && (
          <div className="bg-brand-bg p-4 rounded-2xl border border-border-brand">
            <span className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
              General Food Diet profile (Emissions Intensity)
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { val: 1, label: "Vegan Diet (No dairy/animal-product)" },
                { val: 2, label: "Vegetarian (Plant with dairy/eggs)" },
                { val: 3, label: "Low Meat (Fewer red meat servings)" },
                { val: 4, label: "Heavy Meat (Daily red meat, lamb, beef)" },
              ].map((diet) => (
                <button
                  key={diet.val}
                  type="button"
                  onClick={() => setAmount(diet.val)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    amount === diet.val
                      ? "bg-bg-card border-brand-primary text-brand-primary font-bold shadow-sm"
                      : "bg-brand-bg border-border-brand text-text-secondary"
                  }`}
                >
                  {diet.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount Input */}
        {!(category === "food" && subCategory === "diet") && (
          <div>
            <label htmlFor={subCategory === "flight" ? "flight_hours_input" : "amount_input"} className="block text-sm font-semibold text-text-primary mb-2">
              {subCategory === "flight" ? "Flight Duration" : "Quantity"} ({getUnit()})
            </label>
            {subCategory === "flight" ? (
              <input
                id="flight_hours_input"
                type="number"
                min="0"
                max="100"
                value={flightHours || ""}
                onChange={(e) => setFlightHours(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="Number of hours flown"
                className="w-full bg-brand-bg border border-border-brand rounded-2xl p-3.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus-visible:ring-brand-primary"
              />
            ) : (
              <input
                id="amount_input"
                type="number"
                min="0"
                value={amount || ""}
                onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder={`Enter amount in ${getUnit()}`}
                className="w-full bg-brand-bg border border-border-brand rounded-2xl p-3.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus-visible:ring-brand-primary"
              />
            )}
          </div>
        )}

        {/* Note / Description */}
        <div>
          <label htmlFor="note_input" className="block text-sm font-semibold text-text-primary mb-2">
            Optional Note / Description
          </label>
          <input
            id="note_input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Commute to San Bruno HQ, Weekly sorting compost, etc."
            className="w-full bg-brand-bg border border-border-brand rounded-2xl p-3.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus-visible:ring-brand-primary"
          />
        </div>

        {/* Live carbon footprint estimation bubble */}
        <div className="p-4 bg-brand-secondary/30 rounded-2xl border border-dashed border-border-brand flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-brand-primary" />
            <span className="text-sm font-medium text-text-primary">
              Live CO₂ Estimation:
            </span>
          </div>
          <span className="font-mono text-xl font-bold text-brand-primary">
            {calculatedCO2} kg CO₂e
          </span>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-brand-secondary text-brand-dark rounded-2xl text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" stroke="currentColor" />
            <span>Successfully registered and logged inside Firestore!</span>
          </div>
        )}

        <button
          id="submit_log_btn"
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-40 text-white rounded-2xl font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving to Firestore...
            </>
          ) : (
            <>
              <PlusCircle className="w-5 h-5" />
              Log Footprint Log entry
            </>
          )}
        </button>
      </form>
    </div>
  );
}
