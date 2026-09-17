import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_PHOTO,
  formatTanggal,
  getMenus,
  addMenu,
  updateMenu,
  deleteMenu,
  sortByDateDesc,
} from "@/lib/menuStorage";
import { supabase } from "@/lib/supabase";
import type { MenuData } from "@/types";
import { toast } from "sonner";

const AUTH_KEY = "sppg-admin-auth";

type FormData = {
  id?: string;
  date: string;
  photo: string;
  karbohidrat: string;
  laukHewani: string;
  sayur: string;
  laukNabati: string;
  buah: string;
  kalori: string;
  protein: string;
  lemak: string;
  karbohidratGram: string;
};

const emptyForm: FormData = {
  date: "",
  photo: "",
  karbohidrat: "",
  laukHewani: "",
  sayur: "",
  laukNabati: "",
  buah: "",
  kalori: "",
  protein: "",
  lemak: "",
  karbohidratGram: "",
};

export default function AdminMenu() {
  const navigate = useNavigate();

  const [authed, setAuthed] = useState(false);
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ok = sessionStorage.getItem(AUTH_KEY) === "1";

    setAuthed(ok);

    if (ok) {
      getMenus().then((data) => {
        setMenus(sortByDateDesc(data));
      });
    }
  }, []);

  function refresh() {
    return getMenus().then((data) => {
      setMenus(sortByDateDesc(data));
    });
  }

  function logout() {
    sessionStorage.removeItem(AUTH_KEY);
    navigate("/admin/login");
  }

  function openAddForm() {
    setFormError("");

    setForm({
      ...emptyForm,
      date: new Date().toISOString().split("T")[0],
    });

    setShowForm(true);
  }

  function openEditForm(menu: MenuData) {
    setFormError("");

    setForm({
      id: menu.id,
      date: menu.date,
      photo: menu.photo || "",
      karbohidrat: menu.karbohidrat || "",
      laukHewani: menu.laukHewani || "",
      sayur: menu.sayur || "",
      laukNabati: menu.laukNabati || "",
      buah: menu.buah || "",
      kalori: String(menu.kalori ?? ""),
      protein: String(menu.protein ?? ""),
      lemak: String(menu.lemak ?? ""),
      karbohidratGram: String(menu.karbohidratGram ?? ""),
    });

    setShowForm(true);
  }

  function closeForm() {
    if (saving || uploading) return;

    setShowForm(false);
    setFormError("");
    setForm(emptyForm);
  }

  function updateForm<K extends keyof FormData>(
    key: K,
    value: FormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const maxWidth = 1200;
          const maxHeight = 1200;

          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(
              maxWidth / width,
              maxHeight / height
            );

            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement("canvas");

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Canvas tidak tersedia"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.82);

          resolve(dataUrl);
        };

        img.onerror = () => {
          reject(new Error("Gagal membaca gambar"));
        };

        img.src = reader.result as string;
      };

      reader.onerror = () => {
        reject(new Error("Gagal membaca file"));
      };

      reader.readAsDataURL(file);
    });
  }

  async function handlePhoto(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      e.target.value = "";
      return;
    }

    try {
      setUploading(true);

      const dataUrl = await compressImage(file);

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const fileName = `${Date.now()}-${file.name.replace(
        /[^a-zA-Z0-9.-]/g,
        "-"
      )}`;

      const { error: uploadError } = await supabase.storage
        .from("menu-photos")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("menu-photos")
        .getPublicUrl(fileName);

      setForm((current) => ({
        ...current,
        photo: data.publicUrl,
      }));

      toast.success("Foto berhasil diunggah");
    } catch (error) {
      console.error("Upload foto gagal:", error);
      toast.error("Gagal mengunggah foto");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();

    if (!form.date) {
      setFormError("Tanggal wajib diisi.");
      return;
    }

    const data = {
      date: form.date,
      photo: form.photo || DEFAULT_PHOTO,

      karbohidrat:
        form.karbohidrat.trim() || "-",

      laukHewani:
        form.laukHewani.trim() || "-",

      sayur:
        form.sayur.trim() || "-",

      laukNabati:
        form.laukNabati.trim() || "-",

      buah:
        form.buah.trim() || "-",

      kalori:
        Number(form.kalori) || 0,

      protein:
        Number(form.protein) || 0,

      lemak:
        Number(form.lemak) || 0,

      karbohidratGram:
        Number(form.karbohidratGram) || 0,
    };

    try {
      setSaving(true);

      if (form.id) {
        await updateMenu({
          id: form.id,
          ...data,
        });
      } else {
        await addMenu(data);
      }

      await refresh();

      setShowForm(false);
      setForm(emptyForm);
      setFormError("");

      toast.success(
        form.id
          ? "Menu berhasil diperbarui"
          : "Menu berhasil ditambahkan"
      );
    } catch (error) {
      console.error("Gagal menyimpan menu:", error);
      toast.error("Gagal menyimpan menu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(menu: MenuData) {
    const confirmed = window.confirm(
      `Hapus menu tanggal ${formatTanggal(menu.date)}?`
    );

    if (!confirmed) return;

    try {
      await deleteMenu(menu.id);
      await refresh();

      toast.success("Menu berhasil dihapus");
    } catch (error) {
      console.error("Gagal menghapus menu:", error);
      toast.error("Gagal menghapus menu");
    }
  }

  if (!authed) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* HEADER */}
      <header className="sticky top-0 z-20 border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Admin Menu
            </h1>

            <p className="text-sm text-slate-500">
              SPPG Babayo Love Cecep
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Daftar Menu
            </h2>

            <p className="text-sm text-slate-500">
              Kelola menu makanan berdasarkan tanggal.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Tambah Menu
          </button>
        </div>

        {/* LIST MENU */}
        {menus.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-medium text-slate-700">
              Belum ada menu.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Tambahkan menu pertama untuk ditampilkan di website.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {menus.map((menu) => (
              <div
                key={menu.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row">
                  {/* FOTO */}
                  <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-32 sm:w-48">
                    <img
                      src={menu.photo || DEFAULT_PHOTO}
                      alt="Foto menu"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* INFO */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-blue-600">
                        {formatTanggal(menu.date)}
                      </p>

                      <h3 className="mt-1 text-lg font-bold text-slate-900">
                        Menu Makanan
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-1 text-sm text-slate-600 sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-slate-800">
                          Karbohidrat:
                        </span>{" "}
                        {menu.karbohidrat}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          Lauk Hewani:
                        </span>{" "}
                        {menu.laukHewani}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          Sayur:
                        </span>{" "}
                        {menu.sayur}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          Lauk Nabati:
                        </span>{" "}
                        {menu.laukNabati}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          Buah:
                        </span>{" "}
                        {menu.buah}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {menu.kalori} kkal
                      </span>

                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Protein {menu.protein} g
                      </span>

                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Lemak {menu.lemak} g
                      </span>

                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Karbo {menu.karbohidratGram} g
                      </span>
                    </div>
                  </div>

                  {/* ACTION */}
                  <div className="flex shrink-0 gap-2 sm:flex-col">
                    <button
                      type="button"
                      onClick={() => openEditForm(menu)}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(menu)}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-6 max-w-2xl rounded-2xl bg-white shadow-xl">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {form.id ? "Edit Menu" : "Tambah Menu"}
                </h2>

                <p className="text-sm text-slate-500">
                  Isi informasi menu makanan.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving || uploading}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSave}
              className="space-y-5 p-5"
            >
              {/* TANGGAL */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Tanggal
                </label>

                <input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    updateForm("date", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* FOTO */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Foto Menu
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhoto}
                  disabled={uploading}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />

                {uploading && (
                  <p className="mt-2 text-sm text-blue-600">
                    Mengunggah foto...
                  </p>
                )}

                {form.photo && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                    <img
                      src={form.photo}
                      alt="Preview menu"
                      className="h-48 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* MAKANAN */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Karbohidrat
                  </label>

                  <input
                    type="text"
                    value={form.karbohidrat}
                    onChange={(e) =>
                      updateForm(
                        "karbohidrat",
                        e.target.value
                      )
                    }
                    placeholder="Contoh: Nasi putih"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Lauk Hewani
                  </label>

                  <input
                    type="text"
                    value={form.laukHewani}
                    onChange={(e) =>
                      updateForm(
                        "laukHewani",
                        e.target.value
                      )
                    }
                    placeholder="Contoh: Ayam kecap"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Sayur
                  </label>

                  <input
                    type="text"
                    value={form.sayur}
                    onChange={(e) =>
                      updateForm("sayur", e.target.value)
                    }
                    placeholder="Contoh: Tumis wortel"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Lauk Nabati
                  </label>

                  <input
                    type="text"
                    value={form.laukNabati}
                    onChange={(e) =>
                      updateForm(
                        "laukNabati",
                        e.target.value
                      )
                    }
                    placeholder="Contoh: Tempe goreng"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Buah
                  </label>

                  <input
                    type="text"
                    value={form.buah}
                    onChange={(e) =>
                      updateForm("buah", e.target.value)
                    }
                    placeholder="Contoh: Pisang"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* GIZI */}
              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-800">
                  Informasi Gizi
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Kalori (kkal)
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={form.kalori}
                      onChange={(e) =>
                        updateForm(
                          "kalori",
                          e.target.value
                        )
                      }
                      placeholder="650"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Protein (g)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.protein}
                      onChange={(e) =>
                        updateForm(
                          "protein",
                          e.target.value
                        )
                      }
                      placeholder="28"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Lemak (g)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.lemak}
                      onChange={(e) =>
                        updateForm(
                          "lemak",
                          e.target.value
                        )
                      }
                      placeholder="18"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Karbohidrat (g)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={form.karbohidratGram}
                      onChange={(e) =>
                        updateForm(
                          "karbohidratGram",
                          e.target.value
                        )
                      }
                      placeholder="92"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              {/* BUTTON */}
              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving || uploading}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : form.id
                      ? "Simpan Perubahan"
                      : "Tambah Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}