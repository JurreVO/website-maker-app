const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07111f);
scene.fog = new THREE.Fog(0x07111f, 80, 220);

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

const light = new THREE.DirectionalLight(0x9dc0ff, 1.3);
light.position.set(20, 35, 20);
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
scene.add(light);

const rimLight = new THREE.DirectionalLight(0x3a5f8f, 0.6);
rimLight.position.set(-20, 10, -20);
scene.add(rimLight);

const ambientLight = new THREE.AmbientLight(0x22304a, 0.95);
scene.add(ambientLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500, 200, 200),
  new THREE.MeshPhongMaterial({ color: 0x4c9a4c, shininess: 12 })
);
ground.receiveShadow = true;

ground.rotation.x = -Math.PI / 2;
scene.add(ground);

let plane;
let clouds = [];
let collisionObjects = [];
let skyMode = "dark";
let thunderFlash = 0;
let thunderTimer = 0;
let rainDrops = [];
let rainTimer = 0;
let rainActive = false;

function getSkySettings(mode) {
  if (mode === "light") {
    return {
      background: 0x87ceeb,
      fog: 0x87ceeb,
      directional: 0xffffff,
      directionalIntensity: 2.2,
      rim: 0x80bfff,
      rimIntensity: 0.8,
      ambient: 0xbfdfff,
      ambientIntensity: 0.9,
      cloudColor: 0xffffff,
      cloudOpacity: 0.9,
      groundColor: 0x4c9a4c
    };
  }

  return {
    background: 0x07111f,
    fog: 0x07111f,
    directional: 0x9dc0ff,
    directionalIntensity: 1.3,
    rim: 0x3a5f8f,
    rimIntensity: 0.6,
    ambient: 0x22304a,
    ambientIntensity: 0.95,
    cloudColor: 0xe8f1ff,
    cloudOpacity: 0.45,
    groundColor: 0x223b1f
  };
}

function setSkyMode(mode) {
  skyMode = mode;
  const settings = getSkySettings(mode);

  if (mode === "dark") {
    thunderTimer = 0;
    thunderFlash = 0;
  }

  scene.background.setHex(settings.background);
  scene.fog.color.setHex(settings.fog);
  light.color.setHex(settings.directional);
  light.intensity = settings.directionalIntensity;
  rimLight.color.setHex(settings.rim);
  rimLight.intensity = settings.rimIntensity;
  ambientLight.color.setHex(settings.ambient);
  ambientLight.intensity = settings.ambientIntensity;
  ground.material.color.setHex(settings.groundColor);
  document.body.style.backgroundColor = `#${settings.background.toString(16).padStart(6, "0")}`;

  clouds.forEach((cloud) => {
    cloud.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        obj.material.color.setHex(settings.cloudColor);
        obj.material.opacity = settings.cloudOpacity;
      }
    });
  });
}

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

  plane.position.set(14, 3, -8);

  scene.add(plane);
}

buildPlane("jet");

camera.position.set(14, 8, 2);

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
  const settings = getSkySettings(skyMode);

  const cloudMaterial = new THREE.MeshPhongMaterial({
    color: settings.cloudColor,
    transparent: true,
    opacity: settings.cloudOpacity,
    shininess: 20
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

  for (let i = 0; i < 18; i++) {
    const x = Math.random() * 220 - 110;
    const z = Math.random() * 220 - 110;
    const scale = 0.8 + Math.random() * 1.2;
    createCloud(x, z, scale);
  }
}

function createRain() {
  rainDrops.forEach((drop) => scene.remove(drop));
  rainDrops = [];

  for (let i = 0; i < 300; i++) {
    const drop = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.6, 0.03),
      new THREE.MeshBasicMaterial({ color: 0x8fb8ff })
    );
    drop.position.set(
      Math.random() * 220 - 110,
      20 + Math.random() * 40,
      Math.random() * 220 - 110
    );
    scene.add(drop);
    rainDrops.push(drop);
  }
}

function startRainCycle() {
  rainActive = true;
  createRain();
  rainTimer = 0;
}

function stopRain() {
  rainActive = false;
  rainDrops.forEach((drop) => scene.remove(drop));
  rainDrops = [];
}

buildClouds();
setSkyMode("dark");
startRainCycle();

function collidesWithObstacles(position) {
  const planeRadius = 1.2;
  const planeHeight = 0.8;

  if (position.y < 1.2) return true;

  return collisionObjects.some((obj) => {
    const horizontalHit =
      Math.abs(position.x - obj.x) < obj.width / 2 + planeRadius &&
      Math.abs(position.z - obj.z) < obj.depth / 2 + planeRadius;

    const verticalHit = position.y + planeHeight > 0 && position.y - planeHeight < obj.height;

    return horizontalHit && verticalHit;
  });
}

function animate() {
  requestAnimationFrame(animate);

  if (keys["ArrowLeft"]) viewState.yaw += 0.03;
  if (keys["ArrowRight"]) viewState.yaw -= 0.03;

  const forward = new THREE.Vector3(Math.sin(viewState.yaw), 0, Math.cos(viewState.yaw)).normalize();
  const right = new THREE.Vector3(Math.cos(viewState.yaw), 0, -Math.sin(viewState.yaw)).normalize();
  const move = new THREE.Vector3();

  if (keys["w"]) move.sub(forward);
  if (keys["s"]) move.add(forward);
  if (keys["a"]) move.sub(right);
  if (keys["d"]) move.add(right);
  if (keys["ArrowLeft"]) move.sub(right).add(forward.clone().multiplyScalar(0.35));
  if (keys["ArrowRight"]) move.add(right).add(forward.clone().multiplyScalar(0.35));

  const nextPosition = plane.position.clone();
  nextPosition.addScaledVector(move, 0.2);

  if (keys["ArrowUp"]) nextPosition.y += 0.2;
  if (keys["ArrowDown"]) nextPosition.y -= 0.2;
  if (keys["q"]) nextPosition.y += 0.2;
  if (keys["e"]) nextPosition.y -= 0.2;

  nextPosition.y = Math.max(1.2, nextPosition.y);

  if (!collidesWithObstacles(nextPosition)) {
    plane.position.copy(nextPosition);
  }

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
    cloud.position.x += Math.sin(Date.now() * 0.00025 + index) * 0.01;
    cloud.position.z += Math.cos(Date.now() * 0.00018 + index) * 0.008;

    if (cloud.position.x > 140) cloud.position.x = -140;
    if (cloud.position.x < -140) cloud.position.x = 140;
    if (cloud.position.z > 140) cloud.position.z = -140;
    if (cloud.position.z < -140) cloud.position.z = 140;
  });

  if (skyMode === "dark") {
    thunderTimer += 1;
    if (thunderTimer > 120 && Math.random() < 0.02) {
      thunderFlash = 1;
      thunderTimer = 0;
    }

    thunderFlash = Math.max(0, thunderFlash - 0.08);
    ambientLight.intensity = 0.95 - thunderFlash * 0.8;
    light.intensity = (skyMode === "dark" ? 1.3 : 2.2) + thunderFlash * 1.8;
    light.color.setHSL(0.12, 0.9, 0.7 - thunderFlash * 0.3);
    rimLight.color.setHSL(0.12, 0.8, 0.5 + thunderFlash * 0.2);
  } else {
    thunderFlash = 0;
  }

  rainTimer += 1;
  if (rainActive && rainTimer > 1800) {
    stopRain();
    rainActive = false;
    rainTimer = 0;
  } else if (!rainActive && rainTimer > 7200) {
    startRainCycle();
    rainTimer = 0;
  }

  if (rainActive) {
    rainDrops.forEach((drop) => {
      drop.position.y -= 0.8;
      if (drop.position.y < 0) {
        drop.position.y = 20 + Math.random() * 40;
        drop.position.x = Math.random() * 220 - 110;
        drop.position.z = Math.random() * 220 - 110;
      }
    });
  }

  camera.position.lerp(desiredPosition, 0.05);
  camera.lookAt(plane.position);

  renderer.render(scene, camera);
}

animate();

let buildings = [];

function clearCity() {
  for (let b of buildings) scene.remove(b);
  buildings = [];
  collisionObjects = [];
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
    collisionObjects.push({ x: box.position.x, z: box.position.z, width: w, depth: d, height: h });

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
    collisionObjects.push({ x: 0, z: 0, width: 12, depth: 12, height: 30 });
  }
}

function city(name) {
  if (name === "newyork") makeCity(name, 0x666666);
  if (name === "paris") makeCity(name, 0xd2b48c);

  if (plane) {
    plane.position.set(14, 3, -8);
    camera.position.set(14, 8, 2);
  }
}

city("newyork");

function changePlane(type) {
  buildPlane(type);
}
