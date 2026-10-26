import { Color, Mesh, PerspectiveCamera, Scene, ShaderMaterial, TorusGeometry, WebGLRenderer } from "three";

// Original iridescent shader. Lighting and thin-film bands are evaluated on the GPU.
const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec3 p = position;
    float angle = atan(p.y, p.x);
    p.z += 0.075 * sin(angle * 5.0 + uTime * 0.85);
    vPosition = (modelViewMatrix * vec4(p, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const fragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform vec3 uLilac;
  uniform vec3 uLime;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 view = normalize(-vPosition);
    float fresnel = pow(1.0 - abs(dot(n, view)), 2.0);
    float angle = atan(vPosition.y, vPosition.x);
    float ribbon = sin(angle * 3.0 + n.z * 4.5 - uTime * 1.15) * 0.5 + 0.5;
    vec3 base = mix(uLilac, uLime, smoothstep(0.2, 0.85, ribbon));
    float bands = sin(n.z * 32.0 + angle * 5.0 + uTime * 1.4) * 0.5 + 0.5;
    base = mix(base, vec3(0.94, 0.95, 0.87), bands * 0.24);
    vec3 light = normalize(vec3(cos(uTime * 0.85) * 1.7, sin(uTime * 0.85) * 1.4, 2.0));
    float diffuse = max(dot(n, light), 0.0);
    float specular = pow(max(dot(reflect(-light, n), view), 0.0), 42.0);
    vec3 color = base * (0.34 + diffuse * 0.66) + vec3(0.95, 0.97, 1.0) * specular * 0.7;
    float sweep = pow(max(cos(angle - uTime * 1.1), 0.0), 16.0);
    color += vec3(0.5, 0.45, 0.62) * sweep * (0.3 + fresnel * 0.4);
    color += mix(uLilac, vec3(0.84, 0.97, 0.78), ribbon) * fresnel * 0.36;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createPrism(host: HTMLDivElement) {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 760 ? 1.25 : 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.dataset.prismRenderer = "true";
  renderer.domElement.setAttribute("aria-hidden", "true");
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 30);
  camera.position.z = 9.2;
  const geometry = new TorusGeometry(1.95, 0.49, 40, 140);
  const material = new ShaderMaterial({
    vertexShader, fragmentShader,
    uniforms: { uTime: { value: 0 }, uLilac: { value: new Color("#a28adb") }, uLime: { value: new Color("#c5df8e") } },
  });
  const ring = new Mesh(geometry, material);
  ring.rotation.set(0.28, -0.32, -0.32);
  scene.add(ring);
  host.appendChild(renderer.domElement);
  let visible = false;
  let paused = false;
  let lost = false;
  let disposed = false;
  let elapsed = 0;
  let previous = 0;
  const render = (time: number) => {
    if (previous) elapsed += Math.min((time - previous) / 1000, 0.25);
    previous = time;
    material.uniforms.uTime.value = elapsed;
    ring.rotation.z = -0.32 + Math.sin(elapsed * 0.45) * 0.14;
    ring.rotation.y = -0.32 + Math.sin(elapsed * 0.32) * 0.16;
    renderer.render(scene, camera);
  };
  const sync = () => {
    if (disposed) return;
    previous = 0;
    const active = visible && !paused && !document.hidden && !lost;
    renderer.setAnimationLoop(active ? render : null);
    host.dataset.prismState = lost ? "lost" : active ? "running" : "paused";
  };
  const resize = () => {
    if (disposed || lost) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  const onLost = (event: Event) => { event.preventDefault(); lost = true; host.removeAttribute("data-ready"); sync(); };
  const onRestored = () => { lost = false; resize(); host.dataset.ready = "true"; sync(); };
  renderer.domElement.addEventListener("webglcontextlost", onLost);
  renderer.domElement.addEventListener("webglcontextrestored", onRestored);
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  const sizeObserver = new ResizeObserver(resize);
  observer.observe(host);
  sizeObserver.observe(host);
  document.addEventListener("visibilitychange", sync);
  resize();
  host.dataset.ready = "true";
  return {
    setPaused(value: boolean) { paused = value; sync(); },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      sizeObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onRestored);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      host.removeAttribute("data-ready");
      host.removeAttribute("data-prism-state");
    },
  };
}
