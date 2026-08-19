"use client";

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

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError(null);

const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();

console.log("current user:", user);
console.log("userError:", userError);

if (user) {
  const { data, error } = await supabase
    .from("users_profile")
    .select("*")
    .eq("id", user.id);

  console.log("users_profile row:", data);
  console.log("users_profile error:", error);
}



      const { data: rows, error: fetchError } = await supabase
        .from("ms_menu")
        .select("*");

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
    void loadMenu();
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

    console.log("editingId:", editingId, typeof editingId);

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
          nama: draft.nama.trim(),
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
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-zinc-500">
              Modul 2
            </p>
            <h1 className="text-3xl font-bold">Master Menu</h1>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                resetAddForm();
                setShowAddModal(true);
              }}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              + Add Menu
            </button>
            <a
              href="/"
              className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Kembali ke Dashboard
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {loading ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              Memuat data menu dari Supabase...
            </div>
          ) : error ? (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              Query berhasil, tapi tidak ada data yang dikembalikan. Cek tabel ms_menu, policy RLS, dan koneksi project Supabase yang aktif.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-100 text-zinc-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Kategori</th>
                    <th className="px-4 py-3 font-semibold">Nama Item</th>
                    <th className="px-4 py-3 font-semibold">Unit</th>
                    <th className="px-4 py-3 font-semibold">Harga Jual</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isEditing = editingId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className="border-t border-zinc-200 align-top"
                      >
                        {isEditing && draft ? (
                          <>
                            <td className="px-4 py-3">
                              <select
                                value={draft.kategori ?? ""}
                                onChange={(e) =>
                                  setDraft({ ...draft, kategori: e.target.value })
                                }
                                className="w-full rounded border border-zinc-300 px-2 py-2"
                              >
                                {categoryOptions.map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                value={draft.nama ?? ""}
                                onChange={(e) =>
                                  setDraft({ ...draft, nama: e.target.value })
                                }
                                className="w-full rounded border border-zinc-300 px-2 py-2"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={draft.unit ?? ""}
                                onChange={(e) =>
                                  setDraft({ ...draft, unit: e.target.value })
                                }
                                className="w-full rounded border border-zinc-300 px-2 py-2"
                              >
                                {unitOptions.map((unit) => (
                                  <option key={unit} value={unit}>
                                    {unit}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
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
                                className="w-full rounded border border-zinc-300 px-2 py-2"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={draft.aktif === false ? "nonaktif" : "aktif"}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    aktif: e.target.value === "aktif",
                                  })
                                }
                                className="w-full rounded border border-zinc-300 px-2 py-2"
                              >
                                <option value="aktif">Aktif</option>
                                <option value="nonaktif">Nonaktif</option>
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleEditCancel}
                                  className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
                                >
                                  cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleEditSave}
                                  disabled={savingEdit}
                                  className="text-sm font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-60"
                                >
                                  {savingEdit ? "saving..." : "save"}
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3">{item.kategori ?? "-"}</td>
                            <td className="px-4 py-3 font-medium">{item.nama ?? "-"}</td>
                            <td className="px-4 py-3">{item.unit ?? "-"}</td>
                            <td className="px-4 py-3">
                              {item.harga_jual != null
                                ? new Intl.NumberFormat("id-ID", {
                                    style: "currency",
                                    currency: "IDR",
                                    maximumFractionDigits: 0,
                                  }).format(Number(item.harga_jual))
                                : "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                  item.aktif === false
                                    ? "bg-red-100 text-red-700"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {item.aktif === false ? "Nonaktif" : "Aktif"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleEditStart(item)}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                edit
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Tambah Menu Baru</h2>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
                className="text-sm text-zinc-500 hover:text-zinc-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Kategori</label>
                <select
                  value={addForm.kategori}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, kategori: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 px-3 py-2"
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Nama Item</label>
                <input
                  type="text"
                  value={addForm.nama}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, nama: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 px-3 py-2"
                  placeholder="Contoh: Mie Ayam Jumbo"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Unit</label>
                <select
                  value={addForm.unit}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, unit: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 px-3 py-2"
                >
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Harga Jual</label>
                <input
                  type="number"
                  min="0"
                  value={addForm.harga_jual}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, harga_jual: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 px-3 py-2"
                  placeholder="25000"
                />
              </div>

              {addError && (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {addError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetAddForm();
                }}
                className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMenu}
                disabled={savingAdd}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
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
