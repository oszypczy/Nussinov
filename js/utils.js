'use strict';

window.RNAUtils = (() => {

    const STANDARD_PAIRS = new Set(['AU', 'UA', 'GC', 'CG']);
    const WOBBLE_PAIRS = new Set(['GU', 'UG']);

    function sanitize(raw, format = 'plain') {
        const warnings = [];
        let s = raw;

        if (format === 'fasta') {
            const lines = s.split(/\r?\n/);
            s = lines.filter(l => !l.startsWith('>')).join('');
        }

        s = s.toUpperCase();

        if (/T/.test(s)) {
            warnings.push('Zamieniono T → U (konwersja DNA → RNA).');
            s = s.replace(/T/g, 'U');
        }

        s = s.replace(/[\s\d]/g, '');

        return { cleaned: s, warnings };
    }

    function validate(sequence) {
        const errors = [];
        const warnings = [];

        if (sequence.length === 0) {
            errors.push('Sekwencja jest pusta.');
            return { valid: false, errors, warnings };
        }

        const invalid = sequence.replace(/[AUGC]/g, '');
        if (invalid.length > 0) {
            const unique = [...new Set(invalid)].join(', ');
            errors.push(`Niedozwolone znaki: ${unique}. Dozwolone: A, U, G, C.`);
        }

        if (sequence.length > 50) {
            warnings.push(`Sekwencja ma ${sequence.length} nukleotydów — obliczenia mogą być wolne.`);
        }

        return { valid: errors.length === 0, errors, warnings };
    }

    function canPair(a, b, allowWobble) {
        const pair = a + b;
        if (STANDARD_PAIRS.has(pair)) return true;
        if (allowWobble && WOBBLE_PAIRS.has(pair)) return true;
        return false;
    }

    function pairType(a, b) {
        const pair = a + b;
        if (pair === 'AU' || pair === 'UA') return 'AU';
        if (pair === 'GC' || pair === 'CG') return 'GC';
        if (pair === 'GU' || pair === 'UG') return 'GU';
        return null;
    }

    const EXAMPLES = [
        { name: 'Prosta', sequence: 'GGGAAAUCC' },
        { name: 'Średnia', sequence: 'GGUCCACGUCCAG' },
        { name: 'Dłuższa', sequence: 'ACGUAGCUAGCUA' },
    ];

    return { sanitize, validate, canPair, pairType, EXAMPLES };
})();
