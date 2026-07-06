const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(20, 30, 20);
scene.add(light);

scene.add(new THREE.AmbientLight(0xffffff, 1));

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshLambertMaterial({ color: 0x55aa55 })
);

ground.rotation.x = -Math.PI / 2;
scene.add(ground);

let plane;

function buildPlane(type) {
  if (plane) scene.remove(plane);

  plane = new THREE.Group();

  let color = 0xff0000;

  if (type === "jet") color = 0x666666;
  if (type === "prop") color = 0x00aa00;
  if (type === "airliner") color = 0xffffff;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.4, 0.4),
    new THREE.MeshLambertMaterial({ color })
  );

  plane.add(body);

  const wing = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.05, 2),
    new THREE.MeshLambertMaterial({ color })
  );

  plane.add(wing);

  plane.position.y = 3;

  scene.add(plane);
}

buildPlane("jet");

camera.position.set(0, 5, 10);

const keys = {};

document.addEventListener("keydown", (e) => (keys[e.key] = true));
document.addEventListener("keyup", (e) => (keys[e.key] = false));

function animate() {
  requestAnimationFrame(animate);

  if (keys["w"]) plane.position.z -= 0.2;
  if (keys["s"]) plane.position.z += 0.2;

  if (keys["a"]) plane.position.x -= 0.2;
  if (keys["d"]) plane.position.x += 0.2;

  if (keys["q"]) plane.position.y += 0.2;
  if (keys["e"]) plane.position.y -= 0.2;

  camera.position.lerp(
    new THREE.Vector3(plane.position.x, plane.position.y + 4, plane.position.z + 10),
    0.05
  );

  camera.lookAt(plane.position);

  renderer.render(scene, camera);
}

animate();

let buildings = [];

function clearCity() {
  for (let b of buildings) scene.remove(b);
  buildings = [];
}

function makeCity(color) {
  clearCity();

  for (let i = 0; i < 150; i++) {
    const h = Math.random() * 8 + 2;

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(2, h, 2),
      new THREE.MeshLambertMaterial({ color })
    );

    box.position.x = Math.random() * 200 - 100;
    box.position.z = Math.random() * 200 - 100;
    box.position.y = h / 2;

    scene.add(box);
    buildings.push(box);
  }
}

function city(name) {
  if (name === "newyork") makeCity(0x666666);
  if (name === "paris") makeCity(0xd2b48c);
  if (name === "tokyo") makeCity(0x4444ff);
}

city("newyork");

function changePlane(type) {
  buildPlane(type);
}
