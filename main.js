import WindowManager from "./WindowManager.js";

const t = THREE;
let camera, scene, renderer, world;
let near, far;
let pixR = window.devicePixelRatio ? window.devicePixelRatio : 1;
let shapes = [];
let sceneOffsetTarget = { x: 0, y: 0 };
let sceneOffset = { x: 0, y: 0 };

let today = new Date();
today.setHours(0);
today.setMinutes(0);
today.setSeconds(0);
today.setMilliseconds(0);
today = today.getTime();

let internalTime = getTime();
let windowManager;
let initialized = false;

// get time in seconds since beginning of the day (so that all windows use the same time)
function getTime() {
  return (new Date().getTime() - today) / 1000.0;
}

if (new URLSearchParams(window.location.search).get("clear")) {
  localStorage.clear();
} else {
  // this code is essential to circumvent that some browsers preload the content of some pages before you actually hit the url
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState != "hidden" && !initialized) {
      init();
    }
  });

  window.onload = () => {
    if (document.visibilityState != "hidden") {
      init();
    }
  };

  function init() {
    initialized = true;

    // add a short timeout because window.offsetX reports wrong values before a short period
    setTimeout(() => {
      setupScene();
      setupWindowManager();
      resize();
      updateWindowShape(false);
      render();
      window.addEventListener("resize", resize);
    }, 500);
  }

  function setupScene() {
    camera = new t.OrthographicCamera(
      0,
      0,
      window.innerWidth,
      window.innerHeight,
      -10000,
      10000
    );

    camera.position.z = 2.5;
    near = camera.position.z - 0.5;
    far = camera.position.z + 0.5;

    scene = new t.Scene();
    scene.background = new t.Color(0.0);
    scene.add(camera);

    renderer = new t.WebGLRenderer({ antialias: true, depthBuffer: true });
    renderer.setPixelRatio(pixR);

    world = new t.Object3D();
    scene.add(world);

    renderer.domElement.setAttribute("id", "scene");
    document.body.appendChild(renderer.domElement);
  }

  function setupWindowManager() {
    windowManager = new WindowManager();
    windowManager.setWinShapeChangeCallback(updateWindowShape);
    windowManager.setWinChangeCallback(windowsUpdated);

    // here you can add your custom metadata to each windows instance
    let metaData = { foo: "bar" };

    // this will init the windowmanager and add this window to the centralised pool of windows
    windowManager.init(metaData);

    // call update windows initially (it will later be called by the win change callback)
    windowsUpdated();
  }

  function windowsUpdated() {
    updateNumberOfshapes();
  }

  function updateNumberOfshapes() {
    let wins = windowManager.getWindows();

    // remove all shapes
    shapes.forEach((c) => {
      world.remove(c);
    });
    shapes = [];

    // add new shapes based on the current window setup
    for (let i = 0; i < wins.length; i++) {
      let win = wins[i];

      let c = new t.Color();
      c.setHSL(i * 0.1, 1.0, 0.5);

      let s = 40 + i * 5;
      let shape = getShape(c);
      shape.position.x = win.shape.x + win.shape.w * 0.5;
      shape.position.y = win.shape.y + win.shape.h * 0.5;

      world.add(shape);
      shapes.push(shape);
    }
  }
  const getShape = (color) => {
    let ptsT = getRandomPointsOnTorus(90, 30, 50000);
    let gt = new t.BufferGeometry().setFromPoints(ptsT);
    let mt = new t.PointsMaterial({ size: 0.1, color: color });
    let shape = new t.Points(gt, mt);
    return shape;
  };

  function updateWindowShape(easing = true) {
    // storing the actual offset in a proxy that we update against in the render function
    sceneOffsetTarget = { x: -window.screenX, y: -window.screenY };
    if (!easing) sceneOffset = sceneOffsetTarget;
  }

  function render() {
    let t = getTime();

    windowManager.update();

    // calculate the new position based on the delta between current offset and new offset times a falloff value (to create the nice smoothing effect)
    let falloff = 0.05;
    sceneOffset.x =
      sceneOffset.x + (sceneOffsetTarget.x - sceneOffset.x) * falloff;
    sceneOffset.y =
      sceneOffset.y + (sceneOffsetTarget.y - sceneOffset.y) * falloff;

    // set the world position to the offset
    world.position.x = sceneOffset.x;
    world.position.y = sceneOffset.y;

    let wins = windowManager.getWindows();

    // loop through all our shapes and update their positions based on current window positions
    for (let i = 0; i < shapes.length; i++) {
      let shape = shapes[i];
      let win = wins[i];
      let _t = t; // + i * .2;

      let posTarget = {
        x: win.shape.x + win.shape.w * 0.5,
        y: win.shape.y + win.shape.h * 0.5,
      };

      shape.position.x =
        shape.position.x + (posTarget.x - shape.position.x) * falloff;
      shape.position.y =
        shape.position.y + (posTarget.y - shape.position.y) * falloff;
      shape.rotation.x = _t * 0.5;
      shape.rotation.y = _t * 0.3;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  // resize the renderer to fit the window size
  function resize() {
    let width = window.innerWidth;
    let height = window.innerHeight;

    camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
}
function getRandomPointsOnTorus(R, r, count = 1000) {
  let pts = [];

  let counter = 0;
  let COUNT = count;
  let U, V, W;
  while (counter < COUNT) {
    U = Math.random();
    V = Math.random();
    W = Math.random();
    let theta = 2 * Math.PI * U;
    let phi = 2 * Math.PI * V;
    if (W <= (R + r * Math.cos(theta)) / (R + r)) {
      pts.push(
        new THREE.Vector3(
          (R + r * Math.cos(theta)) * Math.cos(phi),
          (R + r * Math.cos(theta)) * Math.sin(phi),
          r * Math.sin(theta)
        )
      );
      counter++;
    }
  }
  return pts;
}
