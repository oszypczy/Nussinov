// nussinov.js — NussinovModel: algorytm programowania dynamicznego + generowanie krokow
'use strict';

window.NussinovModel = class NussinovModel {

    /**
     * @param {string} sequence - oczyszczona sekwencja RNA (wielkie litery)
     * @param {number} minLoopLength - minimalna odleglosc petli (domyslnie 1)
     * @param {boolean} allowWobble - czy dozwolone pary wobble G-U
     */
    constructor(sequence, minLoopLength = 1, allowWobble = false) {
        this.seq = sequence;
        this.n = sequence.length;
        this.k = minLoopLength;
        this.allowWobble = allowWobble;

        // macierz n x n zainicjalizowana zerami
        this.M = Array.from({ length: this.n }, () => new Array(this.n).fill(0));

        this.fillSteps = [];
        this.tracebackSteps = [];
        this.pairs = [];

        this._fill();
        this._traceback();
    }

    // ---------- Wypelnianie macierzy ----------

    _fill() {
        const { seq, n, k, M, allowWobble } = this;

        // iteracja po dlugosciach podsekwencji (przekatne)
        for (let len = k + 2; len <= n; len++) {
            for (let i = 0; i <= n - len; i++) {
                const j = i + len - 1;

                // Przypadek 1: i niesparowane
                let best = M[i + 1][j];
                let bestCase = 'skip_i';
                let bestDeps = [[i + 1, j]];
                let bestDesc = `s[${i}]=${seq[i]} niesparowane → M[${i + 1}][${j}] = ${M[i + 1][j]}`;

                // Przypadek 2: j niesparowane
                if (M[i][j - 1] > best) {
                    best = M[i][j - 1];
                    bestCase = 'skip_j';
                    bestDeps = [[i, j - 1]];
                    bestDesc = `s[${j}]=${seq[j]} niesparowane → M[${i}][${j - 1}] = ${M[i][j - 1]}`;
                }

                // Przypadek 3: i sparowane z j
                const delta = RNAUtils.canPair(seq[i], seq[j], allowWobble) ? 1 : 0;
                const pairVal = M[i + 1][j - 1] + delta;
                if (pairVal > best) {
                    best = pairVal;
                    bestCase = delta ? 'pair' : 'skip_i';
                    bestDeps = [[i + 1, j - 1]];
                    if (delta) {
                        bestDesc = `Para ${seq[i]}–${seq[j]}: M[${i + 1}][${j - 1}] + 1 = ${pairVal}`;
                    } else {
                        bestDesc = `M[${i + 1}][${j - 1}] + 0 = ${pairVal} (brak pary)`;
                    }
                }

                // Przypadek 4: bifurkacja
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

    // ---------- Traceback ----------

    _traceback() {
        if (this.n === 0) return;
        this._tracebackRecur(0, this.n - 1);
    }

    _tracebackRecur(i, j) {
        const { seq, k, M, allowWobble } = this;

        if (j - i <= k) return;

        // i niesparowane
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
        }
        // j niesparowane
        else if (M[i][j] === M[i][j - 1]) {
            this.tracebackSteps.push({
                type: 'traceback',
                i, j,
                value: M[i][j],
                case: 'skip_j',
                dependencies: [[i, j - 1]],
                description: `M[${i}][${j}]=${M[i][j]} == M[${i}][${j - 1}] → s[${j}]=${seq[j]} niesparowane`,
            });
            this._tracebackRecur(i, j - 1);
        }
        // para i-j
        else if (RNAUtils.canPair(seq[i], seq[j], allowWobble) &&
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
        }
        // bifurkacja
        else {
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

    // ---------- API ----------

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

    /**
     * Zwraca notacje kropkowa (dot-bracket) struktury.
     */
    getDotBracket() {
        const arr = new Array(this.n).fill('.');
        for (const [i, j] of this.pairs) {
            arr[i] = '(';
            arr[j] = ')';
        }
        return arr.join('');
    }
};
