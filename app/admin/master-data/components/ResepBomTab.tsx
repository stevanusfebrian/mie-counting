"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { midText } from "../../../../lib/styles/responsive";

type Row = { menu_item_id: string; nama: string; kategori: string; pangsit_pcs: number | string; bakso_pcs: number | string };

export default function ResepBomTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    const [{ data: menus, error: menuError }, { data: bomRows, error: bomError }] = await Promise.all([
      supabase.from("ms_menu").select("id, nama, kategori").eq("aktif", true).order("kategori", { ascending: true }),
      supabase.from("ms_resep_bom").select("menu_item_id, pangsit_pcs, bakso_pcs"),
    ]);
    if (menuError || bomError) setError(menuError?.message ?? bomError?.message ?? "Gagal memuat resep BOM.");
    else {
      const bomMap = new Map((bomRows ?? []).map((row) => [row.menu_item_id, row]));
      setRows((menus ?? []).map((menu) => ({ menu_item_id: menu.id, nama: menu.nama, kategori: menu.kategori, pangsit_pcs: bomMap.get(menu.id)?.pangsit_pcs ?? 0, bakso_pcs: bomMap.get(menu.id)?.bakso_pcs ?? 0 })));
    }
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    async function fetchBom() {
      await load();
      if (!active) return;
    }
    void fetchBom();
    return () => { active = false; };
  }, []);

  const updateValue = (id: string, field: "pangsit_pcs" | "bakso_pcs", value: number) => setRows((previous) => previous.map((row) => row.menu_item_id === id ? { ...row, [field]: value } : row));
  const save = async (row: Row) => {
    setSavingId(row.menu_item_id); setError(null);
    const { error: saveError } = await supabase.from("ms_resep_bom").upsert({ menu_item_id: row.menu_item_id, pangsit_pcs: Number(row.pangsit_pcs), bakso_pcs: Number(row.bakso_pcs) }, { onConflict: "menu_item_id" });
    if (saveError) setError(saveError.message);
    setSavingId(null);
  };

  if (loading) return <div className={`rounded-2xl border bg-white p-8 text-center text-base text-zinc-500 ${midText.sm}`}>Memuat data resep...</div>;
  if (error && rows.length === 0) return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-base text-red-700">{error}</div>;
  return <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4"><div className="mb-4"><h2 className={`text-xl font-bold ${midText.lg}`}>Resep BOM</h2><p className={`text-base text-zinc-500 ${midText.sm}`}>Menu aktif otomatis tampil. Nilai yang belum disimpan dimulai dari 0.</p></div>{error && <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-base text-red-700">{error}</div>}{rows.length === 0 ? <p className="py-8 text-center text-base text-zinc-500">Belum ada menu aktif.</p> : <div className="overflow-x-auto"><table className={`w-full min-w-[700px] text-left text-base ${midText.sm}`}><thead className="bg-zinc-50"><tr><th className="w-[45%] px-3 py-2">Nama Menu</th><th className="w-[20%] px-3 py-2">Pangsit (pcs)</th><th className="w-[20%] px-3 py-2">Bakso (pcs)</th><th className="w-[15%] px-3 py-2">Aksi</th></tr></thead><tbody>{rows.map((row) => <tr key={row.menu_item_id} className="border-t border-zinc-200"><td className="px-3 py-2"><div className="font-medium">{row.nama}</div><div className="text-sm text-zinc-500">{row.kategori}</div></td><td className="px-2 py-2"><input type="number" min="0" value={row.pangsit_pcs} onChange={(e) => updateValue(row.menu_item_id, "pangsit_pcs", Number(e.target.value))} className="min-h-10 w-full rounded border px-2 text-base" /></td><td className="px-2 py-2"><input type="number" min="0" value={row.bakso_pcs} onChange={(e) => updateValue(row.menu_item_id, "bakso_pcs", Number(e.target.value))} className="min-h-10 w-full rounded border px-2 text-base" /></td><td className="px-2 py-2"><button type="button" onClick={() => save(row)} disabled={savingId === row.menu_item_id} className="min-h-10 text-base font-medium text-emerald-600 disabled:opacity-60">{savingId === row.menu_item_id ? "saving..." : "save"}</button></td></tr>)}</tbody></table></div>}</div>;
}
