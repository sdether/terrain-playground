import * as THREE from 'three';
import * as dat from "three/addons/libs/lil-gui.module.min.js";
import {SETTINGS} from "./settings.js";

class TerrainData {
    width;
    height;
    depthMap;

    constructor(width, height, depthMap) {
        this.width = width;
        this.height = height;
        this.depthMap = depthMap;

    }
}

export class Terrain {

    /**
     *
     * @param {THREE.Scene} scene
     * @param {dat.GUI} gui
     */
    constructor(scene, gui) {
        const settings = this.settings = {
            wireframe: false,
            contours: false,
            heightScale: 0.5
        };
        const geometry = new THREE.BufferGeometry();
        this.simpleMaterial = new THREE.MeshPhysicalMaterial({
            color: SETTINGS.groundColor,
            wireframe: false,
            side: THREE.DoubleSide,
        });

        this.contourMaterial = new THREE.MeshPhysicalMaterial({
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
        for(int i=1;i<100;i++) {
          float f = ss(e, 0., abs(vPos.y - float(i)));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, col, f);
        }
      `
                );
            }
        });
        this.mesh = new THREE.Mesh(geometry, this.simpleMaterial)
        scene.add(this.mesh)
        const wireframe_material = new THREE.MeshPhysicalMaterial({
            color: 0x008800,
            wireframe: true,
            side: THREE.DoubleSide,
        });
        const wireframe_geometry = new THREE.BufferGeometry();
        this.wireframe = new THREE.Mesh(wireframe_geometry, wireframe_material);
        this.wireframe.position.y = 0.001;
        this.wireframe.visible = false;
        scene.add(this.wireframe);

        const gen = this.generateGeometry.bind(this);
        const updateContours = this.updateContours.bind(this);
        gui.add(settings, 'heightScale', 0.1, 2, 0.1).name('Scale').onChange(gen);
        gui.add(settings, 'wireframe').name('Wireframe').onChange(gen);
        gui.add(settings, 'contours').name('Contours').onChange(updateContours);
        this.data = null;

        const textureLoader = new THREE.TextureLoader()
        textureLoader.load('../assets/cabrillo.png', this.#loadTerrain.bind(this));
    }

    updateContours() {
        if (this.settings.contours) {
            this.mesh.material = this.contourMaterial;
        } else {
            this.mesh.material = this.simpleMaterial;
        }

    }

    #loadTerrain(texture) {
        const canvas = document.createElement('canvas');
        canvas.width = texture.image.width
        canvas.height = texture.image.height
        const context = canvas.getContext('2d');
        context.drawImage(texture.image, 0, 0)

        const data = context.getImageData(
            0,
            0,
            texture.image.width,
            texture.image.height
        )
        this.data = new TerrainData(
            data.width,
            data.height,
            data.data.filter((e, i) => i % 4 === 0)
        );
        this.generateGeometry();
    }

    generateGeometry() {
        console.time("generateGeometry");
        const geoWidth = this.data.width - 1;
        const geoHeight = this.data.height - 1;

        const geometry = new THREE.PlaneGeometry(
            geoWidth, geoHeight, geoWidth, geoHeight
        ).rotateX(
            -Math.PI * 0.5
        );
        let wireframeGeometry = null;
        if (this.settings.wireframe) {
            wireframeGeometry = new THREE.PlaneGeometry(
                geoWidth, geoHeight, geoWidth, geoHeight
            ).rotateX(
                -Math.PI * 0.5
            );
        }

        const width = geometry.parameters.widthSegments + 1;
        const height = geometry.parameters.heightSegments + 1;
        const widthStep = this.data.width / width;
        const heightStep = this.data.height / height;
        const positions = geometry.attributes.position.array;
        const displacementMultiplier = this.settings.heightScale;
        let w, h, x, y, d;
        let maxDisplacement = 0;
        let minDisplacement = 1000;

        for (let i = 0; i < positions.length; i += 3) {
            w = (i / 3) % width;
            h = i / 3 / width;

            x = Math.floor(w * widthStep);
            y = Math.floor(h * heightStep);

            d = this.data.depthMap[x + y * this.data.width] * displacementMultiplier;
            if (d > maxDisplacement) {
                maxDisplacement = d;
            }
            if (d < minDisplacement) {
                minDisplacement = d;
            }
            positions[i + 1] = d;
            if (this.settings.wireframe) {
                wireframeGeometry.attributes.position.array[i + 1] = d;
            }
        }

        console.log(`height range: ${minDisplacement}-${maxDisplacement}`);
        geometry.attributes.position.needsUpdate = true
        geometry.computeVertexNormals()
        this.mesh.geometry.dispose();
        this.mesh.geometry = geometry;
        this.updateContours();
        if (this.settings.wireframe) {
            wireframeGeometry.attributes.position.needsUpdate = true
            wireframeGeometry.computeVertexNormals()
            this.wireframe.geometry.dispose();
            this.wireframe.geometry = wireframeGeometry;
            this.wireframe.visible = true;
        } else {
            this.wireframe.visible = false;
        }
        console.timeEnd("generateGeometry")
    }
}