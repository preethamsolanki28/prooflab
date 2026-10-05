"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Database,
  Search,
} from "lucide-react";

export default function AuditPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any | null>(null);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/ledger");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load audit ledger");
      }
      setEntries(data.entries || []);
    } catch (err: any) {
      setError(err.message || "Failed to connect to ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleVerify = async (simulateTamper: boolean = false) => {
    if (entries.length === 0) return;
    try {
      setVerifying(true);
      setVerifyResult(null);

      // Verify using the first project in ledger as sample
      const sampleProjectId = entries[0].project_id;
      const res = await fetch("/api/ledger/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: sampleProjectId,
          simulateTamper,
        }),
      });

      const data = await res.json();
      setVerifyResult(data);
    } catch (err: any) {
      setVerifyResult({ error: err.message || "Verification failed" });
    } finally {
      setVerifying(false);
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      e.action?.toLowerCase().includes(q) ||
      e.profiles?.display_name?.toLowerCase().includes(q) ||
      e.entry_hash?.toLowerCase().includes(q) ||
      e.project_id?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
            <Fingerprint className="w-3.5 h-3.5" />
            Append-Only Cryptographic Audit Log
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Proof of Contribution Ledger
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Every project charter, member acceptance, milestone submission, and confidential access is permanently sealed in an immutable SHA-256 hash chain with database mutation blocks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleVerify(false)}
            disabled={verifying || entries.length === 0}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {verifying ? "Verifying..." : "Verify Hash Chain"}
          </button>

          <button
            onClick={() => handleVerify(true)}
            disabled={verifying || entries.length === 0}
            className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
            title="Simulate attacker modifying history in a safe copy to prove failure detection"
          >
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Tamper Lab
          </button>
        </div>
      </div>

      {/* Verification Results Panel */}
      {verifyResult && (
        <div className="mb-8">
          {verifyResult.simulation ? (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="w-full">
                  <h3 className="text-sm font-bold">Tamper Lab Proof: Cryptographic Mismatch Detected</h3>
                  <p className="text-xs text-amber-800 mt-1">
                    An attacker attempting to retroactively modify a ledger payload causes an immediate hash cascade failure. The production ledger remains 100% untouched.
                  </p>
                  <div className="mt-3 p-3 bg-white rounded-lg border border-amber-200 font-mono text-xs space-y-1">
                    <div>Status: <span className="font-bold text-rose-600">{verifyResult.result?.status}</span></div>
                    <div>Reason: {verifyResult.result?.reason}</div>
                    <div>Detected at entry index: {verifyResult.result?.detected_at_index}</div>
                    <div>Production ledger untouched: <span className="text-emerald-700 font-bold">{String(verifyResult.result?.production_ledger_untouched)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          ) : verifyResult.result?.status === "PASS" ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold">Cryptographic Chain Verification: 100% VALID</h3>
                  <p className="text-xs text-emerald-800 mt-1">
                    All {verifyResult.result?.entries_verified} sequential entries verified from GENESIS without modification.
                  </p>
                  <p className="text-[11px] font-mono text-emerald-700 mt-2">
                    Head Hash: {verifyResult.result?.head_hash}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950">
              <h3 className="text-sm font-bold">Verification Error</h3>
              <p className="text-xs">{verifyResult.error || verifyResult.result?.reason}</p>
            </div>
          )}
        </div>
      )}

      {/* Ledger Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-xs text-slate-500 font-semibold uppercase">Total Ledger Entries</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{entries.length}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-xs text-slate-500 font-semibold uppercase">Database Protection</p>
          <p className="text-sm font-bold text-emerald-700 mt-1.5 flex items-center gap-1.5">
            <Lock className="w-4 h-4" />
            UPDATE & DELETE Triggers Active
          </p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <p className="text-xs text-slate-500 font-semibold uppercase">Hash Standard</p>
          <p className="text-sm font-mono font-bold text-indigo-700 mt-1.5">
            SHA-256 (pgcrypto)
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, actor, hash, or project..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={fetchLedger}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Querying immutable ledger entries...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm">
            No ledger entries found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Entry Hash</th>
                  <th className="py-3 px-4">Prev Hash</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {entry.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {entry.profiles?.display_name || entry.actor_id?.slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700 truncate max-w-[130px]" title={entry.entry_hash}>
                      {entry.entry_hash.slice(0, 14)}...
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[130px]" title={entry.prev_hash}>
                      {entry.prev_hash.slice(0, 14)}...
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedEntry(entry)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entry Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-indigo-600" />
                Ledger Entry Payload
              </h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block">Action:</span>
                <span className="font-mono font-bold text-indigo-700">{selectedEntry.action}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Project ID:</span>
                <Link
                  href={`/projects/${selectedEntry.project_id}`}
                  className="font-mono text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                >
                  {selectedEntry.project_id}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div>
                <span className="text-slate-500 block">Previous Hash (SHA-256):</span>
                <div className="font-mono text-[11px] bg-slate-50 p-2 rounded border border-slate-200 break-all select-all">
                  {selectedEntry.prev_hash}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block">Entry Hash (SHA-256):</span>
                <div className="font-mono text-[11px] bg-slate-50 p-2 rounded border border-slate-200 break-all select-all">
                  {selectedEntry.entry_hash}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Payload JSON:</span>
                <pre className="font-mono text-[11px] bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto">
                  {JSON.stringify(selectedEntry.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
