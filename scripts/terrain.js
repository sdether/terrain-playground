import * as THREE from 'three';
import * as dat from "three/addons/libs/lil-gui.module.min.js";
import {SETTINGS} from "./settings.js";

class TerrainData {
    /**
     * @type {number}
     */
    width;
    /**
     * @type {number}
     */
    height;
    /**
     * @type {number[]}
     */
    depthMap;

    /**
     * @param {number} width
     * @param {number} height
     * @param {number[]} depthMap
     */
    constructor(width, height, depthMap) {
        this.width = width;
        this.height = height;
        this.depthMap = depthMap;
    }

    reduceDetail(factor) {
        // assumes that width and height are divisible by factor
        const data = [];
        const width = Math.floor(this.width / factor);
        const height = Math.floor(this.height / factor);
        let acc, i;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                acc = []
                for (let y1 = 0; y1 < factor; y1++) {
                    i = x * factor + (y * factor + y1) * this.width;
                    let slice = this.depthMap.slice(i, i + factor);
                    acc = acc.concat(slice)
                }
                data.push(acc.reduce((a, v) => a + v, 0) / acc.length);
            }
        }
        return new TerrainData(width, height, data)
    }
}

export class TerrainTile {
    /**
     * @type {TerrainData}
     */
    terrain;
    /**
     * @type {number}
     */
    cy;
    /**
     * @type {number}
     */
    cx;
    /**
     * @type {number}
     */
    xVertices;
    /**
     * @type {number}
     */
    yVertices;

    /**
     * @param {TerrainData} data
     * @param {number} cx
     * @param {number} cy
     * @param {number} chunkVertices
     */
    constructor(data, cx, cy, chunkVertices) {
        this.cx = cx;
        this.cy = cy;
        this.terrain = data;
        const cw = Math.ceil(this.terrain.width / chunkVertices);
        const ch = Math.ceil(this.terrain.height / chunkVertices);
        this.chunkVertices = chunkVertices;
        this.xVertices = this.yVertices = chunkVertices + 1 // shared vertices with neighbors
        if (cx === cw - 1) {
            // last has different size and no shared vertices
            this.xVertices = this.terrain.width % chunkVertices;
        }
        if (cy === ch - 1) {
            // last has different size and no shared vertices
            this.yVertices = this.terrain.height % chunkVertices;
        }
    }

    getDepth(x, y) {
        return this.terrain.depthMap[(this.cx * this.chunkVertices + x) + (this.cy * this.chunkVertices + y) * this.terrain.width]
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
            heightScale: 0.3,
            seaLevel: 2.3,
            selectionRadius: 1.0,
            showLOD: false,
        };
        this.tileSize = 100;
        this.tiles = new THREE.Group();
        this.tiles.position.y = settings.seaLevel;
        scene.add(this.tiles);
        let uniforms = this.uniforms = {
            mousePos: {value: new THREE.Vector3()},
            showContours: {value: settings.contours},
            selectionRadius: {value: settings.selectionRadius},
        };
        this.lowMaterial = new THREE.MeshPhysicalMaterial({
            color: SETTINGS.groundColor,
        });
        this.lowDetail = new THREE.Mesh(new THREE.BufferGeometry(), this.lowMaterial);
        scene.add(this.lowDetail);
        this.material = new THREE.MeshPhysicalMaterial({
            color: SETTINGS.groundColor,
            onBeforeCompile: shader => {
                shader.uniforms.mousePos = uniforms.mousePos;
                shader.uniforms.showContours = uniforms.showContours;
                shader.uniforms.r = uniforms.selectionRadius;
                shader.vertexShader = `
        varying vec3 vPos;
        varying vec3 vWorldPosition;
        ${shader.vertexShader}
`.replace(`#include <begin_vertex>`,
                    `#include <begin_vertex>
        vPos = transformed;
      	vWorldPosition =  (modelMatrix * vec4(transformed, 1.0)).xyz;
`);
                shader.fragmentShader = `
        uniform vec3 mousePos;
        uniform bool showContours;
        uniform float r;
        varying vec3 vPos;
        varying vec3 vWorldPosition;
      ${shader.fragmentShader}
`.replace(
                    `#include <dithering_fragment>`,
                    `#include <dithering_fragment>
        if( showContours ) {
      	  vec3 col = vec3(0.5, 1, 1);
          float e = fwidth(vPos.y) * 2.;
          for(int i=1;i<100;i++) {
            float f = smoothstep(e, 0., abs(vPos.y - float(i)));
            gl_FragColor.rgb = mix(gl_FragColor.rgb, col, f);
          }
        }
        
        // pointer
        // shape
        float dist = distance(mousePos.xz, vWorldPosition.xz);
        
        float shape = (smoothstep(r-0.1, r, dist)*0.75 + 0.25) - smoothstep(r, r + 0.1, dist);
        
        vec3 col = mix(gl_FragColor.rgb, vec3(0, 1, 0.25), shape);
        gl_FragColor = vec4(col, gl_FragColor.a);
`);
            }
        });
        this.wireframe_material = new THREE.MeshPhysicalMaterial({
            color: 0x008800,
            wireframe: true,
            side: THREE.DoubleSide,
        });
        const wireframe_geometry = new THREE.BufferGeometry();

        const gen = this.generateGeometry.bind(this);
        gui.add(settings, 'heightScale', 0.1, 2, 0.1).name('Scale').onChange(gen);
        gui.add(settings, 'seaLevel', 0, 20).name('Sea Level').onChange(this.updateSeaLevel.bind(this));
        gui.add(settings, 'wireframe').name('Wireframe').onChange(gen);
        gui.add(settings, 'contours').name('Contours').onChange(this.updateContours.bind(this));
        gui.add(settings, 'contours').name('Contours').onChange(this.updateContours.bind(this));
        gui.add(settings, 'showLOD').name('Show LOD').onChange(this.toggleLOD.bind(this));
        gui.add(settings, 'selectionRadius', 0.25, 3, 0.25).name('Selection').onChange(this.updateSelectionRadius.bind(this));
        this.data = null;

        const textureLoader = new THREE.TextureLoader()
        textureLoader.load('../assets/santa-barbara.png', this.#loadTerrain.bind(this));
        this.raycaster = new THREE.Raycaster();
    }

    toggleLOD() {
        if (this.settings.showLOD) {
            this.lowDetail.visible = true;
            this.tiles.visible = false;
        } else {
            this.lowDetail.visible = false;
            this.tiles.visible = true;
        }
    }

    intersect(coords, camera) {
        this.raycaster.setFromCamera(coords, camera);
        let lodIntersect = this.raycaster.intersectObject(this.lowDetail);
        if (lodIntersect.length === 0) {
            return [];
        }
        let hit = lodIntersect[0].point;
        const cw = Math.ceil(this.data.width / this.tileSize);
        const ch = Math.ceil(this.data.height / this.tileSize);
        const cx = (hit.x + this.data.width / 2) / this.tileSize;
        const cy = (hit.z + this.data.height / 2) / this.tileSize;

        const rowWidth = Math.ceil(this.data.width / this.tileSize)
        function getIndex(x, y) {
            return Math.floor(x) + Math.floor(y) * rowWidth;
        }

        const indices = [getIndex(cx, cy)];

        // because our low detail match may be straddling tile borders, we may
        // need to consider neighboring tiles
        let rx = cx - Math.floor(cx);
        let ry = cy - Math.floor(cy);
        let left = rx < 0.1 && cx > 1;
        let right = rx > 0.9 && cx < cw;
        let top = ry < 0.1 && cy > 1;
        let bottom = ry > 0.9 && cy < ch;
        if (left) indices.push(getIndex(cx - 1, cy));
        if (right) indices.push(getIndex(cx + 1, cy));
        if (top) indices.push(getIndex(cx, cy - 1));
        if (bottom) indices.push(getIndex(cx, cy + 1));
        if (top && left) indices.push(getIndex(cx - 1, cy - 1));
        if (top && right) indices.push(getIndex(cx + 1, cy - 1));
        if (bottom && left) indices.push(getIndex(cx - 1, cy + 1));
        if (bottom && right) indices.push(getIndex(cx + 1, cy + 1));
        return this.raycaster.intersectObjects(indices.map((i) => this.tiles.children[i].children[0]));
    }

    updateSeaLevel() {
        this.tiles.position.y = -this.settings.seaLevel;
    }

    updateContours() {
        this.uniforms.showContours.value = this.settings.contours;
    }

    updateSelectionRadius() {
        this.uniforms.selectionRadius.value = this.settings.selectionRadius;
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
            Array.from(data.data.filter((e, i) => i % 4 === 0))
        );
        this.lowData = this.data.reduceDetail(10);
        const left = -(this.data.width - 1) / 2 + this.tileSize / 2;
        const top = -(this.data.height - 1) / 2 + this.tileSize / 2;
        const cw = Math.ceil(this.data.width / this.tileSize);
        const ch = Math.ceil(this.data.height / this.tileSize);
        let i = 0;
        let c;
        let offsetX = left;
        let offsetY = top;
        for (let cy = 0; cy < ch; cy++) {
            for (let cx = 0; cx < cw; cx++) {
                const chunk = new THREE.Group();
                this.tiles.add(chunk);
                const geometry = new THREE.BufferGeometry();
                const mesh = new THREE.Mesh(geometry, this.material)
                chunk.add(mesh)
                const wireframe_geometry = new THREE.BufferGeometry();
                const wireframe = new THREE.Mesh(wireframe_geometry, this.wireframe_material);
                wireframe.visible = false;
                chunk.add(wireframe);
                c = new TerrainTile(this.data, cx, cy, this.tileSize);
                chunk.userData = c
                if (cx === cw - 1) {
                    let centerOffset = (this.tileSize - (this.data.width - 1) % this.tileSize) / 2;
                    chunk.position.x = offsetX - centerOffset;
                } else {
                    chunk.position.x = offsetX;
                }
                if (cy === ch - 1) {
                    let centerOffset = (this.tileSize - (this.data.height - 1) % this.tileSize) / 2;
                    chunk.position.z = offsetY - centerOffset;
                } else {
                    chunk.position.z = offsetY;
                }
                console.log(`[${i}] (${cx},${cy}) ${c.xVertices}x${c.yVertices} @ (${chunk.position.x},${chunk.position.z})`)
                i++;
                offsetX += this.tileSize;
            }
            offsetX = left;
            offsetY += this.tileSize;
        }
        this.generateGeometry();
    }

    generateGeometry() {
        for (let i = 0; i < this.tiles.children.length; i++) {
            this.generateChunkGeometry(i);
        }
        this.generateLOD();
        this.toggleLOD();
    }

    generateLOD() {
        console.time("generateLOD");
        const xSegments = this.lowData.width - 1;
        const ySegments = this.lowData.height - 1;
        const geometry = new THREE.PlaneGeometry(
            this.data.width - 1, this.data.height - 1, xSegments, ySegments
        ).rotateX(
            -Math.PI * 0.5
        );
        const width = this.lowData.width;
        const positions = geometry.attributes.position.array;
        const displacementMultiplier = this.settings.heightScale;
        let x, y, d;
        for (let i = 0; i < positions.length; i += 3) {
            x = Math.floor((i / 3) % width);
            y = Math.floor(i / 3 / width);

            d = this.lowData.depthMap[x + y * this.lowData.width] * displacementMultiplier;
            positions[i + 1] = d;
        }
        geometry.attributes.position.needsUpdate = true
        geometry.computeVertexNormals()
        this.lowDetail.geometry.dispose();
        this.lowDetail.geometry = geometry;
        console.timeEnd("generateLOD")
    }

    generateChunkGeometry(index) {
        console.time(`generateGeometry ${index}`);
        const chunk = this.tiles.children[index];
        const chunkData = chunk.userData;
        console.log(`[${index}] (${chunkData.cx},${chunkData.cy}) ${chunkData.xVertices}x${chunkData.yVertices}`)

        const xSegments = chunkData.xVertices - 1;
        const ySegments = chunkData.yVertices - 1;
        const geometry = new THREE.PlaneGeometry(
            xSegments, ySegments, xSegments, ySegments
        ).rotateX(
            -Math.PI * 0.5
        );
        let wireframeGeometry = null;
        if (this.settings.wireframe) {
            wireframeGeometry = new THREE.PlaneGeometry(
                xSegments, ySegments, xSegments, ySegments
            ).rotateX(
                -Math.PI * 0.5
            );
        }

        const width = chunkData.xVertices;
        const positions = geometry.attributes.position.array;
        const displacementMultiplier = this.settings.heightScale;
        let x, y, d;
        let maxDisplacement = 0;
        let minDisplacement = 1000;

        for (let i = 0; i < positions.length; i += 3) {
            x = Math.floor((i / 3) % width);
            y = Math.floor(i / 3 / width);

            d = chunkData.getDepth(x, y) * displacementMultiplier;
            if (d > maxDisplacement) {
                maxDisplacement = d;
            }
            if (d < minDisplacement) {
                minDisplacement = d;
            }
            positions[i + 1] = d;
            if (wireframeGeometry) {
                wireframeGeometry.attributes.position.array[i + 1] = d;
            }
        }

        console.log(`height range: ${minDisplacement}-${maxDisplacement}`);
        geometry.attributes.position.needsUpdate = true
        geometry.computeVertexNormals()
        chunk.children[0].geometry.dispose();
        chunk.children[0].geometry = geometry;
        this.updateContours();
        if (wireframeGeometry) {
            wireframeGeometry.attributes.position.needsUpdate = true
            wireframeGeometry.computeVertexNormals()
            chunk.children[1].geometry.dispose();
            chunk.children[1].geometry = wireframeGeometry;
            chunk.children[1].visible = true;
        } else {
            chunk.children[1].visible = false;
        }
        this.updateSeaLevel();
        console.timeEnd(`generateGeometry ${index}`)
    }
}