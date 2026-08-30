"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { midText } from "../../../lib/styles/responsive";

type Preset = "today" | "week" | "month" | "custom";
type Category = { id: string; nama: string };
type ExpenseRow = { pengeluaran_id: string; jumlah: number | string };
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
  const [sales, setSales] = useState(0);
  const [consignmentMargin, setConsignmentMargin] = useState(0);
  const [expenseTotals, setExpenseTotals] = useState<Record<string, number>>({});
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
    const [{ data: categoryData, error: categoryError }, { data: salesData, error: salesError }, { data: marginData, error: marginError }, { data: expenseData, error: expenseError }] = await Promise.all([
      supabase.from("ms_pengeluaran").select("id, nama").eq("aktif", true).order("nama", { ascending: true }),
      supabase.from("log_penjualan").select("total").gte("tanggal", startDate).lte("tanggal", endDate),
      supabase.from("log_titipan").select("margin").gte("tanggal", startDate).lte("tanggal", endDate),
      supabase.from("log_pengeluaran").select("pengeluaran_id, jumlah").gte("tanggal", startDate).lte("tanggal", endDate),
    ]);
    const fetchError = categoryError ?? salesError ?? marginError ?? expenseError;
    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    const totals = ((expenseData ?? []) as ExpenseRow[]).reduce<Record<string, number>>((result, row) => {
      result[row.pengeluaran_id] = (result[row.pengeluaran_id] ?? 0) + numberValue(row.jumlah);
      return result;
    }, {});
    setCategories((categoryData ?? []) as Category[]);
    setSales(((salesData ?? []) as AmountRow[]).reduce((sum, row) => sum + numberValue(row.total), 0));
    setConsignmentMargin(((marginData ?? []) as AmountRow[]).reduce((sum, row) => sum + numberValue(row.margin), 0));
    setExpenseTotals(totals);
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

  const metricRow = (label: string, value: number, emphasis = false) => (
    <div className={`flex items-center justify-between gap-4 border-b border-zinc-100 py-1 text-sm last:border-b-0 sm:py-3 sm:text-sm ${emphasis ? "font-bold text-zinc-950" : "text-zinc-700"}`} style={{ fontSize: 0.75 + "rem" }}>
      <span>{label}</span><span className="shrink-0 tabular-nums">{amount(value)}</span>
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

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="contents lg:block lg:space-y-5">
            <section className="order-1 self-start rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm lg:order-1">
              <div className="flex items-center justify-between gap-4">
                <h2 className={`text-base font-bold ${midText.lg}`}>Laba Usaha</h2>
                <span className="text-base font-bold tabular-nums text-emerald-800">
                  {amount(operatingProfit)}
                </span>
              </div>
            </section>
            <section className="order-2 rounded-2xl border-2 border-zinc-900 bg-zinc-900 p-5 text-white shadow-sm lg:order-2">
              <div className="flex items-center justify-between gap-4">
                <h2 className={`text-base font-bold ${midText.lg}`}>
                  Sisa Kas / Laba Bersih
                </h2>
                <span className="text-base font-bold tabular-nums text-emerald-300">
                  {amount(netCash)}
                </span>
              </div>
            </section>
            <section className="order-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:order-3">
              <h2 className={`mb-2 text-base font-bold ${midText.lg}`}>Pendapatan</h2>
              {metricRow("Penjualan Menu & Add-On", sales)}
              {metricRow("Margin Titipan", consignmentMargin)}
              {metricRow("Total Pendapatan", totalRevenue, true)}
            </section>
          </div>

          <div className="contents lg:block lg:space-y-5">
            <section className="order-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:order-4">
              <h2 className={`mb-2 text-base font-bold ${midText.lg}`}>
                Beban Usaha
              </h2>
              {businessExpenses.map((category) => (
                <div key={category.id}>
                  {metricRow(category.nama, expenseTotals[category.id] ?? 0)}
                </div>
              ))}
              {metricRow("Total Beban Usaha", totalBusinessExpenses, true)}
            </section>
            <section className="order-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 lg:order-5">
              <h2 className={`mb-2 text-base font-bold ${midText.lg}`}>
                Pengambilan Pribadi
              </h2>
              {personalExpenses.map((category) => (
                <div key={category.id}>
                  {metricRow(category.nama, expenseTotals[category.id] ?? 0)}
                </div>
              ))}
              {metricRow("Total Pengambilan Pribadi", totalPersonal, true)}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}