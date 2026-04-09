'use strict';

window.HelixView = class HelixView {

    constructor(container) {
        this.container = container;
        this.scene    = null;
        this.camera   = null;
        this.renderer = null;
        this.animId   = null;
        this._initialized = false;
        this._isActive    = false;
        this._autoRotate  = true;
        this.pairs = [];
        this.seq   = '';
        this._mouse = { down: false, x: 0, y: 0, startX: 0, startY: 0, wasDragging: false };
        this._spherical = { theta: Math.PI / 6, phi: 1.15, radius: 30 };

        this._raycaster      = null;
        this._clickableObjs  = [];
        this._pairObjects    = new Map();
        this._highlightedPair = null;
    }

    setPairs(pairs, sequence) {
        this.pairs = pairs;
        this.seq   = sequence;
        if (this._initialized) this._buildScene();
    }

    activate() {
        if (!this._initialized) this._init();
        this._isActive = true;
        this._buildScene();
        this._startLoop();
    }

    deactivate() {
        this._isActive = false;
        if (this.animId) {
            cancelAnimationFrame(this.animId);
            this.animId = null;
        }
    }

    highlightPair(i, j) {
        this._highlightedPair = [i, j];
        this._applyHighlight();
    }

    clearHighlight() {
        this._clearHighlightVisuals();
        this._highlightedPair = null;
    }

    _init() {
        if (this._initialized) return;
        this._initialized = true;
        if (typeof THREE === 'undefined') return;

        const w = Math.max(this.container.clientWidth,  200);
        const h = Math.max(this.container.clientHeight, 200);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x080c16);
        this.scene.fog = new THREE.FogExp2(0x080c16, 0.015);

        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
        this._updateCamera();

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(w, h);
        this.container.appendChild(this.renderer.domElement);

        this._raycaster = new THREE.Raycaster();

        this.scene.add(new THREE.AmbientLight(0x1a2a50, 5));
        const dir1 = new THREE.DirectionalLight(0x8899ff, 2.5);
        dir1.position.set(10, 20, 10);
        this.scene.add(dir1);
        const dir2 = new THREE.DirectionalLight(0xff9966, 1.2);
        dir2.position.set(-10, -5, -5);
        this.scene.add(dir2);

        this._setupControls();

        this._resizeObserver = new ResizeObserver(() => this._onResize());
        this._resizeObserver.observe(this.container);
    }

    _onResize() {
        if (!this.renderer) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        if (w < 1 || h < 1) return;
        this.renderer.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    _setupControls() {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', (e) => {
            this._mouse.down = true;
            this._mouse.x = this._mouse.startX = e.clientX;
            this._mouse.y = this._mouse.startY = e.clientY;
            this._mouse.wasDragging = false;
            this._autoRotate = false;
        });

        window.addEventListener('mouseup', () => { this._mouse.down = false; });

        window.addEventListener('mousemove', (e) => {
            if (!this._mouse.down) return;
            const dx = e.clientX - this._mouse.x;
            const dy = e.clientY - this._mouse.y;
            this._mouse.x = e.clientX;
            this._mouse.y = e.clientY;
            if (Math.abs(e.clientX - this._mouse.startX) > 3 ||
                Math.abs(e.clientY - this._mouse.startY) > 3) {
                this._mouse.wasDragging = true;
            }
            this._spherical.theta -= dx * 0.012;
            this._spherical.phi   -= dy * 0.012;
            this._spherical.phi    = Math.max(0.08, Math.min(Math.PI - 0.08, this._spherical.phi));
            this._updateCamera();
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this._spherical.radius += e.deltaY * 0.06;
            this._spherical.radius  = Math.max(6, Math.min(120, this._spherical.radius));
            this._updateCamera();
        }, { passive: false });

        canvas.addEventListener('click', (e) => {
            if (this._mouse.wasDragging) return;
            this._handleClick(e);
        });

        canvas.addEventListener('dblclick', () => { this._autoRotate = true; });

        let lastTouchDist = 0;
        canvas.addEventListener('touchstart', (e) => {
            this._autoRotate = false;
            if (e.touches.length === 1) {
                this._mouse.down = true;
                this._mouse.x = this._mouse.startX = e.touches[0].clientX;
                this._mouse.y = this._mouse.startY = e.touches[0].clientY;
                this._mouse.wasDragging = false;
            } else if (e.touches.length === 2) {
                lastTouchDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        }, { passive: true });
        canvas.addEventListener('touchend', (e) => {
            if (!this._mouse.wasDragging && e.changedTouches.length === 1) {
                this._handleClick(e.changedTouches[0]);
            }
            this._mouse.down = false;
        }, { passive: true });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && this._mouse.down) {
                const dx = e.touches[0].clientX - this._mouse.x;
                const dy = e.touches[0].clientY - this._mouse.y;
                this._mouse.x = e.touches[0].clientX;
                this._mouse.y = e.touches[0].clientY;
                if (Math.abs(e.touches[0].clientX - this._mouse.startX) > 5 ||
                    Math.abs(e.touches[0].clientY - this._mouse.startY) > 5) {
                    this._mouse.wasDragging = true;
                }
                this._spherical.theta -= dx * 0.012;
                this._spherical.phi   -= dy * 0.012;
                this._spherical.phi    = Math.max(0.08, Math.min(Math.PI - 0.08, this._spherical.phi));
                this._updateCamera();
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                this._spherical.radius -= (dist - lastTouchDist) * 0.07;
                this._spherical.radius  = Math.max(6, Math.min(120, this._spherical.radius));
                lastTouchDist = dist;
                this._updateCamera();
            }
        }, { passive: false });
    }

    _handleClick(event) {
        if (!this._raycaster || !this.camera) return;
        const canvas = this.renderer.domElement;
        const rect   = canvas.getBoundingClientRect();
        const ndcX   = ((event.clientX - rect.left) / rect.width)  * 2 - 1;
        const ndcY   = -((event.clientY - rect.top)  / rect.height) * 2 + 1;

        this._raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
        const hits = this._raycaster.intersectObjects(this._clickableObjs);

        if (hits.length === 0) {
            this.clearHighlight();
            return;
        }
        const pairKey = hits[0].object.userData.pairKey;
        if (pairKey) {
            const [si, sj] = pairKey.split(',').map(Number);
            if (this._highlightedPair &&
                this._highlightedPair[0] === si &&
                this._highlightedPair[1] === sj) {
                this.clearHighlight();
            } else {
                this.highlightPair(si, sj);
            }
        } else {
            this.clearHighlight();
        }
    }

    _updateCamera() {
        if (!this.camera) return;
        const { theta, phi, radius } = this._spherical;
        this.camera.position.set(
            radius * Math.sin(phi) * Math.cos(theta),
            radius * Math.cos(phi),
            radius * Math.sin(phi) * Math.sin(theta)
        );
        this.camera.lookAt(0, 0, 0);
    }

    _buildScene() {
        if (!this.scene || typeof THREE === 'undefined') return;

        const toRemove = [];
        this.scene.children.forEach(c => { if (c.userData.isRNA) toRemove.push(c); });
        toRemove.forEach(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
            this.scene.remove(c);
        });

        this._clickableObjs = [];
        this._pairObjects.clear();

        const seq = this.seq;
        const n   = seq.length;
        if (n === 0) return;

        const RISE   = 1.5;
        const TWIST  = 32.7 * Math.PI / 180;
        const RADIUS = 4.2;

        const NUC_COL = { A: 0x22d3ee, U: 0xfb7185, G: 0x4ade80, C: 0xfbbf24 };
        const PAIR_COL = {
            AU: 0x38bdf8, UA: 0x38bdf8,
            GC: 0xf87171, CG: 0xf87171,
            GU: 0x34d399, UG: 0x34d399,
        };

        const paired = new Set();
        this.pairs.forEach(([i, j]) => { paired.add(i); paired.add(j); });

        const nucToPair = new Map();
        this.pairs.forEach(([i, j]) => { nucToPair.set(i, [i, j]); nucToPair.set(j, [i, j]); });

        const totalH = (n - 1) * RISE;
        const positions = [];
        for (let k = 0; k < n; k++) {
            const angle = k * TWIST;
            positions.push(new THREE.Vector3(
                RADIUS * Math.cos(angle),
                k * RISE - totalH / 2,
                RADIUS * Math.sin(angle)
            ));
        }

        this._spherical.radius = Math.max(20, totalH + 14);
        this._updateCamera();

        if (n >= 2) {
            const curve   = new THREE.CatmullRomCurve3(positions);
            const tubeGeo = new THREE.TubeGeometry(curve, n * 4, 0.18, 8, false);
            const tubeMat = new THREE.MeshPhongMaterial({ color: 0x334155, emissive: 0x111827, shininess: 40 });
            const tube = new THREE.Mesh(tubeGeo, tubeMat);
            tube.userData = { isRNA: true };
            this.scene.add(tube);
        }

        const sphereGeo  = new THREE.SphereGeometry(0.5, 14, 10);
        const sphereMeshes = [];

        for (let k = 0; k < n; k++) {
            const nuc  = seq[k] || 'A';
            const col  = NUC_COL[nuc] ?? 0xffffff;
            const isP  = paired.has(k);
            const mat  = new THREE.MeshPhongMaterial({
                color:    col,
                emissive: new THREE.Color(col).multiplyScalar(0.25),
                shininess: 90,
                opacity:   isP ? 1.0 : 0.65,
                transparent: !isP,
            });
            const sphere = new THREE.Mesh(sphereGeo, mat);
            sphere.position.copy(positions[k]);
            sphere.scale.setScalar(isP ? 1.25 : 0.9);

            const pair = nucToPair.get(k);
            sphere.userData = {
                isRNA:   true,
                pairKey: pair ? `${pair[0]},${pair[1]}` : null,
            };

            if (isP) this._clickableObjs.push(sphere);
            this.scene.add(sphere);
            sphereMeshes[k] = sphere;
        }

        this.pairs.forEach(([i, j]) => {
            const pKey = (seq[i] || '') + (seq[j] || '');
            const col  = PAIR_COL[pKey] ?? 0xffffff;
            const key  = `${i},${j}`;

            const start = positions[i];
            const end   = positions[j];
            const dir   = new THREE.Vector3().subVectors(end, start);
            const len   = dir.length();
            if (len < 0.001) return;

            const cylGeo = new THREE.CylinderGeometry(0.13, 0.13, len, 8);
            const cylMat = new THREE.MeshPhongMaterial({
                color:    col,
                emissive: new THREE.Color(col).multiplyScalar(0.35),
                shininess: 110,
                transparent: true,
                opacity: 0.88,
            });
            const cyl = new THREE.Mesh(cylGeo, cylMat);
            cyl.position.copy(new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5));

            const up   = new THREE.Vector3(0, 1, 0);
            const norm = dir.clone().normalize();
            const axis = new THREE.Vector3().crossVectors(up, norm);
            if (axis.length() > 0.001) {
                axis.normalize();
                const angle = Math.acos(Math.max(-1, Math.min(1, up.dot(norm))));
                cyl.setRotationFromAxisAngle(axis, angle);
            }

            cyl.userData = { isRNA: true, pairKey: key };
            this._clickableObjs.push(cyl);
            this.scene.add(cyl);

            this._pairObjects.set(key, {
                si:  sphereMeshes[i],
                sj:  sphereMeshes[j],
                cyl: cyl,
                baseColI: new THREE.Color(NUC_COL[seq[i]] ?? 0xffffff),
                baseColJ: new THREE.Color(NUC_COL[seq[j]] ?? 0xffffff),
                baseColC: new THREE.Color(col),
            });
        });

        this._applyHighlight();
    }

    _applyHighlight() {
        this._clearHighlightVisuals();
        if (!this._highlightedPair) return;

        const [i, j] = this._highlightedPair;
        const entry  = this._pairObjects.get(`${i},${j}`);
        if (!entry) return;

        entry.si.material.emissive.copy(entry.baseColI);
        entry.sj.material.emissive.copy(entry.baseColJ);
        entry.si.scale.setScalar(1.75);
        entry.sj.scale.setScalar(1.75);

        entry.cyl.material.emissive.copy(entry.baseColC);
        entry.cyl.material.opacity = 1.0;

        entry._highlighted = true;
    }

    _clearHighlightVisuals() {
        this._pairObjects.forEach((entry) => {
            if (!entry._highlighted) return;
            entry._highlighted = false;

            entry.si.material.emissive.copy(entry.baseColI).multiplyScalar(0.25);
            entry.sj.material.emissive.copy(entry.baseColJ).multiplyScalar(0.25);
            entry.si.scale.setScalar(1.25);
            entry.sj.scale.setScalar(1.25);

            entry.cyl.material.emissive.copy(entry.baseColC).multiplyScalar(0.35);
            entry.cyl.material.opacity = 0.88;
        });
    }

    _startLoop() {
        const loop = () => {
            if (!this._isActive) return;
            this.animId = requestAnimationFrame(loop);
            if (this._autoRotate) {
                this._spherical.theta += 0.004;
                this._updateCamera();
            }
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        };
        loop();
    }

    destroy() {
        this.deactivate();
        if (this._resizeObserver) this._resizeObserver.disconnect();
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentNode) this.renderer.domElement.remove();
        }
    }
};
