// arc-view.js — ArcView: SVG diagram lukowy struktury drugorzedowej RNA
'use strict';

window.ArcView = class ArcView {

    /**
     * @param {SVGElement} svg - element <svg id="arc-svg">
     */
    constructor(svg) {
        this.svg = svg;
        this.arcs = [];        // { path, i, j, pairType }
        this.nucTexts = [];    // SVG text elements
        this.n = 0;
        this.spacing = 32;     // odleglosc miedzy nukleotydami
        this.marginX = 20;
        this.baseY = 0;       // linia bazowa nukleotydow
        this.onArcHover = null;  // callback(i, j | null)
        this.onArcClick = null;  // callback(i, j, selected)
        this._selectedArc = null; // { i, j } or null
    }

    /**
     * Inicjalizuje diagram dla sekwencji.
     */
    init(sequence) {
        const ns = 'http://www.w3.org/2000/svg';
        this.n = sequence.length;

        // bezpieczne czyszczenie SVG
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }
        this.arcs = [];
        this.nucTexts = [];

        const w = this.marginX * 2 + (this.n - 1) * this.spacing + 20;
        const maxArcH = (this.n * this.spacing) / 2;
        const h = maxArcH + 50;
        this.baseY = h - 20;

        this._vbW = w;
        this._vbH = h;
        this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

        // nukleotydy na osi X
        for (let i = 0; i < this.n; i++) {
            const txt = document.createElementNS(ns, 'text');
            txt.classList.add('nuc-text');
            txt.setAttribute('x', this._nucX(i));
            txt.setAttribute('y', this.baseY);
            txt.textContent = sequence[i];

            // koloruj nukleotydy — vivid on dark
            const colors = { A: '#22d3ee', U: '#fb7185', G: '#4ade80', C: '#fbbf24' };
            txt.setAttribute('fill', colors[sequence[i]] || '#94a3b8');

            this.svg.appendChild(txt);
            this.nucTexts.push(txt);
        }

        // indeksy pod nukleotydami
        for (let i = 0; i < this.n; i++) {
            const idx = document.createElementNS(ns, 'text');
            idx.setAttribute('x', this._nucX(i));
            idx.setAttribute('y', this.baseY + 16);
            idx.setAttribute('text-anchor', 'middle');
            idx.setAttribute('font-size', '9');
            idx.setAttribute('fill', '#475569');
            idx.textContent = i;
            this.svg.appendChild(idx);
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
     * Tworzy luki dla par.
     * @param {Array} pairs - [[i,j], ...]
     * @param {string} sequence
     */
    setPairs(pairs, sequence) {
        const ns = 'http://www.w3.org/2000/svg';

        // usun stare luki
        for (const arc of this.arcs) {
            arc.path.remove();
        }
        this.arcs = [];

        const colorMap = {
            AU: 'var(--pair-au)',
            GC: 'var(--pair-gc)',
            GU: 'var(--pair-gu)',
        };

        for (const [i, j] of pairs) {
            const x1 = this._nucX(i);
            const x2 = this._nucX(j);
            const midX = (x1 + x2) / 2;
            const r = (x2 - x1) / 2;

            // polkole Beziera (luk nad sekwencja)
            const path = document.createElementNS(ns, 'path');
            const d = `M ${x1} ${this.baseY - 10} C ${x1} ${this.baseY - 10 - r * 1.1}, ${x2} ${this.baseY - 10 - r * 1.1}, ${x2} ${this.baseY - 10}`;
            path.setAttribute('d', d);
            path.classList.add('arc-path');

            const pt = RNAUtils.pairType(sequence[i], sequence[j]);
            path.setAttribute('stroke', colorMap[pt] || '#888');

            const ii = i, jj = j;

            // hover (tymczasowe podswietlenie)
            path.addEventListener('mouseenter', () => {
                if (!this._isSelected(ii, jj)) {
                    path.classList.add('hover-highlight');
                }
                if (this.onArcHover) this.onArcHover(ii, jj);
            });
            path.addEventListener('mouseleave', () => {
                path.classList.remove('hover-highlight');
                if (this.onArcHover) this.onArcHover(null, null);
            });

            // click (trwaly toggle)
            path.addEventListener('click', () => {
                const wasSelected = this._isSelected(ii, jj);
                this.clearSelection();
                if (!wasSelected) {
                    this._selectedArc = { i: ii, j: jj };
                    path.classList.add('arc-selected');
                }
                if (this.onArcClick) this.onArcClick(ii, jj, !wasSelected);
            });

            // wstaw przed nukleotydami (pod tekstem)
            this.svg.insertBefore(path, this.nucTexts[0]);

            this.arcs.push({ path, i, j, pairType: pt });
        }
    }

    /**
     * Pokazuje wszystkie luki naraz (tryb instant).
     */
    showAll() {
        for (const arc of this.arcs) {
            arc.path.classList.add('visible');
        }
    }

    /**
     * Pokazuje luki do podanej pary wlacznie (tryb edukacyjny).
     * @param {number} pairIndex — indeks w tablicy arcs
     */
    showUpTo(pairIndex) {
        for (let k = 0; k < this.arcs.length; k++) {
            if (k <= pairIndex) {
                this.arcs[k].path.classList.add('visible');
            } else {
                this.arcs[k].path.classList.remove('visible');
            }
        }
    }

    /**
     * Ukrywa wszystkie luki.
     */
    hideAll() {
        for (const arc of this.arcs) {
            arc.path.classList.remove('visible');
        }
    }

    /**
     * Podswietla luk odpowiadajacy parze (i,j).
     */
    highlightArc(i, j) {
        this.clearHighlights();
        for (const arc of this.arcs) {
            if (arc.i === i && arc.j === j) {
                arc.path.classList.add('hover-highlight');
            }
        }
    }

    clearHighlights() {
        for (const arc of this.arcs) {
            arc.path.classList.remove('hover-highlight');
        }
    }

    clearSelection() {
        this._selectedArc = null;
        for (const arc of this.arcs) {
            arc.path.classList.remove('arc-selected');
        }
    }

    _isSelected(i, j) {
        return this._selectedArc && this._selectedArc.i === i && this._selectedArc.j === j;
    }

    /** Wspolrzedna X nukleotydu na pozycji i. */
    _nucX(i) {
        return this.marginX + i * this.spacing + 10;
    }
};
