import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Apple, Drumstick, Leaf, MapPin, Phone, Sprout, Wheat } from "lucide-react";
import { MenuData } from "@/types";
import { LogoMark } from "@/pages/LogoMark";
import { formatTanggal, getMenus, pickDisplayedMenu, sortByDateDesc, toIsoDate } from "@/lib/menuStorage";

const KOMPONEN_ITEMS = [
  { key: "karbohidrat", label: "Karbohidrat", icon: Wheat, cls: "bg-blue-100 text-blue-700", span: "" },
  { key: "laukHewani", label: "Lauk Hewani", icon: Drumstick, cls: "bg-orange-100 text-orange-700", span: "" },
  { key: "sayur", label: "Sayur", icon: Leaf, cls: "bg-green-100 text-green-700", span: "" },
  { key: "laukNabati", label: "Lauk Nabati", icon: Sprout, cls: "bg-amber-100 text-amber-700", span: "" },
  { key: "buah", label: "Buah", icon: Apple, cls: "bg-teal-100 text-teal-700", span: "col-span-2" },
] as const;

const GIZI_ITEMS = [
  { key: "kalori", label: "Kalori", satuan: "kkal", highlight: true },
  { key: "protein", label: "Protein", satuan: "g", highlight: false },
  { key: "lemak", label: "Lemak", satuan: "g", highlight: false },
  { key: "karbohidratGram", label: "Karbo", satuan: "g", highlight: false },
] as const;

const HARI_SINGKAT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Nama hari singkat dari tanggal ISO, mis. "2026-09-17" -> "Rab". */
function hariSingkat(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return HARI_SINGKAT[new Date(y, m - 1, d).getDay()];
}

/** Angka tanggal dari tanggal ISO, mis. "2026-09-17" -> 17. */
function tanggalAngka(iso: string): number {
  return Number(iso.split("-")[2]);
}

/** Tanggal pendek Indonesia, mis. "2026-09-17" -> "17 Sep". */
function formatShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Rentang Senin s.d. Minggu pada pekan berjalan (zona waktu lokal). */
function weekRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

function KomponenSection({ menu }: { menu: MenuData }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
      {KOMPONEN_ITEMS.map(({ key, label, icon: Icon, cls, span }) => (
        <div key={key} className={`flex items-center gap-2 ${span}`}>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cls}`}>
            <Icon size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase leading-none tracking-wide text-slate-400">{label}</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold leading-tight text-slate-800">{menu[key]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Panel kandungan gizi berwarna biru tua sesuai referensi. */
function GiziSection({ menu }: { menu: MenuData }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-800 to-blue-950 p-4 text-white shadow-md shadow-blue-900/20">
      <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-blue-600/25" />
      <div className="absolute -bottom-12 -left-6 h-24 w-24 rounded-full bg-blue-500/15" />
      <div className="relative">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[13px] font-bold uppercase tracking-wider text-blue-100">Kandungan Gizi</h3>
          <span className="text-[10px] font-medium text-blue-300">per porsi</span>
        </div>
        <div className="grid grid-cols-4 divide-x divide-white/20">
          {GIZI_ITEMS.map(({ key, label, satuan, highlight }) => (
            <div key={key} className="px-1 text-center">
              <p className={`text-lg font-bold leading-none tabular-nums ${highlight ? "text-amber-300" : "text-white"}`}>
                {menu[key]}
                <span className="ml-0.5 text-[10px] font-medium text-blue-200">{satuan}</span>
              </p>
              <p className="mt-1 text-[10px] font-medium text-blue-200">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Index() {
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);

useEffect(() => {
  getMenus().then((data) => {
    setMenus(sortByDateDesc(data));
  });
}, []);

  const todayIso = toIsoDate(new Date());
  const { start, end } = useMemo(() => weekRange(), []);

  const menu = useMemo(() => {
    if (selectedDate) {
      const found = menus.find((m) => m.date === selectedDate);
      if (found) return found;
    }
    return pickDisplayedMenu(menus);
  }, [menus, selectedDate]);

  const weekMenus = useMemo(() => {
    const inWeek = menus
      .filter((m) => m.date >= start && m.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (inWeek.length > 0) return { items: inWeek, isWeek: true as const };
    return { items: sortByDateDesc(menus).slice(0, 7), isWeek: false as const };
  }, [menus, start, end]);

  const isToday = menu?.date === todayIso;

  /** Pilih tanggal dari daftar mingguan, lalu arahkan tampilan ke kartu menu. */
  const pilihTanggal = (date: string) => {
    setSelectedDate(date);
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-blue-50">
      {/* Header identitas: dominan biru tua */}
      <header className="relative overflow-hidden bg-blue-900 text-white">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-blue-800/70" />
        <div className="absolute -left-10 top-8 h-28 w-28 rounded-full bg-blue-700/40" />
        <div className="relative mx-auto flex max-w-xl items-center gap-3 px-4 pb-10 pt-4">
          <LogoMark variant="blue" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight tracking-tight">SPPG Babayo Love Cecep</h1>
            <p className="text-xs text-blue-200">Satuan Pelayanan Pemenuhan Gizi</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 space-y-3.5 px-3 pb-6">
        {!menu ? (
          <div className="-mt-8 rounded-2xl bg-white p-8 text-center shadow-md shadow-blue-900/10">
            <p className="font-semibold text-slate-800">Menu belum tersedia</p>
            <p className="mt-1 text-sm text-slate-500">Silakan cek kembali beberapa saat lagi.</p>
          </div>
        ) : (
          <>
            {/* Kartu menu utama: foto sebagai fokus */}
            <section
              ref={cardRef}
              className="relative -mt-8 overflow-hidden rounded-2xl bg-white shadow-md shadow-blue-900/10"
            >
              <div className="relative">
                <img
  src={menu.photo}
  alt={`Menu makan SPPG: ${menu.karbohidrat}, ${menu.laukHewani}, ${menu.sayur}, ${menu.laukNabati}, dan ${menu.buah}`}
  className="aspect-[16/10] w-full object-contain object-center"
/>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-3 pt-9">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      isToday ? "bg-amber-400 text-blue-950" : "bg-white/20 text-white backdrop-blur-sm"
                    }`}
                  >
                    {isToday ? "Menu Hari Ini" : "Menu Terbaru"}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 p-4">
                <div>
                  <h2 className="text-lg font-bold leading-snug tracking-tight text-slate-900">
                    {menu.karbohidrat} + {menu.laukHewani}
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-blue-700">{formatTanggal(menu.date)}</p>
                </div>

                <div>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Komponen Makanan
                  </h3>
                  <KomponenSection menu={menu} />
                </div>
              </div>
            </section>

            {/* Panel kandungan gizi: biru tua */}
            <GiziSection menu={menu} />
          </>
        )}

        {/* Menu minggu ini */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Menu Minggu Ini</h3>
            <span className="text-[10px] font-medium text-slate-400">
              {weekMenus.isWeek ? `${formatShort(start)} – ${formatShort(end)}` : "Terbaru"}
            </span>
          </div>

          {weekMenus.items.length === 0 ? (
            <p className="py-2 text-center text-xs text-slate-400">Belum ada menu lain.</p>
          ) : (
            <div className="space-y-1.5">
              {weekMenus.items.map((m) => {
                const aktif = m.date === todayIso;
                const ditampilkan = m.date === menu?.date;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => pilihTanggal(m.date)}
                    className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors ${
                      ditampilkan ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-11 shrink-0 flex-col items-center justify-center rounded-lg ${
                        aktif ? "bg-amber-400 text-blue-950" : "bg-blue-900/5 text-blue-900"
                      }`}
                    >
                      <span className="text-[9px] font-bold uppercase leading-none opacity-75">
                        {hariSingkat(m.date)}
                      </span>
                      <span className="mt-0.5 text-base font-bold leading-none tabular-nums">
                        {tanggalAngka(m.date)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {m.karbohidrat} + {m.laukHewani}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {m.sayur}, {m.buah}
                      </span>
                    </span>
                    {aktif && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        Hari ini
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Informasi SPPG */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Informasi SPPG</h3>
          <p className="text-sm font-bold text-blue-900">SPPG Babayo Love Cecep</p>
          <div className="mt-2.5 space-y-2 text-sm">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
              <p className="text-slate-600">Jl. Poros Babayo No. 12, Kec. Babayo, Kab. Pohuwato, Gorontalo</p>
            </div>
            <div className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
              <p className="text-slate-600">
                0821-1234-5678 <span className="text-xs">(WhatsApp)</span>
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-blue-950 text-blue-200">
        <div className="mx-auto max-w-xl px-4 py-5 text-center">
          <p className="text-xs">
            &copy; 2026 SPPG Babayo Love Cecep &mdash; Melayani gizi terbaik untuk anak Indonesia
          </p>
          <Link
            to="/admin"
            className="mt-1.5 inline-block text-xs font-semibold text-amber-300 underline-offset-2 hover:underline"
          >
            Login Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}
