import {
    PerspectiveCamera, Scene, GridHelper, Mesh, SphereGeometry,
    CylinderGeometry, MeshLambertMaterial, PointLight, AmbientLight,
    WebGLRenderer, Line, BufferGeometry, Vector3, LineBasicMaterial,
    AxesHelper, Group, AnimationMixer, AnimationUtils, Color,
} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {ButterflyMotionPath} from './ButterflyMotionPath';
import './style.css'

const {random, cos, sin, PI} = Math;
const lerp = (a, b, x) => a + x*(b - a);

// scene with some static objects
let scene = new Scene();
initScene();

// start/end marker balls
let balls = [0x00ff00, 0xff0000].map(color => {
    let r = 3;
    let obj = new Mesh(
        new SphereGeometry(r, 32, 16),
        new MeshLambertMaterial({color}),
    );
    scene.add(obj);
    return obj;
});

// motion path visual
let motionPathGeometry = new BufferGeometry();
scene.add(new Line(
    motionPathGeometry,
    new LineBasicMaterial({color: 0x00ffff}),
));

// butterfly group will ride motion path
let group = new Group
group.matrixAutoUpdate = false;
scene.add(group)

// add axes gizmo
group.add(new AxesHelper(20));

// butterfly model
let mixer;

{
    let url = './Monarch_Butterfly.glb';
    let gltf = await new GLTFLoader().loadAsync(url);
    let model = gltf.scene;

    // scale up and orient toward +Z
    model.scale.multiplyScalar(500);
    model.rotateY(-.5*PI);

    // add to group
    group.add(model);

    // animation setup
    let clip = AnimationUtils.subclip(gltf.animations[0], 'flying', 0, 38);
    mixer = new AnimationMixer(model);
    mixer.clipAction(clip).play();
}

// current flight time along path [0..1]
let flyTime = 0;

// the ButterflyMotionPath object, (re)-created in resetPoints()
let motionPath;

// start/end points, initalized in resetPoints()
let points = [];

let camera = new PerspectiveCamera(60, 1, 1, 2e3);
camera.position.set(70, 100, 400);

let renderer = new WebGLRenderer();
document.querySelector('#app').replaceWith(renderer.domElement);

let controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, {
    minDistance: 5,
    maxDistance: 1000,
});

document.body.onkeydown = e => {
    switch (e.code) {
        case 'Space':
            // randomize start/end points
            resetPoints();
            break;
    }
};

window.onresize = resize;
resetPoints();
resize();
animate();

function resize() {
    const {innerWidth: w, innerHeight: h, devicePixelRatio: dpr} = window;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

function update() {
    // advance fly time (and wrap back to 0)
    let dt = .005;
    flyTime = (flyTime + dt) % 1;

    mixer.update(.015);

    // sample matrix at current time
    motionPath.getMatrixAt(flyTime, group.matrix);
}

function makeRandomPoint() {
    let theta = random() * PI * 2;
    let r = lerp(10, 200, random());
    return new Vector3(
        r * cos(theta),
        lerp(20, 100, random()),
        r * sin(theta),
    );
}

function resetPoints() {
    // randomize start/end points
    for (let i = 0; i < 2; ++i) {
        let p = points[i] = makeRandomPoint();
        balls[i].position.copy(p);
    };

    // init motion path
    motionPath = new ButterflyMotionPath({
        startPosition: points[0],
        endPosition: points[1],
    });

    // sample points to motion path visual
    motionPathGeometry.setFromPoints(motionPath.curve.getPoints(100));
}

function initScene() {
    scene.background = new Color(0x444444);

    {
        // lighting
        scene.add(new AmbientLight(0x444444));
        let light = new PointLight(0xffffff, 1, 0);
        light.position.set(30, 100, 0);
        scene.add(light);
    }

    // construction grid
    scene.add(new GridHelper(500, 10));

    {
        // cylinder represents viewer location
        let [h, r] = [200, 1];
        let obj = new Mesh(
            new CylinderGeometry(r, r, h, 32),
            new MeshLambertMaterial({color: 0x888888}),
        );
        obj.position.set(0, h/2, 0);
        scene.add(obj);
    }
}
