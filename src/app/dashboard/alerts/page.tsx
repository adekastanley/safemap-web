"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listenToAlertHistory, AlertDoc } from "@/lib/alertsCompat";

export default function AlertsListPage() {
  const [alerts, setAlerts] = useState<AlertDoc[]>([]);

  useEffect(() => {
    const unsub = listenToAlertHistory(setAlerts);
    return () => unsub();
  }, []);

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Alerts</h1>
          <p className="text-muted-foreground">Admin view of all alerts (including history)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts yet.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((a) => (
                  <div key={a.id} className="border rounded-md p-3">
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-gray-600">{a.description}</div>
                    <div className="text-xs text-gray-500">{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

