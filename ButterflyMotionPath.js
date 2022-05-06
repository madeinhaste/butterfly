import {Vector3, CatmullRomCurve3} from 'three';
const {sin, cos, atan2, hypot, PI} = Math;

const toPolar = (x, y) => [
    atan2(y, x),
    hypot(x, y),
];

const lerp = (a, b, x) => a + x*(b - a);

export class ButterflyMotionPath {
    constructor({
        startPosition,
        endPosition,
    })
    {
        this.points = [startPosition, endPosition];
        this.position = new Vector3();
        this.forward = new Vector3();
        this.right = new Vector3();
        this.up = new Vector3(0, 1, 0);
        this.initCurve();
    }

    initCurve() {
        const [A, B] = this.points;
        const [Ap, Bp] = [A, B].map(p => toPolar(p.x, p.z));

        {
            // ensure shortest arc
            const d = Bp[0] - Ap[0];
            Bp[0] += 2 * PI * (d < -PI ? 1 : d > PI ? -1 : 0);
        }

        const n = 100;
        const path = [];
        for (let i = 0; i < n; ++i) {
            const u = i / (n - 1);
            const p = new Vector3();
            lerpArc(p, u);
            path.push(p);
        }

        this.curve = new CatmullRomCurve3(path);

        function lerpArc(out, u) {
            let theta = lerp(Ap[0], Bp[0], u);
            let r = lerp(Ap[1], Bp[1], u);
            let y = lerp(A.y, B.y, u);
            out.set(r * cos(theta), y, r * sin(theta));
        }
    }

    getMatrixAt(time, matrix) {
        const {curve, position, forward, right, up} = this;
        curve.getPointAt(time, position);
        curve.getTangentAt(time, forward);
        right.crossVectors(forward, up);
        matrix.makeBasis(right, up, forward);
        matrix.setPosition(position);
        return matrix;
    }
}
