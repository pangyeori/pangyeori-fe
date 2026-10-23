import {
  ACESFilmicToneMapping, CanvasTexture, DirectionalLight, ExtrudeGeometry, Float32BufferAttribute,
  Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial, OrthographicCamera,
  PlaneGeometry, Scene, Shape, ShapeGeometry, SRGBColorSpace, Vector3, WebGLRenderer,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { drawStoryScreen, SCREEN_HEIGHT, SCREEN_WIDTH } from "./drawStoryScreen";
import { smooth, storyState, type StoryPhase } from "./storyContent";

function roundedShape(width: number, height: number, radius: number) {
  const x = -width / 2, y = -height / 2;
  const shape = new Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y); shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius); shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}
function roundedPlane(width: number, height: number, radius: number) {
  const x = -width / 2, y = -height / 2;
  const geometry = new ShapeGeometry(roundedShape(width, height, radius), 12);
  const position = geometry.getAttribute("position");
  const uv = [];
  for (let i = 0; i < position.count; i++) uv.push((position.getX(i) - x) / width, (position.getY(i) - y) / height);
  geometry.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  return geometry;
}

export type StoryScene = ReturnType<typeof createStoryScene>;
export function createStoryScene(host: HTMLDivElement, onFailure: () => void) {
  const fontFamily = getComputedStyle(host).fontFamily;
  host.dataset.fontFamily = fontFamily;
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setClearColor(0xffffff, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 1.25 : 1.5));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.dataset.storyCanvas = "true";
  const scene = new Scene();
  const camera = new OrthographicCamera(-5, 5, 3.5, -3.5, 0.1, 50);
  camera.position.set(0, 2, 15);
  camera.lookAt(0, 0.2, 0);
  scene.add(new HemisphereLight(0xffffff, 0xc6d4e7, 2.8));
  const key = new DirectionalLight(0xfff4e7, 4);
  key.position.set(-4, 7, 8); scene.add(key);
  const fill = new DirectionalLight(0xc1ddff, 2);
  fill.position.set(5, 2, 4); scene.add(fill);
  const rim = new DirectionalLight(0xffffff, 3);
  rim.position.set(0, 5, -5); scene.add(rim);

  const phone = new Group(); phone.name = "DeviceRig"; scene.add(phone);
  const silver = new MeshStandardMaterial({ color: "#b7c3d3", roughness: 0.28, metalness: 0.65 });
  const bezel = new MeshStandardMaterial({ color: "#18202b", roughness: 0.27, metalness: 0.25 });
  const box = (parent: Group, w: number, h: number, d: number, r: number, material: MeshStandardMaterial | MeshBasicMaterial) => {
    const mesh = new Mesh(new RoundedBoxGeometry(w, h, d, 5, r), material); parent.add(mesh); return mesh;
  };
  const shell = (width: number, height: number, depth: number, radius: number, material: MeshStandardMaterial) => {
    const geometry = new ExtrudeGeometry(roundedShape(width, height, radius), { depth: depth - 0.06, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.03, bevelThickness: 0.03, curveSegments: 12 });
    geometry.translate(0, 0, -depth / 2 + 0.03);
    const mesh = new Mesh(geometry, material); phone.add(mesh); return mesh;
  };
  shell(2.72, 5.5, 0.3, 0.35, silver);
  shell(2.63, 5.41, 0.27, 0.32, bezel).position.z = 0.04;
  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = SCREEN_WIDTH; screenCanvas.height = SCREEN_HEIGHT;
  const texture = new CanvasTexture(screenCanvas); texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const screen = new Mesh(roundedPlane(2.46, 5.12, 0.25), new MeshBasicMaterial({ map: texture, toneMapped: false }));
  screen.position.set(0, -0.015, 0.198); phone.add(screen);
  const speaker = box(phone, 0.59, 0.065, 0.03, 0.02, bezel); speaker.position.set(0, 2.52, 0.205);
  const cameraLens = box(phone, 0.075, 0.075, 0.03, 0.03, new MeshStandardMaterial({ color: "#345278", metalness: 0.8, roughness: 0.1 }));
  cameraLens.position.set(0.43, 2.51, 0.21);
  for (const [x, y, h] of [[-1.38, 1.2, 0.4], [-1.38, 0.55, 0.4], [1.38, 0.95, 0.7]]) box(phone, 0.045, h, 0.1, 0.02, silver).position.set(x, y, 0);

  const mascotAnchor = new Vector3();
  const argumentAnchor = new Vector3();
  const documentGroup = new Group(); scene.add(documentGroup);
  const paper = new MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 });
  box(documentGroup, 1.05, 1.35, 0.06, 0.025, paper);
  for (let i = 0; i < 4; i++) {
    const line = box(documentGroup, i === 0 ? 0.34 : 0.66, 0.055, 0.015, 0.005, new MeshStandardMaterial({ color: i === 0 ? "#2563eb" : "#b8c7df" }));
    line.position.set(i === 0 ? -0.16 : 0, 0.36 - i * 0.2, 0.043);
  }
  const shadowCanvas = document.createElement("canvas"); shadowCanvas.width = 128; shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext("2d")!;
  const gradient = shadowContext.createRadialGradient(64, 64, 2, 64, 64, 64);
  gradient.addColorStop(0, "rgba(40,59,90,.24)"); gradient.addColorStop(0.45, "rgba(40,59,90,.12)"); gradient.addColorStop(1, "rgba(40,59,90,0)");
  shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 128, 128);
  const shadowTexture = new CanvasTexture(shadowCanvas);
  const shadows = [0].map(() => { const mesh = new Mesh(new PlaneGeometry(4, 2), new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })); mesh.rotation.x = -Math.PI / 2; scene.add(mesh); return mesh; });

  let disposed = false, visible = true, raf = 0, progress = 0, previousProgress = 0;
  let phase: StoryPhase = 0, count = 0, compact = false, viewportWidth = 1, viewportHeight = 1;
  let typingStart = 0, typing = false, sendStart = 0, sending = false, lastScreenKey = "";
  const requestFrame = () => { if (!disposed && visible && !document.hidden && !raf) raf = requestAnimationFrame(render); };
  const avatar = new Image();
  avatar.onload = () => { lastScreenKey = ""; requestFrame(); };
  avatar.src = "/images/mascot/owl-holding-star.png";
  function updateObjects(now: number) {
    const reviewIn = smooth(0.43, 0.55, progress), resultIn = smooth(0.75, 0.84, progress);
    const review = reviewIn * (1 - resultIn);
    const readingHeight = Math.min(3.28, Math.max(2.05, viewportHeight * 2.46 / 480));
    const halfHeight = compact ? readingHeight + (3.28 - readingHeight) * review : 3.35;
    const aspect = viewportWidth / viewportHeight;
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
    camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
    host.dataset.projectedTextSize = String(60 / SCREEN_WIDTH * 2.46 * viewportHeight / (halfHeight * 2));
    const exit = smooth(0.94, 1, progress);
    phone.position.set((compact ? -0.68 : -2.05) * review, compact ? 0.28 + review * 0.85 : 0.12, 0);
    phone.rotation.set(0, -0.28 * (1 - smooth(0, 0.07, progress)) - review * 0.12, -0.035 * (1 - smooth(0, 0.07, progress)));
    phone.scale.setScalar((compact ? 1 : 1.03) - review * (compact ? 0.43 : 0.14) - exit * 0.13);
    // Keep the original illustration flat; only its position follows the device stage.
    const mascotHeight = compact ? 1.02 + review * 1.45 : 1.65 + review * 1.55;
    mascotAnchor.set(compact ? 1.08 - review * 0.63 : 2.2, -2.55 + mascotHeight / 2, 0.7).project(camera);
    const mascotSize = Math.min(viewportWidth - 24, mascotHeight * viewportHeight / (halfHeight * 2));
    const mascotLeft = Math.max(mascotSize / 2 + 12, Math.min(viewportWidth - mascotSize / 2 - 12, (mascotAnchor.x + 1) * viewportWidth / 2));
    host.style.setProperty("--mascot-left", `${mascotLeft}px`);
    host.style.setProperty("--mascot-top", `${(1 - mascotAnchor.y) * viewportHeight / 2}px`);
    host.style.setProperty("--mascot-size", `${mascotSize}px`);
    // Project the opinion cards into the same stage, but keep their UI as crisp DOM.
    // Entry is a finite CSS animation, independent of further scroll input.
    const cardWidth = Math.min(compact ? 184 : 220, (viewportWidth - 62) / 2);
    const cardGap = compact ? 22 : 28;
    const pairHalfWidth = cardWidth + cardGap / 2;
    argumentAnchor.set(compact ? 0 : 1.95, compact ? 1.05 : 1.25, 1.65).project(camera);
    const pairCenter = Math.max(pairHalfWidth + 16, Math.min(viewportWidth - pairHalfWidth - 16, (argumentAnchor.x + 1) * viewportWidth / 2));
    host.style.setProperty("--argument-size", `${cardWidth}px`);
    host.style.setProperty("--argument-x-0", `${pairCenter - (cardWidth + cardGap) / 2}px`);
    host.style.setProperty("--argument-x-1", `${pairCenter + (cardWidth + cardGap) / 2}px`);
    host.style.setProperty("--argument-y", `${(1 - argumentAnchor.y) * viewportHeight / 2}px`);
    host.style.setProperty("--argument-scale", String(1 - smooth(0.72, 0.775, progress) * 0.8));
    host.style.setProperty("--argument-opacity", String(1 - smooth(0.755, 0.78, progress)));
    documentGroup.visible = progress > 0.67 && progress < 0.835;
    const gather = smooth(0.67, 0.73, progress), returnToPhone = smooth(0.75, 0.835, progress);
    documentGroup.scale.setScalar((compact ? 0.7 : 0.85) * gather);
    documentGroup.position.set((compact ? 0.4 : 2.1) * (1 - returnToPhone) + phone.position.x * returnToPhone, -0.7 + returnToPhone * 0.9, 1.85 - returnToPhone * 1.45);
    documentGroup.rotation.z = -0.08 * (1 - returnToPhone);
    shadows[0].position.set(phone.position.x, -2.75, 0.15); shadows[0].scale.set(0.85, 0.8, 1);
    const elapsed = typing ? Math.min(1, (now - typingStart) / 760) : 1;
    if (typing && elapsed >= 1) { typing = false; sending = true; sendStart = now; }
    const send = sending ? Math.min(1, (now - sendStart) / 200) : 1;
    if (send >= 1) sending = false;
    const screenKey = `${phase}-${count}-${Math.floor(elapsed * 25)}-${Math.floor(send * 12)}`;
    if (screenKey !== lastScreenKey) {
      drawStoryScreen(screenCanvas, { phase, count, typing: elapsed, send }, avatar.complete && avatar.naturalWidth ? avatar : undefined, fontFamily); texture.needsUpdate = true; lastScreenKey = screenKey;
      host.dataset.screenText = screenCanvas.getAttribute("data-screen-text") ?? "";
      host.dataset.messageCount = String(typing ? Math.max(0, count - 1) : count);
      host.dataset.typing = String(typing);
      host.dataset.sending = String(sending);
    }
  }
  function render(now: number) {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    updateObjects(now); renderer.render(scene, camera);
    host.dataset.renderCount = String(Number(host.dataset.renderCount ?? 0) + 1);
    host.dataset.renderState = typing ? "typing" : sending ? "sending" : "idle";
    if (typing || sending) requestFrame();
  }
  function setProgress(next: number, animate = true) {
    const state = storyState(next);
    // The reverse edge has a small dead band to avoid replay at a boundary.
    if (state.count < count && Math.abs(next - previousProgress) < 0.004 && state.phase === phase) return;
    const changed = state.count !== count || state.phase !== phase;
    if (changed) {
      sending = false;
      typing = animate && next > previousProgress && state.phase === 0 && state.count > 0;
      if (typing) typingStart = performance.now();
    }
    phase = state.phase; count = state.count; progress = state.progress; previousProgress = next;
    host.dataset.phase = String(phase); host.dataset.progress = String(progress);
    requestFrame();
  }
  const resize = () => {
    if (disposed) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    compact = width < 768; viewportWidth = width; viewportHeight = height;
    renderer.setSize(width, height, false);
    const aspect = width / height;
    const halfHeight = compact ? Math.max(3.28, 1.55 / aspect) : 3.35;
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
    camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.position.set(0, 0.95, 16); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    requestFrame();
  };
  const onVisibility = () => {
    typing = false; sending = false;
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; host.dataset.renderState = "hidden"; }
    else requestFrame();
  };
  const onLost = (event: Event) => { event.preventDefault(); onFailure(); };
  renderer.domElement.addEventListener("webglcontextlost", onLost);
  document.addEventListener("visibilitychange", onVisibility);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { typing = false; sending = false; cancelAnimationFrame(raf); raf = 0; host.dataset.renderState = "offscreen"; }
    else requestFrame();
  });
  const observer = new ResizeObserver(resize);
  host.appendChild(renderer.domElement); observer.observe(host); intersection.observe(host);
  resize();
  return {
    setProgress,
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(raf);
      avatar.onload = null;
      observer.disconnect(); intersection.disconnect(); document.removeEventListener("visibilitychange", onVisibility);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      const geometries = new Set<import("three").BufferGeometry>();
      const materials = new Set<import("three").Material>();
      scene.traverse((object) => { if (object instanceof Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material)); } });
      geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose());
      texture.dispose(); shadowTexture.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
