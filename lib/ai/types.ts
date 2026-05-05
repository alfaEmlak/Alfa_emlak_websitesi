export type AssistantIntent = "buy" | "rent" | null;

export type PropertyPreferences = {
  intent: AssistantIntent;
  location: {
    city: string | null;
    district: string | null;
    neighborhood: string | null;
  };
  propertyType: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string | null;
  rooms: string | null;
  minSquareMeters: number | null;
  furnished: boolean | null;
  features: string[];
  notes: string;
};

export type ListingSearchParams = {
  intent?: AssistantIntent;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  propertyType?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  rooms?: string | null;
  minSquareMeters?: number | null;
  features?: string[];
  query?: string | null;
  limit?: number;
};

export type ListingForAssistant = {
  listingId: string;
  title: string;
  city: string;
  region: string;
  neighborhood: string;
  kind: string;
  propertyType: string;
  price: number | null;
  currency: string;
  rooms: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaM2: number | null;
  image: string | null;
  detailUrl: string;
  reason?: string;
};

export type LeadStatus = "new" | "contacted" | "in_progress" | "closed" | "rejected";
