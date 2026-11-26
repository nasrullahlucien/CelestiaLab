export interface TranslationDict {
  appName: string;
  appTagline: string;
  subjectBadge: string;
  skipToContent: string;
  nav: {
    ariaLabel: string;
    home: string;
    horizon: string;
    equatorial: string;
    ecliptic: string;
    compare: string;
    menuOpen: string;
    menuClose: string;
  };
  theme: {
    groupLabel: string;
    auto: string;
    light: string;
    dark: string;
    currentlyLight: string;
    currentlyDark: string;
  };
  lang: {
    toggleLabel: string;
    current: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    ctaStart: string;
    ctaCompare: string;
    modulesHeading: string;
    modulesIntro: string;
    openModule: string;
    questionsCount: string;
    summaryHeading: string;
    summaryCaption: string;
    tableHeaders: {
      system: string;
      plane: string;
      coordinates: string;
      reference: string;
    };
    previewNote: string;
  };
  module: {
    breadcrumbHome: string;
    phaseNotice: string;
    learningObjectives: string;
    keyConcepts: string;
    controlsTitle: string;
    controlsReset: string;
    sceneTitle: string;
    sceneHint: string;
    horizonSceneHint: string;
    equatorialSceneHint: string;
    eclipticSceneHint: string;
    cameraReset: string;
    sphereGridToggle: string;
    hideUndersideToggle: string;
    hideAllHelpers: string;
    showAllHelpers: string;
    prevModule: string;
    nextModule: string;
    backHome: string;
    layersLabel: string;
    helpersLabel: string;
    liveReadoutTitle: string;
    equatorialReadoutTitle: string;
    eclipticReadoutTitle: string;
    altitudeLabel: string;
    azimuthLabel: string;
    zenithDistanceLabel: string;
    zenithFormula: string;
    compassDirectionLabel: string;
    hourAngleLabel: string;
    hourAngleFormula: string;
    poleAltitudeLabel: string;
    poleNorthHint: string;
    poleSouthHint: string;
    poleEquatorHint: string;
    liveAltAzLabel: string;
    aboveHorizonTag: string;
    belowHorizonTag: string;
    maxMeridianAltLabel: string;
    maxMeridianFormula: string;
    visibilityStatusLabel: string;
    statusCircumpolar: string;
    statusNeverRises: string;
    statusRisesSets: string;
    eclipticConvertedLabel: string;
    eclipticSunModeTag: string;
    eclipticTestObjTag: string;
    snapToSunBtn: string;
    solarDecLabel: string;
    seasonLabel: string;
    noonSunAltLabel: string;
    noonSunFormula: string;
    solarDecChartTitle: string;
    siderealPlayback: {
      play: string;
      pause: string;
      speedLabel: string;
    };
    horizonHelpers: {
      meridian: string;
      altitudeCircle: string;
      altitudeArc: string;
      azimuthArc: string;
      zenithNadir: string;
    };
    equatorialHelpers: {
      celestialEquator: string;
      polarAxis: string;
      horizonMeridian: string;
      decCircle: string;
      raDecArcs: string;
    };
    eclipticHelpers: {
      eclipticRing: string;
      celestialEquator: string;
      polesAxes: string;
      seasonalPoints: string;
      coordArcs: string;
    };
    compareUi: {
      sourceTabsHeading: string;
      sourceTabsHint: string;
      sharedParamsHeading: string;
      presetHeading: string;
      summaryTableHeading: string;
      summaryTableCaption: string;
      colSystem: string;
      colPrimary: string;
      colSecondary: string;
      colBehavior: string;
      behaviorDynamic: string;
      behaviorFixedEq: string;
      behaviorFixedEc: string;
      focusLabel: string;
      focusAll: string;
      focusHorizon: string;
      focusEquatorial: string;
      focusEcliptic: string;
      compareSceneHint: string;
      dragHint: string;
    };
    earthMap: {
      title: string;
      hint: string;
    };
    rotatingSky: {
      explorerToggle: string;
      viewSingle: string;
      viewDual: string;
      spaceViewCaption: string;
      horizonViewCaption: string;
      trailsLabel: string;
      trailNone: string;
      trailShort: string;
      trailLong: string;
      constellationLabel: string;
      constellationNone: string;
      zoneCapsToggle: string;
      addRandomStars: string;
      clearRandomStars: string;
      randomStarCount: string;
    };
    sunMotions: {
      viewEcliptic: string;
      viewSunPath: string;
      cardTitle: string;
      calendarLabel: string;
      clockLabel: string;
      quickSunrise: string;
      quickNoon: string;
      quickSunset: string;
      quickMidnight: string;
      animPlay: string;
      animPause: string;
      animContinuous: string;
      animStepByDay: string;
      analemmaToggle: string;
      monthLabelsToggle: string;
      shadowToggle: string;
      sunAltAzLabel: string;
      dayLengthLabel: string;
      sunriseSunsetLabel: string;
      eotLabel: string;
      zeroShadowBadge: string;
      midnightSunTag: string;
      polarNightTag: string;
      sunPathHint: string;
    };
    inputValidation: {
      invalidRestored: string;
      wrapped360: string;
      wrapped24h: string;
      clampedSuffix: string;
      decreaseByOne: string;
      increaseByOne: string;
      numberInputLabel: string;
    };
  };
  tryIt: {
    play: string;
    stop: string;
    playingStatus: string;
    readyStatus: string;
    stepBadge: string;
  };
  quiz: {
    heading: string;
    subheading: string;
    questionOf: string;
    correct: string;
    incorrect: string;
    explanationLabel: string;
    nextQuestion: string;
    finishQuiz: string;
    scoreHeading: string;
    scoreSummary: string;
    retry: string;
    answeredCount: string;
  };
  systems: {
    horizon: {
      name: string;
      shortName: string;
      colorLabel: string;
      plane: string;
      coordinates: string;
      reference: string;
    };
    equatorial: {
      name: string;
      shortName: string;
      colorLabel: string;
      plane: string;
      coordinates: string;
      reference: string;
    };
    ecliptic: {
      name: string;
      shortName: string;
      colorLabel: string;
      plane: string;
      coordinates: string;
      reference: string;
    };
    compare: {
      name: string;
      shortName: string;
      colorLabel: string;
    };
  };
  footer: {
    credit: string;
    note: string;
  };
}

export const th: TranslationDict = {
  appName: 'CelestiaLab',
  appTagline: 'ห้องปฏิบัติการทรงกลมท้องฟ้า 3 มิติ',
  subjectBadge: 'โลก ดาราศาสตร์ และอวกาศ ม.6',
  skipToContent: 'ข้ามไปยังเนื้อหาหลัก',
  nav: {
    ariaLabel: 'เมนูหลัก',
    home: 'หน้าหลัก',
    horizon: '1. พิกัดขอบฟ้า',
    equatorial: '2. พิกัดศูนย์สูตรฟ้า',
    ecliptic: '3. พิกัดสุริยะวิถี',
    compare: '4. เปรียบเทียบ 3 ระบบ',
    menuOpen: 'เปิดเมนูนำทาง',
    menuClose: 'ปิดเมนูนำทาง',
  },
  theme: {
    groupLabel: 'เลือกโหมดสีหน้าจอ',
    auto: 'อัตโนมัติ',
    light: 'สว่าง',
    dark: 'มืด',
    currentlyLight: 'ขณะนี้สว่าง',
    currentlyDark: 'ขณะนี้มืด',
  },
  lang: {
    toggleLabel: 'สลับภาษาเป็นภาษาอังกฤษ',
    current: 'TH',
  },
  home: {
    heroTitle: 'สำรวจทรงกลมท้องฟ้า และระบบพิกัดทางดาราศาสตร์แบบ 3 มิติ',
    heroSubtitle:
      'สื่อการเรียนรู้เชิงโต้ตอบสำหรับนักเรียนชั้นมัธยมศึกษาปีที่ 6 เปรียบเทียบระบบพิกัดขอบฟ้า ศูนย์สูตรฟ้า และสุริยะวิถีด้วยมุมมอง 3 มิติที่หมุนสำรวจได้จริง',
    ctaStart: 'เริ่มเรียนโมดูลที่ 1',
    ctaCompare: 'เปรียบเทียบทั้ง 3 ระบบ',
    modulesHeading: 'บทเรียนทั้ง 4 โมดูล',
    modulesIntro:
      'เลือกโมดูลที่ต้องการศึกษา แต่ละบทมาพร้อมฉาก 3 มิติ แผงควบคุมแบบสัมผัส ปุ่มลองทำดู และแบบทดสอบเฉลยทันที',
    openModule: 'เข้าสู่บทเรียน',
    questionsCount: 'ข้อทดสอบ',
    summaryHeading: 'ตารางสรุปเปรียบเทียบ 3 ระบบพิกัด',
    summaryCaption:
      'ตารางเปรียบเทียบระนาบอ้างอิง พิกัดหลัก และจุดอ้างอิงของระบบพิกัดขอบฟ้า ศูนย์สูตรฟ้า และสุริยะวิถี',
    tableHeaders: {
      system: 'ระบบพิกัด',
      plane: 'ระนาบอ้างอิง',
      coordinates: 'พิกัดหลัก',
      reference: 'จุด / แนวอ้างอิง',
    },
    previewNote: 'ลากหรือใช้นิ้วหมุนทรงกลมท้องฟ้า 3 มิติเพื่อดูความสัมพันธ์ของทั้ง 3 ระนาบ',
  },
  module: {
    breadcrumbHome: 'หน้าหลัก',
    phaseNotice:
      'โหมดโครงสร้างต้นแบบ: แสดงเรขาคณิตอ้างอิงและการโต้ตอบเบื้องต้น (พร้อมเชื่อมต่อสมการดาราศาสตร์เชิงฟิสิกส์ในขั้นถัดไป)',
    learningObjectives: 'จุดประสงค์การเรียนรู้',
    keyConcepts: 'แนวคิดสำคัญของโมดูลนี้',
    controlsTitle: 'แผงควบคุมพารามิเตอร์',
    controlsReset: 'รีเซ็ตค่าเริ่มต้น',
    sceneTitle: 'ฉากทรงกลมท้องฟ้า 3 มิติ',
    sceneHint: 'ลากเพื่อหมุนมุมมอง • เลื่อนหรือจีบนิ้วเพื่อซูม',
    horizonSceneHint: 'ลากดาวบนโดมเพื่อย้ายตำแหน่ง • ลากพื้นที่ว่างเพื่อหมุนมุมมอง • จีบนิ้วเพื่อซูม',
    equatorialSceneHint: 'ลากดาวบนทรงกลมเพื่อปรับ RA/Dec • กดเล่นเพื่อหมุนฟ้าตามเวลาดาราคติ',
    eclipticSceneHint: 'ลากวัตถุบนทรงกลมเพื่อปรับ λ/β • ดวงอาทิตย์อยู่บนเส้นสุริยะวิถี (β = 0°) เสมอ',
    cameraReset: 'รีเซ็ตมุมกล้อง',
    sphereGridToggle: 'เส้นโครงทรงกลม',
    hideUndersideToggle: 'ซ่อนครึ่งล่าง',
    hideAllHelpers: 'ซ่อนเส้นช่วยทั้งหมด',
    showAllHelpers: 'แสดงเส้นช่วยทั้งหมด',
    prevModule: 'โมดูลก่อนหน้า',
    nextModule: 'โมดูลถัดไป',
    backHome: 'กลับหน้าหลัก',
    layersLabel: 'แสดงระนาบระบบพิกัด',
    helpersLabel: 'เส้นช่วยดูบนโดมท้องฟ้า',
    liveReadoutTitle: 'ค่าพิกัดขอบฟ้าแบบสด',
    equatorialReadoutTitle: 'ค่าพิกัดศูนย์สูตรฟ้าและท้องฟ้าจริงแบบสด',
    eclipticReadoutTitle: 'ค่าพิกัดสุริยะวิถีและดวงอาทิตย์แบบสด',
    altitudeLabel: 'มุมเงย (Alt)',
    azimuthLabel: 'มุมทิศ (Az)',
    zenithDistanceLabel: 'ระยะจากจุดเหนือศีรษะ (z)',
    zenithFormula: 'z = 90° − มุมเงย',
    compassDirectionLabel: 'ชื่อทิศ',
    hourAngleLabel: 'มุมชั่วโมง (H)',
    hourAngleFormula: 'H = LST − RA (±12 ชม.)',
    poleAltitudeLabel: 'มุมเงยของขั้วฟ้า',
    poleNorthHint: 'ขั้วฟ้าเหนือ (NCP) สูงเหนือขอบฟ้าทิศเหนือ',
    poleSouthHint: 'ขั้วฟ้าใต้ (SCP) สูงเหนือขอบฟ้าทิศใต้',
    poleEquatorHint: 'ขั้วฟ้าเหนือ–ใต้อยู่บนเส้นขอบฟ้าพอดี',
    liveAltAzLabel: 'พิกัดขอบฟ้าขณะนั้น (โมดูล 1)',
    aboveHorizonTag: 'เหนือขอบฟ้า (มองเห็น)',
    belowHorizonTag: 'ใต้ขอบฟ้า (มองไม่เห็น)',
    maxMeridianAltLabel: 'มุมเงยสูงสุดที่เมอริเดียน',
    maxMeridianFormula: '90° − |ละติจูด − Dec|',
    visibilityStatusLabel: 'สถานะการขึ้น–ตกของดาว',
    statusCircumpolar: 'ดาวไม่ตก (Circumpolar)',
    statusNeverRises: 'ดาวไม่ขึ้น (Never rises)',
    statusRisesSets: 'ดาวขึ้น–ตกปกติ',
    eclipticConvertedLabel: 'แปลงเป็นพิกัดศูนย์สูตรฟ้า (โมดูล 2)',
    eclipticSunModeTag: 'ดวงอาทิตย์ (β = 0°)',
    eclipticTestObjTag: 'วัตถุทดลองนอกสุริยะวิถี',
    snapToSunBtn: 'ตั้ง β = 0° (กลับสู่ดวงอาทิตย์)',
    solarDecLabel: 'เดคลิเนชันของดวงอาทิตย์',
    seasonLabel: 'ฤดูกาล (ซีกโลกเหนือ)',
    noonSunAltLabel: 'มุมเงยดวงอาทิตย์ตอนเที่ยงวัน',
    noonSunFormula: '90° − |ละติจูด − Dec ดวงอาทิตย์|',
    solarDecChartTitle: 'กราฟ Dec ของดวงอาทิตย์ตลอดปี (±ε)',
    siderealPlayback: {
      play: 'เล่นการหมุนฟ้า (LST)',
      pause: 'หยุดหมุนฟ้า',
      speedLabel: 'ความเร็ว',
    },
    horizonHelpers: {
      meridian: 'เส้นเมอริเดียน',
      altitudeCircle: 'วงกลมเงย',
      altitudeArc: 'ส่วนโค้งมุมเงย',
      azimuthArc: 'ส่วนโค้งมุมทิศ',
      zenithNadir: 'แกน Z–Nadir',
    },
    equatorialHelpers: {
      celestialEquator: 'เส้นศูนย์สูตรฟ้า',
      polarAxis: 'ขั้วฟ้าและแกนหมุน',
      horizonMeridian: 'ขอบฟ้าและเมอริเดียน',
      decCircle: 'วงกลมเดคลิเนชัน',
      raDecArcs: 'ส่วนโค้ง RA / Dec',
    },
    eclipticHelpers: {
      eclipticRing: 'เส้นสุริยะวิถี',
      celestialEquator: 'เส้นศูนย์สูตรฟ้า',
      polesAxes: 'ขั้วฟ้าและขั้วสุริยะวิถี',
      seasonalPoints: '4 จุดสำคัญ',
      coordArcs: 'ส่วนโค้ง λ / β',
    },
    compareUi: {
      sourceTabsHeading: 'กำหนดดาวด้วยระบบใดก็ได้',
      sourceTabsHint: 'เลือกแท็บระบบต้นทาง ระบบอีก 2 ระบบจะคำนวณแปลงให้ทันที',
      sharedParamsHeading: 'ตัวแปรร่วม (ผู้สังเกต เวลา และแกนโลก)',
      presetHeading: 'เลือกดาวสำเร็จรูป',
      summaryTableHeading: 'ตารางสรุปพิกัดทั้ง 3 ระบบแบบสด',
      summaryTableCaption:
        'เปรียบเทียบพิกัดปัจจุบันของดาวเป้าหมายทั้งในระบบขอบฟ้า ศูนย์สูตรฟ้า และสุริยะวิถี พร้อมระบุระบบที่เปลี่ยนตามเวลาและสถานที่',
      colSystem: 'ระบบพิกัด',
      colPrimary: 'พิกัดหลัก',
      colSecondary: 'รายละเอียดเพิ่มเติม',
      colBehavior: 'สมบัติตามเวลา / สถานที่',
      behaviorDynamic: 'เปลี่ยนตามเวลาและสถานที่',
      behaviorFixedEq: 'คงที่ (ผูกกับทรงกลมฟ้า)',
      behaviorFixedEc: 'คงที่ (ผูกกับระนาบวงโคจร)',
      focusLabel: 'โหมดเน้นระบบเดียว',
      focusAll: 'แสดงเท่ากันทั้ง 3 ระบบ',
      focusHorizon: 'เน้นขอบฟ้า',
      focusEquatorial: 'เน้นศูนย์สูตรฟ้า',
      focusEcliptic: 'เน้นสุริยะวิถี',
      compareSceneHint: 'ลากดาวบนทรงกลมเพื่อดูพิกัดทั้ง 3 ระบบเปลี่ยนพร้อมกัน • กดเล่นเพื่อเดินเวลา LST',
      dragHint: 'ค่าที่ไฮไลต์เพิ่งอัปเดต',
    },
    earthMap: {
      title: 'แผนที่โลกเลือกตำแหน่งผู้สังเกต',
      hint: 'แตะหรือลากหมุดบนแผนที่เพื่อเปลี่ยนละติจูดผู้สังเกตทันที หรือเลือกเมืองตัวอย่างด้านล่าง',
    },
    rotatingSky: {
      explorerToggle: 'เครื่องมือสำรวจเพิ่มเติม (รอยดาว • กลุ่มดาว • โซน)',
      viewSingle: 'มุมมองเดี่ยว',
      viewDual: 'มุมมองคู่ (อวกาศ + ขอบฟ้า)',
      spaceViewCaption: 'มุมมองอวกาศ (โลก + ทรงกลมท้องฟ้า)',
      horizonViewCaption: 'มุมมองผู้สังเกต (โดมขอบฟ้า)',
      trailsLabel: 'รอยดาว',
      trailNone: 'ปิด',
      trailShort: 'หางสั้น',
      trailLong: 'เต็มวง (เหนือ/ใต้ขอบฟ้า)',
      constellationLabel: 'กลุ่มดาว',
      constellationNone: 'ปิด',
      zoneCapsToggle: 'โซนไม่ตก/ไม่ขึ้น',
      addRandomStars: '+ สุ่มดาว 5 ดวง',
      clearRandomStars: 'ล้างดาวสุ่ม',
      randomStarCount: 'ดาวสุ่ม {count} ดวง (คลิกเลือกได้)',
    },
    sunMotions: {
      viewEcliptic: 'พิกัดสุริยะวิถี (λ, β)',
      viewSunPath: 'เส้นทางดวงอาทิตย์ (ขอบฟ้า)',
      cardTitle: 'ปฏิทิน 12 เดือน & นาฬิกา 24 ชั่วโมง',
      calendarLabel: 'วันในรอบปี',
      clockLabel: 'เวลาในวัน (24 ชม.)',
      quickSunrise: 'อาทิตย์ขึ้น',
      quickNoon: 'เที่ยงวัน',
      quickSunset: 'อาทิตย์ตก',
      quickMidnight: 'เที่ยงคืน',
      animPlay: 'เล่นการเคลื่อนที่ดวงอาทิตย์',
      animPause: 'หยุดแอนิเมชัน',
      animContinuous: 'ต่อเนื่องในวัน',
      animStepByDay: 'ขยับทีละวัน (ดูฤดู/เลข 8)',
      analemmaToggle: 'เส้นอานาเล็มมา (เลข 8)',
      monthLabelsToggle: 'ป้าย 12 เดือน',
      shadowToggle: 'เงาผู้สังเกต',
      sunAltAzLabel: 'ตำแหน่งดวงอาทิตย์บนขอบฟ้า',
      dayLengthLabel: 'ความยาวกลางวัน',
      sunriseSunsetLabel: 'เวลาขึ้น – ตก (โดยประมาณ)',
      eotLabel: 'สมการเวลา (EoT)',
      zeroShadowBadge: 'วันใกล้ไร้เงา! (ดวงอาทิตย์เกือบตั้งฉากศีรษะ)',
      midnightSunTag: 'พระอาทิตย์เที่ยงคืน (24 ชม.)',
      polarNightTag: 'กลางคืนตลอดวัน (0 ชม.)',
      sunPathHint: 'ลากดวงอาทิตย์เพื่อเลื่อนเวลาในวัน • ดูเงาบนพื้นและเส้นทางรายวันเทียบกับสุริยะวิถี',
    },
    inputValidation: {
      invalidRestored: 'กรุณากรอกตัวเลขที่ถูกต้อง (คืนค่าเดิมแล้ว)',
      wrapped360: 'มุมทิศ 360° เท่ากับ 0.0° (วนรอบกลับมาทิศเหนือ)',
      wrapped24h: 'ค่า 24h เท่ากับ 0h 00m (วนรอบครบ 24 ชั่วโมง)',
      clampedSuffix: 'ปรับเป็น {value} อัตโนมัติ',
      decreaseByOne: 'ลด {label} 1 {unit}',
      increaseByOne: 'เพิ่ม {label} 1 {unit}',
      numberInputLabel: 'กรอกค่า {label}',
    },
  },
  tryIt: {
    play: 'ลองทำดู',
    stop: 'หยุดตัวอย่าง',
    playingStatus: 'กำลังเล่นแอนิเมชันตัวอย่างบนฉาก 3 มิติ...',
    readyStatus: 'กดเพื่อชมตัวอย่างการเคลื่อนที่และการเปลี่ยนแปลงค่าบนฉาก 3 มิติ',
    stepBadge: 'ขั้นที่ {current}/{total}',
  },
  quiz: {
    heading: 'แบบทดสอบท้ายโมดูล',
    subheading: 'ตอบคำถามสั้นๆ เพื่อตรวจสอบความเข้าใจ พร้อมเฉลยและคำอธิบายทันที',
    questionOf: 'ข้อที่ {current} จาก {total}',
    correct: 'ถูกต้อง!',
    incorrect: 'ยังไม่ถูกต้อง',
    explanationLabel: 'คำอธิบาย:',
    nextQuestion: 'ข้อถัดไป',
    finishQuiz: 'ดูสรุปคะแนน',
    scoreHeading: 'สรุปผลแบบทดสอบ',
    scoreSummary: 'คุณทำได้ {score} จาก {total} คะแนน',
    retry: 'ทำแบบทดสอบอีกครั้ง',
    answeredCount: 'ตอบแล้ว {done}/{total} ข้อ',
  },
  systems: {
    horizon: {
      name: 'ระบบพิกัดขอบฟ้า',
      shortName: 'พิกัดขอบฟ้า',
      colorLabel: 'สีเขียว',
      plane: 'ระนาบขอบฟ้า (Horizon Plane)',
      coordinates: 'มุมเงย (Alt) และ มุมทิศ (Az)',
      reference: 'ทิศเหนือ (N) และจุดเหนือศีรษะ (Zenith)',
    },
    equatorial: {
      name: 'ระบบพิกัดศูนย์สูตรฟ้า',
      shortName: 'ศูนย์สูตรฟ้า',
      colorLabel: 'สีฟ้า',
      plane: 'ระนาบศูนย์สูตรฟ้า (Celestial Equator)',
      coordinates: 'ไรต์แอสเซนชัน (RA) และ เดคลิเนชัน (Dec)',
      reference: 'จุดวสันตวิษุวัต (Vernal Equinox, ♈) และขั้วฟ้าเหนือ (NCP)',
    },
    ecliptic: {
      name: 'ระบบพิกัดสุริยะวิถี',
      shortName: 'สุริยะวิถี',
      colorLabel: 'สีเหลือง',
      plane: 'ระนาบสุริยะวิถี (Ecliptic Plane เอียง 23.5°)',
      coordinates: 'ลองจิจูดสุริยะวิถี (λ) และ ละติจูดสุริยะวิถี (β)',
      reference: 'จุดวสันตวิษุวัต (♈) และเส้นทางการโคจรปรากฏของดวงอาทิตย์',
    },
    compare: {
      name: 'เปรียบเทียบสามระบบ',
      shortName: 'เปรียบเทียบ 3 ระบบ',
      colorLabel: 'รวม 3 สี',
    },
  },
  footer: {
    credit: 'จัดทำโดย ครูพี่นัท',
    note: 'CelestiaLab — สื่อการสอนวิชาโลก ดาราศาสตร์ และอวกาศ ม.6 • โดย ครูพี่นัท',
  },
};
