import { i18n, type LocalizedText } from '../i18n';
import { formatDayOffsetDate } from '../astronomy/ecliptic';

export type ModuleId = 'horizon' | 'equatorial' | 'ecliptic' | 'compare';
export type CoordAccent = 'horizon' | 'equatorial' | 'ecliptic';

export interface SliderSpec {
  id: string;
  label: LocalizedText;
  description: LocalizedText;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
  accent: CoordAccent;
  format?: 'deg' | 'signed-deg' | 'ra-hours' | 'day-of-year';
  /** Enable number input with +/-1 stepper buttons alongside the slider */
  numberInput?: boolean;
  /** Wrap max value (e.g. 360°) to min (0°) for circular coordinates like Azimuth */
  wrapAtMax?: boolean;
  /** Step size for +/- buttons (defaults to 1) */
  buttonStep?: number;
  /** Custom out-of-range validation message */
  rangeErrorMessage?: LocalizedText;
}

export interface DemoStepSpec {
  title: LocalizedText;
  description: LocalizedText;
  values: Record<string, number>;
  holdMs?: number;
  /** Optional multi-point sequence played within this step */
  waypoints?: Array<{
    values: Record<string, number>;
    transitionMs?: number;
    holdMs?: number;
  }>;
  /** Optional smooth continuous sweep within this step (e.g. 1-year animation) */
  sweep?: {
    durationMs: number;
    from: Record<string, number>;
    to: Record<string, number>;
  };
}

export interface QuizQuestion {
  id: string;
  prompt: LocalizedText;
  choices: LocalizedText[];
  correctIndex: number;
  explanation: LocalizedText;
}

export interface ConceptItem {
  term: LocalizedText;
  detail: LocalizedText;
}

export interface ModuleDefinition {
  id: ModuleId;
  order: number;
  accent: CoordAccent | 'multi';
  title: LocalizedText;
  shortTitle: LocalizedText;
  subtitle: LocalizedText;
  summary: LocalizedText;
  isInteractiveReady?: boolean;
  objectives: LocalizedText[];
  concepts: ConceptItem[];
  demoDescription: LocalizedText;
  demoSteps?: DemoStepSpec[];
  sliders: SliderSpec[];
  quiz: QuizQuestion[];
}

export function formatSliderValue(
  value: number,
  spec: Pick<SliderSpec, 'unit' | 'format'>
): string {
  if (spec.format === 'day-of-year') {
    return formatDayOffsetDate(value, i18n.getLocale());
  }
  if (spec.format === 'ra-hours') {
    const totalMinutes = Math.round(value * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (i18n.getLocale() === 'th') {
      return `${hours} ชม. ${String(minutes).padStart(2, '0')} น.`;
    }
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (spec.format === 'signed-deg') {
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${sign}${Math.abs(value).toFixed(1)}${spec.unit}`;
  }
  return `${value.toFixed(1)}${spec.unit}`;
}

export const MODULES: ModuleDefinition[] = [
  {
    id: 'horizon',
    order: 1,
    accent: 'horizon',
    isInteractiveReady: true,
    title: {
      th: 'ระบบพิกัดขอบฟ้า',
      en: 'Horizon Coordinate System',
    },
    shortTitle: {
      th: 'พิกัดขอบฟ้า',
      en: 'Horizon',
    },
    subtitle: {
      th: 'บอกตำแหน่งดาวเทียบกับผู้สังเกตด้วยมุมเงย (Altitude) และมุมทิศ (Azimuth) พร้อมลากดาวบนโดมท้องฟ้าได้จริง',
      en: 'Locate celestial objects relative to the observer using Altitude and Azimuth—drag the star directly on the 3D sky dome.',
    },
    summary: {
      th: 'เรียนรู้แนวเส้นขอบฟ้า จุดเหนือศีรษะ (Zenith) จุดใต้เท้า (Nadir) เส้นเมอริเดียน การวัดมุมทิศจากทิศเหนือตามเข็มนาฬิกา และการวัดมุมเงยจากขอบฟ้าขึ้นไปหาดาว',
      en: 'Explore the local horizon, zenith, nadir, meridian, clockwise azimuth from North, and altitude measured above the horizon.',
    },
    objectives: [
      {
        th: 'ระบุองค์ประกอบสำคัญของระบบพิกัดขอบฟ้า ได้แก่ เส้นขอบฟ้า จุดเหนือศีรษะ จุดใต้เท้า และเส้นเมอริเดียนได้',
        en: 'Identify key elements: local horizon, zenith, nadir, meridian, and cardinal points.',
      },
      {
        th: 'กำหนดและอ่านค่ามุมเงย (0°–90°) มุมทิศ (0°–360°) และระยะเชิงมุมจากจุดเหนือศีรษะ (z = 90° − มุมเงย) ได้',
        en: 'Set and read Altitude (0°–90°), Azimuth (0°–360°), and Zenith distance (z = 90° − Alt).',
      },
      {
        th: 'เชื่อมโยงค่ามุมทิศกับชื่อทิศทั้ง 8 ทิศ และอธิบายความหมายของมุมเงยติดลบได้',
        en: 'Relate azimuth angles to compass directions and explain negative altitudes.',
      },
    ],
    concepts: [
      {
        term: { th: 'มุมเงย (Altitude) และวงกลมเงย', en: 'Altitude & Altitude Circle' },
        detail: {
          th: 'มุมที่วัดจากเส้นขอบฟ้าขึ้นไปในแนวดิ่งถึงดาว (0° ที่ขอบฟ้า, 90° ที่จุดเหนือศีรษะ) ส่วนวงกลมเงยคือวงกลมขนานขอบฟ้าที่ทุกจุดมีมุมเงยเท่ากัน',
          en: 'Angular height above the horizon (0° at horizon, 90° at zenith). The altitude circle connects all sky points of equal altitude.',
        },
      },
      {
        term: { th: 'มุมทิศ (Azimuth)', en: 'Azimuth (Az)' },
        detail: {
          th: 'มุมที่วัดตามแนวขอบฟ้าจากทิศเหนือ (0°) ตามเข็มนาฬิกา: ตะวันออก 90°, ใต้ 180°, ตะวันตก 270° และวนกลับ 360° = 0°',
          en: 'Compass angle measured clockwise from North (0°): East 90°, South 180°, West 270°, wrapping back so 360° = 0°.',
        },
      },
      {
        term: { th: 'จุดเหนือศีรษะ (Zenith) และเส้นเมอริเดียน', en: 'Zenith, Nadir & Meridian' },
        detail: {
          th: 'จุดเหนือศีรษะอยู่ตรงศีรษะ (z = 90° − มุมเงย) จุดใต้เท้าอยู่ตรงข้ามด้านล่าง และเส้นเมอริเดียนลากผ่านทิศเหนือ–Zenith–ทิศใต้–Nadir',
          en: 'Zenith lies directly overhead (z = 90° − Alt), Nadir directly underfoot, and the local meridian connects N–Zenith–S–Nadir.',
        },
      },
    ],
    demoDescription: {
      th: 'ชมตัวอย่างทีละขั้น: ทิศตะวันออกสูง 30° → เหนือศีรษะ → ขอบฟ้าทิศใต้',
      en: 'Watch a 3-step guided tour: East at 30° → Zenith → Southern horizon.',
    },
    demoSteps: [
      {
        title: {
          th: 'ขั้นที่ 1: ดาวอยู่ทิศตะวันออก สูง 30°',
          en: 'Step 1: Star due East at 30° altitude',
        },
        description: {
          th: 'ดาวอยู่ทางทิศตะวันออกพอดี (มุมทิศ 90.0°) และเงยเหนือขอบฟ้า 30.0° ทำให้ระยะจากจุดเหนือศีรษะ z = 60.0°',
          en: 'Located due East (Az = 90.0°) and 30.0° above the horizon, giving a zenith distance z = 60.0°.',
        },
        values: { altitude: 30, azimuth: 90 },
        holdMs: 2600,
      },
      {
        title: {
          th: 'ขั้นที่ 2: ดาวอยู่เหนือศีรษะ (Zenith)',
          en: 'Step 2: Star directly overhead (Zenith)',
        },
        description: {
          th: 'ดาวเคลื่อนขึ้นไปที่จุดเหนือศีรษะพอดี มุมเงยสูงสุด 90.0° และระยะจากจุดเหนือศีรษะ z = 0.0° วงกลมเงยหดเหลือจุดเดียว',
          en: 'At the zenith, Altitude reaches its maximum of 90.0°, zenith distance drops to 0.0°, and the altitude circle shrinks to a point.',
        },
        values: { altitude: 90, azimuth: 90 },
        holdMs: 2600,
      },
      {
        title: {
          th: 'ขั้นที่ 3: ดาวอยู่บนขอบฟ้าทิศใต้',
          en: 'Step 3: Star on the Southern horizon',
        },
        description: {
          th: 'ดาวลงมาแตะเส้นขอบฟ้าทางทิศใต้พอดี (มุมเงย 0.0°, มุมทิศ 180.0°) ระยะจากจุดเหนือศีรษะ z = 90.0°',
          en: 'Sitting right on the Southern horizon (Alt = 0.0°, Az = 180.0°) with a 180° azimuth sweep from North and z = 90.0°.',
        },
        values: { altitude: 0, azimuth: 180 },
        holdMs: 2800,
      },
    ],
    sliders: [
      {
        id: 'altitude',
        label: { th: 'มุมเงย (Altitude)', en: 'Altitude (Alt)' },
        description: {
          th: 'ความสูงเชิงมุมเหนือเส้นขอบฟ้า (0°–90°) หรือลากดาวบนโดมท้องฟ้าได้โดยตรง',
          en: 'Angular height above the horizon (0°–90°), or drag the star directly on the sky dome.',
        },
        min: 0,
        max: 90,
        step: 0.1,
        defaultValue: 45,
        unit: '°',
        accent: 'horizon',
        format: 'deg',
        numberInput: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'มุมเงยต้องอยู่ระหว่าง 0°–90°',
          en: 'Altitude must be between 0°–90°',
        },
      },
      {
        id: 'azimuth',
        label: { th: 'มุมทิศ (Azimuth)', en: 'Azimuth (Az)' },
        description: {
          th: 'วัดจากทิศเหนือ (0°) ตามเข็มนาฬิกา (E = 90°, S = 180°, W = 270°, 360° = 0°)',
          en: 'Clockwise from North (0°): E = 90°, S = 180°, W = 270°, with 360° wrapping to 0°.',
        },
        min: 0,
        max: 360,
        step: 0.1,
        defaultValue: 45,
        unit: '°',
        accent: 'horizon',
        format: 'deg',
        numberInput: true,
        wrapAtMax: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'มุมทิศต้องอยู่ระหว่าง 0°–360°',
          en: 'Azimuth must be between 0°–360°',
        },
      },
    ],
    quiz: [
      {
        id: 'h-q1',
        prompt: {
          th: 'ดาวที่มีมุมเงย (Altitude) เท่ากับ 90° อยู่ที่ตำแหน่งใดบนทรงกลมท้องฟ้า?',
          en: 'Where on the celestial sphere is a star located if its Altitude is 90°?',
        },
        choices: [
          { th: 'บนเส้นขอบฟ้าทางทิศเหนือ', en: 'On the Northern horizon' },
          { th: 'จุดเหนือศีรษะ (Zenith)', en: 'At the Zenith (directly overhead)' },
          { th: 'จุดใต้เท้า (Nadir)', en: 'At the Nadir (directly underfoot)' },
          { th: 'บนเส้นขอบฟ้าทางทิศตะวันออก', en: 'On the Eastern horizon' },
        ],
        correctIndex: 1,
        explanation: {
          th: 'มุมเงยวัดจากเส้นขอบฟ้า (0°) ขึ้นไปตั้งฉากจนถึง 90° ซึ่งคือจุดเหนือศีรษะ (Zenith) ที่อยู่ตรงศีรษะผู้สังเกตพอดี',
          en: 'Altitude increases from 0° at the horizon to a maximum of 90° at the Zenith directly overhead.',
        },
      },
      {
        id: 'h-q2',
        prompt: {
          th: 'ค่ามุมทิศ (Azimuth) 270° ตรงกับทิศใด?',
          en: 'Which cardinal direction corresponds to an Azimuth of 270°?',
        },
        choices: [
          { th: 'ทิศเหนือ (N)', en: 'North (N)' },
          { th: 'ทิศตะวันออก (E)', en: 'East (E)' },
          { th: 'ทิศใต้ (S)', en: 'South (S)' },
          { th: 'ทิศตะวันตก (W)', en: 'West (W)' },
        ],
        correctIndex: 3,
        explanation: {
          th: 'มุมทิศนับจากทิศเหนือ (0°) ตามเข็มนาฬิกา: ตะวันออก 90°, ใต้ 180° และตะวันตก 270°',
          en: 'Azimuth is measured clockwise from North (0°): East is 90°, South is 180°, and West is 270°.',
        },
      },
      {
        id: 'h-q3',
        prompt: {
          th: 'หากดาวดวงหนึ่งมีมุมเงย 25° จะมีระยะเชิงมุมจากจุดเหนือศีรษะ (Zenith distance, z) เท่าไร?',
          en: 'If a star has an Altitude of 25°, what is its Zenith distance (z)?',
        },
        choices: [
          { th: '25°', en: '25°' },
          { th: '55°', en: '55°' },
          { th: '65°', en: '65°' },
          { th: '115°', en: '115°' },
        ],
        correctIndex: 2,
        explanation: {
          th: 'ระยะเชิงมุมจากจุดเหนือศีรษะคำนวณจากสูตร z = 90° − มุมเงย ดังนั้น z = 90° − 25° = 65°',
          en: 'Zenith distance is calculated as z = 90° − Altitude, so z = 90° − 25° = 65°.',
        },
      },
      {
        id: 'h-q4',
        prompt: {
          th: 'ดาวที่มีค่ามุมเงยติดลบ (เช่น −15°) หมายความว่าอย่างไร?',
          en: 'What does a negative Altitude (e.g., −15°) mean for a star?',
        },
        choices: [
          { th: 'ดาวอยู่ทางทิศใต้ของจุดเหนือศีรษะ', en: 'The star is south of the zenith.' },
          { th: 'ดาวอยู่ใต้เส้นขอบฟ้า ยังมองไม่เห็นจากตำแหน่งผู้สังเกต', en: 'The star is below the horizon and not visible to the observer.' },
          { th: 'ดาวอยู่ใกล้ขั้วฟ้าเหนือมาก', en: 'The star is very close to the North Celestial Pole.' },
          { th: 'ดาวกำลังเคลื่อนที่จากทิศตะวันตกไปทิศตะวันออก', en: 'The star is moving from West to East.' },
        ],
        correctIndex: 1,
        explanation: {
          th: 'เส้นขอบฟ้ามีค่ามุมเงย 0° ค่าที่เป็นบวกอยู่เหนือขอบฟ้า (มองเห็นได้) ส่วนค่าที่ติดลบหมายถึงดาวอยู่ใต้เส้นขอบฟ้า จึงมองไม่เห็น',
          en: '0° marks the local horizon; positive values lie above it while negative values mean the star is below the horizon and hidden from view.',
        },
      },
    ],
  },
  {
    id: 'equatorial',
    order: 2,
    accent: 'equatorial',
    isInteractiveReady: true,
    title: {
      th: 'ระบบพิกัดศูนย์สูตรฟ้า',
      en: 'Equatorial Coordinate System',
    },
    shortTitle: {
      th: 'ศูนย์สูตรฟ้า',
      en: 'Equatorial',
    },
    subtitle: {
      th: 'ระบบพิกัดมาตรฐานสากลด้วยไรต์แอสเซนชัน (RA) เดคลิเนชัน (Dec) ละติจูดผู้สังเกต และเวลาดาราคติ (LST)',
      en: 'Universal celestial mapping with Right Ascension (RA), Declination (Dec), observer latitude, and Local Sidereal Time (LST).',
    },
    summary: {
      th: 'ทำความรู้จักขั้วฟ้าเหนือ/ใต้ เส้นศูนย์สูตรฟ้า แกนหมุนฟ้า การบอกตำแหน่งด้วย RA (0h–24h) และ Dec (−90° ถึง +90°) พร้อมจำลองการหมุนของท้องฟ้าตามเวลาดาราคติ',
      en: 'Explore the celestial poles, equator, spin axis, RA (0h–24h), Dec (−90° to +90°), sidereal rotation, and circumpolar stars.',
    },
    objectives: [
      {
        th: 'อธิบายความหมายของขั้วฟ้าเหนือ/ใต้ เส้นศูนย์สูตรฟ้า ไรต์แอสเซนชัน (RA) เดคลิเนชัน (Dec) และมุมชั่วโมง (H) ได้',
        en: 'Explain the celestial poles, equator, Right Ascension (RA), Declination (Dec), and Hour Angle (H).',
      },
      {
        th: 'คำนวณมุมเงยของขั้วฟ้า มุมชั่วโมง (H = LST − RA) และมุมเงยสูงสุดขณะผ่านเมอริเดียน (90° − |ละติจูด − Dec|) ได้',
        en: 'Compute pole altitude, Hour Angle (H = LST − RA), and upper culmination altitude (90° − |lat − Dec|).',
      },
      {
        th: 'จำแนกดาวขึ้น–ตกปกติ ดาวไม่ตก (Circumpolar) และดาวไม่ขึ้น จากค่าละติจูดผู้สังเกตและเดคลิเนชันได้',
        en: 'Classify normal rising/setting, circumpolar, and never-rising stars from latitude and declination.',
      },
    ],
    concepts: [
      {
        term: { th: 'ไรต์แอสเซนชัน (RA) และมุมชั่วโมง (H)', en: 'Right Ascension (RA) & Hour Angle (H)' },
        detail: {
          th: 'RA วัดจากจุดวสันตวิษุวัต (γ) ไปทางตะวันออก 0h–24h (1h = 15°) ส่วนมุมชั่วโมง H = LST − RA บอกว่าดาวผ่านเมอริเดียนไปแล้วกี่ชั่วโมง',
          en: 'RA runs eastward from the Vernal Equinox (0h–24h, 1h = 15°); Hour Angle H = LST − RA tracks time since meridian transit.',
        },
      },
      {
        term: { th: 'เดคลิเนชัน (Dec) และวงกลมเดคลิเนชัน', en: 'Declination (Dec) & Diurnal Circle' },
        detail: {
          th: 'Dec วัดระยะเชิงมุมเหนือ (+) หรือใต้ (−) เส้นศูนย์สูตรฟ้า (−90° ถึง +90°) เมื่อโลกหมุน ดาวจะเคลื่อนที่ตามวงกลมเดคลิเนชันขนานเส้นศูนย์สูตรฟ้า',
          en: 'Dec measures angular distance north (+) or south (−) of the celestial equator; stars travel along their declination circle as Earth spins.',
        },
      },
      {
        term: { th: 'ดาวไม่ตก (Circumpolar) และมุมเงยขั้วฟ้า', en: 'Circumpolar Stars & Pole Altitude' },
        detail: {
          th: 'มุมเงยของขั้วฟ้าเท่ากับละติจูดผู้สังเกต และดาวจะเป็นดาวไม่ตกเมื่อ |Dec| > 90° − |ละติจูด| โดยมีเครื่องหมาย Dec เดียวกับละติจูด',
          en: 'Pole altitude equals observer latitude; a star is circumpolar when |Dec| > 90° − |latitude| with matching hemisphere sign.',
        },
      },
    ],
    demoDescription: {
      th: 'ชมตัวอย่างทีละขั้น: ขั้วโลกเหนือ (90°N) → เส้นศูนย์สูตรโลก (0°) → ดาวไม่ตกที่ประเทศไทย (14°N)',
      en: 'Watch a 3-step tour: North Pole (90°N) → Earth’s Equator (0°) → Circumpolar star in Thailand (14°N).',
    },
    demoSteps: [
      {
        title: {
          th: 'ขั้นที่ 1: ผู้สังเกตอยู่ขั้วโลกเหนือ (90°N)',
          en: 'Step 1: Observer at the North Pole (90°N)',
        },
        description: {
          th: 'เมื่อย้ายไปละติจูด +90.0° ขั้วฟ้าเหนือ (NCP) จะอยู่ตรงจุดเหนือศีรษะพอดี และเส้นศูนย์สูตรฟ้าสีฟ้าจะทับแนวเส้นขอบฟ้าสีเขียวพอดี',
          en: 'At +90.0° latitude, the North Celestial Pole sits directly at the zenith and the blue Celestial Equator coincides with the green horizon.',
        },
        values: { latitude: 90, dec: 0, ra: 6, lst: 6 },
        holdMs: 3000,
      },
      {
        title: {
          th: 'ขั้นที่ 2: ผู้สังเกตอยู่เส้นศูนย์สูตรโลก (0°)',
          en: 'Step 2: Observer at Earth’s Equator (0°)',
        },
        description: {
          th: 'เมื่อย้ายมาละติจูด 0.0° ขั้วฟ้าเหนือ (NCP) และขั้วฟ้าใต้ (SCP) จะวางตัวอยู่บนเส้นขอบฟ้าพอดี ส่วนเส้นศูนย์สูตรฟ้าจะตั้งฉากกับขอบฟ้า',
          en: 'At 0.0° latitude, both celestial poles rest right on the horizon while the Celestial Equator arches perpendicularly overhead.',
        },
        values: { latitude: 0, dec: 20, ra: 6, lst: 4 },
        holdMs: 3000,
      },
      {
        title: {
          th: 'ขั้นที่ 3: ปรับ Dec เป็นดาวไม่ตก (ไทย 14°N)',
          en: 'Step 3: Circumpolar star from Thailand (14°N)',
        },
        description: {
          th: 'ที่ละติจูด +14.0° (ไทย) ดาวไม่ตกต้องมี Dec > 90° − 14° = 76° เมื่อปรับ Dec = +82.0° วงกลมเดคลิเนชันทั้งวงจะลอยเหนือขอบฟ้าไม่ตกลับเลย',
          en: 'From Thailand (+14.0°N), stars with Dec > 90° − 14° = 76° never set. At Dec = +82.0°, the entire declination circle stays above the horizon.',
        },
        values: { latitude: 14, dec: 82, ra: 6, lst: 12 },
        holdMs: 3200,
      },
    ],
    sliders: [
      {
        id: 'ra',
        label: { th: 'ไรต์แอสเซนชัน (RA)', en: 'Right Ascension (RA)' },
        description: {
          th: '0h–24h จากจุดวสันตวิษุวัต (กรอกทศนิยมได้ เช่น 6.5 = 6 ชม. 30 น., 24h = 0h)',
          en: '0h–24h from the Vernal Equinox (accepts decimal hours, e.g. 6.5 = 06h 30m; 24h wraps to 0h).',
        },
        min: 0,
        max: 24,
        step: 0.1,
        defaultValue: 6,
        unit: 'h',
        accent: 'equatorial',
        format: 'ra-hours',
        numberInput: true,
        wrapAtMax: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'ไรต์แอสเซนชัน (RA) ต้องอยู่ระหว่าง 0–24 ชั่วโมง',
          en: 'Right Ascension (RA) must be between 0–24 hours',
        },
      },
      {
        id: 'dec',
        label: { th: 'เดคลิเนชัน (Dec)', en: 'Declination (Dec)' },
        description: {
          th: 'ระยะเชิงมุมเหนือ (+) หรือใต้ (−) เส้นศูนย์สูตรฟ้า (−90° ถึง +90°)',
          en: 'Angular distance north (+) or south (−) of the celestial equator (−90° to +90°).',
        },
        min: -90,
        max: 90,
        step: 0.1,
        defaultValue: 23.5,
        unit: '°',
        accent: 'equatorial',
        format: 'signed-deg',
        numberInput: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'เดคลิเนชัน (Dec) ต้องอยู่ระหว่าง −90° ถึง +90°',
          en: 'Declination (Dec) must be between −90° and +90°',
        },
      },
      {
        id: 'latitude',
        label: { th: 'ละติจูดผู้สังเกต (φ)', en: 'Observer Latitude (φ)' },
        description: {
          th: 'ปรับความเอียงแกนฟ้า (−90° ถึง +90°, ค่าเริ่มต้น +14.0°N ประเทศไทย)',
          en: 'Tilts the celestial pole (−90° to +90°; default +14.0°N for Thailand).',
        },
        min: -90,
        max: 90,
        step: 0.1,
        defaultValue: 14,
        unit: '°',
        accent: 'equatorial',
        format: 'signed-deg',
        numberInput: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'ละติจูดผู้สังเกตต้องอยู่ระหว่าง −90° ถึง +90°',
          en: 'Observer latitude must be between −90° and +90°',
        },
      },
      {
        id: 'lst',
        label: { th: 'เวลาดาราคติท้องถิ่น (LST)', en: 'Local Sidereal Time (LST)' },
        description: {
          th: 'เวลาดาราคติ 0h–24h กำหนดแนว RA ที่กำลังผ่านเมอริเดียน (24h = 0h)',
          en: 'Local Sidereal Time 0h–24h sets which RA currently transits the meridian (24h = 0h).',
        },
        min: 0,
        max: 24,
        step: 0.1,
        defaultValue: 8,
        unit: 'h',
        accent: 'equatorial',
        format: 'ra-hours',
        numberInput: true,
        wrapAtMax: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'เวลาดาราคติท้องถิ่น (LST) ต้องอยู่ระหว่าง 0–24 ชั่วโมง',
          en: 'Local Sidereal Time (LST) must be between 0–24 hours',
        },
      },
    ],
    quiz: [
      {
        id: 'eq-q1',
        prompt: {
          th: 'ค่าไรต์แอสเซนชัน (RA) 1 ชั่วโมง เทียบเท่ากับมุมกี่องศาบนเส้นศูนย์สูตรฟ้า?',
          en: 'One hour of Right Ascension (RA) corresponds to how many degrees along the celestial equator?',
        },
        choices: [
          { th: '1°', en: '1°' },
          { th: '15°', en: '15°' },
          { th: '23.5°', en: '23.5°' },
          { th: '30°', en: '30°' },
        ],
        correctIndex: 1,
        explanation: {
          th: 'ทรงกลมท้องฟ้าครบ 1 รอบเท่ากับ 360° แบ่งเป็น 24 ชั่วโมง ดังนั้น 1 ชั่วโมงจึงเท่ากับ 360° ÷ 24 = 15°',
          en: 'A full 360° circle divided into 24 hours equals 15° per hour of Right Ascension.',
        },
      },
      {
        id: 'eq-q2',
        prompt: {
          th: 'ผู้สังเกตในประเทศไทยที่ละติจูด 14°N จะมองเห็นขั้วฟ้าเหนือ (NCP) อยู่สูงเหนือขอบฟ้าทิศเหนือกี่องศา?',
          en: 'For an observer in Thailand at latitude 14°N, what is the altitude of the North Celestial Pole (NCP)?',
        },
        choices: [
          { th: '14°', en: '14°' },
          { th: '23.5°', en: '23.5°' },
          { th: '76°', en: '76°' },
          { th: '90°', en: '90°' },
        ],
        correctIndex: 0,
        explanation: {
          th: 'มุมเงยของขั้วฟ้ามีค่าเท่ากับละติจูดของผู้สังเกตเสมอ ดังนั้นที่ละติจูด 14°N ขั้วฟ้าเหนือจึงมีมุมเงย 14° เหนือขอบฟ้าทิศเหนือ',
          en: 'The altitude of the celestial pole always equals the observer’s latitude—14° above the Northern horizon at 14°N.',
        },
      },
      {
        id: 'eq-q3',
        prompt: {
          th: 'ผู้สังเกตที่ละติจูด 14°N สังเกตดาวที่มี Dec = +34° ดาวดวงนี้จะมีมุมเงยสูงสุดขณะผ่านเส้นเมอริเดียนกี่องศา?',
          en: 'From latitude 14°N, what is the maximum meridian altitude of a star with Declination Dec = +34°?',
        },
        choices: [
          { th: '42°', en: '42°' },
          { th: '56°', en: '56°' },
          { th: '70°', en: '70°' },
          { th: '76°', en: '76°' },
        ],
        correctIndex: 2,
        explanation: {
          th: 'จากสูตรมุมเงยสูงสุดขณะผ่านเมอริเดียน = 90° − |ละติจูด − Dec| = 90° − |14° − 34°| = 90° − 20° = 70°',
          en: 'Using max altitude = 90° − |latitude − Dec| = 90° − |14° − 34°| = 90° − 20° = 70°.',
        },
      },
      {
        id: 'eq-q4',
        prompt: {
          th: 'ผู้สังเกตที่ละติจูด 14°N จะเห็นดาวที่มีค่าเดคลิเนชัน (Dec) เท่าใดเป็น "ดาวไม่ตก" (Circumpolar)?',
          en: 'For an observer at latitude 14°N, a star with which Declination (Dec) is circumpolar (never sets)?',
        },
        choices: [
          { th: 'Dec = +20°', en: 'Dec = +20°' },
          { th: 'Dec = +60°', en: 'Dec = +60°' },
          { th: 'Dec = +80°', en: 'Dec = +80°' },
          { th: 'Dec = −80°', en: 'Dec = −80°' },
        ],
        correctIndex: 2,
        explanation: {
          th: 'เงื่อนไขดาวไม่ตกคือ |Dec| > 90° − |ละติจูด| และมีเครื่องหมายเดียวกับละติจูด ที่ 14°N ต้องมี Dec > 90° − 14° = +76° ดังนั้น Dec = +80° จึงเป็นดาวไม่ตก (ส่วน −80° เป็นดาวไม่ขึ้น)',
          en: 'A star is circumpolar when |Dec| > 90° − |latitude| in the same hemisphere. At 14°N, Dec must exceed +76°, so +80° never sets (while −80° never rises).',
        },
      },
    ],
  },
  {
    id: 'ecliptic',
    order: 3,
    accent: 'ecliptic',
    isInteractiveReady: true,
    title: {
      th: 'ระบบพิกัดสุริยะวิถี',
      en: 'Ecliptic Coordinate System',
    },
    shortTitle: {
      th: 'พิกัดสุริยะวิถี',
      en: 'Ecliptic',
    },
    subtitle: {
      th: 'อ้างอิงระนาบสุริยะวิถีที่เอียง ε (23.5°) เทียบกับเส้นศูนย์สูตรฟ้า เชื่อมโยงตำแหน่งดวงอาทิตย์ ฤดูกาล และพิกัดศูนย์สูตรฟ้า (RA/Dec)',
      en: 'Anchored to the ecliptic plane inclined by ε (23.5°), linking solar motion, seasons, and Equatorial coordinates (RA/Dec).',
    },
    summary: {
      th: 'ศึกษาระนาบสุริยะวิถี ขั้วสุริยะวิถี จุดวิษุวัตและจุดอายันทั้ง 4 จุดในรอบปี ปรับค่าความเอียงแกน ε ทดลอง และดูการแปลง (λ, β) เป็น (RA, Dec) พร้อมกราฟเดคลิเนชันของดวงอาทิตย์ตลอดปี',
      en: 'Explore the ecliptic plane, ecliptic poles, 4 equinox/solstice milestones, dynamic obliquity ε, (λ, β) → (RA, Dec) conversion, and an annual solar declination chart.',
    },
    objectives: [
      {
        th: 'ระบุตำแหน่งเส้นสุริยะวิถี ขั้วสุริยะวิถี จุดวิษุวัต (0°, 180°) และจุดอายัน (90°, 270°) บนทรงกลมท้องฟ้าได้',
        en: 'Locate the ecliptic, ecliptic poles, equinoxes (0°, 180°), and solstices (90°, 270°) on the celestial sphere.',
      },
      {
        th: 'แปลงพิกัดสุริยะวิถี (λ, β) เป็นพิกัดศูนย์สูตรฟ้า (RA, Dec) และคำนวณมุมเงยดวงอาทิตย์ตอนเที่ยงวันได้',
        en: 'Convert Ecliptic (λ, β) to Equatorial (RA, Dec) and calculate noon Sun altitude.',
      },
      {
        th: 'อธิบายผลของความเอียงแกนโลก ε ที่มีต่อการแกว่งของ Dec ดวงอาทิตย์และการเกิดฤดูกาลได้',
        en: 'Explain how Earth’s axial obliquity ε drives annual solar declination oscillation and seasons.',
      },
    ],
    concepts: [
      {
        term: { th: 'เส้นสุริยะวิถี และความเอียง ε (23.5°)', en: 'The Ecliptic & Obliquity ε (23.5°)' },
        detail: {
          th: 'เส้นทางปรากฏของดวงอาทิตย์ในรอบ 1 ปี เอียงทำมุม ε ≈ 23.5° กับเส้นศูนย์สูตรฟ้า ตัดกันที่จุดวสันตวิษุวัต (λ = 0°) และศารทวิษุวัต (λ = 180°)',
          en: 'The Sun’s apparent annual path, tilted ε ≈ 23.5° to the celestial equator and intersecting it at the Vernal (0°) and Autumnal (180°) equinoxes.',
        },
      },
      {
        term: { th: 'ลองจิจูด (λ) และละติจูดสุริยะวิถี (β)', en: 'Ecliptic Longitude (λ) & Latitude (β)' },
        detail: {
          th: 'λ วัดจากจุดวสันตวิษุวัตไปทางตะวันออก 0°–360° (ดวงอาทิตย์เคลื่อน ~0.9856°/วัน) ส่วน β วัดตั้งฉากจากระนาบสุริยะวิถี ดวงอาทิตย์มี β = 0° เสมอ',
          en: 'λ runs eastward 0°–360° from the Vernal Equinox (~0.9856°/day for the Sun); β measures angle off the ecliptic (β = 0° always for the Sun).',
        },
      },
      {
        term: { th: 'ขั้วสุริยะวิถี และฤดูกาล', en: 'Ecliptic Poles & Seasons' },
        detail: {
          th: 'ขั้วสุริยะวิถีเหนือ (NEP) เอียงแยกจากขั้วฟ้าเหนือ (NCP) เป็นมุม ε ตลอดปี Dec ของดวงอาทิตย์แกว่งระหว่าง +ε ถึง −ε ทำให้เกิดฤดูกาลและมุมเงยเที่ยงวันเปลี่ยนไป',
          en: 'The North Ecliptic Pole is offset by ε from NCP; solar Declination oscillates between +ε and −ε each year, creating seasons and shifting noon altitude.',
        },
      },
    ],
    demoDescription: {
      th: 'ชมตัวอย่างทีละขั้น: ผ่าน 4 จุดสำคัญ → เล่นครบ 1 ปี (กราฟ Dec แกว่ง ±ε) → ตั้ง ε = 0° (ไม่มีฤดู)',
      en: 'Watch a 3-step tour: 4 seasonal points → Full 1-year orbit → Zero obliquity (ε = 0°, no seasons).',
    },
    demoSteps: [
      {
        title: {
          th: 'ขั้นที่ 1: พาดวงอาทิตย์ผ่าน 4 จุดสำคัญ',
          en: 'Step 1: Sun visits all 4 equinox & solstice points',
        },
        description: {
          th: 'ชมดวงอาทิตย์เคลื่อนผ่าน วสันตวิษุวัต (0°, 21 มี.ค.) → ครีษมายัน (90°, 21 มิ.ย.) → ศารทวิษุวัต (180°, 23 ก.ย.) → เหมายัน (270°, 22 ธ.ค.) สังเกตค่า RA และ Dec เปลี่ยนตาม',
          en: 'Watch the Sun visit Vernal Equinox (0°), Summer Solstice (90°), Autumnal Equinox (180°), and Winter Solstice (270°) while RA and Dec update live.',
        },
        values: { eclipticLon: 90, eclipticLat: 0, obliquity: 23.5, dayOfYear: 91, latitude: 14 },
        waypoints: [
          { values: { eclipticLon: 0, eclipticLat: 0, obliquity: 23.5, dayOfYear: 0 }, transitionMs: 700, holdMs: 1300 },
          { values: { eclipticLon: 90, eclipticLat: 0, obliquity: 23.5, dayOfYear: 91 }, transitionMs: 900, holdMs: 1300 },
          { values: { eclipticLon: 180, eclipticLat: 0, obliquity: 23.5, dayOfYear: 183 }, transitionMs: 900, holdMs: 1300 },
          { values: { eclipticLon: 270, eclipticLat: 0, obliquity: 23.5, dayOfYear: 274 }, transitionMs: 900, holdMs: 1400 },
        ],
      },
      {
        title: {
          th: 'ขั้นที่ 2: เล่นอนิเมชันครบ 1 ปี (Dec แกว่ง ±ε)',
          en: 'Step 2: Full 1-year orbit (Dec oscillates ±ε)',
        },
        description: {
          th: 'สังเกตดวงอาทิตย์โคจรครบรอบ 360° ใน 1 ปี และจุดบนกราฟเดคลิเนชันที่แกว่งเป็นคลื่นไซน์ระหว่าง +23.5° และ −23.5°',
          en: 'Watch the Sun complete a full 360° annual orbit while the declination graph traces a sine wave between +23.5° and −23.5°.',
        },
        values: { eclipticLon: 0, eclipticLat: 0, obliquity: 23.5, dayOfYear: 0 },
        sweep: {
          durationMs: 4800,
          from: { eclipticLon: 0, eclipticLat: 0, obliquity: 23.5, dayOfYear: 0 },
          to: { eclipticLon: 359.9, eclipticLat: 0, obliquity: 23.5, dayOfYear: 365 },
        },
        holdMs: 900,
      },
      {
        title: {
          th: 'ขั้นที่ 3: ตั้ง ε = 0° (ไม่มีฤดูกาล)',
          en: 'Step 3: Set ε = 0° (ecliptic matches equator)',
        },
        description: {
          th: 'เมื่อตั้งความเอียงแกน ε = 0.0° เส้นสุริยะวิถีสีเหลืองจะทับเส้นศูนย์สูตรฟ้าสีฟ้าพอดี ขั้วทั้งสองซ้อนทับกัน และ Dec ของดวงอาทิตย์เป็น 0.0° ตลอดทั้งปี ไม่มีฤดูกาล',
          en: 'At ε = 0.0°, the yellow ecliptic merges onto the blue celestial equator, both poles coincide, and solar Dec stays at 0.0° all year with no seasons.',
        },
        values: { eclipticLon: 90, eclipticLat: 0, obliquity: 0, dayOfYear: 91 },
        holdMs: 3200,
      },
    ],
    sliders: [
      {
        id: 'eclipticLon',
        label: { th: 'ลองจิจูดสุริยะวิถี (λ)', en: 'Ecliptic Longitude (λ)' },
        description: {
          th: '0° วสันตวิษุวัต • 90° ครีษมายัน • 180° ศารทวิษุวัต • 270° เหมายัน (360° = 0°)',
          en: '0° Vernal Equinox • 90° Summer Solstice • 180° Autumnal Equinox • 270° Winter Solstice (360° = 0°).',
        },
        min: 0,
        max: 360,
        step: 0.1,
        defaultValue: 90,
        unit: '°',
        accent: 'ecliptic',
        format: 'deg',
        numberInput: true,
        wrapAtMax: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'ลองจิจูดสุริยะวิถี (λ) ต้องอยู่ระหว่าง 0°–360°',
          en: 'Ecliptic longitude (λ) must be between 0°–360°',
        },
      },
      {
        id: 'eclipticLat',
        label: { th: 'ละติจูดสุริยะวิถี (β)', en: 'Ecliptic Latitude (β)' },
        description: {
          th: 'ดวงอาทิตย์มี β = 0.0° เสมอ • ปรับค่านี้หรือลากวัตถุออกนอกเส้นเพื่อทดลองดาว/ดาวเคราะห์',
          en: 'The Sun always has β = 0.0° • Adjust or drag off the ecliptic to test stars or planets.',
        },
        min: -90,
        max: 90,
        step: 0.1,
        defaultValue: 0,
        unit: '°',
        accent: 'ecliptic',
        format: 'signed-deg',
        numberInput: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'ละติจูดสุริยะวิถี (β) ต้องอยู่ระหว่าง −90° ถึง +90°',
          en: 'Ecliptic latitude (β) must be between −90° and +90°',
        },
      },
      {
        id: 'obliquity',
        label: { th: 'ความเอียงแกนโลก (ε)', en: 'Axial Obliquity (ε)' },
        description: {
          th: 'มุมระหว่างเส้นสุริยะวิถีกับเส้นศูนย์สูตรฟ้า (ค่าจริงของโลก ≈ 23.5°, ทดลองปรับ 0°–90° ได้)',
          en: 'Angle between the ecliptic and celestial equator (Earth ≈ 23.5°; experiment from 0° to 90°).',
        },
        min: 0,
        max: 90,
        step: 0.1,
        defaultValue: 23.5,
        unit: '°',
        accent: 'ecliptic',
        format: 'deg',
        numberInput: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'ความเอียงแกน (ε) ต้องอยู่ระหว่าง 0°–90°',
          en: 'Obliquity (ε) must be between 0°–90°',
        },
      },
      {
        id: 'dayOfYear',
        label: { th: 'วันที่ในรอบปี (นับจาก 21 มี.ค.)', en: 'Date of Year (from Mar 21)' },
        description: {
          th: 'ผูกกับ λ ของดวงอาทิตย์โดยประมาณ λ ≈ 0.9856°/วัน (0 = 21 มี.ค. → 365 = 21 มี.ค.)',
          en: 'Linked to solar longitude at ~0.9856°/day starting from March 21.',
        },
        min: 0,
        max: 365,
        step: 1,
        defaultValue: 91,
        unit: 'd',
        accent: 'ecliptic',
        format: 'day-of-year',
      },
      {
        id: 'latitude',
        label: { th: 'ละติจูดผู้สังเกต (φ)', en: 'Observer Latitude (φ)' },
        description: {
          th: 'ใช้คำนวณมุมเงยดวงอาทิตย์ตอนเที่ยงวัน (ค่าเริ่มต้น +14.0°N ประเทศไทย)',
          en: 'Used to compute noon Sun altitude (default +14.0°N for Thailand).',
        },
        min: -90,
        max: 90,
        step: 0.1,
        defaultValue: 14,
        unit: '°',
        accent: 'ecliptic',
        format: 'signed-deg',
        numberInput: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'ละติจูดผู้สังเกตต้องอยู่ระหว่าง −90° ถึง +90°',
          en: 'Observer latitude must be between −90° and +90°',
        },
      },
    ],
    quiz: [
      {
        id: 'ec-q1',
        prompt: {
          th: 'ระนาบสุริยะวิถีเอียงทำมุม ε กับระนาบศูนย์สูตรฟ้าประมาณกี่องศา?',
          en: 'Approximately what angle ε separates the Ecliptic plane from the Celestial Equator?',
        },
        choices: [
          { th: '14.0°', en: '14.0°' },
          { th: '23.5°', en: '23.5°' },
          { th: '45.0°', en: '45.0°' },
          { th: '66.5°', en: '66.5°' },
        ],
        correctIndex: 1,
        explanation: {
          th: 'แกนหมุนโลกเอียงประมาณ 23.5° ทำให้เส้นสุริยะวิถีทำมุม ε ≈ 23.5° กับเส้นศูนย์สูตรฟ้า และเดคลิเนชันของดวงอาทิตย์แกว่งระหว่าง +23.5° ถึง −23.5°',
          en: 'Earth’s 23.5° axial tilt inclines the ecliptic by ε ≈ 23.5° to the celestial equator, causing solar Declination to swing between +23.5° and −23.5°.',
        },
      },
      {
        id: 'ec-q2',
        prompt: {
          th: 'ในวันครีษมายัน (~21 มิ.ย.) ดวงอาทิตย์อยู่ที่ λ = 90°, β = 0° จะมีค่าพิกัดศูนย์สูตรฟ้า (RA, Dec) เท่าใด?',
          en: 'On the Summer Solstice (~Jun 21) at λ = 90°, β = 0°, what are the Sun’s Equatorial coordinates (RA, Dec)?',
        },
        choices: [
          { th: 'RA = 0 ชม. 00 น., Dec = 0.0°', en: 'RA = 00h 00m, Dec = 0.0°' },
          { th: 'RA = 6 ชม. 00 น., Dec = +23.5°', en: 'RA = 06h 00m, Dec = +23.5°' },
          { th: 'RA = 12 ชม. 00 น., Dec = 0.0°', en: 'RA = 12h 00m, Dec = 0.0°' },
          { th: 'RA = 18 ชม. 00 น., Dec = −23.5°', en: 'RA = 18h 00m, Dec = −23.5°' },
        ],
        correctIndex: 1,
        explanation: {
          th: 'แทนค่า λ = 90°, β = 0°, ε = 23.5° จะได้ sin δ = sin 23.5° → Dec = +23.5° และ α = 90° = 6 ชม. 00 น.',
          en: 'Substituting λ = 90°, β = 0°, ε = 23.5° yields sin δ = sin 23.5° (Dec = +23.5°) and RA = 90° / 15 = 06h 00m.',
        },
      },
      {
        id: 'ec-q3',
        prompt: {
          th: 'ดวงอาทิตย์มีค่าละติจูดสุริยะวิถี (β) เท่าใดตลอดทั้งปี?',
          en: 'What is the Sun’s Ecliptic Latitude (β) throughout the year?',
        },
        choices: [
          { th: '0° เสมอ', en: 'Always 0°' },
          { th: '+23.5° เสมอ', en: 'Always +23.5°' },
          { th: 'แกว่งระหว่าง −23.5° ถึง +23.5°', en: 'Oscillates between −23.5° and +23.5°' },
          { th: '+66.5° เสมอ', en: 'Always +66.5°' },
        ],
        correctIndex: 0,
        explanation: {
          th: 'เส้นสุริยะวิถีนิยามจากระนาบวงโคจรปรากฏของดวงอาทิตย์ ดังนั้นดวงอาทิตย์จึงอยู่บนเส้นสุริยะวิถี (β = 0°) ตลอดทั้งปี',
          en: 'Because the ecliptic is defined by the Sun’s apparent orbital path, the Sun always lies at β = 0°.',
        },
      },
      {
        id: 'ec-q4',
        prompt: {
          th: 'ผู้สังเกตในประเทศไทย (ละติจูด 14°N) ในวันเหมายัน (~22 ธ.ค., Dec ดวงอาทิตย์ = −23.5°) จะเห็นดวงอาทิตย์ตอนเที่ยงวันมีมุมเงยเท่าใด?',
          en: 'For an observer in Thailand (14°N) on the Winter Solstice (~Dec 22, Solar Dec = −23.5°), what is the noon Sun altitude?',
        },
        choices: [
          { th: '52.5°', en: '52.5°' },
          { th: '66.5°', en: '66.5°' },
          { th: '76.0°', en: '76.0°' },
          { th: '80.5°', en: '80.5°' },
        ],
        correctIndex: 0,
        explanation: {
          th: 'จากสูตรมุมเงยตอนเที่ยงวัน = 90° − |ละติจูด − Dec| = 90° − |14° − (−23.5°)| = 90° − 37.5° = 52.5°',
          en: 'Using noon altitude = 90° − |latitude − Dec| = 90° − |14° − (−23.5°)| = 90° − 37.5° = 52.5°.',
        },
      },
    ],
  },
  {
    id: 'compare',
    order: 4,
    accent: 'multi',
    isInteractiveReady: true,
    title: {
      th: 'เปรียบเทียบสามระบบพิกัด',
      en: 'Compare Three Coordinate Systems',
    },
    shortTitle: {
      th: 'เปรียบเทียบ 3 ระบบ',
      en: 'Compare 3 Systems',
    },
    subtitle: {
      th: 'ซ้อนทับขอบฟ้า (เขียว) ศูนย์สูตรฟ้า (ฟ้า) และสุริยะวิถี (เหลือง) บนทรงกลมเดียว กำหนดดาวจากระบบใดก็ได้แล้วแปลงอีก 2 ระบบให้อัตโนมัติ',
      en: 'Overlay Horizon (green), Equatorial (blue), and Ecliptic (yellow) on one 3D sphere—enter coordinates in any system and convert all three live.',
    },
    summary: {
      th: 'เปรียบเทียบพิกัดทั้ง 3 ระบบของดาวดวงเดียวกันพร้อมกัน ทดลองเลือกดาวสำเร็จรูป (Polaris, Sirius, Betelgeuse, Antares, Vega, ดวงอาทิตย์) เล่นเวลาดาราคติ และย้ายละติจูดเพื่อสังเกตว่าระบบใดคงที่และระบบใดเปลี่ยนแปลง',
      en: 'Compare all three coordinate systems simultaneously for any star or preset (Sun, Polaris, Sirius, Betelgeuse, Antares, Vega), play sidereal time, and see which values stay fixed vs dynamic.',
    },
    objectives: [
      {
        th: 'แยกแยะเรขาคณิตและส่วนโค้งพิกัดของระบบขอบฟ้า ศูนย์สูตรฟ้า และสุริยะวิถีบนทรงกลมท้องฟ้าเดียวกันได้',
        en: 'Distinguish the geometry and coordinate arcs of Horizon, Equatorial, and Ecliptic frames on a single sphere.',
      },
      {
        th: 'แปลงพิกัดของดาวข้ามไปมาระหว่างทั้ง 3 ระบบด้วยสมการทรงกลม และเปรียบเทียบผลลัพธ์จากดาวตัวอย่างได้',
        en: 'Convert star coordinates across all three systems using exact spherical trigonometry.',
      },
      {
        th: 'อธิบายได้ชัดเจนว่าเหตุใดพิกัดขอบฟ้า (a, A) เปลี่ยนตามเวลาและสถานที่ ขณะที่ (RA, Dec) และ (λ, β) คงที่',
        en: 'Explain why Horizon coordinates (a, A) depend on time and location while (RA, Dec) and (λ, β) remain fixed.',
      },
    ],
    concepts: [
      {
        term: { th: 'พิกัดขอบฟ้า (สีเขียว) — เปลี่ยนตามเวลา/สถานที่', en: 'Horizon (Green) — Dynamic by Time & Place' },
        detail: {
          th: 'ค่ามุมเงย a และมุมทิศ A เปลี่ยนทุกนาทีเมื่อเวลาดาราคติ (LST) เดินหน้า และเปลี่ยนทันทีเมื่อผู้สังเกตย้ายละติจูด φ',
          en: 'Altitude (a) and Azimuth (A) change continuously with Local Sidereal Time (LST) and immediately when observer latitude changes.',
        },
      },
      {
        term: { th: 'ศูนย์สูตรฟ้า (สีฟ้า) — คงที่บนแผนที่ดาวสากล', en: 'Equatorial (Blue) — Fixed Star Catalog Frame' },
        detail: {
          th: 'ค่า RA (α) และ Dec (δ) ของดาวฤกษ์คงเดิมไม่ขึ้นกับเวลาและตำแหน่งผู้สังเกต เชื่อมต่อกับขอบฟ้าผ่านมุมชั่วโมง H = LST − α',
          en: 'RA (α) and Dec (δ) stay constant regardless of observer time or location, linking to Horizon via Hour Angle H = LST − α.',
        },
      },
      {
        term: { th: 'สุริยะวิถี (สีเหลือง) — คงที่ตามระนาบวงโคจร', en: 'Ecliptic (Yellow) — Fixed Orbital Frame' },
        detail: {
          th: 'ค่า λ และ β คงที่ตามระนาบวงโคจรโลก (เอียง ε ≈ 23.44° จากศูนย์สูตรฟ้า) เหมาะสำหรับดวงอาทิตย์ ดวงจันทร์ และดาวเคราะห์',
          en: 'λ and β stay anchored to Earth’s orbital plane (inclined ε ≈ 23.44° to the celestial equator), ideal for Solar System bodies.',
        },
      },
    ],
    demoDescription: {
      th: 'ชมตัวอย่าง 3 ขั้น: กำหนดดาวด้วยขอบฟ้า → เล่นเวลา LST ไปข้างหน้า → ย้ายละติจูดผู้สังเกต',
      en: 'Watch a 3-step demo: Set star by Horizon → Advance Sidereal Time → Move observer latitude.',
    },
    demoSteps: [
      {
        title: {
          th: 'ขั้นที่ 1: กำหนดดาวด้วยขอบฟ้า (a = 45°, A = 120°)',
          en: 'Step 1: Define star via Horizon (a = 45°, A = 120°)',
        },
        description: {
          th: 'เมื่อกำหนดดาวจากระบบขอบฟ้าที่มุมเงย 45.0° มุมทิศ 120.0° (ที่ไทย 14°N, LST 8h) ระบบจะแปลงเป็น RA/Dec (สีฟ้า) และ λ/β (สีเหลือง) บนทรงกลมและในตารางให้ทันที',
          en: 'Setting a = 45.0° and A = 120.0° (from 14°N at LST 8h) automatically solves Equatorial (RA/Dec) and Ecliptic (λ/β) in the 3D scene and summary table.',
        },
        values: {
          sourceSystem: 0, // 0 = horizon
          altitude: 45,
          azimuth: 120,
          latitude: 14,
          lst: 8,
          obliquity: 23.44,
        },
        holdMs: 3000,
      },
      {
        title: {
          th: 'ขั้นที่ 2: เล่นเวลาไปข้างหน้า (LST เดิน 8h → 14h)',
          en: 'Step 2: Advance Sidereal Time (LST 8h → 14h)',
        },
        description: {
          th: 'สังเกตในตารางสรุปสดขณะที่เวลาดาราคติเดินไปข้างหน้า: มีเฉพาะ "มุมเงย a และมุมทิศ A" (สีเขียว) เท่านั้นที่เปลี่ยนแปลง ส่วน RA/Dec และ λ/β คงเดิมตลอด!',
          en: 'Watch the live summary table as LST advances: ONLY green Horizon (a, A) values change, while blue Equatorial and yellow Ecliptic coordinates stay completely constant!',
        },
        values: { lst: 8 },
        sweep: {
          durationMs: 4200,
          from: { lst: 8 },
          to: { lst: 14 },
        },
        holdMs: 1200,
      },
      {
        title: {
          th: 'ขั้นที่ 3: ย้ายผู้สังเกตไปละติจูดอื่น (14°N → 55°N)',
          en: 'Step 3: Move observer latitude (14°N → 55°N)',
        },
        description: {
          th: 'เมื่อย้ายผู้สังเกตขึ้นเหนือจาก +14.0° ไป +55.0° มุมเงยและมุมทิศของดาวเปลี่ยนไปชัดเจน แต่พิกัดศูนย์สูตรฟ้า (RA/Dec) และสุริยะวิถี (λ/β) ยังคงเท่าเดิมทุกประการ',
          en: 'Moving north from +14.0° to +55.0° dramatically changes Altitude and Azimuth, yet RA/Dec and λ/β remain completely unchanged.',
        },
        values: { latitude: 55 },
        holdMs: 3200,
      },
    ],
    sliders: [
      {
        id: 'latitude',
        label: { th: 'ละติจูดผู้สังเกต (φ)', en: 'Observer Latitude (φ)' },
        description: {
          th: '−90° ถึง +90° (ค่าเริ่มต้น +14.0°N ประเทศไทย)',
          en: '−90° to +90° (default +14.0°N for Thailand)',
        },
        min: -90,
        max: 90,
        step: 0.1,
        defaultValue: 14,
        unit: '°',
        accent: 'horizon',
        format: 'signed-deg',
        numberInput: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'ละติจูดผู้สังเกต (φ) ต้องอยู่ระหว่าง −90° ถึง +90°',
          en: 'Observer latitude (φ) must be between −90° and +90°',
        },
      },
      {
        id: 'lst',
        label: { th: 'เวลาดาราคติท้องถิ่น (LST)', en: 'Local Sidereal Time (LST)' },
        description: {
          th: '0h–24h กำหนดการหมุนของทรงกลมท้องฟ้า (24h = 0h)',
          en: '0h–24h controls sidereal rotation of the sky (24h = 0h)',
        },
        min: 0,
        max: 24,
        step: 0.1,
        defaultValue: 8,
        unit: 'h',
        accent: 'equatorial',
        format: 'ra-hours',
        numberInput: true,
        wrapAtMax: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'เวลาดาราคติ (LST) ต้องอยู่ระหว่าง 0–24 ชั่วโมง',
          en: 'Local Sidereal Time (LST) must be between 0–24 hours',
        },
      },
      {
        id: 'obliquity',
        label: { th: 'ความเอียงแกนโลก (ε)', en: 'Axial Obliquity (ε)' },
        description: {
          th: 'มุมระหว่างระนาบศูนย์สูตรฟ้ากับสุริยะวิถี (ค่ามาตรฐาน 23.44°)',
          en: 'Angle between Celestial Equator and Ecliptic (standard 23.44°)',
        },
        min: 0,
        max: 90,
        step: 0.01,
        defaultValue: 23.44,
        unit: '°',
        accent: 'ecliptic',
        format: 'deg',
        numberInput: true,
        buttonStep: 1,
        rangeErrorMessage: {
          th: 'ความเอียงแกน (ε) ต้องอยู่ระหว่าง 0°–90°',
          en: 'Obliquity (ε) must be between 0°–90°',
        },
      },
    ],
    quiz: [
      {
        id: 'cmp-q1',
        prompt: {
          th: 'เมื่อเวลาดาราคติท้องถิ่น (LST) เดินไปข้างหน้า ค่าพิกัดของดาวฤกษ์ในระบบใดที่เปลี่ยนแปลงตลอดเวลา?',
          en: 'As Local Sidereal Time (LST) advances, which coordinate system’s values continuously change for a star?',
        },
        choices: [
          { th: 'ระบบพิกัดขอบฟ้า (มุมเงย a และมุมทิศ A)', en: 'Horizon Coordinate System (Altitude a & Azimuth A)' },
          { th: 'ระบบพิกัดศูนย์สูตรฟ้า (RA และ Dec)', en: 'Equatorial Coordinate System (RA & Dec)' },
          { th: 'ระบบพิกัดสุริยะวิถี (λ และ β)', en: 'Ecliptic Coordinate System (λ & β)' },
          { th: 'ทั้ง 3 ระบบเปลี่ยนพร้อมกันทั้งหมด', en: 'All three systems change together' },
        ],
        correctIndex: 0,
        explanation: {
          th: 'การหมุนของโลกทำให้มุมชั่วโมง H = LST − α เปลี่ยน จึงมีเฉพาะพิกัดขอบฟ้า (a, A) ที่เปลี่ยนตลอดคืน ส่วน RA/Dec และ λ/β คงที่',
          en: 'Earth’s rotation changes Hour Angle H = LST − α, so only Horizon (a, A) changes while Equatorial (RA, Dec) and Ecliptic (λ, β) stay constant.',
        },
      },
      {
        id: 'cmp-q2',
        prompt: {
          th: 'หากผู้สังเกตย้ายจากประเทศไทย (14°N) ไปยังประเทศญี่ปุ่น (35°N) ค่าพิกัดใดของดาว Sirius ที่ยังคงเท่าเดิมไม่เปลี่ยนแปลง?',
          en: 'If an observer travels from Thailand (14°N) to Japan (35°N), which coordinates of Sirius remain unchanged?',
        },
        choices: [
          { th: 'เฉพาะมุมเงย a และมุมทิศ A', en: 'Only Altitude (a) and Azimuth (A)' },
          { th: 'เฉพาะมุมทิศ A เท่านั้น', en: 'Only Azimuth (A)' },
          { th: 'พิกัดศูนย์สูตรฟ้า (RA, Dec) และพิกัดสุริยะวิถี (λ, β)', en: 'Equatorial (RA, Dec) and Ecliptic (λ, β) coordinates' },
          { th: 'ไม่มีค่าใดคงเดิม ทุกค่าเปลี่ยนหมด', en: 'None—all coordinates change' },
        ],
        correctIndex: 2,
        explanation: {
          th: 'RA/Dec ผูกติดกับทรงกลมท้องฟ้าและ λ/β ผูกติดกับระนาบวงโคจร จึงไม่ขึ้นกับละติจูดผู้สังเกต มีเพียงพิกัดขอบฟ้า (a, A) เท่านั้นที่เปลี่ยน',
          en: 'RA/Dec and λ/β are celestial/orbital frames independent of observer latitude; only local Horizon (a, A) changes.',
        },
      },
      {
        id: 'cmp-q3',
        prompt: {
          th: 'ระบบพิกัดใดที่ใช้ "จุดวสันตวิษุวัต" (Vernal Equinox) เป็นจุดเริ่มต้นของการวัดมุม (0h / 0°) เหมือนกัน?',
          en: 'Which two coordinate systems share the Vernal Equinox as their 0h / 0° origin?',
        },
        choices: [
          { th: 'ระบบขอบฟ้า และ ระบบศูนย์สูตรฟ้า', en: 'Horizon and Equatorial' },
          { th: 'ระบบศูนย์สูตรฟ้า และ ระบบสุริยะวิถี', en: 'Equatorial and Ecliptic' },
          { th: 'ระบบขอบฟ้า และ ระบบสุริยะวิถี', en: 'Horizon and Ecliptic' },
          { th: 'ทั้ง 3 ระบบเริ่มนับจากทิศเหนือเหมือนกัน', en: 'All three start at due North' },
        ],
        correctIndex: 1,
        explanation: {
          th: 'ทั้ง RA = 0h (ศูนย์สูตรฟ้า) และ λ = 0° (สุริยะวิถี) เริ่มนับที่จุดวสันตวิษุวัต ซึ่งเป็นจุดตัดของระนาบทั้งสองที่เอียงทำมุม ε ≈ 23.44°',
          en: 'Both RA = 0h and λ = 0° begin at the Vernal Equinox where the Equatorial and Ecliptic planes intersect at ε ≈ 23.44°.',
        },
      },
      {
        id: 'cmp-q4',
        prompt: {
          th: 'ดาวเหนือ (Polaris: RA 2h 31m, Dec +89° 16′) เมื่อมองจากประเทศไทย (ละติจูด 14°N) ตลอดทั้งคืนจะมีลักษณะอย่างไร?',
          en: 'How does Polaris (RA 2h 31m, Dec +89° 16′) appear throughout the night from Thailand (14°N)?',
        },
        choices: [
          { th: 'ขึ้นทางทิศตะวันออกและตกทางทิศตะวันตกทุกคืน', en: 'Rises in the East and sets in the West every night' },
          { th: 'อยู่ใกล้ทิศเหนือที่มุมเงยประมาณ 14° ตลอดคืน ไม่ตกลับขอบฟ้า', en: 'Stays near due North at ~14° altitude all night and never sets' },
          { th: 'อยู่ใต้เส้นขอบฟ้า มองไม่เห็นจากประเทศไทย', en: 'Stays below the horizon and is never visible from Thailand' },
          { th: 'ผ่านจุดเหนือศีรษะ (Zenith) ของประเทศไทยตอนเที่ยงคืน', en: 'Passes directly through Thailand’s zenith at midnight' },
        ],
        correctIndex: 1,
        explanation: {
          th: 'Polaris มี Dec +89° 16′ อยู่ใกล้ขั้วฟ้าเหนือ (Dec +90°) มาก ซึ่งที่ละติจูด 14°N ขั้วฟ้าเหนืออยู่สูงเหนือขอบฟ้าทิศเหนือ 14° ดาวจึงวนเป็นวงเล็กๆ ไม่ตกเลยตลอดคืน',
          en: 'At Dec +89° 16′, Polaris sits right next to the North Celestial Pole (altitude = 14° due North from 14°N), circling tightly and never setting.',
        },
      },
    ],
  },
];

export function getModuleById(id: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.id === id);
}
