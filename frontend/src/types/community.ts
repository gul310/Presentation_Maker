import type { Presentation, Slide } from "./presentation";

export interface PublicPresentationItem extends Presentation {
  author_name: string;
  author_role: string;
  slides?: Slide[];
}

export interface DiscoverResponse {
  items: PublicPresentationItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface RatingResult {
  message: string;
  user_score: number;
  average_rating: number;
  ratings_count: number;
}

export interface UserRatingStatus {
  rated: boolean;
  score: number | null;
}

export interface ReviewItem {
  id: string;
  presentation_id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface MarketplaceItem extends PublicPresentationItem {
  seller_name: string;
  seller_id: string;
  price: number;
  price_pkr?: number;
  sales_count: number;
  slides_preview?: Slide[];
  slides?: Slide[];
  slides_count?: number;
  category?: string;
  short_description?: string;
  detailed_description?: string;
  file_type?: string;
}

export interface MarketplaceResponse {
  items: MarketplaceItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PurchaseResult {
  message: string;
  transaction_id?: string;
  purchased_deck_id?: string;
  order_id?: string;
  order?: any;
  seller?: any;
}

export interface TransactionSummary {
  purchases: any[];
  sales: any[];
  total_earned: number;
  total_spent: number;
}
