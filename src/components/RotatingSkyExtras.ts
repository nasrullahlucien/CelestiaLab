import * as THREE from 'three';
import {
  CONSTELLATIONS,
  type CatalogStar,
  type ConstellationId,
} from '../astronomy/patterns';
import {
  equatorialToHorizon,
  equatorialToLocalCartesian,
} from '../astronomy/equatorial';
import type { SceneThemePalette } from '../theme/themeManager';

export type StarTrailMode = 'none' | 'short' | 'long';

const DEG2RAD = Math.PI / 180;

function createRingPoints(radius: number, segments = 96): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return pts;
}

/**
 * Creates a clean latitude/longitude spherical graticule without triangulated diagonals.
 */
export function createSphereGraticuleGeometry(
  radius: number,
  latDegs: number[] = [-60, -30, 30, 60],
  meridianCount = 4,
  segments = 72
): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];

  // Latitude parallels
  for (const lat of latDegs) {
    const rad = lat * DEG2RAD;
    const r = radius * Math.cos(rad);
    const y = radius * Math.sin(rad);
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      pts.push(
        new THREE.Vector3(Math.cos(a0) * r, y, Math.sin(a0) * r),
        new THREE.Vector3(Math.cos(a1) * r, y, Math.sin(a1) * r)
      );
    }
  }

  // Meridian great circles (every 180° / meridianCount)
  for (let m = 0; m < meridianCount; m++) {
    const az = (m / meridianCount) * Math.PI;
    const cosAz = Math.cos(az);
    const sinAz = Math.sin(az);
    for (let i = 0; i < segments; i++) {
      const t0 = (i / segments) * Math.PI * 2;
      const t1 = ((i + 1) / segments) * Math.PI * 2;
      const r0 = radius * Math.cos(t0);
      const y0 = radius * Math.sin(t0);
      const r1 = radius * Math.cos(t1);
      const y1 = radius * Math.sin(t1);
      pts.push(
        new THREE.Vector3(r0 * cosAz, y0, r0 * sinAz),
        new THREE.Vector3(r1 * cosAz, y1, r1 * sinAz)
      );
    }
  }

  return new THREE.BufferGeometry().setFromPoints(pts);
}

export interface GlassSphereUniforms {
  [uniform: string]: THREE.IUniform<unknown>;
  uFillColor: THREE.IUniform<THREE.Color>;
  uRimColor: THREE.IUniform<THREE.Color>;
  uBaseOpacity: THREE.IUniform<number>;
  uRimOpacity: THREE.IUniform<number>;
  uOutlineOpacity: THREE.IUniform<number>;
  uClipBelow: THREE.IUniform<number>;
  uDaylightMix: THREE.IUniform<number>;
}

/**
 * Creates a clean frosted-glass celestial sphere material with Fresnel limb shading,
 * crisp silhouette outline, optional horizon clipping (hide underside), and optional
 * upper-hemisphere daylight tint for Sun-Path mode.
 */
export function createGlassSphereMaterial(): THREE.ShaderMaterial {
  const uniforms: GlassSphereUniforms = {
    uFillColor: { value: new THREE.Color(0xcbd5e1) },
    uRimColor: { value: new THREE.Color(0x64748b) },
    uBaseOpacity: { value: 0.08 },
    uRimOpacity: { value: 0.14 },
    uOutlineOpacity: { value: 0.4 },
    uClipBelow: { value: 0.0 },
    uDaylightMix: { value: 0.0 },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vec4 mvPosition = viewMatrix * worldPos;
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uFillColor;
      uniform vec3 uRimColor;
      uniform float uBaseOpacity;
      uniform float uRimOpacity;
      uniform float uOutlineOpacity;
      uniform float uClipBelow;
      uniform float uDaylightMix;

      varying vec3 vNormalView;
      varying vec3 vViewDir;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;

      void main() {
        if (uClipBelow > 0.5 && vWorldPos.y < -0.02) {
          discard;
        }
        float ndotv = clamp(abs(dot(normalize(vNormalView), normalize(vViewDir))), 0.0, 1.0);
        float fresnel = pow(1.0 - ndotv, 2.4);
        float outline = smoothstep(0.86, 0.985, 1.0 - ndotv);
        float shade = 0.92 + 0.08 * dot(normalize(vWorldNormal), normalize(vec3(0.35, 0.85, 0.35)));
        vec3 baseFill = uFillColor * shade;
        float extraAlpha = 0.0;
        if (uDaylightMix > 0.01) {
          if (vWorldPos.y >= 0.0) {
            vec3 skyDay = vec3(0.38, 0.68, 0.96);
            baseFill = mix(baseFill, skyDay, uDaylightMix * 0.62);
            extraAlpha = uDaylightMix * 0.14;
          } else {
            vec3 nightUnder = vec3(0.08, 0.12, 0.20);
            baseFill = mix(baseFill, nightUnder, uDaylightMix * 0.55);
            extraAlpha = uDaylightMix * 0.10;
          }
        }
        vec3 color = mix(baseFill, uRimColor, clamp(fresnel * 0.45 + outline * 0.95, 0.0, 1.0));
        float alpha = clamp(uBaseOpacity + extraAlpha + fresnel * uRimOpacity + outline * uOutlineOpacity, 0.0, 0.65);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
}

export function updateGlassSpherePalette(
  mat: THREE.ShaderMaterial,
  isDark: boolean
): void {
  const u = mat.uniforms as GlassSphereUniforms;
  if (isDark) {
    u.uFillColor.value.setHex(0x1e293b);
    u.uRimColor.value.setHex(0x94a3b8);
    u.uBaseOpacity.value = 0.06;
    u.uRimOpacity.value = 0.14;
    u.uOutlineOpacity.value = 0.38;
  } else {
    u.uFillColor.value.setHex(0xcbd5e1);
    u.uRimColor.value.setHex(0x64748b);
    u.uBaseOpacity.value = 0.08;
    u.uRimOpacity.value = 0.14;
    u.uOutlineOpacity.value = 0.40;
  }
}

/**
 * Draws a crisp flat horizon ground disk texture with painted N / E / S / W cardinal letters
 * (eliminating floating boxed pill sprites that obscure lines across the celestial sphere).
 */
export function createCompassDiskTexture(
  horizonHex: string,
  fillHex: string,
  isDark: boolean,
  subtle = false
): THREE.CanvasTexture {
  const size = 1024;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 6;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, size, size);

    // Translucent ground fill
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = fillHex;
    ctx.globalAlpha = subtle ? (isDark ? 0.2 : 0.24) : isDark ? 0.36 : 0.42;
    ctx.fill();
    ctx.restore();

    // Subtle inner reference circle & N-S / E-W lines
    ctx.save();
    ctx.strokeStyle = horizonHex;
    ctx.globalAlpha = subtle ? 0.24 : 0.34;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.56, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy - radius * 0.78);
    ctx.lineTo(cx, cy + radius * 0.78);
    ctx.moveTo(cx - radius * 0.78, cy);
    ctx.lineTo(cx + radius * 0.78, cy);
    ctx.stroke();
    ctx.restore();

    // Crisp flat N / E / S / W letters near the outer edge (N = top/-Z, E = right/+X, S = bottom/+Z, W = left/-X)
    const labelDist = radius * 0.87;
    const cardinals: Array<{ text: string; x: number; y: number; rot: number }> = [
      { text: 'N', x: cx, y: cy - labelDist, rot: 0 },
      { text: 'E', x: cx + labelDist, y: cy, rot: Math.PI / 2 },
      { text: 'S', x: cx, y: cy + labelDist, rot: Math.PI },
      { text: 'W', x: cx - labelDist, y: cy, rot: -Math.PI / 2 },
    ];

    ctx.save();
    ctx.font = '800 72px "JetBrains Mono", "Noto Sans Thai", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = subtle ? 0.78 : 0.96;

    for (const c of cardinals) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      // Soft halo stroke for maximum readability on both Light & Dark themes
      ctx.lineWidth = 10;
      ctx.strokeStyle = isDark ? 'rgba(6, 11, 22, 0.72)' : 'rgba(255, 255, 255, 0.88)';
      ctx.strokeText(c.text, 0, 0);
      ctx.fillStyle = horizonHex;
      ctx.fillText(c.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Manages Star Trails (none / short 45° comet tail / long above-vs-below horizon diurnal path)
 * inside celestialSpinGroup.
 */
export class StarTrailLayer {
  public readonly group = new THREE.Group();
  private aboveMat: THREE.LineBasicMaterial;
  private belowMat: THREE.LineDashedMaterial;
  private shortMat: THREE.MeshBasicMaterial;

  private aboveLine: THREE.LineSegments;
  private belowLine: THREE.LineSegments;
  private shortMesh: THREE.Mesh;
  private mode: StarTrailMode = 'none';

  constructor(private readonly sphereRadius: number) {
    this.aboveMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
    });
    this.belowMat = new THREE.LineDashedMaterial({
      color: 0x94a3b8,
      dashSize: 0.12,
      gapSize: 0.12,
      transparent: true,
      opacity: 0.45,
    });
    this.shortMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });

    this.aboveLine = new THREE.LineSegments(new THREE.BufferGeometry(), this.aboveMat);
    this.belowLine = new THREE.LineSegments(new THREE.BufferGeometry(), this.belowMat);
    this.shortMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.shortMat);

    this.group.add(this.aboveLine, this.belowLine, this.shortMesh);
    this.group.visible = false;
  }

  public setMode(next: StarTrailMode): void {
    this.mode = next;
    this.group.visible = next !== 'none';
  }

  public getMode(): StarTrailMode {
    return this.mode;
  }

  public applyPalette(palette: SceneThemePalette, isDark: boolean): void {
    this.aboveMat.color.setHex(palette.equatorial);
    this.shortMat.color.setHex(palette.equatorial);
    this.belowMat.color.setHex(isDark ? 0x64748b : 0x94a3b8);
  }

  public update(
    raHours: number,
    decDeg: number,
    latitudeDeg: number,
    lstHours: number
  ): void {
    if (this.mode === 'none') {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;

    const r = this.sphereRadius * 1.004;

    if (this.mode === 'short') {
      this.aboveLine.visible = false;
      this.belowLine.visible = false;

      // Trailing 45° (3h) arc behind the star's apparent westward motion
      // Because sky rotates by -LST, the trail behind the star extends toward HIGHER RA (+dRA)
      const pts: THREE.Vector3[] = [];
      const trailHours = 3.0;
      const steps = 28;
      for (let i = 0; i <= steps; i++) {
        const raSample = (raHours + (i / steps) * trailHours) % 24;
        const p = equatorialToLocalCartesian(raSample, decDeg, r);
        pts.push(new THREE.Vector3(p.x, p.y, p.z));
      }

      this.shortMesh.geometry.dispose();
      if (Math.abs(decDeg) < 89.2 && pts.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(pts);
        this.shortMesh.geometry = new THREE.TubeGeometry(curve, 32, 0.026, 8, false);
        this.shortMesh.visible = true;
      } else {
        this.shortMesh.geometry = new THREE.BufferGeometry();
        this.shortMesh.visible = false;
      }
      return;
    }

    // Long trail: split full 360° diurnal circle into Above Horizon (solid) vs Below Horizon (dashed)
    this.shortMesh.visible = false;
    const segs = 144;
    const abovePts: THREE.Vector3[] = [];
    const belowPts: THREE.Vector3[] = [];

    for (let i = 0; i < segs; i++) {
      const ra0 = (i / segs) * 24;
      const ra1 = ((i + 1) / segs) * 24;
      const raMid = ((i + 0.5) / segs) * 24;

      const p0 = equatorialToLocalCartesian(ra0, decDeg, r);
      const p1 = equatorialToLocalCartesian(ra1, decDeg, r);
      const { altitudeDeg } = equatorialToHorizon(raMid, decDeg, latitudeDeg, lstHours);

      if (altitudeDeg >= 0) {
        abovePts.push(new THREE.Vector3(p0.x, p0.y, p0.z), new THREE.Vector3(p1.x, p1.y, p1.z));
      } else {
        belowPts.push(new THREE.Vector3(p0.x, p0.y, p0.z), new THREE.Vector3(p1.x, p1.y, p1.z));
      }
    }

    this.aboveLine.geometry.dispose();
    this.aboveLine.geometry = new THREE.BufferGeometry().setFromPoints(abovePts);
    this.aboveLine.visible = abovePts.length >= 2;

    this.belowLine.geometry.dispose();
    this.belowLine.geometry = new THREE.BufferGeometry().setFromPoints(belowPts);
    if (belowPts.length >= 2) {
      this.belowLine.computeLineDistances();
      this.belowLine.visible = true;
    } else {
      this.belowLine.visible = false;
    }
  }

  public dispose(): void {
    this.aboveLine.geometry.dispose();
    this.belowLine.geometry.dispose();
    this.shortMesh.geometry.dispose();
    this.aboveMat.dispose();
    this.belowMat.dispose();
    this.shortMat.dispose();
  }
}

/**
 * Manages Constellations (Big Dipper + Polaris, Orion, Crux) & clickable Random Extra Stars.
 */
export class StarPatternLayer {
  public readonly group = new THREE.Group();
  private constellationGroup = new THREE.Group();
  private extraStarsGroup = new THREE.Group();
  private clickableMeshes: THREE.Mesh[] = [];

  private constellationId: ConstellationId = 'none';
  private extraStars: CatalogStar[] = [];

  private starMat: THREE.MeshStandardMaterial;
  private extraStarMat: THREE.MeshStandardMaterial;
  private lineMat: THREE.LineBasicMaterial;
  private pointerMat: THREE.LineDashedMaterial;

  constructor(private readonly sphereRadius: number) {
    this.starMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.75,
      roughness: 0.25,
    });
    this.extraStarMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfacc15,
      emissiveIntensity: 0.7,
      roughness: 0.25,
    });
    this.lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.72,
    });
    this.pointerMat = new THREE.LineDashedMaterial({
      color: 0xfacc15,
      dashSize: 0.14,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.85,
    });

    this.group.add(this.constellationGroup, this.extraStarsGroup);
  }

  public getConstellation(): ConstellationId {
    return this.constellationId;
  }

  public getExtraStars(): CatalogStar[] {
    return this.extraStars;
  }

  public getClickableMeshes(): THREE.Mesh[] {
    return this.clickableMeshes;
  }

  public setConstellation(id: ConstellationId): void {
    this.constellationId = id;
    this.rebuild();
  }

  public setExtraStars(stars: CatalogStar[]): void {
    this.extraStars = stars;
    this.rebuild();
  }

  public applyPalette(palette: SceneThemePalette, isDark: boolean): void {
    this.starMat.color.setHex(isDark ? 0xffffff : 0x0c4a6e);
    this.starMat.emissive.setHex(palette.equatorial);
    this.lineMat.color.setHex(palette.equatorial);
    this.pointerMat.color.setHex(palette.ecliptic);
    this.extraStarMat.color.setHex(isDark ? 0xfef08a : 0x854d0e);
    this.extraStarMat.emissive.setHex(palette.ecliptic);
  }

  private clearChildGroup(target: THREE.Group): void {
    while (target.children.length > 0) {
      const child = target.children[0];
      target.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        child.geometry.dispose();
      }
    }
  }

  private rebuild(): void {
    this.clearChildGroup(this.constellationGroup);
    this.clearChildGroup(this.extraStarsGroup);
    this.clickableMeshes = [];

    const r = this.sphereRadius * 0.992;

    if (this.constellationId !== 'none') {
      const pat = CONSTELLATIONS[this.constellationId];
      const positions: THREE.Vector3[] = [];

      for (const st of pat.stars) {
        const p = equatorialToLocalCartesian(st.raHours, st.decDeg, r);
        const vec = new THREE.Vector3(p.x, p.y, p.z);
        positions.push(vec);

        const size = 0.075 * (st.size ?? 1);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(size, 14, 14), this.starMat);
        dot.position.copy(vec);
        this.constellationGroup.add(dot);

        // Generous clickable hit sphere so students can click any constellation star
        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 10, 10),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        hit.position.copy(vec);
        hit.userData = { ra: st.raHours, dec: st.decDeg, starName: st.name };
        this.constellationGroup.add(hit);
        this.clickableMeshes.push(hit);
      }

      // Stick lines
      const edgePts: THREE.Vector3[] = [];
      for (const [a, b] of pat.edges) {
        if (positions[a] && positions[b]) {
          edgePts.push(positions[a], positions[b]);
        }
      }
      if (edgePts.length >= 2) {
        const lines = new THREE.LineSegments(
          new THREE.BufferGeometry().setFromPoints(edgePts),
          this.lineMat
        );
        this.constellationGroup.add(lines);
      }

      // Dashed pointer lines (e.g. Merak -> Dubhe -> Polaris)
      if (pat.pointerEdges && pat.pointerEdges.length > 0) {
        for (const [a, b] of pat.pointerEdges) {
          if (positions[a] && positions[b]) {
            const pLine = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints([positions[a], positions[b]]),
              this.pointerMat
            );
            pLine.computeLineDistances();
            this.constellationGroup.add(pLine);
          }
        }
      }
    }

    // Random extra stars
    for (const st of this.extraStars) {
      const p = equatorialToLocalCartesian(st.raHours, st.decDeg, r);
      const vec = new THREE.Vector3(p.x, p.y, p.z);

      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 14), this.extraStarMat);
      dot.position.copy(vec);
      this.extraStarsGroup.add(dot);

      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 10, 10),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.copy(vec);
      hit.userData = { ra: st.raHours, dec: st.decDeg, starName: st.name };
      this.extraStarsGroup.add(hit);
      this.clickableMeshes.push(hit);
    }
  }

  public dispose(): void {
    this.clearChildGroup(this.constellationGroup);
    this.clearChildGroup(this.extraStarsGroup);
    this.starMat.dispose();
    this.extraStarMat.dispose();
    this.lineMat.dispose();
    this.pointerMat.dispose();
  }
}

/**
 * Translucent spherical polar caps highlighting Circumpolar (never sets) & Never-Rises zones
 * inside celestialTiltGroup.
 */
export class ZoneCapsLayer {
  public readonly group = new THREE.Group();
  private circMat: THREE.MeshBasicMaterial;
  private neverMat: THREE.MeshBasicMaterial;
  private circMesh: THREE.Mesh;
  private neverMesh: THREE.Mesh;
  private enabled = false;
  private lastLat = Number.NaN;

  constructor(private readonly sphereRadius: number) {
    this.circMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.neverMat = new THREE.MeshBasicMaterial({
      color: 0xf87171,
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    this.circMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.circMat);
    this.neverMesh = new THREE.Mesh(new THREE.BufferGeometry(), this.neverMat);
    this.group.add(this.circMesh, this.neverMesh);
    this.group.visible = false;
  }

  public setEnabled(on: boolean): void {
    this.enabled = on;
    this.group.visible = on;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public applyPalette(palette: SceneThemePalette, isDark: boolean): void {
    this.circMat.color.setHex(palette.equatorial);
    this.circMat.opacity = isDark ? 0.17 : 0.13;
    this.neverMat.color.setHex(isDark ? 0xf87171 : 0xb91c1c);
    this.neverMat.opacity = isDark ? 0.14 : 0.1;
  }

  public update(latitudeDeg: number): void {
    if (Math.abs(latitudeDeg - this.lastLat) < 0.05) return;
    this.lastLat = latitudeDeg;

    const absLat = Math.abs(latitudeDeg);
    const r = this.sphereRadius * 0.992;

    this.circMesh.geometry.dispose();
    this.neverMesh.geometry.dispose();

    if (absLat < 0.5) {
      this.circMesh.geometry = new THREE.BufferGeometry();
      this.neverMesh.geometry = new THREE.BufferGeometry();
      this.circMesh.visible = false;
      this.neverMesh.visible = false;
      return;
    }

    const capTheta = Math.min(Math.PI / 2, absLat * DEG2RAD);
    const northCapGeo = new THREE.SphereGeometry(r, 40, 16, 0, Math.PI * 2, 0, capTheta);
    const southCapGeo = new THREE.SphereGeometry(
      r,
      40,
      16,
      0,
      Math.PI * 2,
      Math.PI - capTheta,
      capTheta
    );

    if (latitudeDeg >= 0) {
      // Northern Hemisphere: North cap = Circumpolar, South cap = Never-Rises
      this.circMesh.geometry = northCapGeo;
      this.neverMesh.geometry = southCapGeo;
    } else {
      // Southern Hemisphere: South cap = Circumpolar, North cap = Never-Rises
      this.circMesh.geometry = southCapGeo;
      this.neverMesh.geometry = northCapGeo;
    }
    this.circMesh.visible = true;
    this.neverMesh.visible = true;
  }

  public dispose(): void {
    this.circMesh.geometry.dispose();
    this.neverMesh.geometry.dispose();
    this.circMat.dispose();
    this.neverMat.dispose();
  }
}

/**
 * Companion 3D Space View Scene (UNL NAAP Left Pane):
 * Upright Celestial Sphere + rotating 3D Earth at center with observer pin at latitude φ
 * and a green tangent Horizon plane tilting with φ and rotating with +LST.
 */
export class SpaceViewController {
  public readonly scene = new THREE.Scene();
  public readonly camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);

  private readonly R = 3.1;
  private readonly earthR = 0.92;

  private wireMat: THREE.LineBasicMaterial;
  private sphereGridLines: THREE.LineSegments;
  private sphereGlassMat: THREE.ShaderMaterial;
  private eqRingMat: THREE.MeshBasicMaterial;
  private ecRingMat: THREE.MeshBasicMaterial;
  private axisMat: THREE.LineBasicMaterial;
  private horizonPlaneMat: THREE.MeshBasicMaterial;
  private horizonRimMat: THREE.MeshBasicMaterial;
  private earthOceanMat: THREE.MeshStandardMaterial;
  private earthGridMat: THREE.MeshBasicMaterial;
  private starMat: THREE.MeshStandardMaterial;
  private starHaloMat: THREE.MeshBasicMaterial;
  private decRingMat: THREE.LineDashedMaterial;
  private zenithRayMat: THREE.LineBasicMaterial;

  private earthSpinGroup = new THREE.Group();
  private observerPivot = new THREE.Group();
  private observerHorizonPlane: THREE.Mesh;
  private observerHorizonRim: THREE.Mesh;
  private eclipticGroup = new THREE.Group();
  private targetStarMesh: THREE.Mesh;
  private targetStarHalo: THREE.Mesh;
  private decCircleLine: THREE.Line;
  private patternLayer: StarPatternLayer;
  private zoneCaps: ZoneCapsLayer;
  private showEcliptic: boolean;

  constructor(showEcliptic: boolean) {
    this.showEcliptic = showEcliptic;
    this.camera.position.set(6.2, 3.8, 6.8);
    this.camera.lookAt(0, 0, 0);

    const amb = new THREE.AmbientLight(0xffffff, 0.95);
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(6, 8, 5);
    this.scene.add(amb, dir);

    // Smooth frosted-glass Celestial Sphere dome (clearly visible outer silhouette)
    this.sphereGlassMat = createGlassSphereMaterial();
    const glassSphere = new THREE.Mesh(
      new THREE.SphereGeometry(this.R * 0.998, 48, 36),
      this.sphereGlassMat
    );
    glassSphere.renderOrder = -1;
    this.scene.add(glassSphere);

    // Outer upright Celestial Sphere clean lat/lon graticule (toggleable, OFF by default for clean look)
    this.wireMat = new THREE.LineBasicMaterial({
      color: 0x475569,
      transparent: true,
      opacity: 0.28,
    });
    this.sphereGridLines = new THREE.LineSegments(
      createSphereGraticuleGeometry(this.R),
      this.wireMat
    );
    this.sphereGridLines.visible = false;
    this.scene.add(this.sphereGridLines);

    // Upright Celestial Equator (blue) & Polar Axis (NCP up, SCP down)
    this.eqRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const eqRing = new THREE.Mesh(
      new THREE.TorusGeometry(this.R, 0.032, 12, 96),
      this.eqRingMat
    );
    eqRing.rotation.x = Math.PI / 2;
    this.scene.add(eqRing);

    this.axisMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
    const axis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -this.R * 1.1, 0),
        new THREE.Vector3(0, this.R * 1.1, 0),
      ]),
      this.axisMat
    );
    this.scene.add(axis);

    // Ecliptic ring (yellow, shown in Compare mode)
    this.ecRingMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const ecRing = new THREE.Mesh(
      new THREE.TorusGeometry(this.R * 1.005, 0.03, 12, 96),
      this.ecRingMat
    );
    ecRing.rotation.x = Math.PI / 2;
    this.eclipticGroup.add(ecRing);
    this.eclipticGroup.visible = showEcliptic;
    this.scene.add(this.eclipticGroup);

    // Rotating 3D Earth at center
    this.scene.add(this.earthSpinGroup);

    this.earthOceanMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      roughness: 0.55,
      metalness: 0.1,
    });
    const earthSphere = new THREE.Mesh(
      new THREE.SphereGeometry(this.earthR, 28, 20),
      this.earthOceanMat
    );
    this.earthGridMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const earthGrid = new THREE.Mesh(
      new THREE.SphereGeometry(this.earthR * 1.01, 16, 12),
      this.earthGridMat
    );
    this.earthSpinGroup.add(earthSphere, earthGrid);

    // Observer pin + green tangent Horizon Plane attached to Earth at latitude φ
    this.earthSpinGroup.add(this.observerPivot);

    const obsPin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, 0.32, 12),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
    );
    obsPin.position.set(0, this.earthR + 0.15, 0);
    const obsHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
    );
    obsHead.position.set(0, this.earthR + 0.36, 0);

    // Tangent green horizon disc slicing the celestial sphere!
    this.horizonPlaneMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.observerHorizonPlane = new THREE.Mesh(
      new THREE.CircleGeometry(this.R * 0.99, 64),
      this.horizonPlaneMat
    );
    this.observerHorizonPlane.rotation.x = -Math.PI / 2;

    this.horizonRimMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    this.observerHorizonRim = new THREE.Mesh(
      new THREE.TorusGeometry(this.R * 0.995, 0.03, 12, 96),
      this.horizonRimMat
    );
    this.observerHorizonRim.rotation.x = Math.PI / 2;

    // Zenith pointer arrow rising straight up from observer's head to sphere edge
    this.zenithRayMat = new THREE.LineBasicMaterial({ color: 0x34d399 });
    const zenithRay = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, this.earthR, 0),
        new THREE.Vector3(0, this.R, 0),
      ]),
      this.zenithRayMat
    );

    this.observerPivot.add(
      obsPin,
      obsHead,
      this.observerHorizonPlane,
      this.observerHorizonRim,
      zenithRay
    );

    // Target Star + Declination circle on the upright Celestial Sphere
    this.starMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.85,
    });
    this.targetStarMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 20), this.starMat);
    this.starHaloMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    this.targetStarHalo = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.28, 24),
      this.starHaloMat
    );
    this.scene.add(this.targetStarMesh, this.targetStarHalo);

    this.decRingMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.14,
      gapSize: 0.09,
      transparent: true,
      opacity: 0.78,
    });
    this.decCircleLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(createRingPoints(this.R)),
      this.decRingMat
    );
    this.decCircleLine.computeLineDistances();
    this.scene.add(this.decCircleLine);

    // Mirrored Constellations & Zone Caps inside Space View
    this.patternLayer = new StarPatternLayer(this.R);
    this.scene.add(this.patternLayer.group);

    this.zoneCaps = new ZoneCapsLayer(this.R);
    this.scene.add(this.zoneCaps.group);
  }

  public syncState(
    raHours: number,
    decDeg: number,
    latitudeDeg: number,
    lstHours: number,
    obliquityDeg: number,
    constellation: ConstellationId,
    extraStars: CatalogStar[],
    zoneCapsEnabled: boolean
  ): void {
    // Rotate Earth eastward by +LST around +Y so observer's meridian points to RA = LST
    this.earthSpinGroup.rotation.y = lstHours * 15 * DEG2RAD;

    // Tilt observer's Zenith (+Y_local) from North Pole (+Y) toward +Z by (90° - φ)
    this.observerPivot.rotation.x = (90 - latitudeDeg) * DEG2RAD;

    if (this.showEcliptic) {
      this.eclipticGroup.rotation.z = obliquityDeg * DEG2RAD;
    }

    // Place target star on upright Celestial Sphere
    const p = equatorialToLocalCartesian(raHours, decDeg, this.R);
    this.targetStarMesh.position.set(p.x, p.y, p.z);
    this.targetStarHalo.position.set(p.x, p.y, p.z);
    this.targetStarHalo.lookAt(this.camera.position);

    // Update star's declination circle
    const decRad = decDeg * DEG2RAD;
    const decR = this.R * Math.cos(decRad);
    const decY = this.R * Math.sin(decRad);
    if (decR > 0.04) {
      this.decCircleLine.visible = true;
      this.decCircleLine.geometry.dispose();
      this.decCircleLine.geometry = new THREE.BufferGeometry().setFromPoints(
        createRingPoints(decR, 96)
      );
      this.decCircleLine.position.y = decY;
      this.decCircleLine.computeLineDistances();
    } else {
      this.decCircleLine.visible = false;
    }

    if (this.patternLayer.getConstellation() !== constellation) {
      this.patternLayer.setConstellation(constellation);
    }
    if (this.patternLayer.getExtraStars() !== extraStars) {
      this.patternLayer.setExtraStars(extraStars);
    }

    this.zoneCaps.setEnabled(zoneCapsEnabled);
    if (zoneCapsEnabled) {
      this.zoneCaps.update(latitudeDeg);
    }
  }

  public setGridVisible(visible: boolean): void {
    this.sphereGridLines.visible = visible;
  }

  public applyPalette(palette: SceneThemePalette, isDark: boolean): void {
    this.scene.background = new THREE.Color(palette.background);
    updateGlassSpherePalette(this.sphereGlassMat, isDark);
    this.wireMat.color.setHex(palette.sphereWireframe);
    this.wireMat.opacity = palette.sphereWireframeOpacity * 0.72;
    this.eqRingMat.color.setHex(palette.equatorial);
    this.axisMat.color.setHex(palette.equatorial);
    this.decRingMat.color.setHex(palette.equatorial);
    this.starHaloMat.color.setHex(palette.equatorial);
    this.starMat.color.setHex(isDark ? 0xffffff : 0x0c4a6e);
    this.starMat.emissive.setHex(palette.equatorial);

    this.ecRingMat.color.setHex(palette.ecliptic);
    this.horizonPlaneMat.color.setHex(palette.horizon);
    this.horizonRimMat.color.setHex(palette.horizon);
    this.zenithRayMat.color.setHex(palette.horizon);

    this.earthOceanMat.color.setHex(isDark ? 0x1e40af : 0x2563eb);
    this.earthGridMat.color.setHex(isDark ? 0x93c5fd : 0xe0f2fe);

    this.patternLayer.applyPalette(palette, isDark);
    this.zoneCaps.applyPalette(palette, isDark);
  }

  public orbitBy(deltaX: number, deltaY: number): void {
    const spherical = new THREE.Spherical().setFromVector3(this.camera.position);
    spherical.theta -= deltaX * 0.008;
    spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.phi - deltaY * 0.008));
    this.camera.position.setFromSpherical(spherical);
    this.camera.lookAt(0, 0, 0);
    this.targetStarHalo.lookAt(this.camera.position);
  }

  public resetCamera(): void {
    this.camera.position.set(6.2, 3.8, 6.8);
    this.camera.lookAt(0, 0, 0);
    this.targetStarHalo.lookAt(this.camera.position);
  }

  public dispose(): void {
    this.patternLayer.dispose();
    this.zoneCaps.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
