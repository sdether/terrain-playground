import * as THREE from "three";
import {SETTINGS} from "./settings.js";

export class Plane {
    constructor(scene, gui) {
        scene.add(new THREE.Mesh(
            new THREE.SphereGeometry(3, 5, 5),
            new THREE.MeshPhysicalMaterial({
                color: 'blue',
                side: THREE.DoubleSide,
            })
        ));
        this.settings = {
            width: 3,
            height: 3,
            size: 1
        };

        gui.add(this.settings, 'width', 1, 10, 1).name('Width').onChange(this.draw.bind(this));
        gui.add(this.settings, 'height', 1, 10, 1).name('Height').onChange(this.draw.bind(this));
        gui.add(this.settings, 'size', 1, 3, 1).name('Size').onChange(this.draw.bind(this));

        this.scene = scene;
        this.ground = null;
        this.mesh = null;
        this.draw();
    }

    draw() {
        const dataWidth = this.settings.width;
        const dataHeight = this.settings.height;
        const dataSize = this.settings.size;
        const data = Array(dataWidth * dataHeight).fill(0).map((x, y) => x + y);
        const displacementFactor = 5;
        const geoWidth = dataWidth - 1;
        const geoHeight = dataHeight - 1
        console.log(data);
        const material0 = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            wireframe: true,
            side: THREE.DoubleSide,
        });
        const geometry0 = new THREE.PlaneGeometry(100, 100, geoWidth, geoHeight).rotateX(Math.PI * -0.5);
        if(!this.ground) {
            this.ground = new THREE.Mesh(geometry0, material0);
            this.ground.position.y = 0.1;
            this.scene.add(this.ground);
        } else {
            geometry0.attributes.position.needsUpdate = true;
            this.ground.geometry.dispose();
            this.ground.geometry = geometry0;
        }
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
        if(!this.mesh) {
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.position.y = 0.1;
            this.scene.add(this.mesh)
        } else {
            geometry.attributes.position.needsUpdate = true;
            this.mesh.geometry.dispose();
            this.mesh.geometry = geometry;
        }

    }
}