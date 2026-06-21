import { CarbonCategory } from "../types";

/**
 * Computes estimated carbon emissions based on active category parameters.
 * Highly aligned with international environmental logging standards.
 */
export function calculateCO2(
  category: CarbonCategory,
  subCategory: string,
  amount: number,
  carFuelType: string,
  flightHours: number,
  electricitySource: string
): number {
  switch (category) {
    case "transport":
      if (subCategory === "driving") {
        const factor = carFuelType === "petrol" ? 0.18 :
                       carFuelType === "diesel" ? 0.17 :
                       carFuelType === "hybrid" ? 0.10 : 0.04;
        return Number((amount * factor).toFixed(2));
      } else if (subCategory === "transit") {
        return Number((amount * 0.05).toFixed(2)); // public transport
      } else if (subCategory === "flight") {
        return Number((flightHours * 110).toFixed(2)); // 110 kg CO2 per flight hour
      }
      return amount * 0.15;

    case "energy":
      if (subCategory === "electricity") {
        const factor = electricitySource === "grid" ? 0.45 : 0.05; // 0.45kg per kWh vs renewable
        return Number((amount * factor).toFixed(2));
      } else if (subCategory === "gas") {
        return Number((amount * 2.0).toFixed(2)); // 2.0kg per m3/unit
      }
      return amount * 1.5;

    case "food":
      if (subCategory === "diet") {
        // amount represents days of following this diet
        // daily emissions: vegan: ~3.5kg, vegetarian: ~4.5kg, low-meat: ~6.0kg, heavy-meat: ~9.5kg
        const factor = amount === 1 ? 3.5 : amount === 2 ? 4.5 : amount === 3 ? 6.0 : 9.5;
        return Number((1 * factor).toFixed(2)); // flat single day or meals
      }
      return amount * 1.2;

    case "waste":
      if (subCategory === "general") {
        return Number((amount * 0.8).toFixed(2)); // ~0.8kg per liter/bag of non-recycled waste
      } else if (subCategory === "recycled") {
        return Number((amount * 0.1).toFixed(2));
      }
      return amount * 0.5;

    default:
      return 0;
  }
}
