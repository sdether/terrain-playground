import * as THREE from 'three';
import * as dat from "three/addons/libs/lil-gui.module.min.js";
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import Stats from "three/addons/libs/stats.module.js";
import {SETTINGS} from "./settings.js";
import {Contour} from "./contour.js";
import {Vector3} from "three";
import {TerraGen} from "./terraGen.js";
import {Terrain} from "./terrain.js";
import {Plane} from "./plane.js";
import skydomeVertexShader from "../shaders/skydome-vertex.glsl"
import skydomeFragmentShader from "../shaders/skydome-fragment.glsl"

export class Sandbox {
    constructor() {
        window.THREE = THREE;
        this.renderer = new THREE.WebGLRenderer({antialias: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(SETTINGS.skyColor)

        this.scene.fog = new THREE.Fog(this.scene.background, 1, 2000);
        const ambientLight = new THREE.AmbientLight(0x888888, 10);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.x = 20;
        directionalLight.position.y = 10;
        directionalLight.position.z = 15;
        this.scene.add(directionalLight);

        // SEA-LEVEL
        const ground_geometry = new THREE.PlaneGeometry(100000, 100000);
        ground_geometry.rotateX(Math.PI * -0.5);
        const ground_material = new THREE.MeshPhysicalMaterial({
            color: SETTINGS.waterColor,
            wireframe: false,
            side: THREE.DoubleSide,
        });
        const ground_plane = new THREE.Mesh(ground_geometry, ground_material);
        ground_plane.position.y = 0;
        this.scene.add(ground_plane);

        // SKYDOME
        const uniforms = {
            'topColor': {value: new THREE.Color(SETTINGS.skyColor)},
            'bottomColor': {value: new THREE.Color(0xffffff)},
            'offset': {value: 33},
            'exponent': {value: 0.9}
        };
        //uniforms[ 'topColor' ].value.copy( hemiLight.color );

        this.scene.fog.color.copy(uniforms['bottomColor'].value);

        const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: skydomeVertexShader,
            fragmentShader: skydomeFragmentShader,
            side: THREE.BackSide
        });

        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.y = 200;
        camera.position.z = 300;

        const controls = new OrbitControls(camera, this.renderer.domElement);
        controls.enableDamping = true
        controls.maxPolarAngle = Math.PI / 2.1
        controls.maxDistance = 500
        controls.minDistance = 1
        controls.target.set(0, 0, 0)

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

        //this.terrain = new Plane(this.scene, this.gui);
        this.terrain = new Terrain(this.scene, this.gui);
        // this.terrain = new TerraGen(this.scene, this.gui);
        // this.terrain.generateGeometry();
        //this.contour = new Contour(this.scene, this.gui);

        let mouse = new THREE.Vector3();
        let raycaster = new THREE.Raycaster();
        let currentFaceIdx = -1;
        const markerMaterial = new THREE.MeshPhysicalMaterial({
            color: 'blue',
            wireframe: false,
            side: THREE.DoubleSide,
        });
        const markerGeometry = new THREE.BufferGeometry();
        markerGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        this.scene.add(marker);
        let material = new THREE.LineBasicMaterial({
            color: 'blue'
        });
        const lineGeometry = new THREE.BufferGeometry();
        this.line = new THREE.Line(lineGeometry, material);
        this.line.visible = false;
        this.scene.add(this.line);
        this.lineStart = null;
        window.addEventListener("pointermove", event => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            // TODO: raycasting needs to be function on terrain that can determine which chunk to look at
            // const intersects = this.terrain.intersect(mouse, camera)
            // if (intersects.length > 0) {
            //
            //     const intersect = intersects[0];
            //     this.terrain.uniforms.mousePos.value = intersect.point;
            // }
        });
        window.addEventListener('mousedown', event => {
            if (event.button !== 0) {
                return
            }
            const intersects = this.terrain.intersect(mouse, camera)
            if (intersects.length > 0) {

                const intersect = intersects[0];
                console.log(intersect.point);
                if (this.lineStart) {
                    this.lineStart = null;
                    this.line.visible = false;
                } else {
                    this.lineStart = intersect.point;
                }
                // if(intersect.faceIndex === currentFaceIdx) {
                //     return
                // }
                // currentFaceIdx = intersect.faceIndex;
                // let vA = new THREE.Vector3();
                // let vB = new THREE.Vector3();
                // let vC = new THREE.Vector3();
                //
                // let face = intersect.face;
                // let geometry = intersect.object.geometry;
                // let position = geometry.attributes.position;
                // vA.fromBufferAttribute( position, face.a );
                // vB.fromBufferAttribute( position, face.b );
                // vC.fromBufferAttribute( position, face.c );
                // let vertices = new Float32Array([
                //     vA.x, vA.y, vA.z,
                //     vB.x, vB.y, vB.z,
                //     vC.x, vC.y, vC.z,
                // ]);
                // geometry = new THREE.BufferGeometry();
                // geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                // geometry.attributes.position.needsUpdate = true;
                // geometry.computeVertexNormals();
                // marker.geometry.dispose()
                // marker.geometry = geometry;
            }

        });


        // render loop
        this.renderer.setAnimationLoop(function (time) {
            controls.update();

            this.renderer.render(this.scene, camera);
            const intersects = this.terrain.intersect(mouse, camera)
            if (intersects.length > 0) {

                const intersect = intersects[0];
                this.terrain.uniforms.mousePos.value = intersect.point;
            }
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