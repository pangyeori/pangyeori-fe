import {
  ACESFilmicToneMapping, CanvasTexture, Curve, DirectionalLight, ExtrudeGeometry,
  Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  OrthographicCamera, PlaneGeometry, PMREMGenerator, Scene, Shape, SphereGeometry,
  TubeGeometry, Vector3, WebGLRenderer, type BufferGeometry, type Material,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const material = (color: string, roughness = .38, metalness = .05) => new MeshStandardMaterial({ color, roughness, metalness, transparent: true });
function box(parent: Group, size: [number, number, number], radius: number, surface: Material, position: [number, number, number]) {
  const mesh = new Mesh(new RoundedBoxGeometry(...size, 5, radius), surface);
  mesh.position.set(...position); parent.add(mesh); return mesh;
}
function capsule(parent: Group, width: number, height: number, depth: number, surface: Material, z: number) {
  const r = width / 2, top = height / 2 - r, bottom = -height / 2 + r;
  const shape = new Shape();
  shape.moveTo(-r, bottom); shape.lineTo(-r, top);
  shape.absarc(0, top, r, Math.PI, 0, true);
  shape.lineTo(r, bottom); shape.absarc(0, bottom, r, 0, -Math.PI, true);
  const bevel = Math.min(.025, depth / 4);
  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 20, steps: 1 });
  geometry.translate(0, 0, -depth / 2);
  const mesh = new Mesh(geometry, surface); mesh.position.z = z; parent.add(mesh);
}
class Headband extends Curve<Vector3> {
  constructor(private inset = 0) { super(); }
  getPoint(t: number, target = new Vector3()) {
    const angle = Math.PI * t;
    return target.set(Math.cos(angle) * (1.04 - this.inset), Math.sin(angle) * (1.32 - this.inset) + .12, 0);
  }
}
function headphones() {
  const root = new Group();
  const silver = material('#cdd6e1', .24, .72), blue = material('#6e9de2', .26, .25);
  const cushion = material('#283749', .86), inner = material('#182535', .98);
  root.add(new Mesh(new TubeGeometry(new Headband(), 64, .105, 12, false), silver));
  root.add(new Mesh(new TubeGeometry(new Headband(.035), 64, .07, 12, false), cushion));
  for (const side of [-1, 1]) {
    const ear = new Group(); ear.position.set(side * 1.02, -.38, 0); ear.rotation.z = side * -.08;
    root.add(ear);
    box(ear, [.12, .55, .17], .05, silver, [0, .52, -.02]);
    capsule(ear, .59, 1.08, .38, blue, -.04);
    capsule(ear, .49, .96, .18, cushion, .23);
    capsule(ear, .29, .65, .012, inner, .357);
    box(ear, [.065, .2, .055], .025, silver, [side * .29, -.15, -.06]);
  }
  return root;
}
function house() {
  const root = new Group();
  const plaster = material('#f7f1e8', .72), roof = material('#c98f77', .5);
  const frame = material('#fffaf0', .6), glass = material('#829fb8', .16, .35);
  box(root, [1.72, 1.4, 1.42], .065, plaster, [0, -.25, 0]);
  const outline = new Shape();
  outline.moveTo(-1.03, .45); outline.lineTo(0, 1.3); outline.lineTo(1.03, .45); outline.closePath();
  const geometry = new ExtrudeGeometry(outline, { depth: 1.62, bevelEnabled: true, bevelThickness: .055, bevelSize: .055, bevelSegments: 4, curveSegments: 16, steps: 1 });
  geometry.translate(0, 0, -.81);
  root.add(new Mesh(geometry, roof));
  box(root, [.26, .57, .31], .035, plaster, [.57, .99, -.35]);
  box(root, [.4, .73, .055], .035, material('#607991', .45), [.38, -.585, .735]);
  const knob = new Mesh(new SphereGeometry(.035, 16, 12), material('#d9bb7e', .3, .6)); knob.position.set(.49, -.6, .78); root.add(knob);
  box(root, [.58, .09, .27], .025, frame, [.38, -.98, .78]);
  box(root, [.51, .53, .065], .035, frame, [-.4, -.18, .74]);
  box(root, [.41, .43, .03], .025, glass, [-.4, -.18, .785]);
  box(root, [.035, .45, .035], .01, frame, [-.4, -.18, .81]);
  box(root, [.43, .035, .035], .01, frame, [-.4, -.18, .81]);
  // Side window remains visible in the three-quarter view.
  box(root, [.055, .51, .55], .025, frame, [.875, -.18, .03]);
  box(root, [.03, .41, .45], .012, glass, [.91, -.18, .03]);
  return root;
}
function moon() {
  const root = new Group();
  const outline = new Shape();
  const tipX = .59, tipY = Math.sqrt(1.18 ** 2 - tipX ** 2);
  outline.moveTo(tipX, tipY);
  outline.absarc(0, 0, 1.18, Math.PI / 3, Math.PI * 5 / 3, false);
  outline.quadraticCurveTo(-1.4, 0, tipX, tipY);
  const geometry = new ExtrudeGeometry(outline, { depth: .36, bevelEnabled: true, bevelThickness: .09, bevelSize: .09, bevelSegments: 7, curveSegments: 48, steps: 1 });
  geometry.translate(.2, 0, -.18);
  root.add(new Mesh(geometry, material('#f4d58f', .35, .12)));
  root.rotation.z = -.12;
  return root;
}

export type TopicScene = ReturnType<typeof createTopicScene>;
export function createTopicScene(host: HTMLDivElement, visuals: HTMLElement[], onFailure: () => void) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  try { return mountScene(host, visuals, onFailure, renderer); }
  catch (error) { renderer.dispose(); renderer.forceContextLoss(); throw error; }
}
function mountScene(host: HTMLDivElement, visuals: HTMLElement[], onFailure: () => void, renderer: WebGLRenderer) {
  renderer.setClearColor(0xffffff, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 1.25 : 1.5));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.autoClear = true;
  renderer.domElement.dataset.topicCanvas = 'true';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new Scene();
  const environment = new RoomEnvironment();
  const generator = new PMREMGenerator(renderer);
  const environmentMap = generator.fromScene(environment, .04);
  environment.dispose(); generator.dispose();
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = .7;
  scene.add(new HemisphereLight(0xffffff, 0xb8c4d6, .9));
  const key = new DirectionalLight(0xfff7ec, 2); key.position.set(-3, 6, 6); scene.add(key);
  const rim = new DirectionalLight(0xe0ecff, 2); rim.position.set(4, 3, -4); scene.add(rim);
  const camera = new OrthographicCamera(-3, 3, 2, -2, .1, 30);
  camera.position.set(0, 1.3, 9); camera.lookAt(0, 0, 0);
  const models = [headphones(), house(), moon()];
  const yaw = [-.3, -.5, -.22];
  models.forEach(model => scene.add(model));
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = 128; shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(34,49,72,.18)'); gradient.addColorStop(.4, 'rgba(34,49,72,.08)'); gradient.addColorStop(1, 'rgba(34,49,72,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  const shadowTexture = new CanvasTexture(shadowCanvas);
  const shadow = new Mesh(new PlaneGeometry(3.6, 2.8), new MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.45; scene.add(shadow);

  // Copy one WebGL render into each face's 2D surface. CSS perspective then
  // rotates the actual artwork plane, rather than an axis-aligned overlay.
  const surfaces = visuals.map(element => {
    const canvas = document.createElement('canvas');
    canvas.dataset.topicSurface = 'true'; canvas.setAttribute('aria-hidden', 'true');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to create topic face surface');
    element.append(canvas);
    return { canvas, context };
  });
  let visible = false, disposed = false, raf = 0, renders = 0, dirty = true;
  const requestRender = () => { if (!disposed && visible && !document.hidden && dirty && !raf) raf = requestAnimationFrame(render); };
  function render() {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    visuals.forEach((element, index) => {
      // Layout sizes are intentionally independent of the CSS turn angle.
      const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight);
      renderer.setSize(width, height, false);
      models.forEach((model, i) => { model.visible = i === index; });
      models[index].rotation.y = yaw[index];
      const halfHeight = Math.max(1.85, 1.6 * height / width);
      camera.left = -halfHeight * width / height; camera.right = -camera.left;
      camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      const { canvas, context } = surfaces[index];
      canvas.width = renderer.domElement.width; canvas.height = renderer.domElement.height;
      context.drawImage(renderer.domElement, 0, 0);
    });
    dirty = false;
    host.dataset.renderCount = String(++renders); host.dataset.renderState = 'idle';
  }
  const resize = () => { dirty = true; requestRender(); };
  const show = () => {
    if (!visible || document.hidden) { cancelAnimationFrame(raf); raf = 0; host.dataset.renderState = 'offscreen'; }
    else { host.dataset.renderState = 'idle'; requestRender(); }
  };
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; show(); });
  const resizeObserver = new ResizeObserver(resize);
  const lose = (event: Event) => { event.preventDefault(); onFailure(); };
  renderer.domElement.addEventListener('webglcontextlost', lose);
  document.addEventListener('visibilitychange', show);
  host.append(renderer.domElement);
  resize(); intersection.observe(host); resizeObserver.observe(host);
  visuals.forEach(element => resizeObserver.observe(element));
  host.dataset.renderState = 'offscreen';
  return {
    requestRender,
    dispose() {
      disposed = true; cancelAnimationFrame(raf);
      intersection.disconnect(); resizeObserver.disconnect(); document.removeEventListener('visibilitychange', show);
      renderer.domElement.removeEventListener('webglcontextlost', lose);
      const geometries = new Set<BufferGeometry>(), materials = new Set<Material>();
      scene.traverse((node) => { if (node instanceof Mesh) { geometries.add(node.geometry); (Array.isArray(node.material) ? node.material : [node.material]).forEach((m) => materials.add(m)); } });
      geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
      shadowTexture.dispose(); environmentMap.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
      surfaces.forEach(({ canvas }) => canvas.remove());
      delete host.dataset.renderState; delete host.dataset.renderCount;
    },
  };
}
