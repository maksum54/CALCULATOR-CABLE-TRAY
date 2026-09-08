// Penempatan tag kabel di pita label atas gambar penampang.
//
// Tag digambar diputar 90 derajat, jadi lebar horizontalnya adalah tinggi hurufnya. Kabel
// yang bertumpuk antar lapis punya x yang sama persis, sehingga tag-nya tercetak tepat di
// atas tag kabel di bawahnya dan keduanya jadi tidak terbaca. Fungsi di sini menggeser
// titik jangkar tag secukupnya supaya tidak ada yang bersentuhan, lalu tiap penggambar
// (2D di layar, SVG, DXF) menarik garis penunjuk dari kabel ke jangkar barunya.
//
// Satu hitungan, banyak tampilan: ketiga penggambar memakai fungsi ini supaya posisi tag
// pada layar, PDF dan DXF identik.

export interface LabelLayoutOptions {
  /** Jarak minimum antar jangkar (mm) - setara tinggi huruf plus sela. */
  pitchMm: number;
  /** Batas kiri dan kanan area gambar (mm). */
  minX: number;
  maxX: number;
}

/**
 * Kembalikan posisi x jangkar tiap tag, urutannya sama dengan `xs`.
 *
 * Kalau jumlah tag melebihi kapasitas lebar yang tersedia, jarak dipadatkan merata: lebih
 * baik rapat teratur daripada sebagian bertumpuk penuh.
 */
export function layoutLabelAnchors(xs: number[], o: LabelLayoutOptions): number[] {
  const n = xs.length;
  if (n === 0) return [];

  const span = o.maxX - o.minX;
  const pitch = n > 1 ? Math.min(o.pitchMm, span / (n - 1)) : o.pitchMm;

  const order = xs.map((x, i) => ({ x, i })).sort((a, b) => a.x - b.x || a.i - b.i);
  const pos = order.map((e) => e.x);

  // Maju: dorong ke kanan sampai tiap tag berjarak minimal satu pitch dari tetangga kiri.
  for (let k = 0; k < n; k++) {
    const floor = k === 0 ? o.minX : pos[k - 1] + pitch;
    if (pos[k] < floor) pos[k] = floor;
  }
  // Mundur: tarik kembali ke kiri kalau dorongan tadi melewati batas kanan.
  for (let k = n - 1; k >= 0; k--) {
    const ceil = k === n - 1 ? o.maxX : pos[k + 1] - pitch;
    if (pos[k] > ceil) pos[k] = ceil;
  }

  const out = new Array<number>(n);
  order.forEach((e, k) => {
    out[e.i] = pos[k];
  });
  return out;
}

/** Tinggi huruf tag pada gambar penampang (mm) - dipakai 2D, SVG dan DXF. */
export const LABEL_FONT_MM = 5.2;
/** Jarak minimum antar jangkar tag (mm). */
export const LABEL_PITCH_MM = 6;
