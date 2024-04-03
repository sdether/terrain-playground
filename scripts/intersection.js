import * as THREE from "three";
import {Line} from "./line.js";

/**
 *
 * @param {THREE.Mesh} mesh
 * @param {THREE.Plane} intersectPlane
 */
export function getIntersectionPoints(mesh, intersectPlane) {
    console.time('getIntersectionPoints')
    let pointOfIntersection = new THREE.Vector3();

    let a = new THREE.Vector3(),
        b = new THREE.Vector3(),
        c = new THREE.Vector3();
    let lineAB = new THREE.Line3(),
        lineBC = new THREE.Line3(),
        lineCA = new THREE.Line3();
    const localVertex = new THREE.Vector3();
    const meshPositions = mesh.geometry.attributes.position;
    const vertexIndex = mesh.geometry.getIndex()
    let lineSegments = [];
    for (let idx = 0; idx < vertexIndex.count; idx += 3) {
        localVertex.fromBufferAttribute(meshPositions, vertexIndex.array[idx]);
        mesh.localToWorld(a.copy(localVertex));
        localVertex.fromBufferAttribute(meshPositions, vertexIndex.array[idx + 1]);
        mesh.localToWorld(b.copy(localVertex));
        localVertex.fromBufferAttribute(meshPositions, vertexIndex.array[idx + 2]);
        mesh.localToWorld(c.copy(localVertex));

        lineAB = new THREE.Line3(a, b);
        lineBC = new THREE.Line3(b, c);
        lineCA = new THREE.Line3(c, a);

        let bisectA = null;
        let bisectB = null;
        let intersectAB = setPointOfIntersection(lineAB, intersectPlane, pointOfIntersection);
        if (intersectAB) {
            bisectA = intersectAB;
        }
        let intersectBC = setPointOfIntersection(lineBC, intersectPlane, pointOfIntersection);
        if (intersectBC) {
            if (bisectA) {
                bisectB = intersectBC
            } else {
                bisectA = intersectBC
            }
        }
        if (!bisectB) {
            bisectB = setPointOfIntersection(lineCA, intersectPlane, pointOfIntersection);
        }
        if (bisectB) {
            lineSegments.push(new Line(bisectA, bisectB));
        }
    }
    console.timeEnd('getIntersectionPoints')
    return Line.findLines(lineSegments);
}

function setPointOfIntersection(line, plane, target) {
    let pointOfIntersection = plane.intersectLine(line, target);
    if (pointOfIntersection) {
        return pointOfIntersection.clone();
    }
    return null;
}

