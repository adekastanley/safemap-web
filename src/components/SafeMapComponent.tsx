'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AlertCategory, ALERT_CATEGORY_COLORS, Location } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, User, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface SafeMapProps {
  alerts?: Alert[];
  onMapClick?: (location: Location) => void;
  selectedLocation?: Location | null;
  showCreateAlertButton?: boolean;
  className?: string;
}

const DEFAULT_CENTER = {
  lat: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LAT || '6.5244'),
  lng: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_MAP_CENTER_LNG || '3.3792'),
};

const DEFAULT_ZOOM = 12;

export default function SafeMapComponent({ 
  alerts = [], 
  onMapClick,
  selectedLocation,
  showCreateAlertButton = false,
  className = "w-full h-[600px]"
}: SafeMapProps) {
  const { isAdmin } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const circlesRef = useRef<google.maps.Circle[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Filter active alerts
  const activeAlerts = alerts.filter(alert => {
    if (!alert.isActive) return false;
    
    const expiresAt = alert.expiresAt instanceof Date ? alert.expiresAt : (alert.expiresAt as Timestamp).toDate();
    return expiresAt > new Date();
  });

  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case AlertCategory.FIRE:
        return '🔥';
      case AlertCategory.THEFT:
        return '🚨';
      case AlertCategory.MEDICAL:
        return '🏥';
      case AlertCategory.ACCIDENT:
        return '🚗';
      case AlertCategory.VIOLENCE:
        return '⚠️';
      case AlertCategory.SUSPICIOUS:
        return '👁️';
      case AlertCategory.NATURAL_DISASTER:
        return '🌪️';
      default:
        return '📍';
    }
  };

  const formatTimeAgo = (date: Date | Timestamp) => {
    const actualDate = date instanceof Date ? date : date.toDate();
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - actualDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return format(actualDate, 'MMM dd, HH:mm');
  };

  const getTimeUntilExpiry = (expiresAt: Date | Timestamp) => {
    const expiry = expiresAt instanceof Date ? expiresAt : expiresAt.toDate();
    const now = new Date();
    const diffInMinutes = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60));
    
    if (diffInMinutes <= 0) return 'Expired';
    if (diffInMinutes < 60) return `${diffInMinutes}m left`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h left`;
    return format(expiry, 'MMM dd, HH:mm');
  };

  // Initialize Google Map
  useEffect(() => {
    if (!mapRef.current || googleMapRef.current) return;

    const initMap = () => {
      const map = new google.maps.Map(mapRef.current!, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
      });

      googleMapRef.current = map;

      // Try to center on current location (browser geolocation) with better error handling
      if (navigator.geolocation) {
        const timeoutId = setTimeout(() => {
          console.log('Geolocation timeout - using default location');
        }, 6000);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            const { latitude, longitude } = pos.coords;
            const newCenter = { lat: latitude, lng: longitude };
            map.setCenter(newCenter);
            map.setZoom(15); // Slightly closer zoom for user location
            
            // Add a marker for user's current location
            new google.maps.Marker({
              position: newCenter,
              map: map,
              title: "Your Location",
              icon: {
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="#4285F4" stroke="white" stroke-width="3"/>
                    <circle cx="12" cy="12" r="3" fill="white"/>
                  </svg>
                `)}`,
                scaledSize: new google.maps.Size(24, 24),
                anchor: new google.maps.Point(12, 12),
              },
            });
            console.log('Map centered on user location:', { latitude, longitude });
          },
          (error) => {
            clearTimeout(timeoutId);
            console.log('Geolocation error:', error.message);
            console.log('Using default location (Lagos, Nigeria)');
            // Show a notification to user about location access
            if (error.code === error.PERMISSION_DENIED) {
              console.log('Location access denied by user. To show your location, please allow location access in your browser.');
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              console.log('Location information unavailable. Using default location.');
            } else if (error.code === error.TIMEOUT) {
              console.log('Location request timed out. Using default location.');
            }
          },
          { 
            enableHighAccuracy: true, 
            timeout: 8000, 
            maximumAge: 300000 // Cache location for 5 minutes
          }
        );
      } else {
        console.log('Geolocation is not supported by this browser. Using default location.');
      }

      // Add click listener if onMapClick is provided
      if (onMapClick) {
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            const location: Location = {
              latitude: event.latLng.lat(),
              longitude: event.latLng.lng(),
            };
            onMapClick(location);
          }
        });
      }

      // Initialize InfoWindow
      infoWindowRef.current = new google.maps.InfoWindow();
    };

    // Check if Google Maps is loaded
    if (window.google && window.google.maps) {
      initMap();
    } else {
      // Wait for Google Maps to load
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogleMaps);
          initMap();
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => {
        clearInterval(checkGoogleMaps);
      }, 10000);
    }
  }, [onMapClick]);

  // Update markers and circles when alerts change
  useEffect(() => {
    if (!googleMapRef.current) return;

    // Clear existing markers and circles
    markersRef.current.forEach(marker => marker.setMap(null));
    circlesRef.current.forEach(circle => circle.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];

    // Add markers and circles for each alert
    activeAlerts.forEach(alert => {
      const position = {
        lat: alert.location.latitude,
        lng: alert.location.longitude
      };

      // Create marker
      const marker = new google.maps.Marker({
        position,
        map: googleMapRef.current!,
        title: alert.title,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="${ALERT_CATEGORY_COLORS[alert.category]}" stroke="white" stroke-width="3"/>
              <text x="16" y="21" text-anchor="middle" font-size="16">${getCategoryIcon(alert.category)}</text>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16),
        },
      });

      // Create circle
      const circle = new google.maps.Circle({
        center: position,
        radius: alert.radius,
        map: googleMapRef.current!,
        fillColor: ALERT_CATEGORY_COLORS[alert.category],
        fillOpacity: 0.1,
        strokeColor: ALERT_CATEGORY_COLORS[alert.category],
        strokeOpacity: 0.3,
        strokeWeight: 2,
      });

      // Add click listener to marker
      marker.addListener('click', () => {
        setSelectedAlert(alert);
        
        // Show info window
        const content = `
          <div class="p-4 min-w-[300px]">
            <div class="flex items-center gap-2 mb-2">
              <span style="font-size: 18px;">${getCategoryIcon(alert.category)}</span>
              <h3 class="font-bold text-lg">${alert.title}</h3>
            </div>
            <div class="mb-3">
              <span class="inline-block px-2 py-1 text-xs rounded" 
                    style="background-color: ${ALERT_CATEGORY_COLORS[alert.category]}20; color: ${ALERT_CATEGORY_COLORS[alert.category]}">
                ${alert.category.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <p class="text-sm text-gray-600 mb-3">${alert.description}</p>
            <div class="space-y-1 text-xs text-gray-500">
              <div>⏰ Created ${formatTimeAgo(alert.createdAt)}</div>
              <div>⚠️ Expires in ${getTimeUntilExpiry(alert.expiresAt)}</div>
              <div>📍 Radius: ${alert.radius}m</div>
              ${alert.metadata?.severity ? `<div>👤 Severity: ${alert.metadata.severity}</div>` : ''}
            </div>
          </div>
        `;
        
        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open(googleMapRef.current!, marker);
      });

      markersRef.current.push(marker);
      circlesRef.current.push(circle);
    });
  }, [activeAlerts]);

  // Update selected location marker
  useEffect(() => {
    if (!googleMapRef.current || !selectedLocation) return;

    const selectedMarker = new google.maps.Marker({
      position: {
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude
      },
      map: googleMapRef.current,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#3b82f6" stroke="white" stroke-width="3"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16),
      },
    });

    return () => {
      selectedMarker.setMap(null);
    };
  }, [selectedLocation]);

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className={className}
        style={{ minHeight: '400px' }}
      >
        {!window.google && (
          <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Map legend */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <h3 className="text-sm font-semibold mb-3">Alert Categories</h3>
        <div className="space-y-2">
          {Object.entries(ALERT_CATEGORY_COLORS).map(([category, color]) => (
            <div key={category} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="capitalize">
                {category.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Active alerts count */}
      {activeAlerts.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="font-medium">
              {activeAlerts.length} active alert{activeAlerts.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Create alert button */}
      {showCreateAlertButton && isAdmin && selectedLocation && (
        <div className="absolute bottom-4 right-4">
          <Button 
            onClick={() => {
              // This will be handled by parent component
              console.log('Create alert at:', selectedLocation);
            }}
            className="shadow-lg"
          >
            Create Alert Here
          </Button>
        </div>
      )}
    </div>
  );
}
