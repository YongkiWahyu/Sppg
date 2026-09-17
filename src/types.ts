/** Data satu menu makan untuk satu tanggal. */
export interface MenuData {
  id: string;
  /** Format YYYY-MM-DD */
  date: string;
  /** URL foto (bisa URL publik atau data URL hasil unggahan admin). */
  photo: string;
  /** Komponen makanan */
  karbohidrat: string;
  laukHewani: string;
  sayur: string;
  laukNabati: string;
  buah: string;
  /** Informasi gizi */
  kalori: number;
  protein: number;
  lemak: number;
  karbohidratGram: number;
}
