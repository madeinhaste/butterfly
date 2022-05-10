import {Vector3, Matrix4, CatmullRomCurve3} from 'three';
const {min, sin, cos, atan2, hypot, PI} = Math;

const toPolar = (x, y) => [
    atan2(y, x),
    hypot(x, y),
];

const lerp = (a, b, x) => a + x*(b - a);
export const smoothstep = (a, b, x) => {
    const u = (x - a) / (b - a);
    return u<0 ? 0 : u>1 ? 1 : u*u*(3 - 2*u);
};

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

        const Q = new Vector3();
        const T = new Vector3();
        const N = new Vector3();

        for (let i = 0; i < n; ++i) {
            const u = i / (n - 1);
            const P = new Vector3();
            lerpArc(P, u);

            if (1) {
                // tangent
                lerpArc(Q, u + 1/(n-1));
                T.subVectors(Q, P);
                T.normalize();
                // perp
                N.set(-T.z, T.y, T.x);

                // add some weighted oscillation
                const amp = 1;
                const freq = 3;
                const w = amp * (sin(PI*u)**2) * sin(freq * 2*PI*u);
                P.addScaledVector(N, w);
                P.y += w;
            }

            if (0) {
                // circle around destination
                const theta = 2 * PI * u * 8;
                const r = 30 + 10 * sin(PI * u * 2);
                Q.x = r * cos(theta);
                Q.z = r * sin(theta);
                Q.y = 0;
                Q.add(B);
                const blend = 0.8;
                P.lerp(Q, smoothstep(blend, 1, u));
            }

            path.push(P);
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
        right.normalize()
        up.crossVectors(right, forward);
        matrix.makeBasis(right, up, forward);

        if (1) {
            // wiggle along forward axis (roll)
            const DEG2RAD = PI / 180;
            const theta = DEG2RAD * 50 * sin(3 * PI * time);
            const R = new Matrix4();
            R.makeRotationAxis(forward, theta);
            matrix.multiply(R);
        }

        matrix.setPosition(position);
        return matrix;
    }
}
