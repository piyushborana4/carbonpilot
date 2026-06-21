export type CarbonCategory = "transport" | "energy" | "food" | "waste";

export interface UserProfile {
  userId: string;
  displayName: string;
  email: string;
  points: number;
  currentFootprint: number; // in metric tons CO2e per year
  hasOnboarded: boolean;
  theme: "light" | "dark";
  language: "en" | "es" | "fr";
  familyGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FootprintLog {
  logId: string;
  userId: string;
  category: CarbonCategory;
  subCategory: string;
  co2e: number; // in kg of CO2e
  amount: number;
  unit: string;
  note?: string;
  timestamp: string;
}

export interface ChatSession {
  sessionId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  messageId: string;
  userId: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface FamilyGroup {
  groupId: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  memberNames?: { [uid: string]: string };
  memberFootprints?: { [uid: string]: number };
  inviteCode: string;
  createdAt: string;
}

export interface SustainabilityChallenge {
  challengeId: string;
  title: string;
  description: string;
  category: CarbonCategory;
  co2eSaved: number; // in kg CO2e
  pointsValue: number;
  icon?: string;
}

export interface ChallengeCompletion {
  completionId: string;
  challengeId: string;
  userId: string;
  completedAt: string;
}

export interface ReceiptScan {
  scanId: string;
  userId: string;
  rawText?: string;
  estimatedCO2: number;
  detectedItems: ReceiptItem[];
  notes?: string;
  timestamp: string;
}

export interface ReceiptItem {
  name: string;
  price?: number;
  category: CarbonCategory;
  co2e: number; // in kg CO2e
  sustainabilityScore?: number; // 1-10
  ecoAlternative?: string;
}

export interface RouteSuggestion {
  name: string;
  distanceKm: number;
  durationMin: number;
  co2eKg: number;
  isEcoFriendly: boolean;
  transitType: "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";
}

export interface CarbonPrediction {
  predictedEmissionNextMonth: number;
  potentialReductionKg: number;
  behavioralInsights: string[];
  monthlyTrendPrediction: {
    month: string;
    businessAsUsual: number;
    greenScenario: number;
  }[];
}

export interface SustainabilityReport {
  reportDate: string;
  scoreCardRating: string;
  comparisonToGlobalPercent: number;
  strengths: string[];
  improvements: string[];
  bespokeActionPlan: {
    actionableTask: string;
    co2eSavingsEstKg: number;
    difficulty: "Easy" | "Medium" | "Hard";
  }[];
  cheeringCloser: string;
}

export interface PlanetarySimulation {
  simulationId: string;
  userId: string;
  choices: {
    commutingMode: string;
    dietStyle: string;
    homeEnergyGrid: string;
    consumptionWaste: string;
  };
  tenYearEmissionsBAU: { year: number; co2: number }[];
  tenYearEmissionsGreen: { year: number; co2: number }[];
  personalizedRecommendations: {
    title: string;
    impact: string;
    difficulty: string;
    action: string;
  }[];
  verdictString: string;
  timestamp: string;
}

