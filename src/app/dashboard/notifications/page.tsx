'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Users, Phone, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { listenToMyRegisteredPhones, RegisteredPhone } from '@/lib/phoneRegistry';
import { auth } from '@/lib/firebase';

export default function NotificationsPage() {
  const { user, isAdmin } = useAuth();
  const [phoneNumbers, setPhoneNumbers] = useState<RegisteredPhone[]>([]);
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('all'); // 'all' or 'selected'
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch phone numbers for the current admin
  useEffect(() => {
    if (!user?.uid || !isAdmin) return;

    setLoading(true);
    const unsubscribe = listenToMyRegisteredPhones((phones) => {
      // Filter only active phone numbers
      const activePhones = phones.filter(phone => phone.isActive);
      setPhoneNumbers(activePhones);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, isAdmin]);

  const handleNumberToggle = (numberId: string) => {
    setSelectedNumbers(prev => 
      prev.includes(numberId) 
        ? prev.filter(id => id !== numberId)
        : [...prev, numberId]
    );
  };

  const handleSelectAll = () => {
    setSelectedNumbers(phoneNumbers.map(num => num.id));
  };

  const handleDeselectAll = () => {
    setSelectedNumbers([]);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (recipient === 'selected' && selectedNumbers.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setSending(true);
    try {
      // Get the numbers to send to
      const recipientNumbers = recipient === 'all' 
        ? phoneNumbers 
        : phoneNumbers.filter(num => selectedNumbers.includes(num.id));

      if (recipientNumbers.length === 0) {
        toast.error('No recipients selected');
        return;
      }

      // Get auth token
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Authentication token unavailable');
        setSending(false);
        return;
      }
      
      // Send SMS via API
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumbers: recipientNumbers.map(num => num.phoneNumber),
          message: message,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send messages');
      }

      if (result.failed > 0) {
        toast.warning(`Sent ${result.sent} messages, ${result.failed} failed`);
      } else {
        toast.success(`Message sent to ${result.sent} recipient(s)!`);
      }
      
      setMessage('');
      setSelectedNumbers([]);
      setRecipient('all');

    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SMS Notifications</h1>
          <p className="text-muted-foreground">
            Send safety alerts and messages to registered users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {phoneNumbers.length} Recipients
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{phoneNumbers.length}</div>
            <p className="text-xs text-muted-foreground">
              Registered phone numbers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recipient === 'all' ? phoneNumbers.length : selectedNumbers.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Will receive message
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Message Length</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{message.length}</div>
            <p className="text-xs text-muted-foreground">
              Characters (160 max recommended)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Composer */}
        <Card>
          <CardHeader>
            <CardTitle>Compose Message</CardTitle>
            <CardDescription>
              Create and send SMS notifications to your registered users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipients</Label>
              <Select value={recipient} onValueChange={setRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All registered users ({phoneNumbers.length})</SelectItem>
                  <SelectItem value="selected">Selected users ({selectedNumbers.length})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your safety alert or message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={320}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Keep messages clear and concise</span>
                <span className={message.length > 160 ? 'text-orange-600' : ''}>
                  {message.length}/160 recommended
                </span>
              </div>
            </div>

            <Button 
              onClick={handleSendMessage}
              disabled={sending || !message.trim() || (recipient === 'selected' && selectedNumbers.length === 0)}
              className="w-full"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recipients List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Registered Users
              {recipient === 'selected' && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Deselect All
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              {recipient === 'all' 
                ? 'All users will receive the message' 
                : 'Click to select users who will receive the message'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : phoneNumbers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No phone numbers registered yet</p>
                <p className="text-sm">Add phone numbers in the Manage section</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {phoneNumbers.map((phoneNumber) => (
                  <div 
                    key={phoneNumber.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      recipient === 'all' || selectedNumbers.includes(phoneNumber.id)
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => recipient === 'selected' && handleNumberToggle(phoneNumber.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        recipient === 'all' || selectedNumbers.includes(phoneNumber.id)
                          ? 'bg-blue-600 border-blue-600' 
                          : 'border-gray-300'
                      }`}>
                        {(recipient === 'all' || selectedNumbers.includes(phoneNumber.id)) && (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{phoneNumber.name}</p>
                        <p className="text-sm text-muted-foreground">{phoneNumber.phoneNumber}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Message Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Templates</CardTitle>
          <CardDescription>
            Click to use pre-written message templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {[
              "🚨 SAFETY ALERT: Please avoid the [LOCATION] area due to ongoing security concerns. Stay safe!",
              "⚠️ WEATHER WARNING: Severe weather expected in your area. Please stay indoors and secure your property.",
              "🚑 EMERGENCY: Medical emergency reported at [LOCATION]. Emergency services on scene. Avoid the area.",
              "🔥 FIRE ALERT: Fire reported in [AREA]. Evacuate if in the vicinity. Follow emergency procedures.",
              "🚧 ROAD CLOSURE: [ROAD NAME] is temporarily closed due to [REASON]. Use alternative routes.",
              "✅ ALL CLEAR: The earlier safety alert for [LOCATION] has been resolved. Normal activities can resume."
            ].map((template, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-left h-auto p-3 whitespace-normal"
                onClick={() => setMessage(template)}
              >
                {template}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </ProtectedRoute>
  );
}
