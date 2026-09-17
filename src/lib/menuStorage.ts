import { MenuData } from "@/types";
import { supabase } from "@/lib/supabase";

export const DEFAULT_PHOTO =
  "https://mgx-backend-cdn.metadl.com/generate/images/1600227/2026-09-17/wtztoeqcak6q/menu-nasi-ayam-sayur-buah.png";

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTanggal(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);

  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fromDatabase(row: any): MenuData {
  return {
    id: String(row.id),
    date: row.date,
    photo: row.photo || DEFAULT_PHOTO,
    karbohidrat: row.karbohidrat || "-",
    laukHewani: row.lauk_hewani || "-",
    sayur: row.sayur || "-",
    laukNabati: row.lauk_nabati || "-",
    buah: row.buah || "-",
    kalori: Number(row.kalori) || 0,
    protein: Number(row.protein) || 0,
    lemak: Number(row.lemak) || 0,
    karbohidratGram: Number(row.karbohidrat_gram) || 0,
  };
}

export async function getMenus(): Promise<MenuData[]> {
  const { data, error } = await supabase
    .from("menus")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Gagal mengambil menu:", error);
    return [];
  }

  return (data || []).map(fromDatabase);
}

export async function addMenu(menu: Omit<MenuData, "id">): Promise<MenuData | null> {
  const { data, error } = await supabase
    .from("menus")
    .insert({
      date: menu.date,
      photo: menu.photo,
      karbohidrat: menu.karbohidrat,
      lauk_hewani: menu.laukHewani,
      sayur: menu.sayur,
      lauk_nabati: menu.laukNabati,
      buah: menu.buah,
      kalori: menu.kalori,
      protein: menu.protein,
      lemak: menu.lemak,
      karbohidrat_gram: menu.karbohidratGram,
    })
    .select()
    .single();

  if (error) {
    console.error("Gagal menambahkan menu:", error);
    throw error;
  }

  return fromDatabase(data);
}

export async function updateMenu(menu: MenuData): Promise<MenuData | null> {
  const { data, error } = await supabase
    .from("menus")
    .update({
      date: menu.date,
      photo: menu.photo,
      karbohidrat: menu.karbohidrat,
      lauk_hewani: menu.laukHewani,
      sayur: menu.sayur,
      lauk_nabati: menu.laukNabati,
      buah: menu.buah,
      kalori: menu.kalori,
      protein: menu.protein,
      lemak: menu.lemak,
      karbohidrat_gram: menu.karbohidratGram,
    })
    .eq("id", menu.id)
    .select()
    .single();

  if (error) {
    console.error("Gagal memperbarui menu:", error);
    throw error;
  }

  return fromDatabase(data);
}

export async function deleteMenu(id: string): Promise<void> {
  const { error } = await supabase
    .from("menus")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Gagal menghapus menu:", error);
    throw error;
  }
}

export function sortByDateDesc(menus: MenuData[]): MenuData[] {
  return [...menus].sort((a, b) => b.date.localeCompare(a.date));
}

export function pickDisplayedMenu(menus: MenuData[]): MenuData | null {
  if (menus.length === 0) return null;

  const todayIso = toIsoDate(new Date());
  const todayMenu = menus.find((m) => m.date === todayIso);

  return todayMenu ?? sortByDateDesc(menus)[0];
}