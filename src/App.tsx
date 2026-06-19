import React, { useState, useEffect } from "react";
import { UserProfile, FootprintLog } from "./types";
import { auth, db, signInWithGoogle, logOut, validateFirestoreConnection, handleFirestoreError, OperationType } from "./firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { WEEKLY_CHALLENGES } from "./challengesData";

// Tabs & components
import DashboardTab from "./components/DashboardTab";
import CarbonCalculator from "./components/CarbonCalculator";
import ClimateCoach from "./components/ClimateCoach";
import PredictionEngine from "./components/PredictionEngine";
import EcoRoute from "./components/EcoRoute";
import ReceiptAnalyzer from "./components/ReceiptAnalyzer";
import WeeklyChallenges from "./components/WeeklyChallenges";
import FamilyDashboard from "./components/FamilyDashboard";
import SustainabilityReports from "./components/SustainabilityReports";

// Icons 
import { Leaf, LogOut, LayoutDashboard, Calculator, Bot, Compass, FileSearch, HelpCircle, Users, FileBarChart, Loader2, Award, Sun, Moon } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<FootprintLog[]>([]);
  const [completedChallengesCount, setCompletedChallengesCount] = useState(0);

  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Local theme state initialized from localStorage
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") return saved;
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return systemPrefersDark ? "dark" : "light";
    }
    return "light";
  });

  // Apply theme class when the theme state changes
  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Synchronize local theme state when profile loads
  useEffect(() => {
    if (profile?.theme && profile.theme !== theme) {
      setTheme(profile.theme);
    }
  }, [profile?.theme]);

  const toggleTheme = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    if (user) {
      const userRef = doc(db, "users", user.uid);
      try {
        await setDoc(userRef, { theme: nextTheme }, { merge: true });
        if (profile) {
          setProfile({ ...profile, theme: nextTheme });
        }
      } catch (err) {
        console.error("Failed to save theme choice to Firestore:", err);
      }
    }
  };

  // Validate Firestore Connection on first boot (Prerequisite constraint from firebase skill)
  useEffect(() => {
    validateFirestoreConnection();
  }, []);

  // Monitor Authentication state
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

  // Listen to standard emissions history subcollection for this user: users/{userId}/footprint_logs/{logId}
  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/footprint_logs`;
    const q = query(collection(db, "users", user.uid, "footprint_logs"), orderBy("timestamp", "desc"));
    
    // Set up snapshot listener
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

    const runCount = async () => {
      let count = 0;
      for (const ch of WEEKLY_CHALLENGES) {
        const ref = doc(db, "challenges", ch.challengeId, "completions", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          count += 1;
        }
      }
      setCompletedChallengesCount(count);
    };

    runCount();
  }, [user, profile?.points]);

  const syncUserProfile = async (firebaseUser: FirebaseUser) => {
    setProfileLoading(true);
    const userRef = doc(db, "users", firebaseUser.uid);
    const targetPath = `users/${firebaseUser.uid}`;

    try {
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        // Core Auto Onboarding Sequence: Instantiate default user options
        const defaultProfile: UserProfile = {
          userId: firebaseUser.uid,
          displayName: firebaseUser.displayName || "Pilot Traveler",
          email: firebaseUser.email || "",
          points: 0,
          currentFootprint: Number((4.5 + Math.random() * 4).toFixed(2)), // Random initial footprint tons
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

  const handleLogAdded = (newLog: FootprintLog) => {
    // Optimistic immediate update to local state array (avoiding duplicates from real-time snapshot listener)
    setLogs((prev) => {
      if (prev.some((log) => log.logId === newLog.logId)) {
        return prev;
      }
      return [newLog, ...prev];
    });
    
    // Substantially reduce the profile current annual footprint in state
    if (profile) {
      const savedTons = newLog.co2e / 1000;
      const updatedProfile = {
        ...profile,
        currentFootprint: Math.max(0, profile.currentFootprint - savedTons),
      };
      setProfile(updatedProfile);
    }
  };

  const handlePointsAwarded = (pointsClaimed: number, co2SavedKg: number) => {
    if (profile) {
      const offsetTons = co2SavedKg / 1000;
      setProfile({
        ...profile,
        points: profile.points + pointsClaimed,
        currentFootprint: Math.max(0, profile.currentFootprint - offsetTons),
      });
      setCompletedChallengesCount((p) => p + 1);
    }
  };

  const handleLogDeleted = (deletedLogId: string, deletedCO2e: number) => {
    setLogs((prev) => prev.filter((l) => l.logId !== deletedLogId));
    if (profile) {
      const footprintRevertedTons = deletedCO2e / 1000;
      setProfile({
        ...profile,
        currentFootprint: profile.currentFootprint + footprintRevertedTons,
      });
    }
  };

  if (authLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-brand-bg text-text-primary">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin mb-4" />
        <span className="text-sm font-semibold">Deploying CarbonPilot AI Interface...</span>
      </div>
    );
  }

  // --- UNAUTHENTICATED HERO ENTRANCE LANDING VIEW ---
  if (!user) {
    return (
      <div id="unauth_landing" className="min-h-screen bg-brand-bg flex items-center justify-center p-4 relative theme-transition">
        {/* Floating Theme Switcher */}
        <div className="absolute top-6 right-6">
          <button
            id="theme_toggle_unauth"
            onClick={toggleTheme}
            className="px-3.5 py-2.5 bg-bg-card hover:bg-brand-secondary/40 text-text-primary border border-border-brand rounded-2xl transition-all shadow-md flex items-center gap-2 text-xs font-semibold"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-brand-primary" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>

        <div className="max-w-4xl w-full bg-bg-card rounded-[32px] overflow-hidden shadow-xl border border-border-brand grid grid-cols-1 md:grid-cols-12 gap-0 theme-transition">
          
          {/* Left Hero Pitch banner using Material M3 and Stitch Inspired brand-darkgreen */}
          <div className="md:col-span-5 bg-gradient-to-br from-brand-darkgreen to-[#002b20] p-8 text-white flex flex-col justify-between space-y-8">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-brand-primary/40 rounded-2xl">
                <Leaf className="w-6 h-6 text-brand-teal" />
              </div>
              <span className="text-sm font-bold tracking-widest font-mono text-brand-teal">
                CARBONPILOT AI
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tight leading-tight">
                Benchmark, Predict, & Offset footprints.
              </h1>
              <p className="text-xs text-brand-secondary/90 leading-relaxed">
                Unlock immediate environmental stewardship powered by AI diagnostics. Compare transit paths, scan sales bills, and generate bespoke home action plans.
              </p>
            </div>

            <span className="text-[10px] text-brand-teal/80 font-mono">
              Designed with Stitch AI 🌿
            </span>
          </div>

          {/* Right Login Trigger block */}
          <div className="md:col-span-7 p-8 flex flex-col justify-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-text-primary tracking-tight">
                Climate Caretaker Sign-In
              </h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                Experience instant auto-onboarding database allocation. No passwords required.
              </p>
            </div>

            <button
              id="oauth_signin_btn"
              onClick={signInWithGoogle}
              className="w-full py-4 bg-brand-primary hover:bg-brand-primary/95 text-white dark:text-brand-dark green-glow rounded-full font-semibold shadow-md shadow-brand-primary/10 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Sign In with Google Test Account
            </button>

            <div className="pt-4 border-t border-border-brand flex items-center justify-between text-[10px] text-text-secondary">
              <span>Secure Cloud Firestore Security</span>
              <span>WCAG 2.1 Compliant</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // --- MAIN AUTHENTICATED WORKSPACE ---
  return (
    <div id="auth_app_canvas" className="min-h-screen bg-brand-bg text-text-primary flex flex-col justify-between theme-transition">
      
      {/* Top Application header */}
      <header className="bg-bg-card border-b border-border-brand py-4 px-6 sticky top-0 z-50 flex items-center justify-between theme-transition">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand-primary text-white dark:text-brand-dark rounded-xl">
            <Leaf className="w-5 h-5 animate-pulse text-white dark:text-slate-900" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-text-primary tracking-tight flex items-center gap-1.5">
              CarbonPilot AI
              <span className="text-[10px] bg-brand-secondary text-brand-dark px-2.5 py-0.5 rounded-full font-bold">
                BETA
              </span>
            </h1>
            <p className="text-[10px] text-text-secondary font-medium">
              Ecological steward dashboard of {profile?.displayName || "Pilot"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-text-primary">
              {profile?.displayName}
            </span>
            <span className="text-[10px] text-brand-primary font-mono">
              Points: {profile?.points || 0} pts
            </span>
          </div>

          {/* Theme Switcher Button */}
          <button
            id="theme_toggle_btn"
            onClick={toggleTheme}
            className="p-2.5 bg-bg-card hover:bg-brand-secondary/50 text-text-primary border border-border-brand rounded-xl transition-all cursor-pointer"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-brand-primary" />
            )}
          </button>

          <button
            id="sign_out_btn"
            onClick={logOut}
            className="p-2.5 bg-bg-card hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 dark:hover:text-rose-400 border border-border-brand rounded-xl transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Primary body grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Navigation Sidebar Panel (Desktop: Span 3) */}
        <aside className="lg:col-span-3 bg-bg-card border border-border-brand rounded-[32px] p-5 shadow-sm space-y-4 h-fit theme-transition">
          <span className="block text-3xs font-bold text-text-secondary uppercase tracking-widest pl-2">
            Operations Menu
          </span>

          <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible gap-1.5 pb-2 lg:pb-0 scrollbar-none">
            {[
              { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
              { id: "calculator", label: "Calculator", icon: Calculator },
              { id: "coach", label: "Climate Coach", icon: Bot },
              { id: "predict", label: "Predictions", icon: FileSearch },
              { id: "route", label: "Eco Routing", icon: Compass },
              { id: "receipt", label: "Receipt Analytics", icon: FileSearch },
              { id: "challenges", label: "Weekly Tasks", icon: HelpCircle },
              { id: "family", label: "Household Group", icon: Users },
              { id: "reports", label: "AI Report", icon: FileBarChart },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`nav_tab_${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-brand-secondary text-brand-dark border border-border-brand/40 font-bold scale-102"
                    : "text-text-secondary hover:text-brand-primary hover:bg-brand-secondary/40"
                }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Dynamic Display Target (Desktop: Span 9) */}
        <main className="lg:col-span-9 space-y-6">
          {activeTab === "dashboard" && (
            <DashboardTab
              userId={user.uid}
              profile={profile}
              logs={logs}
              completedChallengesCount={completedChallengesCount}
              onLogDeleted={handleLogDeleted}
            />
          )}

          {activeTab === "calculator" && (
            <CarbonCalculator
              userId={user.uid}
              onLogAdded={handleLogAdded}
            />
          )}

          {activeTab === "coach" && (
            <ClimateCoach
              userId={user.uid}
            />
          )}

          {activeTab === "predict" && (
            <PredictionEngine
              logs={logs}
              profile={profile}
            />
          )}

          {activeTab === "route" && (
            <EcoRoute
              userId={user.uid}
              onAddLog={handleLogAdded}
            />
          )}

          {activeTab === "receipt" && (
            <ReceiptAnalyzer
              userId={user.uid}
              onScanCompleted={() => syncUserProfile(user)}
            />
          )}

          {activeTab === "challenges" && (
            <WeeklyChallenges
              userId={user.uid}
              userPoints={profile?.points || 0}
              onPointsAwarded={handlePointsAwarded}
            />
          )}

          {activeTab === "family" && (
            <FamilyDashboard
              userId={user.uid}
              userProfile={profile}
            />
          )}

          {activeTab === "reports" && (
            <SustainabilityReports
              logs={logs}
              profile={profile}
              challengesCompletedCount={completedChallengesCount}
            />
          )}
        </main>

      </div>

      {/* Footer credits bar */}
      <footer className="bg-brand-bg border-t border-border-brand py-4 px-6 text-center text-3xs text-text-secondary">
        <p>© 2026 CarbonPilot AI • Google Cloud Partner Enterprise • WCAG AAA Compliance Safeguards</p>
      </footer>

    </div>
  );
}
