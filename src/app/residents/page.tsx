"use client";

import { useEffect, useState } from "react";

type Resident = {
  id: string;
  username: string | null;
  tier: string | null;
  total_spent: number | null;
};

const TIERS = ["01", "02", "03"];

export default function ResidentsPage() {
  const [residents, setResidents] = useState<Resident[]>([]);

  async function loadResidents() {
    const response = await fetch("/api/residents");
    const data = await response.json();
    setResidents(data.residents ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadResidents();
  }, []);

  async function updateTier(id: string, tier: string) {
    await fetch(`/api/residents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    await loadResidents();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl tracking-[0.2em]">[ RESIDENTS ]</h1>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left p-2">Username</th>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Total Spent</th>
              <th className="text-left p-2">Tier</th>
            </tr>
          </thead>
          <tbody>
            {residents.map((resident) => (
              <tr key={resident.id} className="border-b border-border">
                <td className="p-2">{resident.username ?? "-"}</td>
                <td className="p-2">{resident.id}</td>
                <td className="p-2">{resident.total_spent ?? 0}</td>
                <td className="p-2">
                  <select
                    value={resident.tier ?? "01"}
                    onChange={(e) => updateTier(resident.id, e.target.value)}
                  >
                    {TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
