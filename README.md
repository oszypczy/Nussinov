# Algorytm Nussinov — Interaktywna wizualizacja

Interaktywne narzędzie edukacyjne do nauki algorytmu Nussinov — klasycznego algorytmu programowania dynamicznego przewidującego strukturę drugorzędową RNA.

**Demo:** [oszypczy.github.io/Nussinov](https://oszypczy.github.io/Nussinov/)

## Algorytm

Algorytm Nussinov wypełnia macierz `M[i][j]` — maksymalną liczbę par zasad w podsekwencji `s[i..j]`. Rekurencja rozważa cztery przypadki dla każdej komórki:

1. `s[i]` niesparowane → `M[i][j] = M[i+1][j]`
2. `s[j]` niesparowane → `M[i][j] = M[i][j-1]`
3. `s[i]` sparowane z `s[j]` → `M[i][j] = M[i+1][j-1] + 1`
4. Bifurkacja w punkcie `t` → `M[i][j] = max(M[i][t] + M[t+1][j])`

Macierz wypełniana jest po przekątnych (od krótszych do dłuższych podsekwencji). Traceback odtwarza pary zasad przez rekurencyjne śledzenie optymalnych decyzji od `M[0][n-1]`.

Obsługiwane pary zasad: standardowe Watson-Crick (A-U, G-C) oraz opcjonalne wobble (G-U).

## Funkcjonalności

### Wizualizacje

**Macierz DP** — interaktywna siatka SVG. Komórki kolorowane gradientem proporcjonalnym do wartości. Hover podświetla komórki zależne (te, z których wynika wartość). Kliknięcie otwiera panel ze szczegółami obliczenia dla danej komórki.

**Diagram łukowy** — łuki Béziera nad sekwencją reprezentują pary zasad. Kolor łuku zależy od typu pary (A-U: niebieski, G-C: czerwony, G-U: zielony). Pod sekwencją wyświetlana jest notacja dot-bracket. Hover i klik synchronizują zaznaczenie z macierzą DP.

**Drzewo rekurencji** — drzewo SVG odwzorowujące strukturę wywołań tracebacku. Każdy węzeł to podproblem `M[i][j]` z wyświetlaną wartością i podsekwencją. Kolor węzła oznacza podjętą decyzję: niebieski — pominięcie `i` lub `j`, zielony — para `i-j`, fioletowy — bifurkacja. Na krawędziach bifurkacji widoczne są zakresy obu podproblemów. Węzły i komórki macierzy są wzajemnie synchronizowane przy hover.

**Helisa 3D** — model struktury RNA renderowany w WebGL przez Three.js. Nukleotydy rozmieszczone są wzdłuż helisy A-RNA. Sparowane nukleotydy połączone są cylindrami kolorowanymi wg typu pary. Kliknięcie sfery lub cylindra podświetla całą parę. Sterowanie: przeciągnięcie — obrót, scroll — zoom, dwuklik — wznowienie auto-obrotu.

### Tryby pracy

**Tryb edukacyjny** — animacja krok po kroku z kontrolkami play/pause, nawigacją wstecz/dalej i regulacją prędkości. Każdy krok opisany jest tekstowo. Skróty klawiszowe: `←`/`→` (krok), `Spacja` (play/pause).

**Tryb natychmiastowy** — macierz i diagram wypełniane są jednocześnie bez animacji.

### Wejście

- Sekwencje RNA (A, U, G, C) w formacie plain text lub FASTA
- Automatyczna konwersja T→U (DNA→RNA)
- Konfigurowalny parametr minimalnej długości pętli (1–4)
- Opcjonalne pary wobble G-U

## Architektura

```
js/
├── utils.js        — walidacja sekwencji, logika par zasad, przykłady
├── nussinov.js     — algorytm DP, traceback, generowanie kroków, drzewo rekurencji
├── matrix-view.js  — widok SVG macierzy DP
├── arc-view.js     — widok SVG diagramu łukowego
├── tree-view.js    — widok SVG drzewa rekurencji
├── helix-view.js   — widok 3D helisy (Three.js, WebGL)
└── controller.js   — orkiestracja widoków, obsługa zdarzeń, tryby animacji
```

## Stos technologiczny

Vanilla JavaScript
