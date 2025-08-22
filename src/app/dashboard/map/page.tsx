'use client';

import { useState, useEffect } from 'react';
import GoogleMapsProvider from '@/components/GoogleMapsProvider';
import SafeMapComponent from '@/components/SafeMapComponent';
import { Alert, AlertCategory, Location } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Layers, Filter } from 'lucide-react';
import Link from 'next/link';
import { listenToAllAlerts as listenMobileAlerts, AlertDoc } from '@/lib/alertsCompat';

export default function MapPage() {
  const { isAdmin } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time alerts from Firestore (mobile-compatible schema)
  useEffect(() => {
    const unsub = listenMobileAlerts((items: AlertDoc[]) => {
      // Transform mobile alerts to internal Alert type for the map
      const mapped: Alert[] = items.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        category: AlertCategory.OTHER, // Map unknown/mobile types to OTHER for now
        location: { latitude: a.latitude, longitude: a.longitude },
        radius: 500, // default radius for display
        createdAt: a.createdAt ?? new Date(),
        expiresAt: a.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000),
        createdBy: a.userId,
        isActive: true,
      }));
      setAlerts(mapped);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleMapClick = (location: Location) => {
    if (isAdmin) {
      setSelectedLocation(location);
    }
  };

  const handleCreateAlert = () => {
    if (selectedLocation) {
      // Navigate to create alert page with location
      const params = new URLSearchParams({
        lat: selectedLocation.latitude.toString(),
        lng: selectedLocation.longitude.toString(),
      });
      window.location.href = `/dashboard/alerts/create?${params}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Safety Map</h1>
          <p className="text-muted-foreground">
            Real-time community safety alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button asChild>
              <Link href="/dashboard/alerts/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Alert
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Map Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Layers className="h-4 w-4 mr-2" />
            Layers
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        
        {selectedLocation && isAdmin && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Location selected: {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
            </span>
            <Button onClick={handleCreateAlert} size="sm">
              Create Alert Here
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedLocation(null)}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <GoogleMapsProvider>
                <SafeMapComponent
                  alerts={alerts}
                  onMapClick={handleMapClick}
                  selectedLocation={selectedLocation}
                  showCreateAlertButton={true}
                  className="w-full h-[600px] rounded-lg"
                />
              </GoogleMapsProvider>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Alert Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {alerts.filter(alert => alert.isActive).length}
              </div>
              <p className="text-sm text-gray-600">Currently active</p>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <p className="text-sm text-gray-600">No alerts to display</p>
              ) : (
                <div className="space-y-2">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="border-l-2 border-orange-400 pl-3 py-2">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-gray-600">{alert.category}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Use</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• Click on alert markers to view details</p>
                <p>• Use the legend to understand alert types</p>
                {isAdmin && (
                  <>
                    <p>• Click anywhere on the map to select a location</p>
                    <p>• Create alerts by clicking &ldquo;Create Alert Here&rdquo;</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
