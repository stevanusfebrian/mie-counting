"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { midText } from "../../../lib/styles/responsive";

type Category = { id: string; nama: string };
type FormRow = { key: string; pengeluaran_id: string; deskripsi: string; jumlah: string };
type HistoryRow = {
  id: string;
  pengeluaran_id: string;
  deskripsi: string | null;
  jumlah: number | string;
};

const today = () => new Date().toISOString().slice(0, 10);
const newFormRow = (): FormRow => ({ key: crypto.randomUUID(), pengeluaran_id: "", deskripsi: "", jumlah: "" });
const amount = (value: number | string) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(value));

export default function LogPengeluaranPage() {
  const [tanggal, setTanggal] = useState(today);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formRows, setFormRows] = useState<FormRow[]>([newFormRow()]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [editing, setEditing] = useState<HistoryRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyAction, setHistoryAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async (selectedDate: string) => {
    setLoading(true);
    setError(null);
    const [{ data: categoryData, error: categoryError }, { data: historyData, error: historyError }] = await Promise.all([
      supabase.from("ms_pengeluaran").select("id, nama").eq("aktif", true).order("nama", { ascending: true }),
      supabase.from("log_pengeluaran").select("id, pengeluaran_id, deskripsi, jumlah").eq("tanggal", selectedDate).eq("is_deleted", false).order("created_at", { ascending: false }),
    ]);
    const fetchError = categoryError ?? historyError;
    if (fetchError) setError(fetchError.message);
    else {
      setCategories((categoryData ?? []) as Category[]);
      setHistory((historyData ?? []) as HistoryRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(tanggal); });
    return () => { active = false; };
  }, [tanggal]);

  const categoryNames = new Map(categories.map((category) => [category.id, category.nama]));

  const updateFormRow = (key: string, changes: Partial<FormRow>) => {
    setFormRows((current) => current.map((row) => row.key === key ? { ...row, ...changes } : row));
  };

  const save = async () => {
    const rowsToSave = formRows
      .filter((row) => row.pengeluaran_id && row.jumlah && Number(row.jumlah) > 0)
      .map((row) => ({ tanggal, pengeluaran_id: row.pengeluaran_id, deskripsi: row.deskripsi.trim() || null, jumlah: Number(row.jumlah) }));
    if (rowsToSave.length === 0) {
      setError("Isi minimal satu kategori dengan jumlah lebih dari 0.");
      return;
    }
    if (rowsToSave.some((row) => !Number.isFinite(row.jumlah))) {
      setError("Jumlah harus berupa angka yang valid.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    const { data: userData } = await supabase.auth.getUser();
    const { error: saveError } = await supabase.from("log_pengeluaran").insert(rowsToSave.map((row) => ({ ...row, created_by: userData.user?.id ?? null })));
    if (saveError) setError(saveError.message);
    else {
      setFormRows([newFormRow()]);
      setSuccess("Pengeluaran berhasil disimpan.");
      await load(tanggal);
    }
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!editing || !editing.pengeluaran_id || !Number.isFinite(Number(editing.jumlah)) || Number(editing.jumlah) <= 0) {
      setError("Kategori dan jumlah lebih dari 0 wajib diisi.");
      return;
    }
    setHistoryAction(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const { error: updateError } = await supabase.from("log_pengeluaran").update({ pengeluaran_id: editing.pengeluaran_id, deskripsi: editing.deskripsi?.trim() || null, jumlah: Number(editing.jumlah), updated_by: userData.user?.id ?? null, updated_at: new Date().toISOString() }).eq("id", editing.id);
    if (updateError) setError(updateError.message);
    else { setEditing(null); await load(tanggal); }
    setHistoryAction(false);
  };

  const handleSoftDelete = async (id: string) => {
    if (!window.confirm("Hapus transaksi pengeluaran ini?")) return;
    setHistoryAction(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const { error: updateError } = await supabase.from("log_pengeluaran").update({ is_deleted: true, updated_by: userData.user?.id ?? null, updated_at: new Date().toISOString() }).eq("id", id);
    if (updateError) setError(updateError.message);
    else await load(tanggal);
    setHistoryAction(false);
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-4 text-zinc-900 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl pb-24">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p
              className={`text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 sm:text-sm ${midText.sm}`}
            >
              Modul 5
            </p>
            <h1 className={`text-2xl font-bold ${midText.xl}`}>
              Log Pengeluaran
            </h1>
          </div>
          <Link
            href="/"
            className="min-h-11 rounded border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium hover:bg-zinc-100"
          >
            Kembali ke Dashboard
          </Link>
        </header>

        <section className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <label className={`block text-sm font-medium ${midText.sm}`}>
            Tanggal
            <input
              type="date"
              value={tanggal}
              onChange={(event) => {
                setTanggal(event.target.value);
                setSuccess(null);
              }}
              className="mt-1 min-h-11 w-full rounded border border-zinc-300 px-3 text-base sm:max-w-xs"
            />
          </label>
        </section>
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

        <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
          <h2 className={`mb-4 text-xl font-bold ${midText.lg}`}>
            Input Transaksi
          </h2>
          <div className="space-y-3">
            {formRows.map((row) => (
              <div
                key={row.key}
                className="grid gap-2 border-b border-zinc-200 pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_10rem_auto] sm:items-center"
              >
                <select
                  value={row.pengeluaran_id}
                  onChange={(event) =>
                    updateFormRow(row.key, { pengeluaran_id: event.target.value })
                  }
                  className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
                  aria-label="Kategori pengeluaran"
                >
                  <option value="">Pilih kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.nama}
                    </option>
                  ))}
                </select>
                <input
                  value={row.deskripsi}
                  onChange={(event) =>
                    updateFormRow(row.key, { deskripsi: event.target.value })
                  }
                  placeholder="Deskripsi (opsional)"
                  className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={row.jumlah}
                  onChange={(event) =>
                    updateFormRow(row.key, { jumlah: event.target.value })
                  }
                  placeholder="Jumlah"
                  className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormRows((current) =>
                      current.length === 1
                        ? [newFormRow()]
                        : current.filter((item) => item.key !== row.key),
                    )
                  }
                  className="min-h-11 rounded border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50"
                >
                  Hapus baris
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => setFormRows((current) => [...current, newFormRow()])}
              className="min-h-11 rounded border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-100"
            >
              + Tambah Baris
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || categories.length === 0}
              className="min-h-11 rounded bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
          {categories.length === 0 && !loading && (
            <p className="mt-3 text-sm text-amber-700">
              Belum ada kategori aktif. Jalankan seed SQL kategori terlebih
              dahulu.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className={`text-xl font-bold ${midText.lg}`}>
              Riwayat {tanggal}
            </h2>
            <span className="text-sm text-zinc-500">
              {history.length} transaksi
            </span>
          </div>
          {loading ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Memuat riwayat...
            </p>
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Belum ada transaksi pada tanggal ini.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((row) =>
                editing?.id === row.id ? (
                  <div
                    key={row.id}
                    className="grid gap-2 border-b border-zinc-200 pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_10rem_auto] sm:items-center"
                  >
                    <select
                      value={editing.pengeluaran_id}
                      onChange={(event) =>
                        setEditing({
                          ...editing,
                          pengeluaran_id: event.target.value,
                        })
                      }
                      className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
                      aria-label="Kategori pengeluaran edit"
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.nama}
                        </option>
                      ))}
                    </select>
                    <input
                      value={editing.deskripsi ?? ""}
                      onChange={(event) =>
                        setEditing({ ...editing, deskripsi: event.target.value })
                      }
                      className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editing.jumlah}
                      onChange={(event) =>
                        setEditing({ ...editing, jumlah: event.target.value })
                      }
                      className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={historyAction}
                        className="min-h-11 rounded bg-emerald-600 px-3 text-sm text-white"
                      >
                        Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="min-h-11 rounded border px-3 text-sm"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 border-b border-zinc-200 pb-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {categoryNames.get(row.pengeluaran_id) ??
                          "Kategori tidak ditemukan"}
                      </p>
                      <p className="break-words text-sm text-zinc-500">
                        {row.deskripsi || "Tanpa deskripsi"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <span className="font-medium">Rp {amount(row.jumlah)}</span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setEditing(row)}
                          disabled={historyAction}
                          className="min-h-11 text-sm text-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSoftDelete(row.id)}
                          disabled={historyAction}
                          className="min-h-11 text-sm text-red-600"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}