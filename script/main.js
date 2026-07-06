const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 80, 220);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 2.2);
light.position.set(20, 35, 20);
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
scene.add(light);

const rimLight = new THREE.DirectionalLight(0x80bfff, 0.8);
rimLight.position.set(-20, 10, -20);
scene.add(rimLight);

scene.add(new THREE.AmbientLight(0xbfdfff, 0.9));

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500, 200, 200),
  new THREE.MeshPhongMaterial({ color: 0x4c9a4c, shininess: 12 })
);
ground.receiveShadow = true;

ground.rotation.x = -Math.PI / 2;
scene.add(ground);

let plane;
let clouds = [];

function buildPlane(type) {
  if (plane) scene.remove(plane);

  plane = new THREE.Group();

  let color = 0xff0000;

  if (type === "jet") color = 0x666666;
  if (type === "prop") color = 0x00aa00;
  if (type === "airliner") color = 0xffffff;

  const fuselage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 2.2, 12),
    new THREE.MeshPhongMaterial({ color, shininess: 80 })
  );
  fuselage.rotation.z = Math.PI / 2;
  plane.add(fuselage);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.5, 12),
    new THREE.MeshPhongMaterial({ color, shininess: 80 })
  );
  nose.position.x = 1.2;
  plane.add(nose);

  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.45, 0.7),
    new THREE.MeshPhongMaterial({ color, shininess: 80 })
  );
  tail.position.set(-1.1, 0.05, 0);
  plane.add(tail);

  const wingLeft = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.05, 0.9),
    new THREE.MeshPhongMaterial({ color, shininess: 80 })
  );
  wingLeft.position.set(0.1, 0.02, 0.7);
  plane.add(wingLeft);

  const wingRight = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.05, 0.9),
    new THREE.MeshPhongMaterial({ color, shininess: 80 })
  );
  wingRight.position.set(0.1, 0.02, -0.7);
  plane.add(wingRight);

  const cockpit = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.28, 0.28),
    new THREE.MeshPhongMaterial({ color: 0x111111, shininess: 90 })
  );
  cockpit.position.set(0.55, 0.12, 0);
  plane.add(cockpit);

  plane.position.y = 3;

  scene.add(plane);
}

buildPlane("jet");

camera.position.set(0, 5, 10);

const keys = {};
const viewState = {
  yaw: 0,
  pitch: -0.2,
};

function handleKey(event, isPressed) {
  keys[event.key] = isPressed;

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "w", "a", "s", "d", "q", "e"].includes(event.key)) {
    event.preventDefault();
  }
}

document.addEventListener("keydown", (e) => handleKey(e, true));
document.addEventListener("keyup", (e) => handleKey(e, false));

function createCloud(x, z, scale) {
  const group = new THREE.Group();

  const cloudMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    shininess: 30
  });

  const puff1 = new THREE.Mesh(new THREE.SphereGeometry(3 * scale, 12, 12), cloudMaterial);
  puff1.position.set(-2 * scale, 0, 0);
  group.add(puff1);

  const puff2 = new THREE.Mesh(new THREE.SphereGeometry(3.5 * scale, 12, 12), cloudMaterial);
  puff2.position.set(0, 0.5 * scale, 0);
  group.add(puff2);

  const puff3 = new THREE.Mesh(new THREE.SphereGeometry(2.8 * scale, 12, 12), cloudMaterial);
  puff3.position.set(2.2 * scale, 0, 0);
  group.add(puff3);

  group.position.set(x, 18 + Math.random() * 8, z);
  group.scale.setScalar(scale);
  scene.add(group);
  clouds.push(group);
  return group;
}

function buildClouds() {
  clouds.forEach((cloud) => scene.remove(cloud));
  clouds = [];

  for (let i = 0; i < 20; i++) {
    const x = Math.random() * 220 - 110;
    const z = Math.random() * 220 - 110;
    const scale = 0.8 + Math.random() * 1.2;
    createCloud(x, z, scale);
  }
}

buildClouds();

function animate() {
  requestAnimationFrame(animate);

  if (keys["ArrowLeft"]) viewState.yaw += 0.03;
  if (keys["ArrowRight"]) viewState.yaw -= 0.03;
  if (keys["ArrowUp"]) viewState.pitch = Math.max(-0.7, viewState.pitch - 0.03);
  if (keys["ArrowDown"]) viewState.pitch = Math.min(0.3, viewState.pitch + 0.03);

  const forward = new THREE.Vector3(Math.sin(viewState.yaw), 0, Math.cos(viewState.yaw)).normalize();
  const right = new THREE.Vector3(Math.cos(viewState.yaw), 0, -Math.sin(viewState.yaw)).normalize();
  const move = new THREE.Vector3();

  if (keys["w"]) move.sub(forward);
  if (keys["s"]) move.add(forward);
  if (keys["a"]) move.sub(right);
  if (keys["d"]) move.add(right);

  plane.position.addScaledVector(move, 0.2);

  if (keys["q"]) plane.position.y += 0.2;
  if (keys["e"]) plane.position.y -= 0.2;

  const distance = 12;
  const desiredPosition = new THREE.Vector3(
    plane.position.x + Math.sin(viewState.yaw) * distance,
    plane.position.y + 4 + Math.sin(viewState.pitch) * 4,
    plane.position.z + Math.cos(viewState.yaw) * distance
  );

  const lookDirection = new THREE.Vector3(
    Math.sin(viewState.yaw),
    Math.sin(viewState.pitch) * 0.5,
    Math.cos(viewState.yaw)
  ).normalize();

  const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    lookDirection
  );

  plane.quaternion.slerp(targetQuaternion, 0.08);

  clouds.forEach((cloud, index) => {
    cloud.position.x += Math.sin(Date.now() * 0.00015 + index) * 0.003;
    cloud.position.z += Math.cos(Date.now() * 0.0001 + index) * 0.002;
  });

  camera.position.lerp(desiredPosition, 0.05);
  camera.lookAt(plane.position);

  renderer.render(scene, camera);
}

animate();

let buildings = [];

function clearCity() {
  for (let b of buildings) scene.remove(b);
  buildings = [];
}

function makeCity(name, color) {
  clearCity();

  for (let i = 0; i < 90; i++) {
    const h = Math.random() * 8 + 2;
    const w = 2 + Math.random() * 2;
    const d = 2 + Math.random() * 2;

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshPhongMaterial({ color, shininess: 35 })
    );
    box.castShadow = true;
    box.receiveShadow = true;

    const bevel = new THREE.BoxGeometry(w * 0.95, h * 0.95, d * 0.95);
    const bevelMesh = new THREE.Mesh(
      bevel,
      new THREE.MeshPhongMaterial({ color: color, shininess: 35 })
    );
    bevelMesh.position.y = h / 2;
    bevelMesh.castShadow = true;
    bevelMesh.receiveShadow = true;

    box.position.x = Math.random() * 200 - 100;
    box.position.z = Math.random() * 200 - 100;
    box.position.y = h / 2;

    scene.add(box);
    scene.add(bevelMesh);
    buildings.push(box);
    buildings.push(bevelMesh);
  }

  if (name === "paris") {
    const tower = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(12, 3, 12),
      new THREE.MeshPhongMaterial({ color: 0x8b5a2b, shininess: 60 })
    );
    base.castShadow = true;
    base.receiveShadow = true;
    base.position.y = 1.5;
    tower.add(base);

    const legMaterial = new THREE.MeshPhongMaterial({ color: 0xbdbdbd, shininess: 80 });

    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(2, 24, 2), legMaterial);
    leg1.castShadow = true;
    leg1.receiveShadow = true;
    leg1.position.set(-3.5, 12, -3.5);
    tower.add(leg1);

    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(2, 24, 2), legMaterial);
    leg2.castShadow = true;
    leg2.receiveShadow = true;
    leg2.position.set(3.5, 12, -3.5);
    tower.add(leg2);

    const leg3 = new THREE.Mesh(new THREE.BoxGeometry(2, 24, 2), legMaterial);
    leg3.castShadow = true;
    leg3.receiveShadow = true;
    leg3.position.set(-3.5, 12, 3.5);
    tower.add(leg3);

    const leg4 = new THREE.Mesh(new THREE.BoxGeometry(2, 24, 2), legMaterial);
    leg4.castShadow = true;
    leg4.receiveShadow = true;
    leg4.position.set(3.5, 12, 3.5);
    tower.add(leg4);

    const middle = new THREE.Mesh(new THREE.BoxGeometry(8, 2.5, 8), legMaterial);
    middle.castShadow = true;
    middle.receiveShadow = true;
    middle.position.y = 24.5;
    tower.add(middle);

    const top = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), legMaterial);
    top.castShadow = true;
    top.receiveShadow = true;
    top.position.y = 29;
    tower.add(top);

    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 1.2), legMaterial);
    crossArm.castShadow = true;
    crossArm.receiveShadow = true;
    crossArm.position.set(0, 18, 0);
    crossArm.rotation.z = Math.PI / 4;
    tower.add(crossArm);

    tower.position.set(0, 0, 0);
    scene.add(tower);
    buildings.push(tower);
  }
}

function city(name) {
  if (name === "newyork") makeCity(name, 0x666666);
  if (name === "paris") makeCity(name, 0xd2b48c);
}

city("newyork");

function changePlane(type) {
  buildPlane(type);
}
