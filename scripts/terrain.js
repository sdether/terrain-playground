import * as THREE from "three";
import * as dat from "three/addons/libs/lil-gui.module.min.js";
import {ImprovedNoise} from "three/addons";
import {SETTINGS} from "./settings.js";
import {getIntersectionPoints, mulberry32} from "./utils.js";

export class Terrain {

    /**
     * @type {THREE.Group}
     */
    #group;

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

        let uniforms = {
            planeMousePos: {value: new THREE.Vector2()}
        }

        let material = new THREE.MeshStandardMaterial({
            color: SETTINGS.groundColor,
            onBeforeCompile: shader => {
                shader.uniforms.planeMousePos = uniforms.planeMousePos;
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
    	uniform vec2 planeMousePos;
      varying vec3 vPos;
      ${shader.fragmentShader}
    `.replace(
                    `#include <dithering_fragment>`,
                    `#include <dithering_fragment>
      	vec3 col = vec3(0.5, 1, 1);
        float e = fwidth(vPos.y) * 2.;
        float f = ss(e, 0., abs(vPos.y - planeMousePos.y));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, col, f);
      
      `
                );
                //console.log(shader.fragmentShader);
            }
        });

        this.#group = new THREE.Group();
        const geometry = new THREE.BufferGeometry();
        this.mesh = new THREE.Mesh(geometry, material);
        this.#group.add(this.mesh);
        const wireframe_geometry = new THREE.BufferGeometry();
        const wireframe = new THREE.Mesh(wireframe_geometry, wireframe_material);
        wireframe.position.y = 0.001;
        this.#group.add(wireframe);
        scene.add(this.#group);

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

        for (let z = 0; z < totalSegmentsZ; z++) {
            for (let x = 0; x < totalSegmentsX; x++) {
                const index = 3 * (z * totalSegmentsX + x);
                let height = Math.abs(perlin.noise(
                    x / SETTINGS.spread,
                    z / SETTINGS.spread,
                    y
                ) * SETTINGS.height);
                //console.log(`${x},${z},${height}`)
                // this is where you would choose height based on the noise algorithm of your choice !
                geometry.attributes.position.array[index + 1] = height;
                if (SETTINGS.wireframe) {
                    wireframe_geometry.attributes.position.array[index + 1] = height;
                }
                //geometry.attributes.position.array[index + 1] = Math.random() * SETTINGS.height;
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
        this.#group.children[0].geometry.dispose();
        this.#group.children[1].geometry.dispose();
        this.#group.children[0].geometry = geometry;
        this.#group.children[1].geometry = wireframe_geometry;

        const cutMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            visible: false,
            side: THREE.DoubleSide,
        });
        for(let i=1;i<10;i++) {
            const cutGeometry = new THREE.PlaneGeometry(SETTINGS.size/10, SETTINGS.size/10);
            cutGeometry.rotateX(Math.PI * -0.5);
            const cutPlane = new THREE.Mesh(cutGeometry, cutMaterial);
            cutPlane.position.y = i;
            this.#group.add(getIntersectionPoints(this.mesh, cutPlane));
        }

    };

}