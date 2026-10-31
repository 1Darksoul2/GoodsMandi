export type Profile = {
  id: string;
  name: string;
  college_email: string;
  year_of_study: number | null;
  branch_course: string | null;
  profile_photo_url: string | null;
  verified: boolean;
  rating_avg: number;
  total_items_sold: number;
  active_listings_count: number;
  banned: boolean;
  warning_count: number;
  is_admin: boolean;
  created_at: string;
};

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: string;
  asking_price: number;
  product_age: string;
  photos: string[];
  availability_window: string | null;
  status: 'active' | 'sold' | 'removed';
  selected_bidder_id: string | null;
  backup_bidder_id: string | null;
  created_at: string;
  // Joined fields
  seller?: Profile;
};

export type Bid = {
  id: string;
  listing_id: string;
  bidder_id: string;
  bid_amount: number;
  bid_attempts: number;
  status: 'pending' | 'selected' | 'rejected' | 'backup';
  created_at: string;
  // Joined fields
  bidder?: Profile;
  listing?: Listing;
};

export type ChatMessage = {
  id: string;
  listing_id: string;
  sender_id: string;
  recipient_id: string;
  message_text: string;
  created_at: string;
  // Joined fields
  sender?: Profile;
};

export type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reported_listing_id: string | null;
  category: string;
  description: string | null;
  status: 'pending' | 'confirmed' | 'dismissed';
  created_at: string;
  // Joined fields
  reporter?: Profile;
  reported_user?: Profile;
  reported_listing?: Listing;
};

export type Rating = {
  id: string;
  listing_id: string;
  rater_id: string;
  rated_user_id: string;
  rating_value: number;
  created_at: string;
  // Joined fields
  rater?: Profile;
};

export type ChatConversation = {
  listing_id: string;
  other_user_id: string;
  other_user: Profile;
  listing: Listing;
  last_message: ChatMessage;
  unread_count?: number;
};
