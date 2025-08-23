"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { registerPhone, listenToMyRegisteredPhones, RegisteredPhone, updatePhone, deactivatePhone } from "@/lib/phoneRegistry";
import { Plus, Phone, User, MapPin, X, Edit, Trash2, Save } from "lucide-react";

export default function ManagePhonesPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [phones, setPhones] = useState<RegisteredPhone[]>([]);
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");

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

  const startEdit = (phoneData: RegisteredPhone) => {
    setEditingPhone(phoneData.id);
    setEditName(phoneData.name);
    setEditPhoneNumber(phoneData.phoneNumber);
  };

  const cancelEdit = () => {
    setEditingPhone(null);
    setEditName("");
    setEditPhoneNumber("");
  };

  const saveEdit = async (phoneId: string) => {
    if (!editName.trim() || !editPhoneNumber.trim()) {
      setError("Name and phone number are required");
      return;
    }

    try {
      await updatePhone(phoneId, {
        name: editName.trim(),
        phoneNumber: editPhoneNumber.trim()
      });
      setEditingPhone(null);
      setEditName("");
      setEditPhoneNumber("");
      setError("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update phone";
      setError(msg);
    }
  };

  const deletePhone = async (phoneId: string, phoneName: string) => {
    if (window.confirm(`Are you sure you want to delete ${phoneName}'s phone number? This action cannot be undone.`)) {
      try {
        await deactivatePhone(phoneId);
        setError("");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to delete phone";
        setError(msg);
      }
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
                    <div key={p.id} className="border rounded-md p-4">
                      {editingPhone === p.id ? (
                        // Edit mode
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`edit-name-${p.id}`}>Name</Label>
                              <Input
                                id={`edit-name-${p.id}`}
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Name"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-phone-${p.id}`}>Phone Number</Label>
                              <Input
                                id={`edit-phone-${p.id}`}
                                value={editPhoneNumber}
                                onChange={(e) => setEditPhoneNumber(e.target.value)}
                                placeholder="Phone number"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => saveEdit(p.id)}
                              className="flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" />
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={cancelEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div className="flex items-center justify-between">
                          <div className="space-y-1 flex-1">
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
                          <div className="flex items-center gap-3">
                            <div className={`text-xs px-2 py-1 rounded ${
                              p.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}>
                              {p.isActive ? "Active" : "Inactive"}
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(p)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deletePhone(p.id, p.name)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
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

