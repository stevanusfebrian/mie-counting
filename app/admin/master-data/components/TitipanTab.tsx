"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { midText } from "../../../../lib/styles/responsive";

type Titipan = { id: string; nama?: string; unit?: string; harga_beli?: number | string; harga_jual?: number | string; aktif?: boolean };
type Draft = Omit<Titipan, "id">;
const money = (value: number | string | undefined) => value == null ? "-" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));

export default function TitipanTab() {
  const [rows, setRows] = useState<Titipan[]>([]);
  const [draft, setDraft] = useState<Draft>({ nama: "", unit: "pcs", harga_beli: "", harga_jual: "", aktif: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => { setLoading(true); const { data, error: fetchError } = await supabase.from("ms_titipan").select("*").order("nama", { ascending: true }); if (fetchError) setError(fetchError.message); else setRows((data ?? []) as Titipan[]); setLoading(false); };
  useEffect(() => {
    let active = true;
    async function fetchTitipan() {
      await load();
      if (!active) return;
    }
    void fetchTitipan();
    return () => { active = false; };
  }, []);
  const reset = () => setDraft({ nama: "", unit: "pcs", harga_beli: "", harga_jual: "", aktif: true });
  const save = async () => { const buy = Number(draft.harga_beli); const sell = Number(draft.harga_jual); if (!draft.nama?.trim() || !draft.unit?.trim() || !Number.isFinite(buy) || !Number.isFinite(sell) || buy < 0 || sell < 0) { setError("Lengkapi nama, unit, dan harga yang valid."); return; } setSaving(true); setError(null); const payload = { nama: draft.nama.trim(), unit: draft.unit.trim(), harga_beli: buy, harga_jual: sell, aktif: draft.aktif ?? true }; const result = editingId ? await supabase.from("ms_titipan").update(payload).eq("id", editingId).select("*") : await supabase.from("ms_titipan").insert(payload).select("*"); if (result.error) setError(result.error.message); else { setShowAdd(false); setEditingId(null); reset(); await load(); } setSaving(false); };
  const visibleRows = useMemo(() => rows, [rows]);
  if (loading) return <div className={`rounded-2xl border bg-white p-8 text-center text-base text-zinc-500 ${midText.sm}`}>Memuat data titipan...</div>;
  return <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"><div className="mb-4 flex items-center justify-between"><h2 className={`text-xl font-bold ${midText.lg}`}>Titipan</h2><button type="button" onClick={() => { reset(); setShowAdd(true); }} className={`min-h-11 rounded bg-zinc-900 px-4 text-base text-white ${midText.sm}`}>+ Add Titipan</button></div>{error && <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-base text-red-700">{error}</div>}{visibleRows.length === 0 ? <p className="py-8 text-center text-base text-zinc-500">Belum ada data titipan.</p> : <div className="overflow-x-auto"><table className={`w-full min-w-[720px] text-left text-base ${midText.sm}`}><thead className="bg-zinc-50"><tr><th className="px-3 py-2">Nama</th><th className="px-3 py-2">Unit</th><th className="px-3 py-2">Harga Beli</th><th className="px-3 py-2">Harga Jual</th><th className="px-3 py-2">Margin</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Aksi</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className="border-t border-zinc-200"><td className="px-3 py-2">{row.nama}</td><td className="px-3 py-2">{row.unit}</td><td className="px-3 py-2">{money(row.harga_beli)}</td><td className="px-3 py-2">{money(row.harga_jual)}</td><td className="px-3 py-2">{money(Number(row.harga_jual ?? 0) - Number(row.harga_beli ?? 0))}</td><td className="px-3 py-2">{row.aktif === false ? "Nonaktif" : "Aktif"}</td><td className="px-3 py-2"><button type="button" onClick={() => { setEditingId(row.id); setDraft({ ...row }); }} className="min-h-10 text-base text-blue-600">Edit</button></td></tr>)}</tbody></table></div>}{(showAdd || editingId) && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center"><div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl sm:p-6"><h3 className="mb-4 text-xl font-bold">{editingId ? "Edit Titipan" : "Tambah Titipan"}</h3><div className="grid gap-3 sm:grid-cols-2">{(["nama", "unit", "harga_beli", "harga_jual"] as const).map((field) => <label key={field} className="text-base font-medium">{field.replace("_", " ")}<input type={field.includes("harga") ? "number" : "text"} min={field.includes("harga") ? "0" : undefined} value={draft[field] ?? ""} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} className="mt-1 min-h-11 w-full rounded border px-3 text-base" /></label>)}<label className="text-base font-medium">Status<select value={draft.aktif ? "aktif" : "nonaktif"} onChange={(e) => setDraft({ ...draft, aktif: e.target.value === "aktif" })} className="mt-1 min-h-11 w-full rounded border px-3 text-base"><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></label></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="min-h-11 rounded border px-4 text-base">Cancel</button><button type="button" onClick={save} disabled={saving} className="min-h-11 rounded bg-emerald-600 px-4 text-base text-white">{saving ? "Saving..." : "Save"}</button></div></div></div>}</div>;
}
