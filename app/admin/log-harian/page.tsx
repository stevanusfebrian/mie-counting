"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { midText } from "../../../lib/styles/responsive";

const MENU_TABS = ["Mie", "Mie Lebar", "Kwetiau", "Bihun", "Lain-lain", "Minum", "Add On", "Titipan"] as const;
type Tab = (typeof MENU_TABS)[number];
type Kind = "menu" | "titipan";

type MenuItem = { id: string; nama: string; unit: string; kategori: string; harga_jual: number | string };
type TitipanItem = { id: string; nama: string; unit: string; harga_beli: number | string; harga_jual: number | string };
type InputRow = {
  key: string;
  itemId: string;
  kind: Kind;
  nama: string;
  unit: string;
  kategori?: string;
  hargaNormal: number;
  hargaBeli?: number;
  qty: string;
  override: string;
  useOverride: boolean;
  catatan: string;
  additional: boolean;
};
type ExistingRow = { menu_item_id?: string; titipan_item_id?: string; qty: number | string; harga_snapshot?: number | string; harga_jual_snapshot?: number | string; catatan?: string | null };

const today = () => new Date().toISOString().slice(0, 10);
const numberValue = (value: number | string | null | undefined) => Number(value ?? 0);

function makeRow(item: MenuItem | TitipanItem, kind: Kind, additional = false): InputRow {
  const isMenu = kind === "menu";
  return {
    key: `${kind}-${item.id}-${crypto.randomUUID()}`,
    itemId: item.id,
    kind,
    nama: item.nama,
    unit: item.unit,
    kategori: isMenu ? (item as MenuItem).kategori : undefined,
    hargaNormal: numberValue(isMenu ? (item as MenuItem).harga_jual : (item as TitipanItem).harga_jual),
    hargaBeli: isMenu ? undefined : numberValue((item as TitipanItem).harga_beli),
    qty: "",
    override: "",
    useOverride: additional,
    catatan: "",
    additional,
  };
}

export default function LogHarianPage() {
  const [tanggal, setTanggal] = useState(today);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [titipan, setTitipan] = useState<TitipanItem[]>([]);
  const [rows, setRows] = useState<InputRow[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(MENU_TABS[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  const load = async (selectedDate: string) => {
    setLoading(true);
    setError(null);
    const [{ data: menuData, error: menuError }, { data: titipanData, error: titipanError }, { data: salesData, error: salesError }, { data: consignmentData, error: consignmentError }] = await Promise.all([
      supabase.from("ms_menu").select("id, nama, unit, kategori, harga_jual").eq("aktif", true).order("display_order", { ascending: true }),
      supabase.from("ms_titipan").select("id, nama, unit, harga_beli, harga_jual").eq("aktif", true).order("display_order", { ascending: true }),
      supabase.from("log_penjualan").select("menu_item_id, qty, harga_snapshot, catatan").eq("tanggal", selectedDate),
      supabase.from("log_titipan").select("titipan_item_id, qty, harga_jual_snapshot, catatan").eq("tanggal", selectedDate),
    ]);

    const fetchError = menuError ?? titipanError ?? salesError ?? consignmentError;
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const nextMenus = (menuData ?? []) as MenuItem[];
    const nextTitipan = (titipanData ?? []) as TitipanItem[];
    const nextRows = [
      ...nextMenus.map((item) => makeRow(item, "menu")),
      ...nextTitipan.map((item) => makeRow(item, "titipan")),
    ];
    const grouped = new Map<string, ExistingRow[]>();
    for (const existing of [...((salesData ?? []) as ExistingRow[]), ...((consignmentData ?? []) as ExistingRow[])]) {
      const itemId = existing.menu_item_id ?? existing.titipan_item_id;
      if (itemId) grouped.set(itemId, [...(grouped.get(itemId) ?? []), existing]);
    }
    const hydrated: InputRow[] = [];
    for (const row of nextRows) {
      const existing = grouped.get(row.itemId) ?? [];
      if (existing.length === 0) {
        hydrated.push(row);
        continue;
      }
      existing.forEach((saved, index) => {
        const savedPrice = numberValue(saved.harga_snapshot ?? saved.harga_jual_snapshot);
        hydrated.push({
          ...row,
          key: `${row.key}-${index}`,
          qty: String(saved.qty),
          override: savedPrice === row.hargaNormal ? "" : String(savedPrice),
          useOverride: savedPrice !== row.hargaNormal,
          catatan: saved.catatan ?? "",
          additional: index > 0,
        });
      });
      grouped.delete(row.itemId);
    }
    setMenus(nextMenus);
    setTitipan(nextTitipan);
    setRows(hydrated);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load(tanggal);
    });
    return () => { active = false; };
  }, [tanggal]);

  const visibleRows = useMemo(() => rows.filter((row) => row.kind === "titipan" ? activeTab === "Titipan" : row.kategori === activeTab), [activeTab, rows]);

  const updateRow = (key: string, changes: Partial<InputRow>) => setRows((current) => current.map((row) => row.key === key ? { ...row, ...changes } : row));
  const addRow = (row: InputRow) => setRows((current) => {
    const index = current.findIndex((entry) => entry.key === row.key);
    const newRow = makeRow(row.kind === "menu" ? menus.find((item) => item.id === row.itemId)! : titipan.find((item) => item.id === row.itemId)!, row.kind, true);
    return [...current.slice(0, index + 1), newRow, ...current.slice(index + 1)];
  });
  const removeRow = (key: string) => setRows((current) => current.filter((row) => row.key !== key));

  const save = async () => {
    const errors: Record<string, string> = {};
    const positiveRows = rows.filter((row) => Number(row.qty) > 0);
    for (const row of positiveRows) {
      const qty = Number(row.qty);
      if (!Number.isInteger(qty)) errors[row.key] = "Qty harus bilangan bulat.";
      if (row.additional && (!row.override.trim() || !Number.isFinite(Number(row.override)) || Number(row.override) < 0)) errors[row.key] = "Harga override wajib diisi.";
      if (row.useOverride && row.override.trim() && (!Number.isFinite(Number(row.override)) || Number(row.override) < 0)) errors[row.key] = "Harga harus angka valid.";
    }
    setRowErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const pPenjualan = positiveRows.filter((row) => row.kind === "menu").map((row) => ({ menu_item_id: row.itemId, qty: Number(row.qty), ...(row.useOverride && row.override.trim() ? { harga_override: Number(row.override) } : {}), ...(row.catatan.trim() ? { catatan: row.catatan.trim() } : {}) }));
    const pTitipan = positiveRows.filter((row) => row.kind === "titipan").map((row) => ({ titipan_item_id: row.itemId, qty: Number(row.qty), ...(row.useOverride && row.override.trim() ? { harga_jual_override: Number(row.override) } : {}), ...(row.catatan.trim() ? { catatan: row.catatan.trim() } : {}) }));
    setSaving(true);
    setError(null);
    setSuccess(null);
    const { error: saveError } = await supabase.rpc("save_log_harian", { p_tanggal: tanggal, p_penjualan: pPenjualan, p_titipan: pTitipan });
    if (saveError) {
      setError(saveError.message);
    } else {
      setSuccess("Log penjualan dan titipan berhasil disimpan.");
      await load(tanggal);
    }
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-4 text-zinc-900 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl pb-24">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 sm:text-sm">Modul 3</p><h1 className={`text-2xl font-bold ${midText.xl}`}>Input Penjualan &amp; Titipan</h1></div>
          <Link href="/" className="min-h-11 rounded border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium hover:bg-zinc-100">Kembali ke Dashboard</Link>
        </header>
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <label className={`block text-sm font-medium ${midText.sm}`}>Tanggal log<input type="date" value={tanggal} onChange={(event) => { setTanggal(event.target.value); setSuccess(null); }} className="mt-1 min-h-11 w-full rounded border border-zinc-300 px-3 text-base sm:max-w-xs" /></label>
        </div>
        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}
        <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-200" aria-label="Kategori log">
          {MENU_TABS.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`min-h-12 shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${activeTab === tab ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>{tab}</button>)}
        </nav>
        <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
          {loading ? <p className="py-8 text-center text-sm text-zinc-500">Memuat data log...</p> : visibleRows.length === 0 ? <p className="py-8 text-center text-sm text-zinc-500">Belum ada item aktif pada kategori ini.</p> : <div className="space-y-3">
            {visibleRows.map((row) => <div key={row.key} className="border-b border-zinc-100 pb-3 last:border-0">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-start">
                <div className="min-w-0"><p className="break-words text-sm font-medium">{row.nama}</p><p className="text-xs text-zinc-500">{row.unit}{row.additional ? " | harga lain" : ""}</p></div>
                <input type="number" min="1" step="1" inputMode="numeric" placeholder="Qty" value={row.qty} onChange={(event) => updateRow(row.key, { qty: event.target.value })} className="min-h-11 rounded border px-3 text-base" aria-label={`Qty ${row.nama}`} />
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button type="button" onClick={() => updateRow(row.key, { useOverride: !row.useOverride, override: row.useOverride ? "" : String(row.hargaNormal) })} className="min-h-10 rounded border border-zinc-300 px-2 text-zinc-700">{row.useOverride ? "Harga normal" : "Harga lain"}</button>
                  {row.additional && <button type="button" onClick={() => removeRow(row.key)} className="min-h-10 text-red-600">Hapus baris</button>}
                  <button type="button" onClick={() => addRow(row)} className="min-h-10 text-emerald-700">+ tambah harga lain</button>
                </div>
              </div>
              {row.useOverride && <div className="mt-2 grid gap-2 sm:grid-cols-2"><input type="number" min="0" step="1" value={row.override} onChange={(event) => updateRow(row.key, { override: event.target.value })} placeholder={row.kind === "titipan" ? "Harga jual khusus" : "Harga jual khusus"} className="min-h-10 rounded border px-3 text-sm" /><input value={row.catatan} onChange={(event) => updateRow(row.key, { catatan: event.target.value })} placeholder="Catatan / alasan" className="min-h-10 rounded border px-3 text-sm" /></div>}
              {rowErrors[row.key] && <p className="mt-1 text-xs text-red-600">{rowErrors[row.key]}</p>}
            </div>)}
          </div>}
        </section>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:px-6"><div className="mx-auto flex max-w-6xl justify-end"><button type="button" onClick={save} disabled={loading || saving} className="min-h-12 w-full rounded bg-zinc-900 px-6 text-base font-medium text-white disabled:opacity-60 sm:w-auto">{saving ? "Menyimpan..." : "Simpan semua log"}</button></div></div>
    </main>
  );
}