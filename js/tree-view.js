'use strict';

window.TreeView = class TreeView {

    constructor(container) {
        this.container = container;
        this.seq = '';
        this._nodes = new Map();
        this.onNodeHover = null;
        this.onNodeClick = null;
    }

    setTree(tree, sequence) {
        this.seq = sequence || '';
        this._render(tree);
    }

    _render(tree) {
        this.container.innerHTML = '';
        this._nodes.clear();

        if (!tree) {
            const msg = document.createElement('p');
            msg.className = 'tree-empty';
            msg.textContent = 'Brak danych. Oblicz sekwencję.';
            this.container.appendChild(msg);
            return;
        }

        const NODE_W = 96;
        const NODE_H = 44;
        const H_GAP  = 18;
        const V_GAP  = 54;
        const UNIT   = NODE_W + H_GAP;

        let leafIdx = 0;
        const assignLayout = (node, depth) => {
            node._depth = depth;
            if (node.children.length === 0) {
                node._cx = leafIdx * UNIT + NODE_W / 2;
                node._leafSpan = 1;
                leafIdx++;
            } else {
                node.children.forEach(c => assignLayout(c, depth + 1));
                const leftCx  = node.children[0]._cx;
                const rightCx = node.children[node.children.length - 1]._cx;
                node._cx = (leftCx + rightCx) / 2;
                node._leafSpan = node.children.reduce((s, c) => s + c._leafSpan, 0);
            }
        };
        assignLayout(tree, 0);

        let maxDepth = 0;
        const findMaxDepth = (n) => {
            if (n._depth > maxDepth) maxDepth = n._depth;
            n.children.forEach(findMaxDepth);
        };
        findMaxDepth(tree);

        const W = Math.max(leafIdx * UNIT + 8, NODE_W + 8);
        const H = (maxDepth + 1) * (NODE_H + V_GAP) + 20;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', W);
        svg.setAttribute('height', H);
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

        const edgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        const nodeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        svg.appendChild(edgeG);
        svg.appendChild(nodeG);

        const getY = (depth) => depth * (NODE_H + V_GAP) + 10;

        const traverse = (node) => {
            const nx = node._cx - NODE_W / 2;
            const ny = getY(node._depth);

            node.children.forEach(child => {
                const px  = node._cx;
                const py  = ny + NODE_H;
                const cx  = child._cx;
                const cy  = getY(child._depth);
                const my  = (py + cy) / 2;

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', `M ${px} ${py} C ${px} ${my}, ${cx} ${my}, ${cx} ${cy}`);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', 'rgba(148,163,184,0.18)');
                path.setAttribute('stroke-width', '1.5');
                edgeG.appendChild(path);

                if (node.case === 'bifurcation') {
                    const lx = (px + cx) / 2;
                    const ly = (py + cy) / 2;
                    const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    lbl.setAttribute('x', lx);
                    lbl.setAttribute('y', ly - 4);
                    lbl.setAttribute('class', 'tree-edge-label');
                    lbl.textContent = child === node.children[0]
                        ? `[${node.i},${node.bifT}]`
                        : `[${node.bifT + 1},${node.j}]`;
                    edgeG.appendChild(lbl);
                }

                traverse(child);
            });

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('transform', `translate(${nx}, ${ny})`);
            g.style.cursor = 'pointer';

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', NODE_W);
            rect.setAttribute('height', NODE_H);
            rect.setAttribute('rx', '7');
            rect.setAttribute('class', `tree-node tree-node-${node.case}`);
            g.appendChild(rect);

            const txt1 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            txt1.setAttribute('x', NODE_W / 2);
            txt1.setAttribute('y', NODE_H / 2 - 6);
            txt1.setAttribute('class', 'tree-text-main');
            txt1.textContent = `M[${node.i}][${node.j}]=${node.value}`;
            g.appendChild(txt1);

            const sub = this.seq.slice(node.i, node.j + 1);
            const txt2 = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            txt2.setAttribute('x', NODE_W / 2);
            txt2.setAttribute('y', NODE_H / 2 + 9);
            txt2.setAttribute('class', 'tree-text-sub');
            txt2.textContent = sub.length > 9 ? sub.slice(0, 8) + '…' : sub;
            g.appendChild(txt2);

            g.addEventListener('mouseenter', () => {
                rect.classList.add('tree-node-hover');
                if (this.onNodeHover) this.onNodeHover(node.i, node.j);
            });
            g.addEventListener('mouseleave', () => {
                rect.classList.remove('tree-node-hover');
                if (this.onNodeHover) this.onNodeHover(null, null);
            });
            g.addEventListener('click', () => {
                if (this.onNodeClick) this.onNodeClick(node.i, node.j);
            });

            nodeG.appendChild(g);
            this._nodes.set(`${node.i},${node.j}`, { el: rect, g });
        };

        traverse(tree);
        this.container.appendChild(svg);
    }

    highlightNode(i, j) {
        this._nodes.forEach(({ el }) => el.classList.remove('tree-node-active'));
        const entry = this._nodes.get(`${i},${j}`);
        if (entry) entry.el.classList.add('tree-node-active');
    }

    clearHighlight() {
        this._nodes.forEach(({ el }) => el.classList.remove('tree-node-active'));
    }
};
