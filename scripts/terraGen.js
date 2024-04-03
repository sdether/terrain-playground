import * as THREE from "three";
import * as dat from "three/addons/libs/lil-gui.module.min.js";
import {ImprovedNoise} from "three/addons";
import {SETTINGS} from "./settings.js";
import {mulberry32} from "./utils.js";
import {getIntersectionPoints} from "./intersection.js";

export class TerraGen {

    /**
     * @type {THREE.Group}
     */
    #terrainGroup;

    /**
     * @type {THREE.Group}
     */
    #contourGroup;

    /**
     *
     * @param {THREE.Scene} scene
     * @param {dat.GUI} gui
     */
    constructor(scene, gui) {
        const wireframe_material = new THREE.MeshPhysicalMaterial({
            color: 0x008800,
            wireframe: true,
            side: THREE.DoubleSide,
        });

        let material = new THREE.MeshStandardMaterial({
            color: SETTINGS.groundColor,
            onBeforeCompile: shader => {
                shader.vertexShader = `
    	varying vec3 vPos;
      ${shader.vertexShader}
    `.replace(
                    `#include <begin_vertex>`,
                    `#include <begin_vertex>
      	vPos = transformed;
      `
                );
                //console.log(shader.vertexShader);
                shader.fragmentShader = `
    	#define ss(a, b, c) smoothstep(a, b, c)
        varying vec3 vPos;
      ${shader.fragmentShader}
    `.replace(
                    `#include <dithering_fragment>`,
                    `#include <dithering_fragment>
      	vec3 col = vec3(0.5, 1, 1);
        float e = fwidth(vPos.y) * 2.;
        for(int i=1;i<10;i++) {
          float f = ss(e, 0., abs(vPos.y - float(i)));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, col, f);
        }
      `
                );
                //console.log(shader.fragmentShader);
            }
        });

        this.#terrainGroup = new THREE.Group();
        const geometry = new THREE.BufferGeometry();
        this.mesh = new THREE.Mesh(geometry, material);
        this.#terrainGroup.add(this.mesh);
        const wireframe_geometry = new THREE.BufferGeometry();
        const wireframe = new THREE.Mesh(wireframe_geometry, wireframe_material);
        wireframe.position.y = 0.001;
        this.#terrainGroup.add(wireframe);
        scene.add(this.#terrainGroup);

        this.#contourGroup = new THREE.Group();
        scene.add(this.#contourGroup);

        const gen = this.generateGeometry.bind(this);
        gui.add(SETTINGS, 'seed').name('Seed').onChange(gen);
        gui.add(SETTINGS, 'size').name('Size').onChange(gen);
        gui.add(SETTINGS, 'spread').name('Spread').onChange(gen);
        gui.add(SETTINGS, 'height').name('Height').onChange(gen);
        gui.add(SETTINGS, 'segments').name('Segments').onChange(gen);
        gui.add(SETTINGS, 'wireframe').name('Wireframe').onChange(gen);


    }

    generateGeometry() {
        let geometry = new THREE.PlaneGeometry(
            SETTINGS.size,
            SETTINGS.size,
            SETTINGS.segments,
            SETTINGS.segments
        );
        // rotate the plane so it is horizontal
        geometry.rotateX(Math.PI * -0.5);
        let wireframe_geometry = null;
        wireframe_geometry = new THREE.PlaneGeometry(
            SETTINGS.size,
            SETTINGS.size,
            SETTINGS.segments,
            SETTINGS.segments
        );
        // rotate the plane so it is horizontal
        wireframe_geometry.rotateX(Math.PI * -0.5);
        return this.updateGeometry(geometry, wireframe_geometry);
    }


// set terrain height in a random fashion
    updateGeometry(geometry, wireframe_geometry) {
        const prng = mulberry32(SETTINGS.seed);
        window.Math.random = function () {
            return prng();
        };

        const totalSegmentsX = SETTINGS.segments + 1;
        const totalSegmentsZ = SETTINGS.segments + 1;
        const perlin = new ImprovedNoise();

        let y = Math.random() * SETTINGS.height;
        let maxHeight = 0;

        for (let z = 0; z < totalSegmentsZ; z++) {
            for (let x = 0; x < totalSegmentsX; x++) {
                const index = 3 * (z * totalSegmentsX + x);
                let height = Math.abs(perlin.noise(
                    x / SETTINGS.spread,
                    z / SETTINGS.spread,
                    y
                ) * SETTINGS.height);
                if (Math.floor(height) > maxHeight) {
                    maxHeight = Math.floor(height);
                }

                geometry.attributes.position.array[index + 1] = height;
                wireframe_geometry.attributes.position.array[index + 1] = height;
            }
        }

        // to to make sure our changes to the buffer attribute is taken into account
        geometry.attributes.position.needsUpdate = true;
        wireframe_geometry.attributes.position.needsUpdate = true;

        // compute normals so shading works properly
        geometry.computeVertexNormals();
        wireframe_geometry.computeVertexNormals();
        window.terrain = wireframe_geometry;
        // update group in scene with geometry
        this.#terrainGroup.children[0].geometry.dispose();
        this.#terrainGroup.children[1].geometry.dispose();
        this.#terrainGroup.children[0].geometry = geometry;
        this.#terrainGroup.children[1].geometry = wireframe_geometry;
        this.#terrainGroup.children[1].visible = SETTINGS.wireframe;

        return;
        // contour lines as geometry (disabled)
        let ground = new THREE.Vector3();
        this.#terrainGroup.children[0].localToWorld(ground);
        this.#contourGroup.clear();
        for (let i = 1; i <= maxHeight; i++) {

            let contourPlane = new THREE.Plane();
            let planePointA = new THREE.Vector3(ground.x, ground.y + i, ground.z),
                planePointB = new THREE.Vector3(ground.x + 1, ground.y + i, ground.z),
                planePointC = new THREE.Vector3(ground.x, ground.y + i, ground.z + 1);

            contourPlane.setFromCoplanarPoints(planePointA, planePointB, planePointC);
            let lines = getIntersectionPoints(this.#terrainGroup.children[0], contourPlane);
            if (lines.length > 0) {
                let material = new THREE.LineBasicMaterial({
                    color: 0x008800
                });
                for (const line of lines) {
                    const lineGeometry = new THREE.BufferGeometry().setFromPoints(line.vertices);
                    this.#contourGroup.add(new THREE.Line(lineGeometry, material));
                }
            }
        }
    };

}