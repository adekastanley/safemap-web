import { Timestamp } from 'firebase/firestore';

// User roles
export type UserRole = 'admin' | 'user' | 'guest';

// Alert categories with colors
export enum AlertCategory {
  THEFT = 'theft',
  FIRE = 'fire',
  ACCIDENT = 'accident',
  MEDICAL = 'medical',
  VIOLENCE = 'violence',
  SUSPICIOUS = 'suspicious',
  NATURAL_DISASTER = 'natural_disaster',
  OTHER = 'other'
}

export const ALERT_CATEGORY_COLORS: Record<AlertCategory, string> = {
  [AlertCategory.THEFT]: '#ef4444', // red
  [AlertCategory.FIRE]: '#f97316', // orange
  [AlertCategory.ACCIDENT]: '#eab308', // yellow
  [AlertCategory.MEDICAL]: '#ec4899', // pink
  [AlertCategory.VIOLENCE]: '#dc2626', // dark red
  [AlertCategory.SUSPICIOUS]: '#a855f7', // purple
  [AlertCategory.NATURAL_DISASTER]: '#0ea5e9', // blue
  [AlertCategory.OTHER]: '#6b7280' // gray
};

// Location interface
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

// Alert interface
export interface Alert {
  id?: string;
  title: string;
  description: string;
  category: AlertCategory;
  location: Location;
  radius: number; // in meters
  createdAt: Timestamp | Date;
  expiresAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  createdBy: string; // admin user ID
  isActive: boolean;
  metadata?: {
    reportedBy?: string;
    severity?: 'low' | 'medium' | 'high';
    tags?: string[];
  };
}

// Registered user for SMS notifications
export interface RegisteredUser {
  id?: string;
  name: string;
  phoneNumber: string;
  location: Location;
  isActive: boolean;
  createdAt: Timestamp | Date;
  createdBy: string; // admin who registered them
  metadata?: {
    emergencyContact?: string;
    preferences?: {
      categories?: AlertCategory[];
      quietHours?: {
        start: string; // HH:mm
        end: string; // HH:mm
      };
    };
  };
}

// Firebase Auth User with custom claims
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role: UserRole;
  customClaims?: {
    admin?: boolean;
    permissions?: string[];
  };
}

// Admin dashboard stats
export interface DashboardStats {
  activeAlerts: number;
  totalRegisteredUsers: number;
  smsMessagesSentToday: number;
  alertsByCategory: Record<AlertCategory, number>;
  recentActivity: {
    alertsCreatedToday: number;
    usersRegisteredToday: number;
    lastAlertCreated?: Timestamp | Date;
  };
}

// SMS notification log
export interface SMSNotification {
  id?: string;
  alertId: string;
  userId: string;
  phoneNumber: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  sentAt: Timestamp | Date;
  twilioSid?: string;
  error?: string;
}

// Map bounds for viewport
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Form interfaces
export interface CreateAlertForm {
  title: string;
  description: string;
  category: AlertCategory;
  location: Location;
  radius: number;
  severity?: 'low' | 'medium' | 'high';
  tags?: string;
}

export interface RegisterUserForm {
  name: string;
  phoneNumber: string;
  address?: string;
  location: Location;
  emergencyContact?: string;
  categories?: AlertCategory[];
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Firebase collections
export const COLLECTIONS = {
  ALERTS: 'alerts',
  USERS: 'registered_users',
  SMS_NOTIFICATIONS: 'sms_notifications',
  ADMIN_LOGS: 'admin_logs'
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
