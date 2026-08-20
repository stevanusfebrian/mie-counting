"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type MenuItem = {
  id: string;
  kategori?: string;
  nama?: string;
  unit?: string;
  harga_jual?: number | string;
  aktif?: boolean;
  created_at?: string;
};

type AddFormState = {
  kategori: string;
  nama: string;
  unit: string;
  harga_jual: string;
};

const defaultCategoryOptions = ["Mie", "Bakso", "Pangsit", "Lainnya"];
const defaultUnitOptions = ["Porsi", "Cup", "Box"];

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>({
    kategori: defaultCategoryOptions[0],
    nama: "",
    unit: defaultUnitOptions[0],
    harga_jual: "",
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [savingAdd, setSavingAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MenuItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const categoryOptions = useMemo(() => {
    const values = items
      .map((item) => item.kategori)
      .filter((value): value is string => Boolean(value && value.trim()));

    const unique = Array.from(new Set(values));
    return unique.length > 0 ? unique : defaultCategoryOptions;
  }, [items]);

  const unitOptions = useMemo(() => {
    const values = items
      .map((item) => item.unit)
      .filter((value): value is string => Boolean(value && value.trim()));

    const unique = Array.from(new Set(values));
    return unique.length > 0 ? unique : defaultUnitOptions;
  }, [items]);

  const categoryGroups = useMemo(() => {
    const groups = new Map<string, MenuItem[]>();

    for (const item of items) {
      const category = item.kategori?.trim() || "Lainnya";
      const group = groups.get(category) ?? [];
      group.push(item);
      groups.set(category, group);
    }

    return Array.from(groups.entries()).map(([category, group]) => ({
      category,
      items: group,
    }));
  }, [items]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: rows, error: fetchError } = await supabase
        .from("ms_menu")
        .select("*")
        .order("display_order", { ascending: true });

      if (fetchError) {
        throw new Error(
          `${fetchError.message}. Cek apakah tabel ms_menu ada, nama kolom benar, dan RLS tidak memblokir select.`
        );
      }

      setItems((rows ?? []) as MenuItem[]);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data."
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function fetchInitialMenu() {
      try {
        setLoading(true);
        setError(null);

        const { data: rows, error: fetchError } = await supabase
          .from("ms_menu")
          .select("*");

        if (!active) return;

        if (fetchError) {
          throw new Error(
            `${fetchError.message}. Cek apakah tabel ms_menu ada, nama kolom benar, dan RLS tidak memblokir select.`
          );
        }

        setItems((rows ?? []) as MenuItem[]);
      } catch (err: unknown) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data."
        );
        setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchInitialMenu();

    return () => {
      active = false;
    };
  }, []);

  const resetAddForm = () => {
    setAddForm({
      kategori: categoryOptions[0] ?? defaultCategoryOptions[0],
      nama: "",
      unit: unitOptions[0] ?? defaultUnitOptions[0],
      harga_jual: "",
    });
    setAddError(null);
  };

  const handleAddMenu = async () => {
    const trimmedNama = addForm.nama.trim();
    const parsedHarga = Number(addForm.harga_jual);

    if (!addForm.kategori.trim() || !trimmedNama || !addForm.unit.trim()) {
      setAddError("Semua field wajib diisi.");
      return;
    }

    if (!Number.isFinite(parsedHarga) || parsedHarga < 0) {
      setAddError("Harga jual harus angka yang valid dan tidak negatif.");
      return;
    }

    try {
      setSavingAdd(true);
      setAddError(null);

      const { error } = await supabase.from("ms_menu").insert([
        {
          kategori: addForm.kategori.trim(),
          nama: trimmedNama,
          unit: addForm.unit.trim(),
          harga_jual: parsedHarga,
          aktif: true,
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      setShowAddModal(false);
      resetAddForm();
      await loadMenu();
    } catch (err: unknown) {
      setAddError(
        err instanceof Error ? err.message : "Gagal menambahkan data menu."
      );
    } finally {
      setSavingAdd(false);
    }
  };

  const handleEditStart = (item: MenuItem) => {
    setEditingId(item.id);
    setDraft({
      ...item,
      kategori: item.kategori ?? "",
      nama: item.nama ?? "",
      unit: item.unit ?? "",
      harga_jual: item.harga_jual ?? 0,
      aktif: item.aktif ?? true,
    });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setDraft(null);
  };

  const handleEditSave = async () => {
    if (!editingId || !draft) return;

    const trimmedNama = draft.nama?.trim() ?? "";
    const parsedHarga = Number(draft.harga_jual ?? 0);

    if (!draft.kategori?.trim() || !trimmedNama || !draft.unit?.trim()) {
      setError("Semua field edit wajib diisi.");
      return;
    }

    if (!Number.isFinite(parsedHarga) || parsedHarga < 0) {
      setError("Harga jual edit harus angka yang valid dan tidak negatif.");
      return;
    }

    try {
      setSavingEdit(true);
      setError(null);

      const { data, error } = await supabase
        .from("ms_menu")
        .update({
          kategori: draft.kategori.trim(),
          nama: trimmedNama,
          unit: draft.unit.trim(),
          harga_jual: Number(draft.harga_jual),
          aktif: draft.aktif ?? true,
        })
        .eq("id", editingId)
        .select("*");

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        throw new Error(
          "Update tidak berhasil: tidak ada baris yang cocok dengan id ini, atau policy RLS memblokir perubahan. Cek id row dan policy Supabase."
        );
      }

      setEditingId(null);
      setDraft(null);
      await loadMenu();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal menyimpan perubahan data menu."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-4 text-zinc-900 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500 sm:text-sm">
              Modul 2
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">Master Menu</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <button
              type="button"
              onClick={() => {
                resetAddForm();
                setShowAddModal(true);
              }}
              className="min-h-11 rounded bg-zinc-900 px-3 py-2 text-base font-medium text-white hover:bg-zinc-800 sm:px-4 sm:text-sm"
            >
              + Add Menu
            </button>
            <Link
              href="/"
              className="min-h-11 rounded border border-zinc-300 bg-white px-3 py-2 text-center text-base font-medium text-zinc-700 hover:bg-zinc-100 sm:px-4 sm:text-sm"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
          {loading ? (
            <div className="py-8 text-center text-base text-zinc-500 sm:text-sm">
              Memuat data menu dari Supabase...
            </div>
          ) : error ? (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-base text-red-700 sm:text-sm">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-base text-zinc-500 sm:text-sm">
              Query berhasil, tapi tidak ada data yang dikembalikan. Cek tabel ms_menu, policy RLS, dan koneksi project Supabase yang aktif.
            </div>
          ) : (
            <div className="space-y-5 overflow-x-auto">
              {categoryGroups.map(({ category, items: groupItems }, groupIndex) => (
                <section key={category} className="w-full min-w-[850px] overflow-hidden border border-zinc-200 min-[850px]:text-lg min-[1080px]:text-lg min-w-[1080px]">
                  <div className={`px-3 py-2 text-center text-sm font-medium ${
                    ["bg-rose-50", "bg-amber-50", "bg-lime-50", "bg-cyan-50", "bg-violet-50", "bg-blue-50" ][groupIndex % 6]
                  }`}>
                    {category}
                  </div> 
                  {/* buat ubah responsive */}
                  <table className="w-full table-fixed text-left text-base sm:text-sm">
                    <thead className="bg-zinc-50 text-zinc-700">
                      <tr>
                        <th className="w-[30%] px-3 py-2 font-semibold">Nama</th>
                        <th className="w-[16%] px-3 py-2 font-semibold">Unit</th>
                        <th className="w-[20%] px-3 py-2 font-semibold">Harga Jual</th>
                        <th className="w-[17%] px-3 py-2 font-semibold">Status</th>
                        <th className="w-[17%] px-3 py-2 font-semibold">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupItems.map((item) => {
                        const isEditing = editingId === item.id;

                        return (
                          <tr key={item.id} className="border-t border-zinc-200 align-top">
                            {isEditing && draft ? (
                              <>
                                <td className="px-2 py-2">
                                  <div className="space-y-2">
                                    <select value={draft.kategori ?? ""} onChange={(e) => setDraft({ ...draft, kategori: e.target.value })} className="min-h-10 w-full rounded border border-zinc-300 px-2 py-1 text-base">
                                      {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                                    </select>
                                    <input value={draft.nama ?? ""} onChange={(e) => setDraft({ ...draft, nama: e.target.value })} className="min-h-10 w-full rounded border border-zinc-300 px-2 py-1 text-base" />
                                  </div>
                                </td>
                                <td className="px-2 py-2">
                                  <select value={draft.unit ?? ""} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} className="min-h-10 w-full rounded border border-zinc-300 px-2 py-1 text-base">
                                    {unitOptions.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                                  </select>
                                </td>
                                <td className="px-2 py-2">
                                  <input type="number" min="0" value={Number(draft.harga_jual ?? 0)} onChange={(e) => setDraft({ ...draft, harga_jual: Number(e.target.value) })} className="min-h-10 w-full rounded border border-zinc-300 px-2 py-1 text-base" />
                                </td>
                                <td className="px-2 py-2">
                                  <select value={draft.aktif === false ? "nonaktif" : "aktif"} onChange={(e) => setDraft({ ...draft, aktif: e.target.value === "aktif" })} className="min-h-10 w-full rounded border border-zinc-300 px-2 py-1 text-base">
                                    <option value="aktif">Aktif</option>
                                    <option value="nonaktif">Nonaktif</option>
                                  </select>
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={handleEditCancel} className="min-h-10 text-base font-medium text-zinc-600 sm:text-sm">cancel</button>
                                    <button type="button" onClick={handleEditSave} disabled={savingEdit} className="min-h-10 text-base font-medium text-emerald-600 disabled:opacity-60 sm:text-sm">{savingEdit ? "saving..." : "save"}</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="break-words px-3 py-2 font-medium">{item.nama ?? "-"}</td>
                                <td className="px-3 py-2">{item.unit ?? "-"}</td>
                                <td className="px-3 py-2">{item.harga_jual != null ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(item.harga_jual)) : "-"}</td>
                                <td className="px-3 py-2">{item.aktif === false ? "Nonaktif" : "Aktif"}</td>
                                <td className="px-3 py-2"><button type="button" onClick={() => handleEditStart(item)} className="min-h-10 text-base font-medium text-blue-600 sm:text-sm">Edit</button></td>
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
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4">
          <div className="max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:max-h-[90dvh] sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Tambah Menu Baru</h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
                className="min-h-11 min-w-11 text-sm text-zinc-500 hover:text-zinc-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-base font-medium sm:text-sm">Kategori</label>
                <select
                  value={addForm.kategori}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, kategori: e.target.value }))
                  }
                  className="min-h-11 w-full rounded border border-zinc-300 px-3 py-2 text-base"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-base font-medium sm:text-sm">Nama Item</label>
                <input
                  type="text"
                  value={addForm.nama}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, nama: e.target.value }))
                  }
                  className="min-h-11 w-full rounded border border-zinc-300 px-3 py-2 text-base"
                  placeholder="Contoh: Mie Ayam Jumbo"
                />
              </div>

              <div>
                <label className="mb-1 block text-base font-medium sm:text-sm">Unit</label>
                <select
                  value={addForm.unit}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, unit: e.target.value }))
                  }
                  className="min-h-11 w-full rounded border border-zinc-300 px-3 py-2 text-base"
                >
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-base font-medium sm:text-sm">Harga Jual</label>
                <input
                  type="number"
                  min="0"
                  value={addForm.harga_jual}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, harga_jual: e.target.value }))
                  }
                  className="min-h-11 w-full rounded border border-zinc-300 px-3 py-2 text-base"
                  placeholder="25000"
                />
              </div>

              {addError && (
                  <div className="rounded border border-red-200 bg-red-50 p-3 text-base text-red-700 sm:text-sm">
                  {addError}
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
                className="min-h-11 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-base font-medium text-zinc-700 sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMenu}
                disabled={savingAdd}
                className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2 text-base font-medium text-white hover:bg-emerald-700 disabled:opacity-60 sm:text-sm"
              >
                {savingAdd ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
