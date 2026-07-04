// Optimized 3D Background — floating geometric objects + star field
// Drop into index.html as <script type="module" src="background-optimized.js"></script>

import * as THREE from 'https://unpkg.com/three@0.165.0/build/three.module.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const MAX_PARTICLES = isMobile ? 1200 : 2000;
const OBJECT_COUNT = isMobile ? 12 : 24;

const canvas = document.getElementById('bg-canvas');
if (!canvas) throw new Error('#bg-canvas not found');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
camera.position.z = 30;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

scene.fog = new THREE.FogExp2(0x000000, 0.006);

const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(MAX_PARTICLES * 3);
const starSizes = new Float32Array(MAX_PARTICLES);
const starAlphas = new Float32Array(MAX_PARTICLES);
const starSpeeds = new Float32Array(MAX_PARTICLES);

for (let i = 0; i < MAX_PARTICLES; i++) {
  const radius = 40 + Math.random() * 80;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
  starPositions[i * 3 + 2] = radius * Math.cos(phi);
  starSizes[i] = Math.random() * 1.2 + 0.3;
  starAlphas[i] = Math.random() * 0.6 + 0.3;
  starSpeeds[i] = Math.random() * 0.0008 + 0.0002;
}

starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
starGeometry.setAttribute('alpha', new THREE.BufferAttribute(starAlphas, 1));

const starMaterial = new THREE.PointsMaterial({
  size: 1.5,
  vertexColors: false,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true,
});

const starUniforms = { uTime: { value: 0 }, uScroll: { value: 0 } };
starMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = starUniforms.uTime;
  shader.uniforms.uScroll = starUniforms.uScroll;
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `#include <common>
    uniform float uTime;
    uniform float uScroll;
    attribute float size;
    attribute float alpha;
    varying float vAlpha;
    varying float vSize;`
  ).replace(
    '#include <color_vertex>',
    `#include <color_vertex>
    vAlpha = alpha;
    vSize = size;
    float parallax = uScroll * 0.3;
    vec3 pos = position;
    pos.z += parallax * 20.0;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z) * uPixelRatio;`
  );
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <common>',
    `#include <common>
    varying float vAlpha;
    varying float vSize;`
  ).replace(
    'gl_FragColor = vec4( diffuse, opacity );',
    `float dist = length(gl_PointCoord - 0.5);
    float mask = smoothstep(0.5, 0.1, dist);
    vec3 color = mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.95, 0.8), vSize);
    gl_FragColor = vec4(color, mask * vAlpha * opacity);`
  );
};

const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

const geometries = [
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.OctahedronGeometry(0.8, 0),
  new THREE.IcosahedronGeometry(0.7, 0),
  new THREE.TetrahedronGeometry(0.9, 0),
];

const objectMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x00b4c8,
  metalness: 0.3,
  roughness: 0.4,
  transmission: 0.15,
  thickness: 0.5,
  transparent: true,
  opacity: 0.25,
  depthWrite: false,
  blending: THREE.NormalBlending,
  clearcoat: 0.3,
  clearcoatRoughness: 0.2,
});

const dummy = new THREE.Object3D();
const objects = new THREE.InstancedMesh(
  geometries[0],
  objectMaterial,
  OBJECT_COUNT
);
objects.instanceMatrix.setUsage(THREE.DynamicDrawName);
objects.instanceColor = null;

const objectData = [];
for (let i = 0; i < OBJECT_COUNT; i++) {
  const geo = geometries[Math.floor(Math.random() * geometries.length)];
  const scale = 0.6 + Math.random() * 1.2;
  const pos = new THREE.Vector3(
    (Math.random() - 0.5) * 60,
    (Math.random() - 0.5) * 40,
    (Math.random() - 0.5) * 60 - 20
  );
  const rotSpeed = new THREE.Vector3(
    (Math.random() - 0.5) * 0.002,
    (Math.random() - 0.5) * 0.002,
    (Math.random() - 0.5) * 0.002
  );
  const driftSpeed = (Math.random() - 0.5) * 0.008;
  const baseY = pos.y;

  dummy.position.copy(pos);
  dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
  dummy.scale.setScalar(scale);
  dummy.updateMatrix();
  objects.setMatrixAt(i, dummy.matrix);

  objectData.push({ pos, rotSpeed, driftSpeed, baseY, scale, geoIndex: geometries.indexOf(geo) });
}
scene.add(objects);

const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0x00ffff, 0.6);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);
const dirLight2 = new THREE.DirectionalLight(0xff6b00, 0.3);
dirLight2.position.set(-10, -10, -10);
scene.add(dirLight2);

let scrollY = 0;
let targetScrollY = 0;
let currentScrollY = 0;

function onScroll() {
  targetScrollY = window.scrollY;
}
window.addEventListener('scroll', onScroll, { passive: true });

let mouseX = 0, mouseY = 0;
window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / innerWidth - 0.5) * 2;
  mouseY = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  starMaterial.uniforms.uPixelRatio?.value = Math.min(devicePixelRatio, 2);
}
window.addEventListener('resize', resize);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  starUniforms.uTime.value = elapsed;
  currentScrollY += (targetScrollY - currentScrollY) * 0.08;
  starUniforms.uScroll.value = currentScrollY * 0.001;

  camera.position.y = currentScrollY * 0.05;
  camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.02;
  camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.02;
  camera.lookAt(0, currentScrollY * 0.05, 0);

  stars.rotation.y += 0.00005;

  for (let i = 0; i < OBJECT_COUNT; i++) {
    const d = objectData[i];
    d.pos.y = d.baseY + Math.sin(elapsed * 0.3 + i) * 1.5 + currentScrollY * 0.02;
    d.pos.x += d.driftSpeed;
    if (d.pos.x > 35) d.pos.x = -35;
    if (d.pos.x < -35) d.pos.x = 35;

    dummy.position.copy(d.pos);
    dummy.rotation.x += d.rotSpeed.x;
    dummy.rotation.y += d.rotSpeed.y;
    dummy.rotation.z += d.rotSpeed.z;
    dummy.scale.setScalar(d.scale);
    dummy.updateMatrix();
    objects.setMatrixAt(i, dummy.matrix);
  }
  objects.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
}

if (!prefersReducedMotion) {
  animate();
} else {
  renderer.render(scene, camera);
}

function cleanup() {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', resize);
  starGeometry.dispose();
  starMaterial.dispose();
  geometries.forEach(g => g.dispose());
  objectMaterial.dispose();
  objects.dispose();
  renderer.dispose();
}
window.addEventListener('beforeunload', cleanup);

export { scene, camera, renderer, cleanup };