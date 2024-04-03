export class Line {

    /**
     *
     * @param {Line[]} lines
     */
    static findLines(lines) {
        console.time('findLines')

        /**
         *
         * @param {Line} cur
         * @param {Line[]} rem
         * @param {Line[]} acc
         */
        function r(cur, rem, acc) {
            if (rem.length === 0) {
                if (cur) {
                    acc.push(cur);
                }
                return acc;
            }
            if (!cur) {
                return r(rem.shift(), rem, acc);
            }
            let checked = [];
            do {
                let line = cur.combine(rem.shift());
                if (line) {
                    checked.push(line);
                } else {
                    if (cur.isClosed) {
                        acc.push(cur);
                        return r(null, checked.concat(rem), acc);
                    }
                }
            } while (rem.length > 0);
            if (cur.modified) {
                return r(cur.reset(), checked, acc);
            }
            acc.push(cur);
            return r(null, checked, acc);
        }

        lines = r(null, lines, []);
        console.timeEnd('findLines')
        return lines;
    }

    /**
     *
     * @param {THREE.Vector3} start
     * @param {THREE.Vector3} end
     * @param {number} tolerance
     */
    constructor(start, end, tolerance = 0.001) {
        this.start = start;
        this.end = end;
        this.vertices = [start, end];
        this.tolerance = tolerance;
        this.isClosed = false;
        this.modified = false;
    }

    reset() {
        this.modified = false;
        return this;
    }

    /**
     *
     * @param {Line} line
     * @returns {Line|null}
     */
    combine(line) {
        if (this.#equals(this.start, line.start)) {
            this.vertices.unshift(line.end);
            this.start = line.end;
        } else if (this.#equals(this.start, line.end)) {
            this.vertices.unshift(line.start);
            this.start = line.start;
        } else if (this.#equals(this.end, line.end)) {
            this.vertices.push(line.start);
            this.end = line.start;
        } else if (this.#equals(this.end, line.start)) {
            this.vertices.push(line.end);
            this.end = line.end;
        } else {
            return line;
        }
        this.modified = true;
        if (this.#equals(this.start, this.end)) {
            this.isClosed = true;
        }
        return null;
    }

    #equals(v1, v2) {
        return ((Math.abs(v1.x - v2.x) < this.tolerance) &&
            (Math.abs(v1.y - v2.y) < this.tolerance) &&
            (Math.abs(v1.z - v2.z) < this.tolerance));
    }
}