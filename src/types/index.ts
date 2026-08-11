export type BookingStatus = 'pending' | 'confirmed' | 'blocked' | 'cancelled';

export interface BookingRequest {
  clientName: string;
  clientPhone: string;
  eventType: string;
  eventLocation: string;
  bookingDate: string;
}

export interface BookingRecord {
  id?: number | string;
  client_name: string;
  client_phone: string;
  event_type: string;
  event_location: string;
  booking_date: string;
  status: BookingStatus;
  created_at?: string;
}

export interface BlockedDateRecord {
  id?: number;
  date_str: string;
  status: 'blocked' | 'available';
  notes?: string;
  created_at?: string;
}

export interface DateEventDetail {
  eventType: string;
  clientName?: string;
  status: BookingStatus;
}

export interface CalendarStatusPayload {
  success: boolean;
  dateStatuses: Record<string, 'blocked' | 'pending' | 'available'>;
  dateEvents: Record<string, DateEventDetail>;
}

export interface ReviewRecord {
  id?: number | string;
  client_name: string;
  event_type: string;
  rating: number;
  review_text: string;
  is_approved?: number | boolean;
  created_at?: string;
}

export interface ServiceRecord {
  id?: number;
  title: string;
  subtitle?: string;
  badge?: string;
  price?: string;
  deliverables?: string;
  features?: string;
  cover_image?: string;
}

export interface GalleryRecord {
  id?: number | string;
  title: string;
  category: string;
  image_url: string;
  badge?: string;
}

export interface ProfilePhotoRecord {
  id?: number;
  photo_path: string;
}
