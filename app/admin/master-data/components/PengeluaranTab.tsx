"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { midText } from "../../../../lib/styles/responsive";

type Expense = { id: string; nama?: string; kategori?: string; aktif?: boolean };
const categories = ["Bahan Baku", "Gas", "Air", "Sewa", "Gaji Karyawan", "Gaji Pribadi", "Pribadi/Non-usaha", "Operasional Lain", "Complimentary"];

export default function PengeluaranTab() {
  const [rows, setRows] = useState<Expense[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = async () => { setLoading(true); const { data, error: fetchError } = await supabase.from("ms_pengeluaran").select("*").order("nama", { ascending: true }); if (fetchError) setError(fetchError.message); else setRows((data ?? []) as Expense[]); setLoading(false); };
  useEffect(() => {
    let active = true;
    async function fetchPengeluaran() {
      await load();
      if (!active) return;
    }
    void fetchPengeluaran();
    return () => { active = false; };
  }, []);
  const save = async () => { if (!name.trim()) { setError("Nama pengeluaran wajib diisi."); return; } setSaving(true); setError(null); const result = editingId ? await supabase.from("ms_pengeluaran").update({ nama: name.trim(), kategori: category, aktif: true }).eq("id", editingId).select("*") : await supabase.from("ms_pengeluaran").insert({ nama: name.trim(), kategori: category, aktif: true }).select("*"); if (result.error) setError(result.error.message); else { setShowAdd(false); setEditingId(null); setName(""); await load(); } setSaving(false); };
  if (loading) return <div className={`rounded-2xl border bg-white p-8 text-center text-base text-zinc-500 ${midText.sm}`}>Memuat data pengeluaran...</div>;
  return <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"><div className="mb-4 flex items-center justify-between"><h2 className={`text-xl font-bold ${midText.lg}`}>Pengeluaran</h2><button type="button" onClick={() => { setName(""); setCategory(categories[0]); setShowAdd(true); }} className={`min-h-11 rounded bg-zinc-900 px-4 text-base text-white ${midText.sm}`}>+ Add Pengeluaran</button></div>{error && <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-base text-red-700">{error}</div>}{rows.length === 0 ? <p className="py-8 text-center text-base text-zinc-500">Belum ada data pengeluaran.</p> : <div className="overflow-x-auto"><table className={`w-full min-w-[560px] text-left text-base ${midText.sm}`}><thead className="bg-zinc-50"><tr><th className="px-3 py-2">Nama</th><th className="px-3 py-2">Kategori</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Aksi</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-zinc-200"><td className="px-3 py-2">{row.nama ?? "-"}</td><td className="px-3 py-2">{row.kategori ?? "-"}</td><td className="px-3 py-2">{row.aktif === false ? "Nonaktif" : "Aktif"}</td><td className="px-3 py-2"><button type="button" onClick={() => { setEditingId(row.id); setName(row.nama ?? ""); setCategory(row.kategori ?? categories[0]); }} className="min-h-10 text-base text-blue-600">Edit</button></td></tr>)}</tbody></table></div>}{(showAdd || editingId) && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center"><div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl sm:p-6"><h3 className="mb-4 text-xl font-bold">{editingId ? "Edit Pengeluaran" : "Tambah Pengeluaran"}</h3><label className="block text-base font-medium">Nama<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 min-h-11 w-full rounded border px-3 text-base" /></label><label className="mt-3 block text-base font-medium">Kategori<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 min-h-11 w-full rounded border px-3 text-base">{categories.map((value) => <option key={value}>{value}</option>)}</select></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="min-h-11 rounded border px-4 text-base">Cancel</button><button type="button" onClick={save} disabled={saving} className="min-h-11 rounded bg-emerald-600 px-4 text-base text-white">{saving ? "Saving..." : "Save"}</button></div></div></div>}</div>;
}
