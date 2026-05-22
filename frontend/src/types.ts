export type BudgetLevel = "low" | "medium" | "high" | "luxury";

export type SegmentType =
  | "arrival"
  | "drive"
  | "activity"
  | "meal"
  | "lodging"
  | "viewpoint"
  | "flight"
  | "transit"
  | "buffer"
  | "departure";

export type UserPreferences = {
  travel_styles: string[];
  pace?: string | null;
  interests: string[];
  avoid: string[];
  accessibility_notes?: string | null;
};

export type GenerateTripRequest = {
  query: string;
  start_date: string;
  end_date: string;
  origin_location?: string | null;
  budget_level?: BudgetLevel | null;
  num_travelers: number;
  user_preferences: UserPreferences;
};

export type TripDraftRequest = {
  query: string;
  start_date?: string | null;
  end_date?: string | null;
  origin_location?: string | null;
  budget_level?: BudgetLevel | null;
  num_travelers: number;
  user_preferences: UserPreferences;
};

export type ItinerarySegment = {
  sequence: number;
  segment_type: SegmentType;
  start_time: string;
  end_time: string;
  origin?: string | null;
  destination?: string | null;
  description: string;
  estimated_travel_time?: string | null;
  estimated_distance?: string | null;
  why_recommended?: string | null;
  cost_estimate?: string | null;
  food_recommendation?: string | null;
  photo_query?: string | null;
  image_url?: string | null;
  tips: string[];
  constraints_satisfied: string[];
};

export type TripDay = {
  day_number: number;
  date: string;
  theme: string;
  starting_location: string;
  ending_location: string;
  estimated_total_drive_time?: string | null;
  estimated_total_walking_time?: string | null;
  estimated_total_distance?: string | null;
  summary: string;
  segments: ItinerarySegment[];
};

export type TripPlan = {
  trip_title: string;
  origin_location?: string | null;
  destination_region: string;
  start_date: string;
  end_date: string;
  travel_style: string[];
  budget_level: BudgetLevel;
  num_travelers: number;
  estimated_total_cost_range?: string | null;
  summary: string;
  days: TripDay[];
};

export type RecommendationCard = {
  id: string;
  title: string;
  destination_region: string;
  duration_days: number;
  short_description: string;
  travel_styles: string[];
  budget_level: BudgetLevel;
  best_season?: string | null;
  preview_image_query?: string | null;
};
