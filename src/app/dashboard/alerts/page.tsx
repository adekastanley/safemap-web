"use client";

import { useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listenToAlertHistory, AlertDoc, resolveAlert, markAlertFalse } from "@/lib/alertsCompat";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function AlertsListPage() {
  const { user, isSuperAdmin } = useAuth();
  const [alerts, setAlerts] = useState<AlertDoc[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all'|'test'|'type1'|'type2'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [nameFilter, setNameFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all'|'active'|'resolved'|'false'|'inactive'>('all');
  const [assignedRegions, setAssignedRegions] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [minLat, setMinLat] = useState<string>('');
  const [maxLat, setMaxLat] = useState<string>('');
  const [minLng, setMinLng] = useState<string>('');
  const [maxLng, setMaxLng] = useState<string>('');

  useEffect(() => {
    const unsub = listenToAlertHistory(setAlerts);
    return () => unsub();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user?.uid || isSuperAdmin) { setAssignedRegions([]); return; }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.exists() ? snap.data() as any : null;
        setAssignedRegions(Array.isArray(data?.assignedRegions) ? data.assignedRegions : []);
      } catch {
        setAssignedRegions([]);
      }
    };
    load();
  }, [user?.uid, isSuperAdmin]);

  const filtered = useMemo(() => {
    const base = alerts.filter(a => {
      // Assigned regions restriction for admins
      if (!isSuperAdmin && assignedRegions.length > 0) {
        const hay = `${a.locationName||''}, ${a.locationState||''}, ${a.locationCountry||''}`.toLowerCase();
        const ok = assignedRegions.some(r => hay.includes(String(r||'').toLowerCase()));
        if (!ok) return false;
      }
      return true;
    });

    const now = new Date();
    return base.filter(a => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (statusFilter !== 'all') {
        const expired = a.expiresAt && a.expiresAt.toDate() <= now;
        if (statusFilter === 'active') {
          const isActive = !expired && a.status !== 'resolved' && a.status !== 'false';
          if (!isActive) return false;
        } else if (statusFilter === 'resolved') {
          if (a.status !== 'resolved') return false;
        } else if (statusFilter === 'false') {
          if (a.status !== 'false') return false;
        } else if (statusFilter === 'inactive') {
          if (!expired) return false;
        }
      }
      if (countryFilter && !(a.locationCountry||'').toLowerCase().includes(countryFilter.toLowerCase())) return false;
      if (stateFilter && !(a.locationState||'').toLowerCase().includes(stateFilter.toLowerCase())) return false;
      if (nameFilter && !(a.locationName||'').toLowerCase().includes(nameFilter.toLowerCase())) return false;
      const latOk = (
        (minLat === '' || a.latitude >= parseFloat(minLat)) &&
        (maxLat === '' || a.latitude <= parseFloat(maxLat))
      );
      const lngOk = (
        (minLng === '' || a.longitude >= parseFloat(minLng)) &&
        (maxLng === '' || a.longitude <= parseFloat(maxLng))
      );
      return latOk && lngOk;
    });
  }, [alerts, typeFilter, statusFilter, minLat, maxLat, minLng, maxLng, countryFilter, stateFilter, nameFilter, assignedRegions, isSuperAdmin]);

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Alerts</h1>
          <p className="text-muted-foreground">Admin view of all alerts with filters</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-8 gap-2">
              <div>
                <label className="text-sm">Type</label>
                <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value as any)} className="border rounded px-2 py-1 w-full">
                  <option value="all">All</option>
                  <option value="test">Test</option>
                  <option value="type1">Community</option>
                  <option value="type2">Emergency</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Status</label>
                <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)} className="border rounded px-2 py-1 w-full">
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="false">False</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="text-sm">Country</label>
                <input value={countryFilter} onChange={e=>setCountryFilter(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="e.g., Nigeria" />
              </div>
              <div>
                <label className="text-sm">State</label>
                <input value={stateFilter} onChange={e=>setStateFilter(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="e.g., Osun" />
              </div>
              <div>
                <label className="text-sm">Area/Name</label>
                <input value={nameFilter} onChange={e=>setNameFilter(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="e.g., Ipetumodu" />
              </div>
              <div>
                <label className="text-sm">Min Lat</label>
                <input value={minLat} onChange={e=>setMinLat(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="e.g., 6.0" />
              </div>
              <div>
                <label className="text-sm">Max Lat</label>
                <input value={maxLat} onChange={e=>setMaxLat(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="e.g., 7.0" />
              </div>
              <div>
                <label className="text-sm">Min Lng</label>
                <input value={minLng} onChange={e=>setMinLng(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="e.g., 3.0" />
              </div>
              <div>
                <label className="text-sm">Max Lng</label>
                <input value={maxLng} onChange={e=>setMaxLng(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="e.g., 4.5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts match your filters.</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((a) => (
                  <div key={a.id} className="border rounded-md">
                    <div
                      className="p-3 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    >
                      <div className="font-medium">{a.title}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100">{a.type}</span>
                        {a.status === 'resolved' && (<span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Resolved</span>)}
                        {a.status === 'false' && (<span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">False</span>)}
                      </div>
                    </div>
                    {expandedId === a.id && (
                      <div className="px-3 pb-3">
                        <div className="text-sm text-gray-600">{a.description}</div>
                        <div className="text-xs text-gray-500">{a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}</div>
                        {isSuperAdmin && (
                          <div className="mt-2 flex gap-2">
                            <button
                              className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                              onClick={async (e)=>{ e.stopPropagation(); try { await resolveAlert(a.id); } catch(err){ console.error(err);} }}
                              disabled={a.status === 'resolved'}
                            >Resolve</button>
                            <button
                              className="text-xs px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-700"
                              onClick={async (e)=>{ e.stopPropagation(); try { await markAlertFalse(a.id); } catch(err){ console.error(err);} }}
                              disabled={a.status === 'false'}
                            >Mark False</button>
                          </div>
                        )}
                      </div>
                    )}
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

