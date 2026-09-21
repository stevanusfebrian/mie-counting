"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { midText } from "../../../lib/styles/responsive";

type Category = { id: string; nama: string };
type SubCategory = { id: string; pengeluaran_id: string; nama: string };
type BahanBaku = { id: string; sub_pengeluaran_id: string; nama: string; unit: string; berat_bersih: number | string | null; berat_bersih_satuan: string | null };
type FormRow = { key: string; pengeluaran_id: string; sub_pengeluaran_id: string; bahan_baku_id: string; qty: string; deskripsi: string; jumlah: string };
type HistoryRow = {
  id: string;
  pengeluaran_id: string;
  sub_pengeluaran_id: string | null;
  bahan_baku_id: string | null;
  qty: number | string | null;
  deskripsi: string | null;
  jumlah: number | string;
};

const today = () => new Date().toISOString().slice(0, 10);
const shiftDate = (date: string, days: number) => {
  const nextDate = new Date(`${date}T00:00:00.000Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString().slice(0, 10);
};
const newFormRow = (): FormRow => ({ key: crypto.randomUUID(), pengeluaran_id: "", sub_pengeluaran_id: "", bahan_baku_id: "", qty: "", deskripsi: "", jumlah: "" });
const amount = (value: number | string) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(Number(value));
const qtyLabel = (item: BahanBaku) => `Qty (${item.unit})`;
const parsePrice = (value: number | string | null | undefined) => Number(String(value ?? "").replace(/\./g, "").replace(/[^\d-]/g, "")) || 0;
const formatPriceInput = (value: number | string | null | undefined) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(digits)) : "";
};
const itemFieldsGridClass = (itemCount: number, hasSelectedItem: boolean) =>
  itemCount > 1 && hasSelectedItem
    ? "grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-start"
    : "grid gap-2 sm:grid-cols-1 sm:items-start";

export default function LogPengeluaranPage() {
  const [tanggal, setTanggal] = useState(today);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [bahanBaku, setBahanBaku] = useState<BahanBaku[]>([]);
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
    const [{ data: categoryData, error: categoryError }, { data: subCategoryData, error: subCategoryError }, { data: bahanBakuData, error: bahanBakuError }, { data: historyData, error: historyError }] = await Promise.all([
      supabase.from("ms_pengeluaran").select("id, nama").eq("aktif", true).order("nama", { ascending: true }),
      supabase.from("ms_sub_pengeluaran").select("id, pengeluaran_id, nama").eq("aktif", true).order("nama", { ascending: true }),
      supabase.from("ms_bahan_baku").select("id, sub_pengeluaran_id, nama, unit, berat_bersih, berat_bersih_satuan").eq("aktif", true).order("nama", { ascending: true }),
      supabase.from("log_pengeluaran").select("id, pengeluaran_id, sub_pengeluaran_id, bahan_baku_id, qty, deskripsi, jumlah").eq("tanggal", selectedDate).eq("is_deleted", false).order("created_at", { ascending: false }),
    ]);
    const fetchError = categoryError ?? subCategoryError ?? bahanBakuError ?? historyError;
    if (fetchError) setError(fetchError.message);
    else {
      setCategories((categoryData ?? []) as Category[]);
      setSubCategories((subCategoryData ?? []) as SubCategory[]);
      setBahanBaku((bahanBakuData ?? []) as BahanBaku[]);
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
  const subCategoryNames = new Map(subCategories.map((category) => [category.id, category.nama]));
  const bahanBakuMap = new Map(bahanBaku.map((item) => [item.id, item]));
  const itemsForSub = (subId: string) => bahanBaku.filter((item) => item.sub_pengeluaran_id === subId);

  const moveDay = (direction: -1 | 1) => {
    setTanggal((current) => shiftDate(current, direction));
    setSuccess(null);
  };

  const updateFormRow = (key: string, changes: Partial<FormRow>) => {
    setFormRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const nextRow = { ...row, ...changes };
        if (changes.pengeluaran_id !== undefined && changes.pengeluaran_id !== row.pengeluaran_id) {
          nextRow.sub_pengeluaran_id = "";
          nextRow.bahan_baku_id = "";
          nextRow.qty = "";
        }
        if (changes.sub_pengeluaran_id !== undefined && changes.sub_pengeluaran_id !== row.sub_pengeluaran_id) {
          const items = itemsForSub(changes.sub_pengeluaran_id);
          nextRow.bahan_baku_id = items.length === 1 ? items[0].id : "";
          nextRow.qty = "";
        }
        return nextRow;
      }),
    );
  };

  const save = async () => {
    const invalidQtyRow = formRows.find((row) => row.bahan_baku_id && (!row.qty || Number(row.qty) <= 0));
    if (invalidQtyRow) {
      const item = bahanBakuMap.get(invalidQtyRow.bahan_baku_id);
      setError(`Jumlah ${item?.unit ?? "item"} wajib diisi untuk item bahan baku.`);
      return;
    }
    const rowsToSave = formRows
      .filter((row) => row.pengeluaran_id && row.jumlah && parsePrice(row.jumlah) > 0)
      .map((row) => ({ tanggal, pengeluaran_id: row.pengeluaran_id, sub_pengeluaran_id: row.sub_pengeluaran_id || null, bahan_baku_id: row.bahan_baku_id || null, qty: row.bahan_baku_id ? Number(row.qty) || null : null, deskripsi: row.deskripsi.trim() || null, jumlah: parsePrice(row.jumlah) }));
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
    if (!editing || !editing.pengeluaran_id || !Number.isFinite(parsePrice(editing.jumlah)) || parsePrice(editing.jumlah) <= 0) {
      setError("Kategori dan jumlah lebih dari 0 wajib diisi.");
      return;
    }
    const editingItem = editing.bahan_baku_id ? bahanBakuMap.get(editing.bahan_baku_id) : null;
    if (editing.bahan_baku_id && (!editing.qty || Number(editing.qty) <= 0)) {
      setError(`Jumlah ${editingItem?.unit ?? "item"} wajib diisi untuk item bahan baku.`);
      return;
    }
    setHistoryAction(true);
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const { error: updateError } = await supabase.from("log_pengeluaran").update({ pengeluaran_id: editing.pengeluaran_id, sub_pengeluaran_id: editing.sub_pengeluaran_id || null, bahan_baku_id: editing.bahan_baku_id || null, qty: editing.bahan_baku_id ? Number(editing.qty) || null : null, deskripsi: editing.deskripsi?.trim() || null, jumlah: parsePrice(editing.jumlah), updated_by: userData.user?.id ?? null, updated_at: new Date().toISOString() }).eq("id", editing.id);
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

  const editingSubCategories = editing?.pengeluaran_id ? subCategories.filter((category) => category.pengeluaran_id === editing.pengeluaran_id) : [];
  const editingItems = editing ? itemsForSub(editing.sub_pengeluaran_id ?? "") : [];
  const editingItem = editing?.bahan_baku_id ? bahanBakuMap.get(editing.bahan_baku_id) : null;

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
            <div className="mt-1 flex w-full items-center gap-2 sm:max-w-xs">
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
                className="border-b border-zinc-200 pb-3"
              >
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_10rem_auto] sm:items-center">
                  <select
                    value={row.pengeluaran_id}
                    onChange={(event) => updateFormRow(row.key, { pengeluaran_id: event.target.value })}
                    className="min-h-11 rounded border border-zinc-300 px-3 text-sm"
                    aria-label="Kategori pengeluaran"
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.nama}</option>)}
                  </select>
                  <select
                    value={row.sub_pengeluaran_id}
                    onChange={(event) => updateFormRow(row.key, { sub_pengeluaran_id: event.target.value })}
                    disabled={!row.pengeluaran_id}
                    className="min-h-11 rounded border border-zinc-300 px-3 text-sm disabled:cursor-not-allowed disabled:bg-zinc-100"
                    aria-label="Sub-kategori pengeluaran"
                  >
                    <option value="">Sub-kategori (opsional)</option>
                    {subCategories.filter((category) => category.pengeluaran_id === row.pengeluaran_id).map((category) => <option key={category.id} value={category.id}>{category.nama}</option>)}
                  </select>
                  <div className={itemFieldsGridClass(itemsForSub(row.sub_pengeluaran_id).length, Boolean(row.bahan_baku_id))}>
                    {(() => {
                      const items = itemsForSub(row.sub_pengeluaran_id);
                      const item = bahanBakuMap.get(row.bahan_baku_id);
                      const isBahanBakuCategory = categoryNames.get(row.pengeluaran_id) === "Bahan Baku";
                      return (
                        <>
                          {row.sub_pengeluaran_id && items.length > 1 && (
                            <select value={row.bahan_baku_id} onChange={(event) => updateFormRow(row.key, { bahan_baku_id: event.target.value, qty: "" })} className="min-h-11 w-full rounded border border-zinc-300 px-3 text-sm" aria-label="Item bahan baku">
                              <option value="">Pilih item bahan baku</option>
                              {items.map((option) => <option key={option.id} value={option.id}>{option.nama}</option>)}
                            </select>
                          )}
                          {item && (
                            <div className={items.length > 1 ? "sm:col-start-2 sm:row-start-1" : ""}>
                            <input placeholder={qtyLabel(item)} type="number" min="0" step="0.5" inputMode="decimal" value={row.qty} onChange={(event) => updateFormRow(row.key, { qty: event.target.value })} className="min-h-11 w-full rounded border border-zinc-300 px-3 text-sm" />
                            {/* {item.berat_bersih && item.berat_bersih_satuan && <span className="block text-xs font-normal text-zinc-500">≈ {Number(row.qty || 0) * Number(item.berat_bersih)} {item.berat_bersih_satuan} total</span>} */}
                          {/* <label className="text-xs font-medium text-zinc-600">{qtyLabel(item)}</label> */}
                            </div>
                          )}
                          {isBahanBakuCategory && row.sub_pengeluaran_id && items.length === 0 && (
                            <p className="mt-2 text-xs text-amber-700">Belum ada item bahan baku aktif untuk sub-kategori ini. Periksa seed `ms_bahan_baku` dan akses RLS.</p>
                          )}
                        </>
                      );
                    })()}
                  </div> 
                  <input type="text" inputMode="numeric" value={row.jumlah} onChange={(event) => updateFormRow(row.key, { jumlah: formatPriceInput(event.target.value) })} placeholder="Jumlah Harga" className="min-h-11 rounded border border-zinc-300 px-3 text-sm" />
                  <input value={row.deskripsi} onChange={(event) => updateFormRow(row.key, { deskripsi: event.target.value })} placeholder="Deskripsi (opsional)" className="min-h-11 rounded border border-zinc-300 px-3 text-sm" />
                  <button type="button" onClick={() => setFormRows((current) => current.length === 1 ? [newFormRow()] : current.filter((item) => item.key !== row.key))} className="min-h-11 rounded border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50">Hapus baris</button>
                </div>
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
                    className="border-b border-zinc-200 pb-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)_10rem_auto] sm:items-center">
                    <select value={editing.pengeluaran_id} onChange={(event) => setEditing({ ...editing, pengeluaran_id: event.target.value, sub_pengeluaran_id: null, bahan_baku_id: null, qty: null })} className="min-h-11 rounded border border-zinc-300 px-3 text-sm" aria-label="Kategori pengeluaran edit">
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.nama}</option>)}
                    </select>
                    <select value={editing.sub_pengeluaran_id ?? ""} onChange={(event) => { const nextSubId = event.target.value || null; const items = itemsForSub(nextSubId ?? ""); setEditing({ ...editing, sub_pengeluaran_id: nextSubId, bahan_baku_id: items.length === 1 ? items[0].id : null, qty: null }); }} disabled={!editing.pengeluaran_id} className="min-h-11 rounded border border-zinc-300 px-3 text-sm disabled:cursor-not-allowed disabled:bg-zinc-100" aria-label="Sub-kategori pengeluaran edit">
                      <option value="">Sub-kategori (opsional)</option>
                      {editingSubCategories.map((category) => <option key={category.id} value={category.id}>{category.nama}</option>)}
                    </select>
                    <input value={editing.deskripsi ?? ""} onChange={(event) => setEditing({ ...editing, deskripsi: event.target.value })} className="min-h-11 rounded border border-zinc-300 px-3 text-sm" />
                    <input type="text" inputMode="numeric" value={formatPriceInput(editing.jumlah)} onChange={(event) => setEditing({ ...editing, jumlah: formatPriceInput(event.target.value) })} className="min-h-11 rounded border border-zinc-300 px-3 text-sm" />
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
                    <div className={itemFieldsGridClass(editingItems.length, Boolean(editing?.bahan_baku_id))}>
                      {editing.sub_pengeluaran_id && editingItems.length > 1 && <select value={editing.bahan_baku_id ?? ""} onChange={(event) => setEditing({ ...editing, bahan_baku_id: event.target.value || null, qty: null })} className="min-h-11 w-full rounded border border-zinc-300 px-3 text-sm" aria-label="Item bahan baku edit"><option value="">Pilih item bahan baku</option>{editingItems.map((item) => <option key={item.id} value={item.id}>{item.nama}</option>)}</select>}
                      {editingItem && <label className="text-xs font-medium text-zinc-600">{qtyLabel(editingItem)}<input type="number" min="0" step="0.5" value={editing.qty ?? ""} onChange={(event) => setEditing({ ...editing, qty: event.target.value })} className="mt-1 min-h-11 w-full rounded border border-zinc-300 px-3 text-sm" />{editingItem.berat_bersih && editingItem.berat_bersih_satuan && <span className="mt-1 block font-normal text-zinc-500">≈ {Number(editing.qty || 0) * Number(editingItem.berat_bersih)} {editingItem.berat_bersih_satuan} total</span>}</label>}
                    </div>
                  </div>
                ) : (
                  <div
                    key={row.id}
                    className="flex flex-col gap-3 border-b border-zinc-200 pb-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {categoryNames.get(row.pengeluaran_id) ?? "Kategori tidak ditemukan"}
                      </p>
                      {row.sub_pengeluaran_id ? (
                        <p className="text-xs text-zinc-500">
                          {subCategoryNames.get(row.sub_pengeluaran_id) ?? "Sub-kategori tidak ditemukan"}
                          {row.bahan_baku_id && bahanBakuMap.get(row.bahan_baku_id) && ` · ${bahanBakuMap.get(row.bahan_baku_id)?.nama} · ${row.qty} ${bahanBakuMap.get(row.bahan_baku_id)?.unit}`}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-500">Tidak Berkategori</p>
                      )}
                      <p className="break-words text-sm text-zinc-500">
                        {row.deskripsi || "Tanpa deskripsi"}
                      </p>
                      {row.deskripsi?.includes("[estimasi]") && <span className="mt-1 inline-block text-xs text-amber-700">Perkiraan qty</span>}
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