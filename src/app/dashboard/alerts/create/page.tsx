'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import GoogleMapsProvider from '@/components/GoogleMapsProvider';
import SafeMapComponent from '@/components/SafeMapComponent';
import { createAlert as createMobileAlert, AlertType } from '@/lib/alertsCompat';
import { Location } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

const createAlertSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be less than 500 characters'),
  type: z.enum(['test','type1','type2']),
  ttlMinutes: z.number().min(1).max(720),
});

type CreateAlertFormData = z.infer<typeof createAlertSchema>;

export default function CreateAlertPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin } = useAuth();
  
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<CreateAlertFormData>({
    resolver: zodResolver(createAlertSchema),
    defaultValues: {
      type: 'test',
      ttlMinutes: 120
    }
  });

  // Get location from URL params if available
  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    
    if (lat && lng) {
      setSelectedLocation({
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      });
    }
  }, [searchParams]);


  const handleMapClick = (location: Location) => {
    setSelectedLocation(location);
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<{ formatted?: string; name?: string; state?: string; country?: string } | null> => {
    try {
      if (!(window as any).google || !(window as any).google.maps) return null;
      const geocoder = new (window as any).google.maps.Geocoder();
      const result = await new Promise<any>((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results && results.length > 0) {
            resolve(results[0]);
          } else {
            resolve(null);
          }
        });
      });
      if (!result) return null;
      const formatted = result.formatted_address as string | undefined;
      const comps: any[] = result.address_components || [];
      const findComp = (type: string) => comps.find(c=> (c.types||[]).includes(type));
      const country = findComp('country')?.long_name as string | undefined;
      const state = findComp('administrative_area_level_1')?.long_name as string | undefined;
      const name = (findComp('locality')?.long_name || findComp('sublocality')?.long_name || findComp('administrative_area_level_2')?.long_name) as string | undefined;
      return { formatted, name, state, country };
    } catch {
      return null;
    }
  };

  const onSubmit = async (data: CreateAlertFormData) => {
    if (!selectedLocation) {
      setError('Please select a location on the map');
      return;
    }

    if (!user) {
      setError('You must be logged in to create alerts');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const geodata = await reverseGeocode(selectedLocation.latitude, selectedLocation.longitude);
      await createMobileAlert({
        type: data.type as AlertType,
        title: data.title,
        description: data.description,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        locationName: geodata?.name || geodata?.formatted || undefined,
        locationState: geodata?.state || undefined,
        locationCountry: geodata?.country || undefined,
        ttlMinutes: data.ttlMinutes,
      });
      setSuccess(true);
      
      // Redirect to map view after a delay
      setTimeout(() => {
        router.push('/dashboard/map');
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create alert';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <div className="mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-900">Alert Created Successfully!</h3>
              <p className="text-green-700 mt-2">
                SMS notifications are being sent to users in the area.
              </p>
            </div>
            <Button onClick={() => router.push('/dashboard/map')} className="w-full">
              View on Map
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/map">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Map
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Safety Alert</h1>
          <p className="text-muted-foreground">
            Report a new safety incident to notify the community
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Details</CardTitle>
            <CardDescription>
              Fill in the details of the safety alert
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Alert Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Robbery reported on Main Street"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide more details about the incident..."
                  rows={3}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Type *</Label>
                        <Select onValueChange={(value: 'test' | 'type1' | 'type2') => setValue('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select alert type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">TEST</SelectItem>
                    <SelectItem value="type1">TYPE 1</SelectItem>
                    <SelectItem value="type2">TYPE 2</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>

              {/* TTL */}
              <div className="space-y-2">
                <Label htmlFor="ttl">Time to live (minutes)</Label>
                <Input id="ttl" type="number" min="1" max="720" {...register('ttlMinutes', { valueAsNumber: true })} />
              </div>

              {/* Location Info */}
              <div className="space-y-2">
                <Label>Location *</Label>
                {selectedLocation ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">
                      {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-800">
                      Please click on the map to select a location
                    </span>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !selectedLocation}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Alert...
                  </>
                ) : (
                  'Create Alert'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Map */}
        <Card>
          <CardHeader>
            <CardTitle>Select Location</CardTitle>
            <CardDescription>
              Click on the map to select the alert location
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <GoogleMapsProvider>
              <SafeMapComponent
                onMapClick={handleMapClick}
                selectedLocation={selectedLocation}
                className="w-full h-[600px] rounded-b-lg"
              />
            </GoogleMapsProvider>
          </CardContent>
        </Card>
      </div>
    </div>
    </ProtectedRoute>
  );
}
