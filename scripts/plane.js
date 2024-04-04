import * as THREE from "three";
import {SETTINGS} from "./settings.js";

export class Plane {
    constructor(scene) {

        const dataWidth = 3;
        const dataHeight = 3;
        const dataSize = 1;
        const data = Array(dataWidth * dataHeight).fill(0).map((x, y) => x + y);
        const displacementFactor = 5;
        const geoWidth = dataWidth  - 1;
        const geoHeight = dataHeight  - 1
        console.log(data);
        const material0 = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            wireframe: true,
            side: THREE.DoubleSide,
        });
        const geometry0 = new THREE.PlaneGeometry(100, 100, geoWidth, geoHeight).rotateX(Math.PI * -0.5);
        const ground = new THREE.Mesh(geometry0, material0);
        ground.position.y = 0.1;
        scene.add(ground);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0x000000,
            wireframe: true,
            side: THREE.DoubleSide,
        });
        const geometry = new THREE.PlaneGeometry(100, 100, geoWidth, geoHeight).rotateX(Math.PI * -0.5);
        const width = geometry.parameters.widthSegments + 1
        const height = geometry.parameters.heightSegments + 1
        const widthStep = dataWidth / width
        const heightStep = dataHeight / height
        const positions = geometry.attributes.position.array;
        let w, h, x, y, d;

        for (let i = 0; i < positions.length; i += 3) {
            w = (i / 3) % width
            h = i / 3 / width
            x = Math.floor(w * widthStep)
            y = Math.floor(h * heightStep)
                d = data[x * dataSize + y * dataSize * dataWidth]
            console.log(`[${i}] ${w},${h} -> ${x},${y} = ${d}`)
            geometry.attributes.position.array[i + 1] = d * displacementFactor;
        }
        geometry.computeVertexNormals();
        window.plane = geometry;
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.y = 0.1;
        scene.add(this.mesh)

    }
}