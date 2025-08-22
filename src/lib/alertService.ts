import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertCategory, Location, COLLECTIONS } from '@/types';

export class AlertService {
  private static collectionRef = collection(db, COLLECTIONS.ALERTS);

  /**
   * Create a new alert
   */
  static async createAlert(alertData: {
    title: string;
    description: string;
    category: AlertCategory;
    location: Location;
    radius: number;
    createdBy: string;
    severity?: 'low' | 'medium' | 'high';
    tags?: string[];
  }): Promise<string> {
    try {
      const expiryMinutes = process.env.NODE_ENV === 'production' 
        ? parseInt(process.env.NEXT_PUBLIC_ALERT_EXPIRY_MINUTES || '15')
        : parseInt(process.env.NEXT_PUBLIC_DEBUG_EXPIRY_MINUTES || '1');

      const now = new Date();
      const expiresAt = new Date(now.getTime() + (expiryMinutes * 60 * 1000));

      const alert: Omit<Alert, 'id'> = {
        title: alertData.title,
        description: alertData.description,
        category: alertData.category,
        location: alertData.location,
        radius: alertData.radius,
        createdAt: Timestamp.fromDate(now),
        expiresAt: Timestamp.fromDate(expiresAt),
        createdBy: alertData.createdBy,
        isActive: true,
        metadata: {
          severity: alertData.severity,
          tags: alertData.tags,
        }
      };

      const docRef = await addDoc(this.collectionRef, alert);
      
      // TODO: Trigger SMS notifications here
      await this.triggerSMSNotifications(docRef.id, alert);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw new Error('Failed to create alert');
    }
  }

  /**
   * Get all active alerts
   */
  static async getActiveAlerts(): Promise<Alert[]> {
    try {
      const now = new Date();
      const q = query(
        this.collectionRef,
        where('isActive', '==', true),
        where('expiresAt', '>', Timestamp.fromDate(now)),
        orderBy('expiresAt'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const alerts: Alert[] = [];

      querySnapshot.forEach((doc) => {
        alerts.push({
          id: doc.id,
          ...doc.data()
        } as Alert);
      });

      return alerts;
    } catch (error) {
      console.error('Error fetching active alerts:', error);
      throw new Error('Failed to fetch active alerts');
    }
  }

  /**
   * Get all alerts (including inactive)
   */
  static async getAllAlerts(limitCount: number = 100): Promise<Alert[]> {
    try {
      const q = query(
        this.collectionRef,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const alerts: Alert[] = [];

      querySnapshot.forEach((doc) => {
        alerts.push({
          id: doc.id,
          ...doc.data()
        } as Alert);
      });

      return alerts;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw new Error('Failed to fetch alerts');
    }
  }

  /**
   * Get alert by ID
   */
  static async getAlertById(alertId: string): Promise<Alert | null> {
    try {
      const docRef = doc(this.collectionRef, alertId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as Alert;
      }

      return null;
    } catch (error) {
      console.error('Error fetching alert:', error);
      throw new Error('Failed to fetch alert');
    }
  }

  /**
   * Update an alert
   */
  static async updateAlert(alertId: string, updates: Partial<Alert>): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, alertId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Error updating alert:', error);
      throw new Error('Failed to update alert');
    }
  }

  /**
   * Deactivate an alert
   */
  static async deactivateAlert(alertId: string): Promise<void> {
    try {
      await this.updateAlert(alertId, { 
        isActive: false,
        updatedAt: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Error deactivating alert:', error);
      throw new Error('Failed to deactivate alert');
    }
  }

  /**
   * Delete an alert
   */
  static async deleteAlert(alertId: string): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, alertId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw new Error('Failed to delete alert');
    }
  }

  /**
   * Subscribe to real-time alert updates
   */
  static subscribeToAlerts(callback: (alerts: Alert[]) => void): () => void {
    const now = new Date();
    const q = query(
      this.collectionRef,
      where('isActive', '==', true),
      where('expiresAt', '>', Timestamp.fromDate(now)),
      orderBy('expiresAt'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const alerts: Alert[] = [];
      querySnapshot.forEach((doc) => {
        alerts.push({
          id: doc.id,
          ...doc.data()
        } as Alert);
      });
      callback(alerts);
    }, (error) => {
      console.error('Error in alerts subscription:', error);
    });

    return unsubscribe;
  }

  /**
   * Get alerts by category
   */
  static async getAlertsByCategory(category: AlertCategory): Promise<Alert[]> {
    try {
      const q = query(
        this.collectionRef,
        where('category', '==', category),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const alerts: Alert[] = [];

      querySnapshot.forEach((doc) => {
        alerts.push({
          id: doc.id,
          ...doc.data()
        } as Alert);
      });

      return alerts;
    } catch (error) {
      console.error('Error fetching alerts by category:', error);
      throw new Error('Failed to fetch alerts by category');
    }
  }

  /**
   * Clean up expired alerts
   */
  static async cleanupExpiredAlerts(): Promise<number> {
    try {
      const now = new Date();
      const q = query(
        this.collectionRef,
        where('isActive', '==', true),
        where('expiresAt', '<=', Timestamp.fromDate(now))
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      let count = 0;

      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { 
          isActive: false,
          updatedAt: Timestamp.fromDate(now)
        });
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }

      return count;
    } catch (error) {
      console.error('Error cleaning up expired alerts:', error);
      throw new Error('Failed to cleanup expired alerts');
    }
  }

  /**
   * Get alerts within radius of a location
   */
  static async getAlertsNearLocation(
    location: Location, 
    radiusInMeters: number
  ): Promise<Alert[]> {
    try {
      // For simplicity, we'll get all active alerts and filter client-side
      // In production, you might want to use geohash or similar for better performance
      const activeAlerts = await this.getActiveAlerts();
      
      return activeAlerts.filter(alert => {
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          alert.location.latitude,
          alert.location.longitude
        );
        
        return distance <= (radiusInMeters + alert.radius);
      });
    } catch (error) {
      console.error('Error fetching alerts near location:', error);
      throw new Error('Failed to fetch alerts near location');
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Trigger SMS notifications for users within alert radius
   */
  private static async triggerSMSNotifications(alertId: string, alert: Omit<Alert, 'id'>): Promise<void> {
    try {
      // This would typically call a Firebase Function or API endpoint
      // For now, we'll just log it
      console.log(`Triggering SMS notifications for alert ${alertId}`);
      
      // TODO: Implement SMS notification logic
      // - Get users within alert radius
      // - Send SMS notifications
      // - Log notification results
    } catch (error) {
      console.error('Error triggering SMS notifications:', error);
    }
  }
}
