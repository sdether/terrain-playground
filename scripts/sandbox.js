import * as THREE from 'three';
import * as dat from "three/addons/libs/lil-gui.module.min.js";
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import Stats from "three/addons/libs/stats.module.js";
import {SETTINGS} from "./settings.js";
import {ContourTest} from "./contourTest.js";


export class Sandbox {
    constructor() {
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xccccff)
        const ambientLight = new THREE.AmbientLight(0x888888, 4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 8);
        directionalLight.position.x = 20;
        directionalLight.position.y = 10;
        directionalLight.position.z = 15;
        this.scene.add(directionalLight);

        const ground_geometry = new THREE.PlaneGeometry(100000, 100000);
        ground_geometry.rotateX(Math.PI * -0.5);
        const ground_material = new THREE.MeshPhysicalMaterial({
            color: SETTINGS.groundColor,
            wireframe: false,
            side: THREE.DoubleSide,
        });
        const ground_plane = new THREE.Mesh(ground_geometry, ground_material);
        ground_plane.position.y = 0;
        this.scene.add(ground_plane);

        const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.y = 40;
        camera.position.z = 60;

        const controls = new OrbitControls(camera, this.renderer.domElement);
        // controls.target.x = 0.75;

        this.gui = new dat.GUI();


        // add stats
        let stats = new Stats();
        document.body.appendChild(stats.dom);

        // window resize listener
        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.render(this.scene, camera);
        }.bind(this), false);

        // this.terrain = new Terrain(this.scene, this.gui);
        // this.terrain.generateGeometry();
        this.contour = new ContourTest(this);
        // render loop
        let deltaTime = 0, lastTime = 0, elapsedTime = 0;
        this.renderer.setAnimationLoop(function (time) {
            deltaTime = time - lastTime;
            lastTime = time;

            //if (window.document.hasFocus()) {
            elapsedTime += deltaTime;

            controls.update();

            this.renderer.render(this.scene, camera);
            //}

            stats.update();
        }.bind(this));

    }
}

window.onload = () => {
    window.sandbox = new Sandbox();
}

/*
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onPointerMove(event) {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

}

window.addEventListener('pointermove', onPointerMove);
raycaster.setFromCamera(pointer, camera);


let mouse = new THREE.Vector3();
let raycaster2 = new THREE.Raycaster();
let intersects = [];
let currentFaceIdx  = -1;
const markerMaterial = new THREE.MeshPhysicalMaterial({
    color: 'blue',
    wireframe: false,
    side: THREE.DoubleSide,
});
const markerGeometry = new THREE.BufferGeometry();
markerGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
const marker = new THREE.Mesh(markerGeometry, markerMaterial);
scene.add(marker);

window.addEventListener("pointermove", event => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    getMousePos();

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObject(group);
    if (intersects.length > 0) {

        const intersect = intersects[0];
        if(intersect.faceIndex === currentFaceIdx) {
            return
        }
        currentFaceIdx = intersect.faceIndex;
        let vA = new THREE.Vector3();
        let vB = new THREE.Vector3();
        let vC = new THREE.Vector3();

        let face = intersect.face;
        let geometry = intersect.object.geometry;
        let position = geometry.attributes.position;

        vA.fromBufferAttribute( position, face.a );
        vB.fromBufferAttribute( position, face.b );
        vC.fromBufferAttribute( position, face.c );
        let vertices = new Float32Array([
            vA.x, vA.y, vA.z,
            vB.x, vB.y, vB.z,
            vC.x, vC.y, vC.z,
        ]);
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        marker.geometry.dispose()
        marker.geometry = geometry;
    }

});

function getMousePos() {
    raycaster2.setFromCamera(mouse, camera);
    intersects = raycaster2.intersectObject(group.children[0]);
    if (intersects.length > 0) {
        uniforms.planeMousePos.value.copy(ground_plane.worldToLocal(intersects[0].point));
    } else {
        uniforms.planeMousePos.value.set(0, 10000, 0);
    }
}
window.addEventListener('mousedown', event => {
    if (event.button === 0) {
        //left
    }
    if (event.button === 1) {
        // middle
    }
    if (event.button === 2) {
        // right
    }
});


*/