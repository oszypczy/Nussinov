'use strict';

window.NussinovModel = class NussinovModel {

    constructor(sequence, minLoopLength = 1, allowWobble = false) {
        this.seq = sequence;
        this.n = sequence.length;
        this.k = minLoopLength;
        this.allowWobble = allowWobble;

        this.M = Array.from({ length: this.n }, () => new Array(this.n).fill(0));

        this.fillSteps = [];
        this.tracebackSteps = [];
        this.pairs = [];

        this._fill();
        this._traceback();
    }

    _fill() {
        const { seq, n, k, M, allowWobble } = this;

        for (let len = k + 2; len <= n; len++) {
            for (let i = 0; i <= n - len; i++) {
                const j = i + len - 1;

                let best = M[i + 1][j];
                let bestCase = 'skip_i';
                let bestDeps = [[i + 1, j]];
                let bestDesc = `s[${i}]=${seq[i]} niesparowane → M[${i + 1}][${j}] = ${M[i + 1][j]}`;

                if (M[i][j - 1] > best) {
                    best = M[i][j - 1];
                    bestCase = 'skip_j';
                    bestDeps = [[i, j - 1]];
                    bestDesc = `s[${j}]=${seq[j]} niesparowane → M[${i}][${j - 1}] = ${M[i][j - 1]}`;
                }

                const delta = RNAUtils.canPair(seq[i], seq[j], allowWobble) ? 1 : 0;
                const pairVal = M[i + 1][j - 1] + delta;
                if (pairVal > best) {
                    best = pairVal;
                    bestCase = delta ? 'pair' : 'skip_i';
                    bestDeps = [[i + 1, j - 1]];
                    bestDesc = delta
                        ? `Para ${seq[i]}–${seq[j]}: M[${i + 1}][${j - 1}] + 1 = ${pairVal}`
                        : `M[${i + 1}][${j - 1}] + 0 = ${pairVal} (brak pary)`;
                }

                for (let t = i + 1; t < j; t++) {
                    const bifVal = M[i][t] + M[t + 1][j];
                    if (bifVal > best) {
                        best = bifVal;
                        bestCase = 'bifurcation';
                        bestDeps = [[i, t], [t + 1, j]];
                        bestDesc = `Bifurkacja w t=${t}: M[${i}][${t}] + M[${t + 1}][${j}] = ${M[i][t]} + ${M[t + 1][j]} = ${bifVal}`;
                    }
                }

                M[i][j] = best;

                this.fillSteps.push({
                    type: 'fill',
                    i, j,
                    value: best,
                    case: bestCase,
                    dependencies: bestDeps,
                    description: `M[${i}][${j}] = ${best}  ←  ${bestDesc}`,
                });
            }
        }
    }

    _traceback() {
        if (this.n === 0) return;
        this._tracebackRecur(0, this.n - 1);
    }

    _tracebackRecur(i, j) {
        const { seq, k, M, allowWobble } = this;

        if (j - i <= k) return;

        if (M[i][j] === M[i + 1][j]) {
            this.tracebackSteps.push({
                type: 'traceback',
                i, j,
                value: M[i][j],
                case: 'skip_i',
                dependencies: [[i + 1, j]],
                description: `M[${i}][${j}]=${M[i][j]} == M[${i + 1}][${j}] → s[${i}]=${seq[i]} niesparowane`,
            });
            this._tracebackRecur(i + 1, j);
        } else if (M[i][j] === M[i][j - 1]) {
            this.tracebackSteps.push({
                type: 'traceback',
                i, j,
                value: M[i][j],
                case: 'skip_j',
                dependencies: [[i, j - 1]],
                description: `M[${i}][${j}]=${M[i][j]} == M[${i}][${j - 1}] → s[${j}]=${seq[j]} niesparowane`,
            });
            this._tracebackRecur(i, j - 1);
        } else if (RNAUtils.canPair(seq[i], seq[j], allowWobble) &&
                   M[i][j] === M[i + 1][j - 1] + 1) {
            this.tracebackSteps.push({
                type: 'traceback',
                i, j,
                value: M[i][j],
                case: 'pair',
                dependencies: [[i + 1, j - 1]],
                description: `Para ${seq[i]}–${seq[j]} (pozycje ${i}–${j})`,
            });
            this.pairs.push([i, j]);
            this._tracebackRecur(i + 1, j - 1);
        } else {
            for (let t = i + 1; t < j; t++) {
                if (M[i][j] === M[i][t] + M[t + 1][j]) {
                    this.tracebackSteps.push({
                        type: 'traceback',
                        i, j,
                        value: M[i][j],
                        case: 'bifurcation',
                        dependencies: [[i, t], [t + 1, j]],
                        description: `Bifurkacja w t=${t}: M[${i}][${t}] + M[${t + 1}][${j}]`,
                    });
                    this._tracebackRecur(i, t);
                    this._tracebackRecur(t + 1, j);
                    break;
                }
            }
        }
    }

    generateFillSteps() {
        return this.fillSteps;
    }

    generateTracebackSteps() {
        return this.tracebackSteps;
    }

    getMatrix() {
        return this.M;
    }

    getPairs() {
        return this.pairs;
    }

    buildRecursionTree() {
        if (this.n === 0) return null;
        return this._buildTreeNode(0, this.n - 1);
    }

    _buildTreeNode(i, j) {
        const { seq, k, M, allowWobble } = this;
        const value = (i >= 0 && j < this.n && i <= j) ? M[i][j] : 0;
        const node = { i, j, value, case: 'base', children: [] };

        if (j - i <= k) return node;

        if (M[i][j] === M[i + 1][j]) {
            node.case = 'skip_i';
            node.children = [this._buildTreeNode(i + 1, j)];
        } else if (M[i][j] === M[i][j - 1]) {
            node.case = 'skip_j';
            node.children = [this._buildTreeNode(i, j - 1)];
        } else if (RNAUtils.canPair(seq[i], seq[j], allowWobble) && M[i][j] === M[i + 1][j - 1] + 1) {
            node.case = 'pair';
            node.children = [this._buildTreeNode(i + 1, j - 1)];
        } else {
            for (let t = i + 1; t < j; t++) {
                if (M[i][j] === M[i][t] + M[t + 1][j]) {
                    node.case = 'bifurcation';
                    node.bifT = t;
                    node.children = [this._buildTreeNode(i, t), this._buildTreeNode(t + 1, j)];
                    break;
                }
            }
        }
        return node;
    }

    getDotBracket() {
        const arr = new Array(this.n).fill('.');
        for (const [i, j] of this.pairs) {
            arr[i] = '(';
            arr[j] = ')';
        }
        return arr.join('');
    }
};
