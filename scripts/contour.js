import * as THREE from "three";
import {SETTINGS} from "./settings.js";
import {mulberry32} from "./utils.js";
import {ImprovedNoise} from "three/addons";
import {getIntersectionPoints} from "./intersection.js";

export class Contour {
    constructor(scene, gui) {

        this.settings = {
            seed: 200,
            size: 30,
            height: 20,
            wireframe: false
        };
        let settings = this.settings;
        const gen = this.generateGeometry.bind(this);
        gui.add(settings, 'wireframe').name('Wireframe').onChange(gen);
        gui.add(settings, 'seed', 1, 1000, 1).name('Seed').onChange(gen);
        gui.add(settings, 'size', 10, 100, 10).name('Size').onChange(gen);
        gui.add(settings, 'height', 10, 40, 1).name('Height').onChange(gen);

        this.contourGroup = new THREE.Group();
        scene.add(this.contourGroup);

        this.createGeometry();
        const material = new THREE.MeshPhysicalMaterial({
            color: SETTINGS.groundColor,
            wireframe: false,
            side: THREE.DoubleSide,
        });
        const wireframeMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x008800,
            wireframe: true,
            side: THREE.DoubleSide,
        });
        this.terrainMesh = new THREE.Mesh(this.terrainGeometry, material);
        this.contourGroup.add(this.terrainMesh);
        this.wireframeMesh = new THREE.Mesh(this.wireframeGeometry, wireframeMaterial);
        this.wireframeMesh.position.y = 0.01;
        this.wireframeMesh.visible = settings.wireframe;
        this.contourGroup.add(this.wireframeMesh);

        this.lineGroup = new THREE.Group();
        scene.add(this.lineGroup);
        this.updateGeometry();
    }

    generateGeometry() {
        this.createGeometry();
        this.updateGeometry();
    }

    createGeometry() {

        this.terrainGeometry = new THREE.PlaneGeometry(
            this.settings.size,
            this.settings.size,
            this.settings.size,
            this.settings.size
        );
        this.terrainGeometry.rotateX(Math.PI * -0.5);

        this.wireframeGeometry = new THREE.PlaneGeometry(
            this.settings.size,
            this.settings.size,
            this.settings.size,
            this.settings.size
        );
        this.wireframeGeometry.rotateX(Math.PI * -0.5);
    }

    updateGeometry() {
        // rotate the plane so it is horizontal
        const prng = mulberry32(this.settings.seed);
        window.Math.random = function () {
            return prng();
        };

        const perlin = new ImprovedNoise();

        let y = Math.random() * this.settings.height;
        let maxHeight = 0;
        for (let z = 0; z < this.settings.size; z++) {
            for (let x = 0; x < this.settings.size; x++) {
                const index = 3 * (z * this.settings.size + x);
                let height = Math.abs(perlin.noise(
                    x / this.settings.size * 3,
                    z / this.settings.size * 3,
                    y
                ) * this.settings.height);
                if (Math.floor(height) > maxHeight) {
                    maxHeight = Math.floor(height);
                }
                this.terrainGeometry.attributes.position.array[index + 1] = height;
                this.wireframeGeometry.attributes.position.array[index + 1] = height;
            }
        }
        this.terrainGeometry.attributes.position.needsUpdate = true;
        this.terrainGeometry.computeVertexNormals();
        this.wireframeGeometry.attributes.position.needsUpdate = true;
        this.wireframeGeometry.computeVertexNormals();
        this.contourGroup.children[0].geometry.dispose();
        this.contourGroup.children[1].geometry.dispose();
        this.contourGroup.children[0].geometry = this.terrainGeometry;
        this.contourGroup.children[1].geometry = this.wireframeGeometry;
        this.contourGroup.children[1].visible = this.settings.wireframe;
        let ground = new THREE.Vector3();
        this.contourGroup.children[0].localToWorld(ground);
        this.lineGroup.clear();
        for (let i = 1; i <= maxHeight; i++) {

            let contourPlane = new THREE.Plane();
            let planePointA = new THREE.Vector3(ground.x, ground.y + i, ground.z),
                planePointB = new THREE.Vector3(ground.x + 1, ground.y + i, ground.z),
                planePointC = new THREE.Vector3(ground.x, ground.y + i, ground.z + 1);

            contourPlane.setFromCoplanarPoints(planePointA, planePointB, planePointC);
            let lines = getIntersectionPoints(this.contourGroup.children[0], contourPlane);
            if (lines.length > 0) {
                let material = new THREE.LineBasicMaterial({
                    color: 0x008800
                });
                for (const line of lines) {
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints(line.vertices);
                    this.lineGroup.add(new THREE.Line(lineGeometry, material));
                }
            }
        }
    }
}