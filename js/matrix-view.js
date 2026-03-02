// matrix-view.js — MatrixView: SVG wizualizacja macierzy DP
'use strict';

window.MatrixView = class MatrixView {

    /**
     * @param {SVGElement} svg - element <svg id="matrix-svg">
     */
    constructor(svg) {
        this.svg = svg;
        this.cells = [];       // [i][j] -> { rect, text }
        this.n = 0;
        this.cellSize = 36;
        this.headerSize = 28;
        this.onCellClick = null;   // callback(i, j)
        this.onCellHover = null;   // callback(i, j | null)
    }

    /**
     * Inicjalizuje siatke macierzy dla sekwencji.
     */
    init(sequence) {
        const ns = 'http://www.w3.org/2000/svg';
        this.n = sequence.length;

        // bezpieczne czyszczenie SVG
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }
        this.cells = [];

        const cs = this.cellSize;
        const hs = this.headerSize;
        const w = hs + this.n * cs;
        const h = hs + this.n * cs;

        this._vbW = w;
        this._vbH = h;
        this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

        // naglowki kolumn (gora)
        for (let j = 0; j < this.n; j++) {
            const txt = document.createElementNS(ns, 'text');
            txt.classList.add('header-text');
            txt.setAttribute('x', hs + j * cs + cs / 2);
            txt.setAttribute('y', hs / 2);
            txt.textContent = `${sequence[j]}${j}`;
            this.svg.appendChild(txt);
        }

        // naglowki wierszy (lewa)
        for (let i = 0; i < this.n; i++) {
            const txt = document.createElementNS(ns, 'text');
            txt.classList.add('header-text');
            txt.setAttribute('x', hs / 2);
            txt.setAttribute('y', hs + i * cs + cs / 2);
            txt.textContent = `${sequence[i]}${i}`;
            this.svg.appendChild(txt);
        }

        // komorki
        for (let i = 0; i < this.n; i++) {
            this.cells[i] = [];
            for (let j = 0; j < this.n; j++) {
                const rect = document.createElementNS(ns, 'rect');
                rect.classList.add('cell-rect');
                rect.setAttribute('x', hs + j * cs);
                rect.setAttribute('y', hs + i * cs);
                rect.setAttribute('width', cs);
                rect.setAttribute('height', cs);
                rect.setAttribute('fill', j >= i ? '#141b2d' : '#0e1322');
                this.svg.appendChild(rect);

                const text = document.createElementNS(ns, 'text');
                text.classList.add('cell-text');
                text.setAttribute('x', hs + j * cs + cs / 2);
                text.setAttribute('y', hs + i * cs + cs / 2);
                text.textContent = '';
                this.svg.appendChild(text);

                this.cells[i][j] = { rect, text };

                // eventy
                const ii = i, jj = j;
                rect.addEventListener('click', () => {
                    if (this.onCellClick) this.onCellClick(ii, jj);
                });
                rect.addEventListener('mouseenter', () => {
                    if (this.onCellHover) this.onCellHover(ii, jj);
                });
                rect.addEventListener('mouseleave', () => {
                    if (this.onCellHover) this.onCellHover(null, null);
                });
            }
        }

        this._fitToContainer();
        this._observeResize();
    }

    _fitToContainer() {
        const wrap = this.svg.parentElement;
        if (!wrap || !this._vbW) return;
        const { width: cw, height: ch } = wrap.getBoundingClientRect();
        if (cw === 0 || ch === 0) return;
        const scale = Math.min(cw / this._vbW, ch / this._vbH);
        this.svg.setAttribute('width', this._vbW * scale);
        this.svg.setAttribute('height', this._vbH * scale);
    }

    _observeResize() {
        if (this._ro) this._ro.disconnect();
        const wrap = this.svg.parentElement;
        if (!wrap) return;
        this._ro = new ResizeObserver(() => this._fitToContainer());
        this._ro.observe(wrap);
    }

    /**
     * Ustawia wartosc komorki i koloruje wg wartosci.
     */
    setCellValue(i, j, value, maxValue) {
        if (!this.cells[i] || !this.cells[i][j]) return;
        const cell = this.cells[i][j];
        cell.text.textContent = value;

        // gradient ciemny -> luminescencyjny wg wartosci (dark theme)
        if (value > 0 && maxValue > 0) {
            const t = value / maxValue;
            // od ciemnego indygo do jasnego cyan-indygo
            const r = Math.round(20 + t * 60);    // 20 -> 80
            const g = Math.round(27 + t * 85);    // 27 -> 112
            const b = Math.round(45 + t * 175);   // 45 -> 220
            cell.rect.setAttribute('fill', `rgb(${r},${g},${b})`);
        } else {
            cell.rect.setAttribute('fill', '#141b2d');
        }
    }

    /**
     * Wypelnia cala macierz wartosciami (tryb instant).
     */
    fillAll(matrix) {
        const maxVal = Math.max(1, ...matrix.flat());
        for (let i = 0; i < this.n; i++) {
            for (let j = i; j < this.n; j++) {
                this.setCellValue(i, j, matrix[i][j], maxVal);
            }
        }
    }

    /**
     * Podswietla komorke i jej zaleznosci.
     */
    highlightStep(step) {
        this.clearHighlights();
        if (!step) return;

        const { i, j, dependencies } = step;

        // zaleznosci
        if (dependencies) {
            for (const [di, dj] of dependencies) {
                if (this.cells[di] && this.cells[di][dj]) {
                    this.cells[di][dj].rect.classList.add(
                        step.type === 'traceback' ? 'highlight-trace' : 'highlight-dep'
                    );
                }
            }
        }

        // aktualna komorka
        if (this.cells[i] && this.cells[i][j]) {
            this.cells[i][j].rect.classList.add('highlight-current');
        }
    }

    /**
     * Podswietla zaleznosci przy hover.
     */
    highlightDeps(deps) {
        this.clearHoverHighlights();
        if (!deps) return;
        for (const [di, dj] of deps) {
            if (this.cells[di] && this.cells[di][dj]) {
                this.cells[di][dj].rect.classList.add('hover-dep');
            }
        }
    }

    /**
     * Podswietla pare (i,j) w macierzy — tymczasowo przy hover na luk.
     */
    highlightPair(i, j) {
        this.clearHoverHighlights();
        if (this.cells[i] && this.cells[i][j]) {
            this.cells[i][j].rect.classList.add('hover-dep');
        }
    }

    /**
     * Trwale zaznacza pare (i,j) — przy kliknieciu w luk.
     */
    selectPair(i, j) {
        this.clearPairSelection();
        if (this.cells[i] && this.cells[i][j]) {
            this.cells[i][j].rect.classList.add('highlight-trace');
        }
    }

    clearPairSelection() {
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                this.cells[i][j].rect.classList.remove('highlight-trace');
            }
        }
    }

    clearHighlights() {
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                const r = this.cells[i][j].rect;
                r.classList.remove('highlight-current', 'highlight-dep', 'highlight-trace');
            }
        }
    }

    clearHoverHighlights() {
        for (let i = 0; i < this.n; i++) {
            for (let j = 0; j < this.n; j++) {
                this.cells[i][j].rect.classList.remove('hover-dep');
            }
        }
    }

    /**
     * Podswietla sciezke traceback.
     */
    highlightTracePath(traceSteps) {
        for (const step of traceSteps) {
            if (step.case === 'pair' && this.cells[step.i] && this.cells[step.i][step.j]) {
                this.cells[step.i][step.j].rect.classList.add('highlight-trace');
            }
        }
    }
};
