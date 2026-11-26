import * as THREE from 'three';
import {
  calendarDayToSunLambda,
  computeAnalemmaPoints,
  exactEquatorialToHorizon,
  MONTH_NAMES_EN,
  MONTH_NAMES_TH,
  monthDayToCalendarDay,
  type SunHorizonState,
} from '../astronomy/sunMotion';
import { eclipticToLocalCartesian } from '../astronomy/ecliptic';
import { horizonToCartesian } from '../astronomy/horizon';
import type { Locale } from '../i18n';
import type { SceneThemePalette } from '../theme/themeManager';

const DEG2RAD = Math.PI / 180;

function createMonthLabelSprite(
  text: string,
  fgHex: string,
  bgHex: string
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = 0.84;
    ctx.fillStyle = bgHex;
    ctx.beginPath();
    ctx.roundRect(10, 12, canvas.width - 20, 40, 14);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = fgHex;
    ctx.font = '700 24px "Noto Sans Thai", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
  });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(0.56, 0.28, 1);
  return sp;
}

/**
 * 3D Sun Motions visual layer for Module 3's Horizon Sun-Path mode:
 * - Observer stickfigure + real-time ground shadow + sunlight ray
 * - Sun's daily diurnal path (solid above horizon / dashed below horizon)
 * - Annual Analemma figure-8 curve at current clock time
 * - Optional 12-month markers placed along the Ecliptic circle
 */
export class SunMotionLayer {
  public readonly horizonGroup = new THREE.Group();
  public readonly eclipticMonthsGroup = new THREE.Group();

  private stickGroup = new THREE.Group();
  private stickMat: THREE.MeshStandardMaterial;
  private shadowMat: THREE.MeshBasicMaterial;
  private shadowMesh: THREE.Mesh;
  private zeroShadowRing: THREE.Mesh;
  private sunRayMat: THREE.LineBasicMaterial;
  private sunRayLine: THREE.Line;

  private dailyAboveMat: THREE.MeshBasicMaterial;
  private dailyBelowMat: THREE.LineDashedMaterial;
  private dailyAboveTube: THREE.Mesh;
  private dailyBelowLine: THREE.LineSegments;

  private analemmaMat: THREE.LineBasicMaterial;
  private analemmaLine: THREE.Line;

  private monthSprites: Array<{ sprite: THREE.Sprite; text: string }> = [];

  private showShadow = true;
  private showAnalemma = false;
  private showMonthLabels = false;

  private lastAnalemmaKey = '';

  constructor(
    private readonly sphereRadius: number,
    locale: Locale
  ) {
    // 1. Stickfigure + Dynamic Ground Shadow
    this.stickMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.35,
    });
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.14, 0.04, 20),
      this.stickMat
    );
    base.position.y = 0.02;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.045, 0.36, 14),
      this.stickMat
    );
    pole.position.y = 0.22;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 16), this.stickMat);
    head.position.y = 0.45;
    this.stickGroup.add(base, pole, head);

    this.shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.shadowMat);
    this.shadowMesh.position.y = 0.018;

    this.zeroShadowRing = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 24),
      this.shadowMat
    );
    this.zeroShadowRing.rotation.x = -Math.PI / 2;
    this.zeroShadowRing.position.y = 0.018;
    this.zeroShadowRing.visible = false;

    this.sunRayMat = new THREE.LineBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.45,
    });
    this.sunRayLine = new THREE.Line(new THREE.BufferGeometry(), this.sunRayMat);

    this.horizonGroup.add(
      this.stickGroup,
      this.shadowMesh,
      this.zeroShadowRing,
      this.sunRayLine
    );

    // 2. Sun's Daily Path (solid bright above horizon, dashed subtle below)
    this.dailyAboveMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.92,
    });
    this.dailyAboveTube = new THREE.Mesh(new THREE.BufferGeometry(), this.dailyAboveMat);

    this.dailyBelowMat = new THREE.LineDashedMaterial({
      color: 0x94a3b8,
      dashSize: 0.14,
      gapSize: 0.12,
      transparent: true,
      opacity: 0.42,
    });
    this.dailyBelowLine = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      this.dailyBelowMat
    );
    this.horizonGroup.add(this.dailyAboveTube, this.dailyBelowLine);

    // 3. Analemma (Figure-8 Curve)
    this.analemmaMat = new THREE.LineBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.92,
    });
    this.analemmaLine = new THREE.Line(new THREE.BufferGeometry(), this.analemmaMat);
    this.analemmaLine.visible = false;
    this.horizonGroup.add(this.analemmaLine);

    // 4. 12 Month Markers along the Ecliptic (15th of each month)
    const names = locale === 'th' ? MONTH_NAMES_TH : MONTH_NAMES_EN;
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    for (let m = 0; m < 12; m++) {
      const cDay = monthDayToCalendarDay(m, 15);
      const lam = calendarDayToSunLambda(cDay);
      const pos = eclipticToLocalCartesian(lam, 0, this.sphereRadius);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), dotMat);
      dot.position.set(pos.x, pos.y, pos.z);
      const sp = createMonthLabelSprite(names[m], '#facc15', '#2c2106');
      sp.position.set(pos.x * 1.12, pos.y + 0.16, pos.z * 1.12);
      this.eclipticMonthsGroup.add(dot, sp);
      this.monthSprites.push({ sprite: sp, text: names[m] });
    }
    this.eclipticMonthsGroup.visible = false;
    this.horizonGroup.visible = false;
  }

  public setVisible(visible: boolean): void {
    this.horizonGroup.visible = visible;
    this.eclipticMonthsGroup.visible = visible && this.showMonthLabels;
  }

  public setOptions(opts: {
    showShadow?: boolean;
    showAnalemma?: boolean;
    showMonthLabels?: boolean;
  }): void {
    if (typeof opts.showShadow === 'boolean') this.showShadow = opts.showShadow;
    if (typeof opts.showAnalemma === 'boolean') this.showAnalemma = opts.showAnalemma;
    if (typeof opts.showMonthLabels === 'boolean') {
      this.showMonthLabels = opts.showMonthLabels;
    }
    this.eclipticMonthsGroup.visible =
      this.horizonGroup.visible && this.showMonthLabels;
  }

  public applyPalette(palette: SceneThemePalette, isDark: boolean): void {
    this.stickMat.color.setHex(palette.observerColor);
    this.shadowMat.color.setHex(isDark ? 0x020617 : 0x0f172a);
    this.shadowMat.opacity = isDark ? 0.6 : 0.4;
    this.sunRayMat.color.setHex(isDark ? 0xfacc15 : 0xf59e0b);
    this.sunRayMat.opacity = isDark ? 0.42 : 0.36;
    this.dailyAboveMat.color.setHex(isDark ? 0xfef08a : 0xf59e0b);
    this.dailyBelowMat.color.setHex(isDark ? 0x64748b : 0x94a3b8);
    this.dailyBelowMat.opacity = isDark ? 0.38 : 0.34;
    this.analemmaMat.color.setHex(isDark ? 0xfb923c : 0xea580c);

    const fg = `#${palette.ecliptic.toString(16).padStart(6, '0')}`;
    const bg = isDark ? '#0f172a' : '#ffffff';
    for (const rec of this.monthSprites) {
      const rep = createMonthLabelSprite(rec.text, fg, bg);
      const oldMat = rec.sprite.material as THREE.SpriteMaterial;
      const newMat = rep.material as THREE.SpriteMaterial;
      oldMat.map?.dispose();
      oldMat.map = newMat.map;
      oldMat.needsUpdate = true;
      newMat.dispose();
    }
  }

  public update(
    sunState: SunHorizonState,
    latitudeDeg: number,
    obliquityDeg: number
  ): void {
    if (!this.horizonGroup.visible) return;

    const r = this.sphereRadius * 1.003;

    // 1. Update Observer Shadow & Sunlight Ray
    const isAbove = sunState.altitudeDeg > 0.4;
    if (this.showShadow && isAbove) {
      const sunPos = horizonToCartesian(
        sunState.altitudeDeg,
        sunState.azimuthDeg,
        this.sphereRadius
      );
      this.sunRayLine.geometry.dispose();
      this.sunRayLine.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.46, 0),
        new THREE.Vector3(sunPos.x, sunPos.y, sunPos.z),
      ]);
      this.sunRayLine.visible = true;

      if (sunState.altitudeDeg >= 87.5) {
        // Zero-shadow / Sun directly overhead!
        this.shadowMesh.visible = false;
        this.zeroShadowRing.visible = true;
      } else {
        this.zeroShadowRing.visible = false;
        const stickH = 0.48;
        const rawLen = stickH / Math.tan(sunState.altitudeDeg * DEG2RAD);
        const len = Math.max(0.14, Math.min(this.sphereRadius * 0.92, rawLen));
        const azRad = sunState.shadowAzimuthDeg * DEG2RAD;
        const dx = Math.sin(azRad);
        const dz = -Math.cos(azRad);
        // Perpendicular vector on ground plane for tapered shadow quad
        const px = -dz;
        const pz = dx;
        const wBase = 0.085;
        const wTip = 0.035;

        const verts = new Float32Array([
          px * wBase, 0, pz * wBase,
          -px * wBase, 0, -pz * wBase,
          dx * len + px * wTip, 0, dz * len + pz * wTip,

          -px * wBase, 0, -pz * wBase,
          dx * len - px * wTip, 0, dz * len - pz * wTip,
          dx * len + px * wTip, 0, dz * len + pz * wTip,
        ]);
        this.shadowMesh.geometry.dispose();
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        this.shadowMesh.geometry = geo;
        this.shadowMesh.visible = true;
      }
    } else {
      this.shadowMesh.visible = false;
      this.zeroShadowRing.visible = false;
      this.sunRayLine.visible = false;
    }

    // 2. Sun's Daily Diurnal Path at sunState.sunDecDeg (split above vs below horizon)
    const segs = 120;
    const aboveCurves: THREE.Vector3[][] = [];
    let currentAbove: THREE.Vector3[] = [];
    const belowPts: THREE.Vector3[] = [];

    for (let i = 0; i <= segs; i++) {
      const lstSample = (i / segs) * 24;
      const { altitudeDeg, azimuthDeg } = exactEquatorialToHorizon(
        sunState.sunRaHours,
        sunState.sunDecDeg,
        latitudeDeg,
        lstSample
      );
      const p = horizonToCartesian(altitudeDeg, azimuthDeg, r);
      const vec = new THREE.Vector3(p.x, p.y, p.z);

      if (altitudeDeg >= -0.2) {
        currentAbove.push(vec);
      } else {
        if (currentAbove.length >= 2) {
          aboveCurves.push(currentAbove);
        }
        currentAbove = [];
      }

      if (i < segs) {
        const nextLst = ((i + 1) / segs) * 24;
        const nextPos = exactEquatorialToHorizon(
          sunState.sunRaHours,
          sunState.sunDecDeg,
          latitudeDeg,
          nextLst
        );
        if (altitudeDeg < 0 || nextPos.altitudeDeg < 0) {
          const pNext = horizonToCartesian(nextPos.altitudeDeg, nextPos.azimuthDeg, r);
          belowPts.push(vec, new THREE.Vector3(pNext.x, pNext.y, pNext.z));
        }
      }
    }
    if (currentAbove.length >= 2) {
      aboveCurves.push(currentAbove);
    }

    // Merge contiguous above-horizon arc(s) (handle wrap-around at index 0/segs)
    if (
      aboveCurves.length >= 2 &&
      aboveCurves[0][0].distanceTo(
        aboveCurves[aboveCurves.length - 1][
          aboveCurves[aboveCurves.length - 1].length - 1
        ]
      ) < 0.25
    ) {
      const merged = [
        ...aboveCurves[aboveCurves.length - 1],
        ...aboveCurves[0].slice(1),
      ];
      aboveCurves.splice(0, 1);
      aboveCurves[aboveCurves.length - 1] = merged;
    }

    this.dailyAboveTube.geometry.dispose();
    if (aboveCurves.length > 0 && aboveCurves[0].length >= 2) {
      const pts = aboveCurves[0];
      const closed = pts.length > segs - 2;
      const curve = new THREE.CatmullRomCurve3(pts, closed);
      this.dailyAboveTube.geometry = new THREE.TubeGeometry(
        curve,
        Math.max(24, pts.length),
        0.013,
        8,
        closed
      );
      this.dailyAboveTube.visible = true;
    } else {
      this.dailyAboveTube.geometry = new THREE.BufferGeometry();
      this.dailyAboveTube.visible = false;
    }

    this.dailyBelowLine.geometry.dispose();
    this.dailyBelowLine.geometry = new THREE.BufferGeometry().setFromPoints(belowPts);
    if (belowPts.length >= 2) {
      this.dailyBelowLine.computeLineDistances();
      this.dailyBelowLine.visible = true;
    } else {
      this.dailyBelowLine.visible = false;
    }

    // 3. Analemma Figure-8 Curve (recompute only when time/lat/obliquity changes)
    this.analemmaLine.visible = this.showAnalemma;
    if (this.showAnalemma) {
      const key = `${sunState.solarTimeHours.toFixed(2)}|${latitudeDeg.toFixed(1)}|${obliquityDeg.toFixed(1)}`;
      if (key !== this.lastAnalemmaKey) {
        this.lastAnalemmaKey = key;
        const aPts = computeAnalemmaPoints(
          sunState.solarTimeHours,
          latitudeDeg,
          obliquityDeg,
          this.sphereRadius * 1.008,
          5
        ).map((pt) => new THREE.Vector3(pt.x, pt.y, pt.z));
        this.analemmaLine.geometry.dispose();
        this.analemmaLine.geometry = new THREE.BufferGeometry().setFromPoints(aPts);
      }
    }
  }

  public dispose(): void {
    this.shadowMesh.geometry.dispose();
    this.shadowMat.dispose();
    this.zeroShadowRing.geometry.dispose();
    this.sunRayLine.geometry.dispose();
    this.sunRayMat.dispose();
    this.dailyAboveTube.geometry.dispose();
    this.dailyAboveMat.dispose();
    this.dailyBelowLine.geometry.dispose();
    this.dailyBelowMat.dispose();
    this.analemmaLine.geometry.dispose();
    this.analemmaMat.dispose();
    this.stickMat.dispose();
    for (const rec of this.monthSprites) {
      const mat = rec.sprite.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
  }
}
