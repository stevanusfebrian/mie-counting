"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { midText } from "../../../lib/styles/responsive";

type Preset = "today" | "week" | "month" | "custom";
type Category = { id: string; nama: string };
type SubCategory = { id: string; pengeluaran_id: string; nama: string };
type ExpenseRow = { pengeluaran_id: string; sub_pengeluaran_id?: string | null; jumlah: number | string };
type BahanBakuPurchase = { tanggal: string; qty: number | string | null; deskripsi?: string | null; bahan_baku_id: string | null };
type AmountRow = { total?: number | string | null; margin?: number | string | null };

const PERSONAL_CATEGORIES = new Set(["Gaji Pribadi", "Pribadi/Non-usaha"]);
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const shiftDate = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const monthStart = (value: string) => `${value.slice(0, 8)}01`;
const amount = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
const numberValue = (value: number | string | null | undefined) => Number(value ?? 0);

export default function DashboardLabaRugiPage() {
  const initialToday = today();
  const [preset, setPreset] = useState<Preset>("today");
  const [startDate, setStartDate] = useState(initialToday);
  const [endDate, setEndDate] = useState(initialToday);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [sales, setSales] = useState(0);
  const [countMakan, setCountMakan] = useState(0);
  const [countMinum, setCountMinum] = useState(0);
  const [noodleCounts, setNoodleCounts] = useState<Record<string, number>>({});
  const [ayamStock, setAyamStock] = useState<{ averagePerDay: number; latestQty: number; estimatedDays: number | null; estimatedCount: number }>({ averagePerDay: 0, latestQty: 0, estimatedDays: null, estimatedCount: 0 });
  const [consignmentMargin, setConsignmentMargin] = useState(0);
  const [consignmentQty, setConsignmentQty] = useState(0);
  const [expenseTotals, setExpenseTotals] = useState<Record<string, number>>({});
  const [subExpenseTotals, setSubExpenseTotals] = useState<Record<string, Record<string, number>>>({});
  const [showSubKategori, setShowSubKategori] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validRange = startDate !== "" && endDate !== "" && endDate >= startDate;

  const load = useCallback(async () => {
    if (!validRange) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [{ data: categoryData, error: categoryError }, { data: subCategoryData, error: subCategoryError }, { data: menuData, error: menuError }, { data: salesData, error: salesError }, { data: marginData, error: marginError }, { data: expenseData, error: expenseError }, { data: ayamData, error: ayamError }] = await Promise.all([
      supabase.from("ms_pengeluaran").select("id, nama").eq("aktif", true).order("nama", { ascending: true }),
      supabase.from("ms_sub_pengeluaran").select("id, pengeluaran_id, nama").eq("aktif", true).order("nama", { ascending: true }),
      supabase.from("ms_menu").select("id, kategori").eq("aktif", true),
      supabase.from("log_penjualan").select("menu_item_id, qty, total").gte("tanggal", startDate).lte("tanggal", endDate),
      supabase.from("log_titipan").select("margin, qty").gte("tanggal", startDate).lte("tanggal", endDate),
      supabase.from("log_pengeluaran").select("pengeluaran_id, sub_pengeluaran_id, jumlah").gte("tanggal", startDate).lte("tanggal", endDate).eq("is_deleted", false),
      supabase.from("log_pengeluaran").select("tanggal, qty, deskripsi, bahan_baku_id, ms_bahan_baku!inner(nama, ms_sub_pengeluaran!inner(nama))").gte("tanggal", startDate).lte("tanggal", endDate).eq("is_deleted", false).eq("ms_bahan_baku.nama", "Ayam").eq("ms_bahan_baku.ms_sub_pengeluaran.nama", "Ayam").order("tanggal", { ascending: true }),
    ]);
    const fetchError = categoryError ?? subCategoryError ?? menuError ?? salesError ?? marginError ?? expenseError ?? ayamError;
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    const totals = ((expenseData ?? []) as ExpenseRow[]).reduce<Record<string, number>>((result, row) => {
      result[row.pengeluaran_id] = (result[row.pengeluaran_id] ?? 0) + numberValue(row.jumlah);
      return result;
    }, {});
    const subTotals = ((expenseData ?? []) as Array<{ pengeluaran_id: string; sub_pengeluaran_id: string | null; jumlah: number | string }>).reduce<Record<string, Record<string, number>>>((result, row) => {
      const catId = row.pengeluaran_id;
      const subId = row.sub_pengeluaran_id ?? "UNCATEGORIZED";
      if (!result[catId]) result[catId] = {};
      result[catId][subId] = (result[catId][subId] ?? 0) + numberValue(row.jumlah);
      return result;
    }, {});
    const menuCategoryMap = new Map((menuData ?? []).map((row) => [row.id, String(row.kategori ?? "").trim()]));
    const salesEntries = (salesData ?? []) as Array<{ menu_item_id?: string | null; qty?: number | string | null; total?: number | string | null }>;
    const countMakanValue = salesEntries.reduce((sum, row) => {
      const category = (menuCategoryMap.get(String(row.menu_item_id ?? "")) ?? "").toLowerCase();
      if (["mie", "mie lebar", "kwetiau", "bihun", "lain-lain", "lain lain"].includes(category)) {
        return sum + numberValue(row.qty);
      }
      return sum;
    }, 0);
    const countMinumValue = salesEntries.reduce((sum, row) => {
      const category = (menuCategoryMap.get(String(row.menu_item_id ?? "")) ?? "").toLowerCase();
      if (category === "minum") {
        return sum + numberValue(row.qty);
      }
      return sum;
    }, 0);
    const noodleCategories = ["mie", "mie lebar", "kwetiau", "bihun"];
    const noodleCountValues = noodleCategories.reduce<Record<string, number>>((result, category) => {
      result[category] = salesEntries.reduce((sum, row) => (menuCategoryMap.get(String(row.menu_item_id ?? "")) ?? "").trim().toLowerCase() === category ? sum + numberValue(row.qty) : sum, 0);
      return result;
    }, {});
    const ayamPurchases = (ayamData ?? []) as BahanBakuPurchase[];
    const ayamQty = ayamPurchases.reduce((sum, row) => sum + numberValue(row.qty), 0);
    const dayCount = ayamPurchases.length > 0 ? Math.max(1, Math.round((new Date(`${ayamPurchases[ayamPurchases.length - 1].tanggal}T00:00:00`).getTime() - new Date(`${ayamPurchases[0].tanggal}T00:00:00`).getTime()) / 86400000) + 1) : 0;
    const averagePerDay = dayCount > 0 ? ayamQty / dayCount : 0;
    const latestQty = ayamPurchases.length > 0 ? numberValue(ayamPurchases[ayamPurchases.length - 1].qty) : 0;
    const estimatedCount = ayamPurchases.filter((row) => row.deskripsi?.includes("[estimasi]")).length;

    setCategories((categoryData ?? []) as Category[]);
    setSubCategories((subCategoryData ?? []) as SubCategory[]);
    setSales(salesEntries.reduce((sum, row) => sum + numberValue(row.total), 0));
    setCountMakan(countMakanValue);
    setCountMinum(countMinumValue);
    setNoodleCounts(noodleCountValues);
    setAyamStock({ averagePerDay, latestQty, estimatedDays: averagePerDay > 0 ? latestQty / averagePerDay : null, estimatedCount });
    setConsignmentMargin(((marginData ?? []) as AmountRow[]).reduce((sum, row) => sum + numberValue(row.margin), 0));
    setConsignmentQty(((marginData ?? []) as Array<{ qty?: number | string | null }>).reduce((sum, row) => sum + numberValue(row.qty), 0));
    setExpenseTotals(totals);
    setSubExpenseTotals(subTotals);
    setLoading(false);
  }, [endDate, startDate, validRange]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const setPresetRange = (nextPreset: Exclude<Preset, "custom">) => {
    const current = today();
    setPreset(nextPreset);
    setEndDate(current);
    setStartDate(nextPreset === "today" ? current : nextPreset === "week" ? shiftDate(current, 1 - (new Date(`${current}T00:00:00`).getDay() || 7)) : monthStart(current));
  };
  const moveDay = (direction: -1 | 1) => {
    const baseDate = preset === "custom" ? startDate || today() : startDate || today();
    const nextDate = shiftDate(baseDate, direction);
    setPreset("today");
    setStartDate(nextDate);
    setEndDate(nextDate);
  };
  const updateDate = (setter: (value: string) => void, value: string) => {
    setPreset("custom");
    setter(value);
  };

  const businessExpenses = useMemo(() => categories.filter((category) => !PERSONAL_CATEGORIES.has(category.nama)), [categories]);
  const personalExpenses = useMemo(() => categories.filter((category) => PERSONAL_CATEGORIES.has(category.nama)), [categories]);
  const sumCategories = (items: Category[]) => items.reduce((sum, category) => sum + (expenseTotals[category.id] ?? 0), 0);
  const totalRevenue = sales + consignmentMargin;
  const totalBusinessExpenses = sumCategories(businessExpenses);
  const operatingProfit = totalRevenue - totalBusinessExpenses;
  const totalPersonal = sumCategories(personalExpenses);
  const netCash = operatingProfit - totalPersonal;

  const metricRow = (label: string, value: number, emphasis = false, counts: Array<{ count: number; label: string }> = [], rowClassName = "") => (
    <div className={`flex items-center justify-between gap-4 border-b border-zinc-100 py-1 text-sm last:border-b-0 sm:py-3 sm:text-sm ${emphasis ? "font-bold text-zinc-950" : "text-zinc-700"} ${rowClassName}`} style={{ fontSize: 0.75 + "rem" }}>
      <div className="flex min-w-0 flex-col">
        <span>{label}</span>
        {counts.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
            {counts.map(({ count, label: countLabel }) => (
              <span key={countLabel}>
                {count} {countLabel}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="shrink-0 tabular-nums">{amount(value)}</span>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f5f7f4] px-3 py-4 text-zinc-900 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-5xl pb-12">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 sm:text-sm ${midText.sm}`}
            >
              Modul 6
            </p>
            <h1
              className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${midText.xl}`}
            >
              Dashboard Laba Rugi
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Ringkasan kinerja usaha berdasarkan periode terpilih.
            </p>
          </div>
          <Link
            href="/"
            className="min-h-11 rounded border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium hover:bg-zinc-100"
          >
            Kembali ke Dashboard
          </Link>
        </header>

        <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex justify-end">
            <div
              className="flex flex-wrap items-center justify-end gap-2"
              role="group"
              aria-label="Preset tanggal"
            >
              {(
                [
                  ["month", "Bulan ini"],
                  ["week", "Minggu ini"],
                  ["today", "Hari ini"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPresetRange(value)}
                  className={`min-h-7 rounded-full border px-3 text-xs font-medium transition ${preset === value ? "border-emerald-700 bg-emerald-700 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"}`}
                >
                  {label}
                </button>
              ))}

              {preset === "today" && (
                <>
                  <button
                    type="button"
                    onClick={() => moveDay(-1)}
                    aria-label="Tanggal sebelumnya"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 bg-white text-base text-zinc-700 transition hover:bg-zinc-50"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDay(1)}
                    aria-label="Tanggal berikutnya"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-300 bg-white text-base text-zinc-700 transition hover:bg-zinc-50"
                  >
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className={`text-sm font-medium ${midText.sm}`}>
              Tanggal Mulai
              <input
                type="date"
                value={startDate}
                onChange={(event) => updateDate(setStartDate, event.target.value)}
                className="mt-1 min-h-8 w-full rounded border border-zinc-300 px-2 text-xs"
              />
            </label>
            <label className={`text-sm font-medium ${midText.sm}`}>
              Tanggal Selesai
              <input
                type="date"
                value={endDate}
                onChange={(event) => updateDate(setEndDate, event.target.value)}
                className="mt-1 min-h-8 w-full rounded border border-zinc-300 px-2 text-xs"
              />
            </label>
          </div>
        </section>

        {!validRange && (
          <div className="mb-5 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Tanggal selesai harus sama atau setelah tanggal mulai.
          </div>
        )}
        {error && (
          <div className="mb-5 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Gagal memuat dashboard: {error}
          </div>
        )}
        {loading && validRange && (
          <div
            className="mb-5 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            role="status"
          >
            Memuat data periode terpilih...
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="contents lg:block lg:space-y-5">
            <section className="order-1 self-start rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm lg:order-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className={`text-sm font-bold ${midText.lg}`}>Laba Usaha</h2>
                <span className="text-base font-bold tabular-nums text-emerald-800">
                  {amount(operatingProfit)}
                </span>
              </div>
            </section>
            <section className="order-2 rounded-2xl border-2 border-zinc-900 bg-zinc-900 p-3 text-white shadow-sm lg:order-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className={`text-sm font-bold ${midText.lg}`}>
                  Sisa Kas / Laba Bersih
                </h2>
                <span className="text-base font-bold tabular-nums text-emerald-300">
                  {amount(netCash)}
                </span>
              </div>
            </section>
            <section className="order-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:order-3">
              <h2 className={`mb-2 text-base font-bold ${midText.lg}`}>Pendapatan</h2>
              <div className="divide-y divide-zinc-200">
                {metricRow("Penjualan Menu & Add-On", sales, false, [
                  { count: countMakan, label: "porsi" },
                  { count: countMinum, label: "gelas" },
                ])}
                {metricRow("Margin Titipan", consignmentMargin, false, [{ count: consignmentQty, label: "item" }])}
                {metricRow("Total Pendapatan", totalRevenue, true)}
              </div>
            </section>
            <section className="order-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:order-6">
              <h2 className={`mb-2 text-base font-bold ${midText.lg}`}>Porsi Noodle Terjual</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-700">
                {["mie", "mie lebar", "kwetiau", "bihun"].map((category) => (
                  <div key={category} className="flex justify-between gap-2 border-b border-zinc-100 py-1">
                    <span className="capitalize">{category}</span>
                    <span className="font-medium tabular-nums">{noodleCounts[category] ?? 0}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="order-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5 lg:order-7">
              <h2 className={`mb-2 text-base font-bold ${midText.lg}`}>Estimasi Stok Ayam</h2>
              <p className="text-sm text-zinc-700">
                Ayam: rata-rata {ayamStock.averagePerDay.toFixed(2)} kg/hari · pembelian terakhir {ayamStock.latestQty.toFixed(2)} kg {ayamStock.estimatedDays === null ? "· belum cukup data" : `≈ ${ayamStock.estimatedDays.toFixed(1)} hari`}
              </p>
              {ayamStock.estimatedCount > 0 && <p className="mt-2 text-xs text-amber-800">{ayamStock.estimatedCount} pembelian memakai qty perkiraan.</p>}
            </section>
          </div>

          <div className="contents lg:block lg:space-y-5">
            <section className="order-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:order-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className={`text-base font-bold ${midText.lg}`}>
                  Beban Usaha
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-700">Detail Sub-Kategori</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showSubKategori}
                    onClick={() => setShowSubKategori((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${showSubKategori ? "bg-blue-600" : "bg-zinc-300"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${showSubKategori ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </div>
              <div className="divide-y divide-zinc-200">
                {businessExpenses.map((category) => {
                  const subTotalsForCategory = subExpenseTotals[category.id] ?? {};
                  const hasRegisteredSubCategories = subCategories.some((sub) => sub.pengeluaran_id === category.id);
                  const subEntries = Object.entries(subTotalsForCategory)
                    .filter(([, total]) => total > 0)
                    .sort((a, b) => {
                      if (a[0] === "UNCATEGORIZED") return 1;
                      if (b[0] === "UNCATEGORIZED") return -1;
                      return b[1] - a[1];
                    });

                  return (
                    <div key={category.id}>
                      {metricRow(category.nama, expenseTotals[category.id] ?? 0, showSubKategori)}
                      {showSubKategori && hasRegisteredSubCategories && subEntries.length > 0 && (
                        <div className="pl-6">
                          {subEntries.map(([subId, total]) => {
                            const label = subId === "UNCATEGORIZED"
                              ? "Tidak Berkategori"
                              : (subCategories.find((item) => item.id === subId)?.nama ?? "Tidak Diketahui");

                            return (
                              <div
                                key={subId}
                                className="flex items-center justify-between gap-4 border-b border-zinc-100 py-1 text-xs font-normal text-zinc-00 last:border-b-0"
                              >
                                <span>{label}</span>
                                <span className="tabular-nums">{amount(total)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="border-t-[2px] border-zinc-500">
                  {metricRow("Total Beban Usaha", totalBusinessExpenses, true)}
                </div>
              </div>
            </section>
            <section className="order-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:order-5">
              <h2 className={`mb-2 text-base font-bold ${midText.lg}`}>
                Pengambilan Pribadi
              </h2>
              <div className="divide-y divide-zinc-200">
                {personalExpenses.map((category) => (
                  <div key={category.id}>
                    {metricRow(category.nama, expenseTotals[category.id] ?? 0)}
                  </div>
                ))}
                {metricRow("Total Pengambilan Pribadi", totalPersonal, true)}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}