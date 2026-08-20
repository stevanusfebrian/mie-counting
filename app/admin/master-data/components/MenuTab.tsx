"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { midText } from "../../../../lib/styles/responsive";

type MenuItem = { id: string; kategori?: string; nama?: string; unit?: string; harga_jual?: number | string; aktif?: boolean };
type FormState = { kategori: string; nama: string; unit: string; harga_jual: string };
const defaultCategories = ["Mie", "Bakso", "Pangsit", "Lainnya"];
const defaultUnits = ["porsi", "pcs", "gelas", "box"];
const money = (value: number | string | undefined) => value == null ? "-" : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value));

export default function MenuTab() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<FormState>({ kategori: defaultCategories[0], nama: "", unit: defaultUnits[0], harga_jual: "" });

  const categories = useMemo(() => Array.from(new Set([...defaultCategories, ...items.map((item) => item.kategori).filter((value): value is string => Boolean(value))])), [items]);
  const units = useMemo(() => Array.from(new Set([...defaultUnits, ...items.map((item) => item.unit).filter((value): value is string => Boolean(value))])), [items]);
  const groups = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    items.forEach((item) => { const key = item.kategori?.trim() || "Lainnya"; map.set(key, [...(map.get(key) ?? []), item]); });
    return Array.from(map.entries());
  }, [items]);

  const load = async () => {
    setLoading(true); setError(null);
    const { data, error: fetchError } = await supabase.from("ms_menu").select("*").order("display_order", { ascending: true });
    if (fetchError) setError(fetchError.message); else setItems((data ?? []) as MenuItem[]);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    async function fetchMenu() {
      await load();
      if (!active) return;
    }
    void fetchMenu();
    return () => { active = false; };
  }, []);

  const add = async () => {
    const price = Number(form.harga_jual);
    if (!form.nama.trim() || !form.kategori || !form.unit || !Number.isFinite(price) || price < 0) { setError("Lengkapi nama, kategori, unit, dan harga jual yang valid."); return; }
    setSaving(true); setError(null);
    const { error: insertError } = await supabase.from("ms_menu").insert({ kategori: form.kategori, nama: form.nama.trim(), unit: form.unit, harga_jual: price, aktif: true });
    if (insertError) setError(insertError.message); else { setShowAdd(false); setForm({ kategori: categories[0] ?? defaultCategories[0], nama: "", unit: units[0] ?? defaultUnits[0], harga_jual: "" }); await load(); }
    setSaving(false);
  };

  const save = async () => {
    if (!editingId || !draft) return;
    const price = Number(draft.harga_jual);
    if (!draft.nama?.trim() || !draft.kategori?.trim() || !draft.unit?.trim() || !Number.isFinite(price) || price < 0) { setError("Semua nilai menu wajib valid."); return; }
    setSaving(true); setError(null);
    const { data, error: updateError } = await supabase.from("ms_menu").update({ kategori: draft.kategori, nama: draft.nama.trim(), unit: draft.unit, harga_jual: price, aktif: draft.aktif ?? true }).eq("id", editingId).select("*");
    if (updateError) setError(updateError.message); else if (!data?.length) setError("Tidak ada baris yang dapat diubah. Periksa row id atau policy RLS."); else { setEditingId(null); setDraft(null); await load(); }
    setSaving(false);
  };

  if (loading) return <div className={`rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm min-[850px]:text-base text-zinc-500 ${midText.sm}`}>Memuat data menu...</div>;
  if (error && items.length === 0) return <div className={`rounded-2xl border border-red-200 bg-red-50 p-4 text-sm min-[850px]:text-base text-red-700 ${midText.sm}`}>{error}</div>;

return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={`text-xl font-bold ${midText.lg}`}>Menu</h2>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className={`min-h-11 rounded bg-zinc-900 px-4 py-2 text-sm min-[850px]:text-base font-medium text-white ${midText.sm}`}
        >
          + Add Menu
        </button>
      </div>
      {error && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm min-[850px]:text-base text-red-700">
          {error}
        </div>
      )}
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm min-[850px]:text-base text-zinc-500">
          Belum ada data menu.
        </div>
      ) : (
        <div className="space-y-3 overflow-x-hidden">
          {groups.map(([category, rows], index) => (
            <section
              key={category}
              className="w-full min-w-0 overflow-hidden border border-zinc-200 min-[1080px]:min-w-[1080px]"
            >
              <div
                className={`px-3 py-2 text-center text-sm min-[850px]:text-base font-medium ${midText.sm} ${["bg-rose-50", "bg-amber-50", "bg-lime-50", "bg-cyan-50", "bg-violet-50", "bg-blue-50"][index % 6]}`}
              >
                {category}
              </div>
              <table
                className={`w-full table-fixed text-left text-sm min-[850px]:text-sm ${midText.sm}`}
              >
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="w-[30%] px-3 py-2">Nama</th>
                    <th className="w-[16%] px-3 py-2">Unit</th>
                    <th className="w-[20%] px-3 py-2">Harga Jual</th>
                    <th className="w-[17%] px-3 py-2">Status</th>
                    <th className="w-[17%] px-3 py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => {
                    const edit = editingId === item.id && draft;
                    return (
                      <tr
                        key={item.id}
                        className="border-t border-zinc-200 align-middle"
                      >
                        {edit ? (
                          <>
                            <td className="px-2 py-2">
                              <input
                                value={draft.nama ?? ""}
                                onChange={(e) =>
                                  setDraft({ ...draft, nama: e.target.value })
                                }
                                className="min-h-10 w-full rounded border px-2 text-sm min-[850px]:text-sm"
                                style={{ fontSize: 0.7 + "rem" }}
                              />

                              <select
                                value={draft.kategori ?? ""}
                                onChange={(e) =>
                                  setDraft({ ...draft, kategori: e.target.value })
                                }
                                className="mb-2 min-h-10 w-full rounded border px-2 text-sm min-[850px]:text-sm"
                                style={{ fontSize: 0.7 + "rem" }}
                              >
                                {categories.map((value) => (
                                  <option key={value}>{value}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <select
                                value={draft.unit ?? ""}
                                onChange={(e) =>
                                  setDraft({ ...draft, unit: e.target.value })
                                }
                                className="min-h-10 w-full rounded border px-2 text-sm min-[850px]:text-sm"
                                style={{ fontSize: 0.7 + "rem" }}
                              >
                                {units.map((value) => (
                                  <option key={value}>{value}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min="0"
                                value={Number(draft.harga_jual ?? 0)}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    harga_jual: Number(e.target.value),
                                  })
                                }
                                className="min-h-10 w-full rounded border px-2 text-sm min-[850px]:text-sm"
                                style={{ fontSize: 0.7 + "rem" }}
                              />
                            </td>
                            <td className="px-0.5 py-2">
                              <select
                                value={
                                  draft.aktif === false ? "nonaktif" : "aktif"
                                }
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    aktif: e.target.value === "aktif",
                                  })
                                }
                                className="min-h-10 w-full rounded border px-2 text-sm min-[850px]:text-sm"
                                style={{ fontSize: 0.7 + "rem" }}
                              >
                                <option value="aktif">Aktif</option>
                                <option value="nonaktif">Nonaktif</option>
                              </select>
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null);
                                    setDraft(null);
                                  }}
                                  className="min-h-10 text-sm min-[850px]:text-sm"
                                  style={{ fontSize: 0.7 + "rem" }}
                                >
                                  cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={save}
                                  disabled={saving}
                                  className="min-h-10 text-sm min-[850px]:text-sm text-emerald-600"
                                  style={{ fontSize: 0.7 + "rem" }}
                                >
                                  {saving ? "saving..." : "save"}
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="break-words px-3 py-2 font-medium min-[850px]:text-sm" style={{ fontSize: 0.75 + "rem" }}>
                              {item.nama ?? "-"}
                            </td>
                            <td className="px-3 py-2 min-[850px]:text-sm" style={{ fontSize: 0.75 + "rem" }}>
                              {item.unit ?? "-"}
                            </td>
                            <td className="px-3 py-2 min-[850px]:text-sm" style={{ fontSize: 0.75 + "rem" }}>
                              {money(item.harga_jual)}
                            </td>
                            <td className="px-3 py-2 min-[850px]:text-sm" style={{ fontSize: 0.75 + "rem" }}>
                              {item.aktif === false ? "Nonaktif" : "Aktif"}
                            </td>
                            <td className="px-3 py-2 min-[850px]:text-sm" style={{ fontSize: 0.75 + "rem" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(item.id);
                                  setDraft({ ...item });
                                }}
                                className="min-h-10 text-sm min-[850px]:text-sm text-blue-600"
                                style={{ fontSize: 0.75 + "rem" }}
                              >
                                Edit
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4">
          <div className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:p-6">
            <h3 className="mb-4 text-xl font-bold">Tambah Menu</h3>
            <div className="space-y-3">
              {(["kategori", "nama", "unit", "harga_jual"] as const).map(
                (field) =>
                  field === "kategori" || field === "unit" ? (
                    <label key={field} className="block text-sm min-[850px]:text-base font-medium">
                      {field === "kategori" ? "Kategori" : "Unit"}
                      <select
                        value={form[field]}
                        onChange={(e) =>
                          setForm({ ...form, [field]: e.target.value })
                        }
                        className="mt-1 min-h-11 w-full rounded border px-3 text-sm min-[850px]:text-base"
                      >
                        {(field === "kategori" ? categories : units).map(
                          (value) => (
                            <option key={value}>{value}</option>
                          ),
                        )}
                      </select>
                    </label>
                  ) : (
                    <label key={field} className="block text-sm min-[850px]:text-base font-medium">
                      {field === "nama" ? "Nama Item" : "Harga Jual"}
                      <input
                        type={field === "harga_jual" ? "number" : "text"}
                        min={field === "harga_jual" ? "0" : undefined}
                        value={form[field]}
                        onChange={(e) =>
                          setForm({ ...form, [field]: e.target.value })
                        }
                        className="mt-1 min-h-11 w-full rounded border px-3 text-sm min-[850px]:text-base"
                      />
                    </label>
                  ),
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="min-h-11 rounded border px-4 text-sm min-[850px]:text-base"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={add}
                disabled={saving}
                className="min-h-11 rounded bg-emerald-600 px-4 text-sm min-[850px]:text-base text-white"
              >
                {saving ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
