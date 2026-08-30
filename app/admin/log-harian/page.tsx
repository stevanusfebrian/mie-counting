"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { midText } from "../../../lib/styles/responsive";

const MENU_TABS = ["Mie", "Mie Lebar", "Kwetiau", "Bihun", "Lain-lain", "Minum", "Add On", "Titipan"] as const;
type Tab = (typeof MENU_TABS)[number];
type Kind = "menu" | "titipan";

type MenuItem = { id: string; nama: string; unit: string; kategori: string; harga_jual: number | string };
type TitipanItem = { id: string; nama: string; unit: string; harga_beli: number | string; harga_jual: number | string };
type SummaryMenu = { id: string; kategori: string };
type SummarySalesRow = { menu_item_id?: string; qty: number | string; pangsit_terpakai?: number | string; bakso_terpakai?: number | string };
type SummaryConsignmentRow = { titipan_item_id?: string; qty: number | string };
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
const normalizeCategory = (value: string | null | undefined) => value?.trim().toLowerCase();
const shiftDate = (date: string, days: number) => {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString().slice(0, 10);
};

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
  const [summary, setSummary] = useState({
    menu: { Mie: 0, "Mie Lebar": 0, Kwetiau: 0, Bihun: 0, Pangsit: 0, Bakso: 0 },
    titipan: {} as Record<string, number>,
  });

  const load = async (selectedDate: string) => {
    setLoading(true);
    setError(null);
const [
  { data: menuData, error: menuError },
  { data: titipanData, error: titipanError },
  { data: salesData, error: salesError },
  { data: consignmentData, error: consignmentError },
  { data: summaryMenuData, error: summaryMenuError },
] = await Promise.all([
  supabase
    .from("ms_menu")
    .select("id, nama, unit, kategori, harga_jual")
    .eq("aktif", true)
    .order("display_order", { ascending: true }),
  supabase
    .from("ms_titipan")
    .select("id, nama, unit, harga_beli, harga_jual")
    .eq("aktif", true)
    .order("display_order", { ascending: true }),
  supabase
    .from("log_penjualan")
    .select(
      "menu_item_id, qty, harga_snapshot, catatan, pangsit_terpakai, bakso_terpakai",
    )
    .eq("tanggal", selectedDate),
  supabase
    .from("log_titipan")
    .select("titipan_item_id, qty, harga_jual_snapshot, catatan")
    .eq("tanggal", selectedDate),
  supabase.from("ms_menu").select("id, kategori"),
]);


    const fetchError = menuError ?? titipanError ?? salesError ?? consignmentError ?? summaryMenuError;
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const nextMenus = (menuData ?? []) as MenuItem[];
    const nextTitipan = (titipanData ?? []) as TitipanItem[];
    const menuCategories = new Map<string, string | undefined>();
    for (const item of nextMenus as SummaryMenu[]) menuCategories.set(String(item.id), normalizeCategory(item.kategori));
    for (const item of (summaryMenuData ?? []) as SummaryMenu[]) menuCategories.set(String(item.id), normalizeCategory(item.kategori));
    const menuSummary = { Mie: 0, "Mie Lebar": 0, Kwetiau: 0, Bihun: 0, Pangsit: 0, Bakso: 0 };
    for (const sale of (salesData ?? []) as SummarySalesRow[]) {
      const category = menuCategories.get(String(sale.menu_item_id ?? ""));
      if (category === "mie") menuSummary.Mie += numberValue(sale.qty);
      if (category === "mie lebar") menuSummary["Mie Lebar"] += numberValue(sale.qty);
      if (category === "kwetiau") menuSummary.Kwetiau += numberValue(sale.qty);
      if (category === "bihun") menuSummary.Bihun += numberValue(sale.qty);
      menuSummary.Pangsit += numberValue(sale.pangsit_terpakai);
      menuSummary.Bakso += numberValue(sale.bakso_terpakai);
    }
    const titipanSummary: Record<string, number> = {};
    for (const item of nextTitipan) titipanSummary[item.id] = 0;
    for (const sale of (consignmentData ?? []) as SummaryConsignmentRow[]) {
      if (sale.titipan_item_id && sale.titipan_item_id in titipanSummary) titipanSummary[sale.titipan_item_id] += numberValue(sale.qty);
    }
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
    setSummary({ menu: menuSummary, titipan: titipanSummary });
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

  const moveDay = (direction: -1 | 1) => {
    setTanggal((current) => shiftDate(current, direction));
    setSuccess(null);
  };

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
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 sm:text-sm">
              Modul 3
            </p>
            <h1 className={`text-2xl font-bold ${midText.xl}`}>
              Input Penjualan &amp; Titipan
            </h1>
          </div>
          <Link
            href="/"
            className="min-h-11 rounded border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium hover:bg-zinc-100"
          >
            Kembali ke Dashboard
          </Link>
        </header>
        <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <label className={`block text-sm font-medium ${midText.sm}`}>
            Tanggal log
            <div className="mt-1 flex w-full items-center gap-2 sm:max-w-md">
              <input
                type="date"
                value={tanggal}
                onChange={(event) => {
                  setTanggal(event.target.value);
                  setSuccess(null);
                }}
                className="min-h-11 min-w-0 flex-1 rounded border border-zinc-300 px-3 text-base"
              />
              <>
                <button
                  type="button"
                  onClick={() => moveDay(-1)}
                  aria-label="Tanggal sebelumnya"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-base text-zinc-700 transition hover:bg-zinc-50"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => moveDay(1)}
                  aria-label="Tanggal berikutnya"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-base text-zinc-700 transition hover:bg-zinc-50"
                >
                  ›
                </button>
              </>
            </div>
          </label>
        </div>
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </div>
        )}
        <section className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className={`mb-4 text-xl font-bold ${midText.lg}`}>Ringkasan Total Terjual</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-x-8">
            <div className="space-y-2">
              {(["Mie", "Mie Lebar", "Kwetiau", "Bihun", "Pangsit", "Bakso"] as const).map((category) => (
                <div key={category} className="flex items-center gap-2 text-xs sm:text-sm">
                  <span>{category}</span>
                  <strong>{summary.menu[category]}</strong>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {titipan.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-xs sm:text-sm">
                  <span>{item.nama}</span>
                  <strong>{summary.titipan[item.id] ?? 0}</strong>
                </div>
              ))}
              {titipan.length === 0 && <p className="text-xs text-zinc-500 sm:text-sm">Belum ada item titipan aktif.</p>}
            </div>
          </div>
        </section>
        <nav
          className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-200"
          aria-label="Kategori log"
        >
          {MENU_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-h-12 shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${activeTab === tab ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}
            >
              {tab}
            </button>
          ))}
        </nav>
        <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Memuat data log...
            </p>
          ) : visibleRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Belum ada item aktif pada kategori ini.
            </p>
          ) : (
            <div className="space-y-3">
              {visibleRows.map((row) => (
                <div
                  key={row.key}
                  className={`border-b border-zinc-300 pb-3 last:border-0 ${row.additional ? "ml-4 sm:ml-5" : ""}`}
                >
                  <div className={`${row.additional ? "grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_8rem_auto] sm:items-start" : "grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-start"}`}>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="break-words text-sm font-medium">{row.nama}</p>
                        {row.additional && <button type="button" onClick={() => removeRow(row.key)} className="h-4 shrink-0 text-sm text-red-600 sm:hidden">Hapus</button>}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {row.unit}
                        {row.additional ? " | harga lain" : ""}
                      </p>
                    </div>
                    {row.additional && <input type="number" min="0" step="1" value={row.override} onChange={(event) => updateRow(row.key, { override: event.target.value })} placeholder="Harga jual khusus" className="order-2 h-8 rounded border px-2 text-[11px] placeholder:text-[11px] sm:order-none" aria-label={`Harga jual khusus ${row.nama}`} />}
                    {row.additional && <input value={row.catatan} onChange={(event) => updateRow(row.key, { catatan: event.target.value })} placeholder="Catatan / alasan" className="order-3 h-8 rounded border px-2 text-[11px] placeholder:text-[11px] sm:order-none" aria-label={`Catatan ${row.nama}`} />}
                    {!row.additional && <input type="number" min="1" step="1" inputMode="numeric" placeholder="Qty" value={row.qty} onChange={(event) => updateRow(row.key, { qty: event.target.value })} className="h-8 rounded border px-2 text-[11px] placeholder:text-[11px]" aria-label={`Qty ${row.nama}`} />}
                    {row.additional && <input type="number" min="1" step="1" inputMode="numeric" placeholder="Qty" value={row.qty} onChange={(event) => updateRow(row.key, { qty: event.target.value })} className="order-4 h-8 rounded border px-2 text-[11px] placeholder:text-[11px] sm:order-none" aria-label={`Qty ${row.nama}`} />}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {!row.additional && (
                        <button
                          type="button"
                          onClick={() =>
                            updateRow(row.key, {
                              useOverride: !row.useOverride,
                              override: row.useOverride
                                ? ""
                                : String(row.hargaNormal),
                            })
                          }
                          className="h-8 rounded border border-zinc-300 px-2 text-zinc-700"
                        >
                          {row.useOverride ? "Harga normal" : "Harga lain"}
                        </button>
                      )}
                      {row.additional && (
                        <button
                          type="button"
                          onClick={() => removeRow(row.key)}
                          className="hidden h-8 text-xs text-red-600 sm:inline"
                        >
                          Hapus
                        </button>
                      )}
                      {!row.additional && (
                        <button
                          type="button"
                          onClick={() => addRow(row)}
                          className="h-8 text-emerald-700"
                        >
                          + Harga custom
                        </button>
                      )}
                    </div>
                  </div>
                  {row.useOverride && !row.additional && <div className="mt-2 grid gap-2 sm:grid-cols-2"><input type="number" min="0" step="1" value={row.override} onChange={(event) => updateRow(row.key, { override: event.target.value })} placeholder="Harga jual khusus" className="h-8 rounded border px-2 text-[11px] placeholder:text-[11px]" /><input value={row.catatan} onChange={(event) => updateRow(row.key, { catatan: event.target.value })} placeholder="Catatan / alasan" className="h-8 rounded border px-2 text-[11px] placeholder:text-[11px]" /></div>}
                  {rowErrors[row.key] && (
                    <p className="mt-1 text-xs text-red-600">
                      {rowErrors[row.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl justify-end">
          <button
            type="button"
            onClick={save}
            disabled={loading || saving}
            className="min-h-12 w-full rounded bg-zinc-900 px-6 text-base font-medium text-white disabled:opacity-60 sm:w-auto"
          >
            {saving ? "Menyimpan..." : "Simpan semua log"}
          </button>
        </div>
      </div>
    </main>
  );

}