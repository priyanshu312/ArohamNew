/**
 * SolarSystem3D – raw WebGL2 3D Navagraha solar system.
 * No external 3D library required. Self-contained Phong shading,
 * procedural planet textures, Saturn rings, orbit ellipses, starfield.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { GOLD, SAFFRON, SERIF } from "@nakshra/shared-config/theme";

// ─────────────────────────────────────────────────────────
//  Planet data
// ─────────────────────────────────────────────────────────
const PLANETS = [
  { name: "Chandra", en: "Moon",    color: [0.88, 0.88, 0.95], size: 0.38, orbit: 2.8,  speed: 7,   gem: "Pearl",         desc: "Mind, emotions, nurture" },
  { name: "Mangal",  en: "Mars",    color: [0.90, 0.28, 0.26], size: 0.42, orbit: 4.0,  speed: 13,  gem: "Coral",         desc: "Energy, courage, strength" },
  { name: "Budha",   en: "Mercury", color: [0.36, 0.82, 0.40], size: 0.34, orbit: 5.0,  speed: 9,   gem: "Emerald",       desc: "Intellect, communication" },
  { name: "Guru",    en: "Jupiter", color: [0.90, 0.68, 0.28], size: 0.60, orbit: 6.3,  speed: 21,  gem: "Yellow Sapphire",desc: "Wisdom, expansion, luck" },
  { name: "Shukra",  en: "Venus",   color: [0.92, 0.72, 0.75], size: 0.46, orbit: 7.8,  speed: 15,  gem: "Diamond",       desc: "Love, beauty, luxury" },
  { name: "Shani",   en: "Saturn",  color: [0.72, 0.64, 0.54], size: 0.52, orbit: 9.4,  speed: 29,  gem: "Blue Sapphire", desc: "Discipline, karma, justice", hasRings: true },
  { name: "Rahu",    en: "",        color: [0.38, 0.28, 0.68], size: 0.38, orbit: 10.8, speed: 18,  gem: "Hessonite",     desc: "Desire, illusion, foreign" },
  { name: "Ketu",    en: "",        color: [0.68, 0.42, 0.28], size: 0.38, orbit: 12.2, speed: 19,  gem: "Cat's Eye",     desc: "Liberation, mysticism" },
] as const;

// ─────────────────────────────────────────────────────────
//  GLSL Shaders
// ─────────────────────────────────────────────────────────
const PLANET_VERT = `#version 300 es
precision mediump float;
in vec3 aPos;
in vec3 aNorm;
uniform mat4 uMVP;
uniform mat4 uModel;
out vec3 vNorm;
out vec3 vWorld;
void main(){
  vec4 w=uModel*vec4(aPos,1.0);
  vWorld=w.xyz;
  // approximate normal transform (no non-uniform scale)
  vNorm=mat3(uModel)*aNorm;
  gl_Position=uMVP*vec4(aPos,1.0);
}`;

const PLANET_FRAG = `#version 300 es
precision mediump float;
in vec3 vNorm;
in vec3 vWorld;
uniform vec3 uColor;
uniform vec3 uSunPos;
uniform vec3 uEye;
uniform float uShiny;
out vec4 fragColor;
void main(){
  vec3 N=normalize(vNorm);
  vec3 L=normalize(uSunPos-vWorld);
  vec3 V=normalize(uEye-vWorld);
  vec3 H=normalize(L+V);
  float amb=0.10;
  float dif=max(dot(N,L),0.0)*0.88;
  float spec=pow(max(dot(N,H),0.0),uShiny)*0.35;
  // Band noise: cheap planetary surface variation
  float band=sin(vWorld.y*8.0+vWorld.x*3.0)*0.06+
             cos(vWorld.z*5.0+vWorld.y*7.0)*0.04;
  vec3 col=uColor*(1.0+band);
  // Rim atmosphere glow
  float rim=1.0-max(dot(N,V),0.0);
  vec3 rimCol=uColor*1.8*pow(rim,3.0)*0.5;
  col=col*(amb+dif)+vec3(spec)+rimCol;
  fragColor=vec4(clamp(col,0.0,1.0),1.0);
}`;

const SUN_VERT = `#version 300 es
precision mediump float;
in vec3 aPos;
in vec3 aNorm;
uniform mat4 uMVP;
out vec3 vNorm;
out vec3 vPos;
void main(){
  vNorm=aNorm;
  vPos=aPos;
  gl_Position=uMVP*vec4(aPos,1.0);
}`;

const SUN_FRAG = `#version 300 es
precision mediump float;
in vec3 vNorm;
in vec3 vPos;
out vec4 fragColor;
void main(){
  // Core emissive orange-yellow gradient
  float r=length(vPos);
  vec3 hotCore=vec3(1.0,0.98,0.88);
  vec3 mid=vec3(1.0,0.75,0.15);
  vec3 edge=vec3(1.0,0.40,0.02);
  float t=clamp((r-0.7)*3.3,0.0,1.0);
  float t2=clamp((r-0.85)*6.5,0.0,1.0);
  vec3 col=mix(hotCore,mid,t);
  col=mix(col,edge,t2);
  // Limb darkening
  float ld=max(dot(normalize(vNorm),vec3(0.0,0.0,1.0)),0.0);
  col*=0.65+0.35*ld;
  fragColor=vec4(col,1.0);
}`;

const GLOW_VERT = `#version 300 es
precision mediump float;
in vec2 aPos;
out vec2 vUV;
uniform vec2 uCenter;
uniform float uRadius;
uniform vec2 uResolution;
void main(){
  vUV=aPos;
  vec2 pos=uCenter+aPos*uRadius;
  // Convert pixel coords to NDC
  vec2 ndc=pos/uResolution*2.0-1.0;
  ndc.y=-ndc.y;
  gl_Position=vec4(ndc,0.0,1.0);
}`;

const GLOW_FRAG = `#version 300 es
precision mediump float;
in vec2 vUV;
uniform vec3 uColor;
uniform float uStrength;
out vec4 fragColor;
void main(){
  float d=length(vUV);
  float a=uStrength*pow(max(1.0-d,0.0),2.2);
  fragColor=vec4(uColor*a,a*0.75);
}`;

const LINE_VERT = `#version 300 es
precision mediump float;
in vec3 aPos;
uniform mat4 uMVP;
void main(){ gl_Position=uMVP*vec4(aPos,1.0); }`;

const LINE_FRAG = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 fragColor;
void main(){ fragColor=uColor; }`;

const STAR_VERT = `#version 300 es
precision mediump float;
in vec3 aPos;
in float aSize;
in float aBright;
uniform mat4 uMVP;
out float vBright;
void main(){
  vBright=aBright;
  gl_PointSize=aSize;
  gl_Position=uMVP*vec4(aPos,1.0);
}`;

const STAR_FRAG = `#version 300 es
precision mediump float;
in float vBright;
out vec4 fragColor;
void main(){
  float d=length(gl_PointCoord-0.5)*2.0;
  float a=smoothstep(1.0,0.0,d)*vBright;
  fragColor=vec4(1.0,1.0,1.0,a);
}`;

// ─────────────────────────────────────────────────────────
//  4×4 Matrix math (column-major, Float32Array)
// ─────────────────────────────────────────────────────────
type M4 = Float32Array;
const m4id = (): M4 => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);

function m4mul(a: M4, b: M4): M4 {
  const r = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      r[j*4+i] = a[0*4+i]*b[j*4+0]+a[1*4+i]*b[j*4+1]+a[2*4+i]*b[j*4+2]+a[3*4+i]*b[j*4+3];
  return r;
}

function m4perspective(fovY: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan(fovY / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f;
  m[10] = (far + near) / (near - far); m[11] = -1;
  m[14] = 2 * far * near / (near - far);
  return m;
}

function m4lookAt(eye: [number,number,number], center: [number,number,number], up: [number,number,number]): M4 {
  const [ex,ey,ez] = eye, [cx,cy,cz] = center, [ux,uy,uz] = up;
  let fx=cx-ex,fy=cy-ey,fz=cz-ez;
  let fl=Math.sqrt(fx*fx+fy*fy+fz*fz); fx/=fl; fy/=fl; fz/=fl;
  let rx=fy*uz-fz*uy, ry=fz*ux-fx*uz, rz=fx*uy-fy*ux;
  let rl=Math.sqrt(rx*rx+ry*ry+rz*rz); rx/=rl; ry/=rl; rz/=rl;
  const lx=ry*fz-rz*fy, ly=rz*fx-rx*fz, lz=rx*fy-ry*fx;
  return new Float32Array([
    rx, lx, -fx, 0,
    ry, ly, -fy, 0,
    rz, lz, -fz, 0,
    -(rx*ex+ry*ey+rz*ez), -(lx*ex+ly*ey+lz*ez), fx*ex+fy*ey+fz*ez, 1
  ]);
}

function m4translate(tx: number, ty: number, tz: number): M4 {
  const m = m4id();
  m[12]=tx; m[13]=ty; m[14]=tz;
  return m;
}

function m4scale(sx: number, sy: number, sz: number): M4 {
  const m = m4id();
  m[0]=sx; m[5]=sy; m[10]=sz;
  return m;
}

function m4rotY(a: number): M4 {
  const m = m4id(), c=Math.cos(a), s=Math.sin(a);
  m[0]=c; m[2]=s; m[8]=-s; m[10]=c;
  return m;
}

function m4rotX(a: number): M4 {
  const m = m4id(), c=Math.cos(a), s=Math.sin(a);
  m[5]=c; m[6]=-s; m[9]=s; m[10]=c;
  return m;
}

// ─────────────────────────────────────────────────────────
//  Geometry builders
// ─────────────────────────────────────────────────────────
function buildSphere(radius: number, W: number, H: number) {
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  for (let j = 0; j <= H; j++) {
    const phi = (Math.PI * j) / H;
    const sp = Math.sin(phi), cp = Math.cos(phi);
    for (let i = 0; i <= W; i++) {
      const theta = (2 * Math.PI * i) / W;
      const st = Math.sin(theta), ct = Math.cos(theta);
      const x = ct * sp, y = cp, z = st * sp;
      pos.push(x*radius, y*radius, z*radius);
      nrm.push(x, y, z);
    }
  }
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const a = j*(W+1)+i, b = a+W+1;
      idx.push(a, b, a+1, b, b+1, a+1);
    }
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), idx: new Uint16Array(idx) };
}

function buildOrbitLine(orbitR: number, tiltX: number, segs = 128) {
  const pts: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (2 * Math.PI * i) / segs;
    const x = Math.cos(a) * orbitR;
    const z = Math.sin(a) * orbitR;
    // Tilt around X axis
    const y = z * Math.sin(tiltX);
    const zr = z * Math.cos(tiltX);
    pts.push(x, y, zr);
  }
  return new Float32Array(pts);
}

function buildSaturnRing(inner: number, outer: number, segs = 80) {
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const a = (2 * Math.PI * i) / segs;
    const c = Math.cos(a), s = Math.sin(a);
    pos.push(c*inner, 0, s*inner);
    pos.push(c*outer, 0, s*outer);
  }
  for (let i = 0; i < segs; i++) {
    const b = i*2;
    idx.push(b, b+1, b+2, b+1, b+3, b+2);
  }
  return { pos: new Float32Array(pos), idx: new Uint16Array(idx) };
}

function buildStars(count: number, spread: number) {
  const pos: number[] = [], sizes: number[] = [], bright: number[] = [];
  for (let i = 0; i < count; i++) {
    // Use golden ratio spiral for even distribution
    const phi = Math.acos(1 - 2*(i+0.5)/count);
    const theta = Math.PI * (1+Math.sqrt(5)) * i;
    const r = spread * (0.8 + Math.random() * 0.4);
    pos.push(r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi));
    sizes.push(i % 20 === 0 ? 2.5 : i % 5 === 0 ? 1.8 : 1.1);
    bright.push(0.25 + Math.random() * 0.65);
  }
  return { pos: new Float32Array(pos), sizes: new Float32Array(sizes), bright: new Float32Array(bright) };
}

function buildQuad(): Float32Array {
  // Full-screen quad with UV corners [-1..1]
  return new Float32Array([-1,-1, 1,-1, 1,1, -1,-1, 1,1, -1,1]);
}

// ─────────────────────────────────────────────────────────
//  WebGL helpers
// ─────────────────────────────────────────────────────────
function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error("Shader error: " + gl.getShaderInfoLog(s));
  return s;
}

function linkProgram(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const p = gl.createProgram()!;
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER, vert));
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error("Program error: " + gl.getProgramInfoLog(p));
  return p;
}

function createVBO(gl: WebGL2RenderingContext, data: Float32Array, usage = WebGL2RenderingContext.STATIC_DRAW) {
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  return buf;
}

function createIBO(gl: WebGL2RenderingContext, data: Uint16Array) {
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buf;
}

// ─────────────────────────────────────────────────────────
//  React Component
// ─────────────────────────────────────────────────────────
export interface HoveredGraha {
  name: string; en: string; desc: string; gem: string;
  color: readonly [number, number, number];
  screenX: number; screenY: number;
}

export function SolarSystem3D({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<HoveredGraha | null>(null);

  // Store planet world positions each frame so hover raycasting can use them
  const planetScreenPos = useRef<Array<{ x: number; y: number; r: number; idx: number }>>([]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let found: HoveredGraha | null = null;
    for (const p of planetScreenPos.current) {
      const dx = mx - p.x, dy = my - p.y;
      if (dx*dx + dy*dy < (p.r+12) * (p.r+12)) {
        const pl = PLANETS[p.idx];
        found = { name: pl.name, en: pl.en, desc: pl.desc, gem: pl.gem, color: pl.color, screenX: p.x, screenY: p.y };
        break;
      }
    }
    setHovered(found);
  }, []);

  const handleMouseLeave = useCallback(() => setHovered(null), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    // ── Resize handler ──
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas;
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // ── Compile programs ──
    const progPlanet = linkProgram(gl, PLANET_VERT, PLANET_FRAG);
    const progSun    = linkProgram(gl, SUN_VERT,    SUN_FRAG);
    const progGlow   = linkProgram(gl, GLOW_VERT,   GLOW_FRAG);
    const progLine   = linkProgram(gl, LINE_VERT,   LINE_FRAG);
    const progStar   = linkProgram(gl, STAR_VERT,   STAR_FRAG);

    // ── Build geometry ──
    const sphere   = buildSphere(1, 40, 32);
    const satRing  = buildSaturnRing(1.35, 2.1, 80);
    const stars    = buildStars(900, 55);
    const quadData = buildQuad();

    // Sphere VAO (shared by all planets and sun)
    const sphereVAO = gl.createVertexArray()!;
    gl.bindVertexArray(sphereVAO);
    const spherePosBuf = createVBO(gl, sphere.pos);
    const sphereNrmBuf = createVBO(gl, sphere.nrm);
    const sphereIBO    = createIBO(gl, sphere.idx);
    // We bind them per draw, so just store bufs

    // Saturn ring VAO
    const ringVAO = gl.createVertexArray()!;
    gl.bindVertexArray(ringVAO);
    const ringPosBuf = createVBO(gl, satRing.pos);
    const ringIBO    = createIBO(gl, satRing.idx);

    // Stars VAO
    const starVAO = gl.createVertexArray()!;
    gl.bindVertexArray(starVAO);
    const starPosBuf    = createVBO(gl, stars.pos);
    const starSizeBuf   = createVBO(gl, stars.sizes);
    const starBrightBuf = createVBO(gl, stars.bright);

    // Glow quad VAO
    const glowVAO = gl.createVertexArray()!;
    gl.bindVertexArray(glowVAO);
    const glowQuadBuf = createVBO(gl, quadData);

    // Orbit lines VAOs
    const TILT = 0; // flat orbital plane — top-down view
    const orbitVAOs: WebGLVertexArrayObject[] = [];
    const orbitCounts: number[] = [];
    for (const pl of PLANETS) {
      const vao = gl.createVertexArray()!;
      gl.bindVertexArray(vao);
      const linePts = buildOrbitLine(pl.orbit, TILT);
      const buf = createVBO(gl, linePts);
      const loc = gl.getAttribLocation(progLine, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
      orbitVAOs.push(vao);
      orbitCounts.push(linePts.length / 3);
    }

    gl.bindVertexArray(null);

    // ── Helper: draw sphere ──
    function drawSphere(prog: WebGLProgram, mvp: M4, model: M4, color: [number,number,number], shiny: number, sunPos: [number,number,number], eye: [number,number,number]) {
      gl.useProgram(prog);
      gl.uniformMatrix4fv(gl.getUniformLocation(prog,"uMVP"),   false, mvp);
      gl.uniformMatrix4fv(gl.getUniformLocation(prog,"uModel"), false, model);
      gl.uniform3fv(gl.getUniformLocation(prog,"uColor"),  color);
      gl.uniform3fv(gl.getUniformLocation(prog,"uSunPos"), sunPos);
      gl.uniform3fv(gl.getUniformLocation(prog,"uEye"),    eye);
      gl.uniform1f(gl.getUniformLocation(prog,"uShiny"),   shiny);
      const posLoc = gl.getAttribLocation(prog,"aPos");
      const nrmLoc = gl.getAttribLocation(prog,"aNorm");
      gl.bindBuffer(gl.ARRAY_BUFFER, spherePosBuf);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, sphereNrmBuf);
      gl.enableVertexAttribArray(nrmLoc);
      gl.vertexAttribPointer(nrmLoc, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIBO);
      gl.drawElements(gl.TRIANGLES, sphere.idx.length, gl.UNSIGNED_SHORT, 0);
    }

    // ── Animation loop ──
    let raf = 0;
    let t0 = performance.now();

    // Fixed top-down camera — matches the flat orbital layout the user wants.
    // Slightly offset on Z so the perspective gives minimal depth illusion
    // while keeping the solar system essentially "flat" as seen on screen.
    const eye: [number,number,number] = [0, 30, 6];
    const proj = m4perspective(0.65, 1, 0.1, 300); // aspect corrected per frame
    const view = m4lookAt(eye, [0,0,0], [0,0,-1]);

    const render = (now: number) => {
      t0 = now;
      const elapsed = now / 1000;

      const W = canvas.width, H = canvas.height;
      gl.viewport(0, 0, W, H);
      gl.clearColor(0.03, 0.015, 0.025, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      // Rebuild proj each frame to respect canvas aspect ratio
      const aspectProj = m4perspective(0.65, W / H, 0.1, 300);
      const VP = m4mul(aspectProj, view);

      // ── Stars ──
      gl.useProgram(progStar);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.depthMask(false);
      const starMVP = m4mul(VP, m4scale(1,1,1));
      gl.uniformMatrix4fv(gl.getUniformLocation(progStar,"uMVP"), false, starMVP);
      const sPosLoc    = gl.getAttribLocation(progStar,"aPos");
      const sSizeLoc   = gl.getAttribLocation(progStar,"aSize");
      const sBrightLoc = gl.getAttribLocation(progStar,"aBright");
      gl.bindBuffer(gl.ARRAY_BUFFER, starPosBuf);
      gl.enableVertexAttribArray(sPosLoc);
      gl.vertexAttribPointer(sPosLoc, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, starSizeBuf);
      gl.enableVertexAttribArray(sSizeLoc);
      gl.vertexAttribPointer(sSizeLoc, 1, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, starBrightBuf);
      gl.enableVertexAttribArray(sBrightLoc);
      gl.vertexAttribPointer(sBrightLoc, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, stars.pos.length / 3);
      gl.depthMask(true);
      gl.disable(gl.BLEND);

      // ── Orbit rings ──
      gl.useProgram(progLine);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(gl.getUniformLocation(progLine,"uMVP"), false, VP);
      gl.uniform4fv(gl.getUniformLocation(progLine,"uColor"), [0.78, 0.63, 0.27, 0.18]);
      for (let i = 0; i < PLANETS.length; i++) {
        gl.bindVertexArray(orbitVAOs[i]);
        gl.drawArrays(gl.LINE_STRIP, 0, orbitCounts[i]);
      }
      gl.disable(gl.BLEND);

      // ── Sun ──
      const sunModel = m4scale(1.8, 1.8, 1.8);
      const sunMVP   = m4mul(VP, sunModel);
      drawSphere(progSun, sunMVP, sunModel, [1,0.8,0.2], 0, [0,0,0], eye);

      // Sun glow (screen-space additive billboard)
      {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.depthMask(false);
        gl.useProgram(progGlow);
        // Project sun center to screen
        const sunClip = m4mul(VP, m4translate(0,0,0));
        // Sun is at origin → clip pos = VP * [0,0,0,1] = 4th col of VP
        const cx4 = VP[12], cy4 = VP[13], cw = VP[15];
        const ndcX = cx4/cw, ndcY = cy4/cw;
        const sx = (ndcX*0.5+0.5)*W;
        const sy = (1-(ndcY*0.5+0.5))*H;
        const glowR = W * 0.22;
        gl.bindBuffer(gl.ARRAY_BUFFER, glowQuadBuf);
        const gPosLoc = gl.getAttribLocation(progGlow,"aPos");
        gl.enableVertexAttribArray(gPosLoc);
        gl.vertexAttribPointer(gPosLoc, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2fv(gl.getUniformLocation(progGlow,"uCenter"),     [sx, sy]);
        gl.uniform1f(gl.getUniformLocation(progGlow,"uRadius"),      glowR);
        gl.uniform2fv(gl.getUniformLocation(progGlow,"uResolution"), [W, H]);
        gl.uniform3fv(gl.getUniformLocation(progGlow,"uColor"),      [1.0, 0.6, 0.1]);
        gl.uniform1f(gl.getUniformLocation(progGlow,"uStrength"),    0.55);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }

      // ── Planets ──
      const newScreenPos: Array<{ x: number; y: number; r: number; idx: number }> = [];
      const sunWorldPos: [number,number,number] = [0,0,0];

      for (let i = 0; i < PLANETS.length; i++) {
        const pl = PLANETS[i];
        const angle = elapsed / pl.speed * Math.PI * 2;
        const wx = Math.cos(angle) * pl.orbit;
        const wz_raw = Math.sin(angle) * pl.orbit;
        const wy = wz_raw * Math.sin(TILT);
        const wz = wz_raw * Math.cos(TILT);

        const model = m4mul(m4translate(wx, wy, wz), m4scale(pl.size, pl.size, pl.size));
        const mvp   = m4mul(VP, model);
        const col   = [...pl.color] as [number,number,number];
        drawSphere(progPlanet, mvp, model, col, 48, sunWorldPos, eye);

        // Saturn rings
        if ("hasRings" in pl && pl.hasRings) {
          gl.useProgram(progLine);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          const ringModel = m4mul(m4translate(wx,wy,wz), m4mul(m4rotX(0.42), m4scale(pl.size,pl.size,pl.size)));
          gl.uniformMatrix4fv(gl.getUniformLocation(progLine,"uMVP"), false, m4mul(VP,ringModel));
          gl.uniform4fv(gl.getUniformLocation(progLine,"uColor"), [0.88,0.78,0.58,0.65]);
          const rPosLoc = gl.getAttribLocation(progLine,"aPos");
          gl.bindBuffer(gl.ARRAY_BUFFER, ringPosBuf);
          gl.enableVertexAttribArray(rPosLoc);
          gl.vertexAttribPointer(rPosLoc, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ringIBO);
          gl.drawElements(gl.TRIANGLES, satRing.idx.length, gl.UNSIGNED_SHORT, 0);
          gl.disable(gl.BLEND);
        }

        // Compute screen position for hover
        const clipX = mvp[12], clipY = mvp[13], clipW = mvp[15];
        if (clipW > 0) {
          const sx = ((clipX/clipW)*0.5+0.5)*(W/devicePixelRatio);
          const sy = (1-(clipY/clipW)*0.5-0.5)*(H/devicePixelRatio);
          newScreenPos.push({ x: sx, y: sy, r: (pl.size / clipW) * (H/devicePixelRatio) * 0.5, idx: i });
        }
      }
      planetScreenPos.current = newScreenPos;

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(progPlanet);
      gl.deleteProgram(progSun);
      gl.deleteProgram(progGlow);
      gl.deleteProgram(progLine);
      gl.deleteProgram(progStar);
    };
  }, []);

  return (
    <div className={`relative ${className ?? ""}`} style={{ width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {hovered && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: hovered.screenX,
            top: hovered.screenY - 8,
            transform: "translate(-50%, -100%)",
            animation: "tooltipIn3d 0.15s ease",
          }}
        >
          <style>{`@keyframes tooltipIn3d{from{opacity:0;transform:translate(-50%,-90%) scale(0.95)}to{opacity:1;transform:translate(-50%,-100%) scale(1)}}`}</style>
          <div className="px-4 py-3 rounded-2xl min-w-[160px]"
            style={{ background: "rgba(6,3,10,0.97)", border: "1px solid rgba(200,160,68,0.38)", backdropFilter: "blur(14px)", boxShadow: "0 8px 36px rgba(0,0,0,0.7)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: `rgb(${hovered.color.map(c=>Math.round(c*255)).join(",")})`, boxShadow: `0 0 6px rgb(${hovered.color.map(c=>Math.round(c*255)).join(",")})` }} />
              <span className="text-sm font-semibold" style={{ color: GOLD, fontFamily: SERIF }}>{hovered.name}</span>
              {hovered.en && <span className="text-[10px]" style={{ color: "rgba(250,247,242,0.45)" }}>— {hovered.en}</span>}
            </div>
            <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: "rgba(250,247,242,0.72)" }}>{hovered.desc}</p>
            <p className="text-[10px]" style={{ color: "rgba(200,160,68,0.8)" }}>💎 {hovered.gem}</p>
          </div>
        </div>
      )}
    </div>
  );
}

