"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { registerPhone, listenToMyRegisteredPhones, RegisteredPhone } from "@/lib/phoneRegistry";
import { Plus, Phone, User, MapPin, X } from "lucide-react";

export default function ManagePhonesPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [phones, setPhones] = useState<RegisteredPhone[]>([]);

  useEffect(() => {
    const unsub = listenToMyRegisteredPhones(setPhones);
    return () => unsub();
  }, []);

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name || !phone) {
      setError("Name and phone are required");
      return;
    }
    setSubmitting(true);
    try {
      await registerPhone({ name, phoneNumber: phone });
      setName("");
      setPhone("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to register phone";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Registered Phones</h1>
          <p className="text-muted-foreground">Add residents phone numbers to receive SMS alerts.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Register Phone</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onRegister} className="space-y-4">
                {error && (
                  <div className="text-sm text-red-600">{error}</div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Resident name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g., +2348012345678" />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  <Plus className="h-4 w-4 mr-2" />
                  {submitting ? "Registering..." : "Register"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>My Registered Phones</CardTitle>
            </CardHeader>
            <CardContent>
              {phones.length === 0 ? (
                <p className="text-sm text-muted-foreground">No phone numbers registered yet.</p>
              ) : (
                <div className="space-y-3">
                  {phones.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border rounded-md p-3">
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2">
                          <User className="h-4 w-4" /> {p.name}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <Phone className="h-4 w-4" /> {p.phoneNumber}
                        </div>
                        {p.homeLocation && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {p.homeLocation.latitude.toFixed(4)}, {p.homeLocation.longitude.toFixed(4)}
                          </div>
                        )}
                      </div>
                      <div className="text-xs px-2 py-1 rounded bg-gray-100">{p.isActive ? "Active" : "Inactive"}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

