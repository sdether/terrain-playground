import * as THREE from "three";

export function mulberry32(a) {
    return function () {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

/**
 *
 * @param {THREE.Mesh} mesh
 * @param {THREE.Mesh} plane
 */
export function getIntersectionPoints(mesh, plane ) {

    const pointsOfIntersection = new THREE.BufferGeometry();
    let pointOfIntersection = new THREE.Vector3();

    let a = new THREE.Vector3(),
        b = new THREE.Vector3(),
        c = new THREE.Vector3();
    let planePointA = new THREE.Vector3(),
        planePointB = new THREE.Vector3(),
        planePointC = new THREE.Vector3();
    let lineAB = new THREE.Line3(),
        lineBC = new THREE.Line3(),
        lineCA = new THREE.Line3();


    var mathPlane = new THREE.Plane();

    const positionAttribute = plane.geometry.getAttribute('position');

    const localVertex = new THREE.Vector3();

    localVertex.fromBufferAttribute(positionAttribute, 0);
    plane.localToWorld(planePointA.copy(localVertex));
    localVertex.fromBufferAttribute(positionAttribute, 1);
    plane.localToWorld(planePointB.copy(localVertex));
    localVertex.fromBufferAttribute(positionAttribute, 2);
    plane.localToWorld(planePointC.copy(localVertex));

    mathPlane.setFromCoplanarPoints(planePointA, planePointB, planePointC);

    var positions = [];

    const meshPositions = mesh.geometry.attributes.position;
    for (let vertexIndex = 0; vertexIndex < meshPositions.count; vertexIndex += 3) {

        localVertex.fromBufferAttribute(meshPositions, vertexIndex);
        mesh.localToWorld(a.copy(localVertex));
        localVertex.fromBufferAttribute(meshPositions, vertexIndex + 1);
        mesh.localToWorld(b.copy(localVertex));
        localVertex.fromBufferAttribute(meshPositions, vertexIndex + 2);
        mesh.localToWorld(c.copy(localVertex));

        lineAB = new THREE.Line3(a, b);
        lineBC = new THREE.Line3(b, c);
        lineCA = new THREE.Line3(c, a);

        setPointOfIntersection(lineAB, mathPlane, positions, pointOfIntersection);
        setPointOfIntersection(lineBC, mathPlane, positions, pointOfIntersection);
        setPointOfIntersection(lineCA, mathPlane, positions, pointOfIntersection);
    }

    pointsOfIntersection.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(positions), 3));

    var pointsMaterial = new THREE.PointsMaterial({
        size: 10,
        color: 0xffff00
    });

    return new THREE.Points(pointsOfIntersection, pointsMaterial);
}

function setPointOfIntersection(line, plane, positions, target) {
    let pointOfIntersection = plane.intersectLine(line, target);
    if (pointOfIntersection) {
        let g = pointOfIntersection.clone();
        positions.push(g.x);
        positions.push(g.y);
        positions.push(g.z);
    }
}
//
// var contours = getContours(pointsOfIntersection.vertices, [], true);
// console.log("contours", contours);
//
// contours.forEach(cntr => {
//     let cntrGeom = new THREE.Geometry();
//     cntrGeom.vertices = cntr;
//     let contour = new THREE.Line(cntrGeom, new THREE.LineBasicMaterial({
//         color: Math.random() * 0xffffff //0x777777 + 0x777777
//     }));
//     scene.add(contour);
// });
// }