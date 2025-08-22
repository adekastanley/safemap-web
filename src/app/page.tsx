'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GoogleMapsProvider from '@/components/GoogleMapsProvider';
import SafeMapComponent from '@/components/SafeMapComponent';
import { AlertService } from '@/lib/alertService';
import { Alert } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Shield, Users, Clock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
      return;
    }

    // Load public alerts
    const loadAlerts = async () => {
      try {
        const activeAlerts = await AlertService.getActiveAlerts();
        setAlerts(activeAlerts);
      } catch (error) {
        console.error('Error loading alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadAlerts();
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || (isAuthenticated && alerts.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SafeMap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">SafeMap</span>
            </div>
            
            <nav className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                <Link href="#about">About</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="#features">Features</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/login">
                  <LogIn className="h-4 w-4 mr-2" />
                  Admin Login
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Real-time Community
              <span className="text-blue-600 block">Safety Alerts</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Stay informed about safety incidents in your community with live alerts, 
              SMS notifications, and interactive mapping.
            </p>
            
            <div className="flex items-center justify-center gap-2 mb-8">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Clock className="h-4 w-4 mr-2" />
                {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </section>

        {/* Live Map Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Live Safety Map
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                View current safety alerts in real-time. Click on markers to see detailed information.
              </p>
            </div>

            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <GoogleMapsProvider>
                  <SafeMapComponent
                    alerts={alerts}
                    className="w-full h-[600px]"
                  />
                </GoogleMapsProvider>
              </CardContent>
            </Card>

            {loading && (
              <div className="text-center mt-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500">Loading alerts...</p>
              </div>
            )}

            {!loading && alerts.length === 0 && (
              <div className="text-center mt-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  All Clear!
                </h3>
                <p className="text-gray-600">
                  No active safety alerts in your area at this time.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How SafeMap Works
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Our platform provides comprehensive community safety monitoring and notification systems.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle>Real-time Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">
                    Administrators report safety incidents that appear instantly on the map with 
                    color-coded categories and affected radius.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle>SMS Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">
                    Registered residents receive immediate SMS alerts when incidents 
                    occur within their specified radius.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle>Community Safety</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-center">
                    Build a safer community through transparent communication and 
                    coordinated emergency response.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-blue-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-6">
              Want to implement SafeMap in your community?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Contact us to set up SafeMap for your neighborhood, campus, or organization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/auth/login">
                  <LogIn className="h-5 w-5 mr-2" />
                  Administrator Access
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-blue-600">
                <Users className="h-5 w-5 mr-2" />
                Register for SMS Alerts
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-6 w-6" />
              <span className="text-xl font-bold">SafeMap</span>
            </div>
            <p className="text-gray-400">
              Keeping communities safe through real-time communication.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
