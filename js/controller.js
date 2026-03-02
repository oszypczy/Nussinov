// controller.js — Controller: orkiestracja interfejsu, tryby, animacja
'use strict';

window.Controller = class Controller {

    constructor() {
        // DOM
        this.inputScreen = document.getElementById('input-screen');
        this.resultsScreen = document.getElementById('results-screen');
        this.seqInput = document.getElementById('seq-input');
        this.seqInputFasta = document.getElementById('seq-input-fasta');
        this.seqError = document.getElementById('seq-error');
        this.seqWarning = document.getElementById('seq-warning');
        this.exampleChips = document.getElementById('example-chips');
        this.loopSlider = document.getElementById('loop-slider');
        this.loopValue = document.getElementById('loop-value');
        this.wobbleCheck = document.getElementById('wobble-check');
        this.btnCompute = document.getElementById('btn-compute');
        this.resultSeqLabel = document.getElementById('result-seq-label');

        // edu controls
        this.eduControls = document.getElementById('edu-controls');
        this.btnReset = document.getElementById('btn-reset');
        this.btnPrev = document.getElementById('btn-prev');
        this.btnPlay = document.getElementById('btn-play');
        this.btnPause = document.getElementById('btn-pause');
        this.btnNext = document.getElementById('btn-next');
        this.btnSkip = document.getElementById('btn-skip');
        this.speedSlider = document.getElementById('speed-slider');
        this.stepLabel = document.getElementById('step-label');
        this.stepDesc = document.getElementById('step-description');
        this.btnBack = document.getElementById('btn-back');

        // overlay
        this.overlay = document.getElementById('cell-detail-overlay');
        this.overlayBody = document.getElementById('cell-detail-body');
        this.overlayClose = document.getElementById('overlay-close');

        this.dotBracketEl = document.getElementById('dot-bracket');

        // views
        this.matrixView = new MatrixView(document.getElementById('matrix-svg'));
        this.arcView = new ArcView(document.getElementById('arc-svg'));

        // state
        this.model = null;
        this.allSteps = [];     // fill + traceback
        this.currentStep = -1;
        this.fillCount = 0;
        this.isPlaying = false;
        this.playTimer = null;
        this.mode = 'educational';  // 'educational' | 'instant'
        this.format = 'plain';

        // pairIndexMap: mapuje indeks kroku traceback 'pair' na indeks luku w arcView
        this.pairStepToArcIndex = [];

        this._initEvents();
        this._populateExamples();
    }

    // ---------- Init ----------

    _initEvents() {
        // format toggle
        document.querySelectorAll('.format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.format = btn.dataset.format;

                const isPlain = this.format === 'plain';
                this.seqInput.classList.toggle('hidden', !isPlain);
                this.seqInputFasta.classList.toggle('hidden', isPlain);
                this._validateInput();
            });
        });

        // mode toggle
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.dataset.mode;
            });
        });

        // input events
        this.seqInput.addEventListener('input', () => this._validateInput());
        this.seqInputFasta.addEventListener('input', () => this._validateInput());

        // loop slider
        this.loopSlider.addEventListener('input', () => {
            this.loopValue.textContent = this.loopSlider.value;
        });

        // compute
        this.btnCompute.addEventListener('click', () => this._compute());

        // back
        this.btnBack.addEventListener('click', () => this._goBack());

        // edu controls
        this.btnReset.addEventListener('click', () => this._resetSteps());
        this.btnPrev.addEventListener('click', () => this._prevStep());
        this.btnNext.addEventListener('click', () => this._nextStep());
        this.btnPlay.addEventListener('click', () => this._play());
        this.btnPause.addEventListener('click', () => this._pause());
        this.btnSkip.addEventListener('click', () => this._skipToTraceback());

        // speed slider
        this.speedSlider.addEventListener('input', () => {
            if (this.isPlaying) {
                this._pause();
                this._play();
            }
        });

        // keyboard
        document.addEventListener('keydown', (e) => {
            if (this.resultsScreen.classList.contains('hidden')) return;
            if (this.mode !== 'educational') return;
            if (e.key === 'ArrowRight') { e.preventDefault(); this._nextStep(); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); this._prevStep(); }
            if (e.key === ' ') {
                e.preventDefault();
                this.isPlaying ? this._pause() : this._play();
            }
        });

        // overlay close
        this.overlayClose.addEventListener('click', () => {
            this.overlay.classList.add('hidden');
        });
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.overlay.classList.add('hidden');
        });
    }

    _populateExamples() {
        RNAUtils.EXAMPLES.forEach((ex, idx) => {
            const chip = document.createElement('button');
            chip.classList.add('chip');

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('chip-name');
            nameSpan.textContent = ex.name;
            chip.appendChild(nameSpan);

            chip.appendChild(document.createTextNode(ex.sequence));

            chip.addEventListener('click', () => {
                // zaznacz chip
                document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');

                // wstaw sekwencje
                if (this.format === 'plain') {
                    this.seqInput.value = ex.sequence;
                } else {
                    this.seqInputFasta.value = `>przyklad_${idx + 1}\n${ex.sequence}`;
                }
                this._validateInput();
            });

            this.exampleChips.appendChild(chip);
        });
    }

    // ---------- Validation ----------

    _getActiveInput() {
        return this.format === 'plain' ? this.seqInput : this.seqInputFasta;
    }

    _getRawText() {
        return this._getActiveInput().value;
    }

    _validateInput() {
        const raw = this._getRawText();
        this.seqError.textContent = '';
        this.seqWarning.textContent = '';

        const activeEl = this._getActiveInput();
        activeEl.classList.remove('invalid');

        if (raw.trim().length === 0) {
            this.btnCompute.disabled = true;
            return;
        }

        const { cleaned, warnings: sanWarnings } = RNAUtils.sanitize(raw, this.format);
        const { valid, errors, warnings } = RNAUtils.validate(cleaned);

        const allWarnings = [...sanWarnings, ...warnings];

        if (!valid) {
            this.seqError.textContent = errors.join(' ');
            activeEl.classList.add('invalid');
            this.btnCompute.disabled = true;
        } else {
            this.btnCompute.disabled = false;
        }

        this.seqWarning.textContent = allWarnings.join(' ');
    }

    // ---------- Compute ----------

    _compute() {
        const raw = this._getRawText();
        const { cleaned } = RNAUtils.sanitize(raw, this.format);
        const minLoop = parseInt(this.loopSlider.value, 10);
        const wobble = this.wobbleCheck.checked;

        this.model = new NussinovModel(cleaned, minLoop, wobble);

        const fillSteps = this.model.generateFillSteps();
        const traceSteps = this.model.generateTracebackSteps();
        this.allSteps = [...fillSteps, ...traceSteps];
        this.fillCount = fillSteps.length;

        // buduj mapowanie pair steps -> arc index
        this.pairStepToArcIndex = [];
        let arcIdx = 0;
        for (let s = 0; s < traceSteps.length; s++) {
            if (traceSteps[s].case === 'pair') {
                this.pairStepToArcIndex.push({ stepIndex: this.fillCount + s, arcIndex: arcIdx });
                arcIdx++;
            }
        }

        // init views
        this.matrixView.init(cleaned);
        this.arcView.init(cleaned);
        this.arcView.setPairs(this.model.getPairs(), cleaned);

        // cross-interactions
        this.matrixView.onCellClick = (i, j) => this._showCellDetail(i, j);
        this.matrixView.onCellHover = (i, j) => {
            if (i === null) {
                this.matrixView.clearHoverHighlights();
                this.arcView.clearHighlights();
                return;
            }
            // find step for (i,j) to show deps
            const step = this.allSteps.find(s => s.type === 'fill' && s.i === i && s.j === j);
            if (step) this.matrixView.highlightDeps(step.dependencies);
            // highlight arc if pair exists
            this.arcView.highlightArc(i, j);
        };

        this.arcView.onArcHover = (i, j) => {
            if (i === null) {
                this.matrixView.clearHoverHighlights();
                return;
            }
            this.matrixView.highlightPair(i, j);
        };

        // show results
        this.inputScreen.classList.add('hidden');
        this.resultsScreen.classList.remove('hidden');
        this.resultSeqLabel.textContent = `${cleaned}  (${cleaned.length} nt, ${this.model.getPairs().length} par)`;
        this.dotBracketEl.textContent = this.model.getDotBracket();

        if (this.mode === 'instant') {
            this._runInstant();
        } else {
            this._runEducational();
        }
    }

    _runInstant() {
        this.eduControls.classList.add('hidden');
        this.matrixView.fillAll(this.model.getMatrix());
        this.arcView.showAll();
    }

    _runEducational() {
        this.eduControls.classList.remove('hidden');
        this.currentStep = -1;
        this._updateStepUI();
    }

    // ---------- Step navigation ----------

    _nextStep() {
        if (this.currentStep >= this.allSteps.length - 1) return;
        this.currentStep++;
        this._applyStep(this.currentStep);
        this._updateStepUI();
    }

    _prevStep() {
        if (this.currentStep < 0) return;
        this.currentStep--;
        this._rebuildUpTo(this.currentStep);
        this._updateStepUI();
    }

    _resetSteps() {
        this._pause();
        this.currentStep = -1;
        this._rebuildUpTo(-1);
        this._updateStepUI();
    }

    _skipToTraceback() {
        this._pause();
        // przeskocz do ostatniego fill step
        this.currentStep = this.fillCount - 1;
        this._rebuildUpTo(this.currentStep);
        this._updateStepUI();
    }

    _play() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.btnPlay.classList.add('hidden');
        this.btnPause.classList.remove('hidden');

        const delay = 1050 - parseInt(this.speedSlider.value, 10);
        this.playTimer = setInterval(() => {
            if (this.currentStep >= this.allSteps.length - 1) {
                this._pause();
                return;
            }
            this._nextStep();
        }, delay);
    }

    _pause() {
        this.isPlaying = false;
        this.btnPause.classList.add('hidden');
        this.btnPlay.classList.remove('hidden');
        if (this.playTimer) {
            clearInterval(this.playTimer);
            this.playTimer = null;
        }
    }

    // ---------- Step apply ----------

    _applyStep(index) {
        if (index < 0 || index >= this.allSteps.length) return;
        const step = this.allSteps[index];

        if (step.type === 'fill') {
            const maxVal = Math.max(1, step.value, ...(this.model.getMatrix().flat()));
            this.matrixView.setCellValue(step.i, step.j, step.value, maxVal);
        }

        this.matrixView.highlightStep(step);

        // pokaz luki stopniowo podczas traceback
        if (step.type === 'traceback') {
            const mapping = this.pairStepToArcIndex.find(m => m.stepIndex === index);
            if (mapping) {
                this.arcView.showUpTo(mapping.arcIndex);
            }
        }
    }

    /**
     * Odbudowuje stan do danego kroku (dla prev / reset).
     */
    _rebuildUpTo(upTo) {
        // reset macierzy
        this.matrixView.init(this.model.seq);
        this.arcView.hideAll();

        // odtworz fill steps
        const maxVal = Math.max(1, ...(this.model.getMatrix().flat()));
        for (let s = 0; s <= upTo && s < this.allSteps.length; s++) {
            const step = this.allSteps[s];
            if (step.type === 'fill') {
                this.matrixView.setCellValue(step.i, step.j, step.value, maxVal);
            }
        }

        // odtworz traceback arcs
        let lastArcIdx = -1;
        for (const m of this.pairStepToArcIndex) {
            if (m.stepIndex <= upTo) lastArcIdx = m.arcIndex;
        }
        if (lastArcIdx >= 0) this.arcView.showUpTo(lastArcIdx);

        // podswietlenie aktualnego kroku
        if (upTo >= 0 && upTo < this.allSteps.length) {
            this.matrixView.highlightStep(this.allSteps[upTo]);
        }
    }

    _updateStepUI() {
        const total = this.allSteps.length;
        const current = this.currentStep + 1;
        const phase = this.currentStep < 0 ? 'Start'
            : this.currentStep < this.fillCount ? 'Wypełnianie macierzy'
            : 'Traceback';

        this.stepLabel.textContent = `Krok ${current}/${total} — ${phase}`;

        if (this.currentStep >= 0 && this.currentStep < total) {
            this.stepDesc.textContent = this.allSteps[this.currentStep].description;
        } else {
            this.stepDesc.textContent = 'Kliknij "Dalej" aby rozpocząć.';
        }

        // wlacz/wylacz przyciski
        this.btnPrev.disabled = this.currentStep < 0;
        this.btnReset.disabled = this.currentStep < 0;
        this.btnNext.disabled = this.currentStep >= total - 1;
        this.btnSkip.disabled = this.currentStep >= this.fillCount - 1;
    }

    // ---------- Cell detail overlay ----------

    _showCellDetail(i, j) {
        if (!this.model) return;
        const M = this.model.getMatrix();
        if (i >= this.model.n || j >= this.model.n) return;

        // szukaj kroku fill dla (i,j)
        const step = this.allSteps.find(s => s.type === 'fill' && s.i === i && s.j === j);

        // buduj DOM bezpiecznie
        const body = this.overlayBody;
        while (body.firstChild) body.removeChild(body.firstChild);

        const addLine = (text, bold) => {
            const el = document.createElement(bold ? 'strong' : 'span');
            el.textContent = text;
            body.appendChild(el);
            body.appendChild(document.createElement('br'));
        };

        addLine(`M[${i}][${j}] = ${M[i][j]}`, true);
        addLine(`Sekwencja: ${this.model.seq[i]}...${this.model.seq[j]}`, false);

        if (step) {
            body.appendChild(document.createElement('br'));
            addLine('Obliczenie:', true);
            addLine(step.description, false);
            addLine(`Przypadek: ${this._caseLabel(step.case)}`, false);
        } else if (j - i <= this.model.k) {
            body.appendChild(document.createElement('br'));
            addLine(`Warunek początkowy (j - i ≤ ${this.model.k})`, false);
        }

        this.overlay.classList.remove('hidden');
    }

    _caseLabel(c) {
        switch (c) {
            case 'skip_i': return 'i niesparowane';
            case 'skip_j': return 'j niesparowane';
            case 'pair': return 'Parowanie i–j';
            case 'bifurcation': return 'Bifurkacja';
            default: return c;
        }
    }

    // ---------- Navigation ----------

    _goBack() {
        this._pause();
        this.resultsScreen.classList.add('hidden');
        this.inputScreen.classList.remove('hidden');
    }
};

// Inicjalizacja po zaladowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    window.app = new Controller();
});
