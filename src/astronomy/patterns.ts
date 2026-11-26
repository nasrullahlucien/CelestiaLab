import type { LocalizedText } from '../i18n';

export type ConstellationId = 'none' | 'bigDipper' | 'orion' | 'crux';

export interface CatalogStar {
  id: string;
  name: LocalizedText;
  raHours: number;
  decDeg: number;
  /** Optional relative visual size (1 = standard, 1.35 = bright anchor like Polaris/Rigel) */
  size?: number;
}

export interface ConstellationPattern {
  id: Exclude<ConstellationId, 'none'>;
  name: LocalizedText;
  shortName: LocalizedText;
  hint: LocalizedText;
  stars: CatalogStar[];
  /** Pairs of star indices connected by solid constellation lines */
  edges: Array<[number, number]>;
  /** Optional dashed guide lines (e.g. Merak -> Dubhe -> Polaris pointer) */
  pointerEdges?: Array<[number, number]>;
}

export interface WorldCity {
  id: string;
  name: LocalizedText;
  latDeg: number; // +N, -S
  lonDeg: number; // +E, -W (for map pin placement)
}

export const WORLD_CITIES: WorldCity[] = [
  { id: 'bangkok', name: { th: 'กรุงเทพฯ', en: 'Bangkok' }, latDeg: 13.8, lonDeg: 100.5 },
  { id: 'chiangmai', name: { th: 'เชียงใหม่', en: 'Chiang Mai' }, latDeg: 18.8, lonDeg: 99.0 },
  { id: 'singapore', name: { th: 'สิงคโปร์ (ใกล้ศูนย์สูตร)', en: 'Singapore' }, latDeg: 1.3, lonDeg: 103.8 },
  { id: 'tokyo', name: { th: 'โตเกียว', en: 'Tokyo' }, latDeg: 35.7, lonDeg: 139.7 },
  { id: 'london', name: { th: 'ลอนดอน', en: 'London' }, latDeg: 51.5, lonDeg: -0.1 },
  { id: 'sydney', name: { th: 'ซิดนีย์', en: 'Sydney' }, latDeg: -33.9, lonDeg: 151.2 },
  { id: 'northpole', name: { th: 'ขั้วโลกเหนือ', en: 'North Pole' }, latDeg: 90.0, lonDeg: 0.0 },
];

export const CONSTELLATIONS: Record<
  Exclude<ConstellationId, 'none'>,
  ConstellationPattern
> = {
  bigDipper: {
    id: 'bigDipper',
    name: { th: 'กระบวยใหญ่ + ดาวเหนือ', en: 'Big Dipper + Polaris' },
    shortName: { th: 'กระบวยใหญ่', en: 'Big Dipper' },
    hint: {
      th: 'ดาว Merak → Dubhe ชี้ตรงไปยังดาวเหนือ (Polaris) ที่ใกล้ขั้วฟ้าเหนือ',
      en: 'Pointer stars Merak → Dubhe point directly toward Polaris near the NCP.',
    },
    stars: [
      { id: 'alkaid', name: { th: 'Alkaid', en: 'Alkaid' }, raHours: 13.79, decDeg: 49.31 },
      { id: 'mizar', name: { th: 'Mizar', en: 'Mizar' }, raHours: 13.40, decDeg: 54.93 },
      { id: 'alioth', name: { th: 'Alioth', en: 'Alioth' }, raHours: 12.90, decDeg: 55.96 },
      { id: 'megrez', name: { th: 'Megrez', en: 'Megrez' }, raHours: 12.26, decDeg: 57.03 },
      { id: 'phecda', name: { th: 'Phecda', en: 'Phecda' }, raHours: 11.90, decDeg: 53.69 },
      { id: 'merak', name: { th: 'Merak', en: 'Merak' }, raHours: 11.03, decDeg: 56.38, size: 1.2 },
      { id: 'dubhe', name: { th: 'Dubhe', en: 'Dubhe' }, raHours: 11.06, decDeg: 61.75, size: 1.25 },
      { id: 'polaris', name: { th: 'Polaris (ดาวเหนือ)', en: 'Polaris' }, raHours: 2.53, decDeg: 89.26, size: 1.4 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 3],
    ],
    pointerEdges: [[6, 7]],
  },
  orion: {
    id: 'orion',
    name: { th: 'กลุ่มดาวนายพราน (Orion)', en: 'Orion' },
    shortName: { th: 'นายพราน', en: 'Orion' },
    hint: {
      th: 'เข็มขัดนายพรานพาดทับเส้นศูนย์สูตรฟ้า จึงขึ้นใกล้ทิศตะวันออกและตกใกล้ทิศตะวันตกพอดี',
      en: 'Orion’s Belt straddles the Celestial Equator, rising due East and setting due West.',
    },
    stars: [
      { id: 'betelgeuse', name: { th: 'Betelgeuse', en: 'Betelgeuse' }, raHours: 5.92, decDeg: 7.41, size: 1.35 },
      { id: 'bellatrix', name: { th: 'Bellatrix', en: 'Bellatrix' }, raHours: 5.42, decDeg: 6.35, size: 1.1 },
      { id: 'mintaka', name: { th: 'Mintaka', en: 'Mintaka' }, raHours: 5.53, decDeg: -0.30, size: 1.1 },
      { id: 'alnilam', name: { th: 'Alnilam', en: 'Alnilam' }, raHours: 5.60, decDeg: -1.20, size: 1.15 },
      { id: 'alnitak', name: { th: 'Alnitak', en: 'Alnitak' }, raHours: 5.68, decDeg: -1.94, size: 1.1 },
      { id: 'rigel', name: { th: 'Rigel', en: 'Rigel' }, raHours: 5.24, decDeg: -8.20, size: 1.35 },
      { id: 'saiph', name: { th: 'Saiph', en: 'Saiph' }, raHours: 5.80, decDeg: -9.67, size: 1.05 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [2, 5],
      [4, 6],
      [5, 6],
    ],
  },
  crux: {
    id: 'crux',
    name: { th: 'กางเขนใต้ (Crux)', en: 'Southern Cross (Crux)' },
    shortName: { th: 'กางเขนใต้', en: 'Crux' },
    hint: {
      th: 'ที่ไทย (14°N) เห็นโผล่ต่ำทางทิศใต้ • ที่ลอนดอน (51°N) ไม่ขึ้นเลย • ที่ซิดนีย์ (34°S) เป็นดาวไม่ตก',
      en: 'Peeks low in the South from Thailand (14°N), never rises in London (51°N), and is circumpolar in Sydney (34°S).',
    },
    stars: [
      { id: 'gacrux', name: { th: 'Gacrux', en: 'Gacrux' }, raHours: 12.52, decDeg: -57.11, size: 1.2 },
      { id: 'acrux', name: { th: 'Acrux', en: 'Acrux' }, raHours: 12.44, decDeg: -63.10, size: 1.35 },
      { id: 'mimosa', name: { th: 'Mimosa', en: 'Mimosa' }, raHours: 12.80, decDeg: -59.69, size: 1.25 },
      { id: 'imai', name: { th: 'Imai', en: 'Imai' }, raHours: 12.25, decDeg: -58.75, size: 1.0 },
    ],
    edges: [
      [0, 1],
      [2, 3],
    ],
  },
};
