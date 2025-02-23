import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const nutrientClassification = {
  high_risk: [
    "trans fat",
    "aspartame",
    "high fructose corn syrup",
    "artificial sweeteners",
    "sodium nitrite",
    "sodium nitrate",
  ],
  moderate_risk: [
    "saturated fat",
    "sodium",
    "added sugars",
    "artificial colors",
    "preservatives",
  ],
  healthy: [
    "fiber",
    "protein",
    "vitamin",
    "mineral",
    "antioxidant",
    "omega-3",
  ],
};

export const nutrientInfo = {
  "trans fat": "Known to increase cancer risk and inflammation in the body.",
  "aspartame": "Artificial sweetener with potential links to various cancers.",
  "high fructose corn syrup": "May contribute to obesity and metabolic disorders.",
  "sodium nitrite": "Used in processed meats, linked to increased cancer risk.",
  "saturated fat": "High intake may increase risk of certain cancers.",
  "sodium": "Excessive intake may increase risk of stomach cancer.",
  "fiber": "Helps prevent colorectal cancer and promotes gut health.",
  "protein": "Essential for cell repair and immune system function.",
  "vitamins": "Critical for cellular health and cancer prevention.",
};
