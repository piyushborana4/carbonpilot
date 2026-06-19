import { SustainabilityChallenge } from "./types";

export const WEEKLY_CHALLENGES: SustainabilityChallenge[] = [
  {
    challengeId: "challenge_meatless_monday",
    title: "Meatless Monday",
    description: "Replace all meat dishes with plant-based meals today to reduce animal consumption footprint.",
    category: "food",
    co2eSaved: 6.8,
    pointsValue: 50,
  },
  {
    challengeId: "challenge_unplug_appliances",
    title: "Phantom Load Elimination",
    description: "Unplug standby microwave, TV, games consoles, or chargers when sleeping or at work.",
    category: "energy",
    co2eSaved: 2.1,
    pointsValue: 30,
  },
  {
    challengeId: "challenge_transit_commute",
    title: "Transit Day Tracker",
    description: "Leave your car at home and commute by bus, train, or light transit for a day.",
    category: "transport",
    co2eSaved: 11.5,
    pointsValue: 100,
  },
  {
    challengeId: "challenge_reusable_bag",
    title: "Plastic-Free Shopping",
    description: "Bring reusable cloth bags for groceries and refuse primary and double single-use plastic wraps.",
    category: "waste",
    co2eSaved: 1.4,
    pointsValue: 20,
  },
  {
    challengeId: "challenge_cool_wash",
    title: "Cold Water Laundry Wash",
    description: "Wash two rounds of laundry using cold tap water (30°C or lower) instead of hot cycles.",
    category: "energy",
    co2eSaved: 3.4,
    pointsValue: 40,
  },
  {
    challengeId: "challenge_short_shower",
    title: "Five-Minute Shower Sprint",
    description: "Shave water heater costs by completing your morning shower in 5 minutes or less.",
    category: "energy",
    co2eSaved: 4.5,
    pointsValue: 35,
  }
];
