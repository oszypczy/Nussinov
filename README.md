# Algorytm Nussinov — Interaktywna wizualizacja

Interaktywne narzędzie edukacyjne do nauki algorytmu Nussinov — klasycznego algorytmu programowania dynamicznego przewidującego strukturę drugorzędową RNA.

**Demo:** [oszypczy.github.io/Nussinov](https://oszypczy.github.io/Nussinov/)

## Funkcjonalności

- **Macierz DP** — interaktywna siatka SVG z gradientem wartości, podświetlaniem zależności przy hover i szczegółami komórki po kliknięciu
- **Diagram łukowy** — wizualizacja par zasad jako łuków nad sekwencją z kolorami wg typu pary (A-U, G-C, G-U) i notacją dot-bracket
- **Tryb edukacyjny** — krokowa animacja wypełniania macierzy i tracebacku z kontrolkami play/pause, prędkością i opisem każdego kroku
- **Tryb natychmiastowy** — błyskawiczne obliczenie i wyświetlenie wyniku
- **Pary wobble** — opcjonalne wiązania G-U
- **Format FASTA** — automatyczne parsowanie sekwencji z nagłówkami FASTA, konwersja T→U

## Stos technologiczny

Vanilla JavaScript, HTML5, CSS3 — zero zależności zewnętrznych. Wizualizacje w SVG.

## Przyszły rozwój

### Drzewo rekurencji

Oprócz macierzy DP — interaktywne drzewo pokazujące, jak rekurencja się rozgałęzia. Kliknięcie komórki w macierzy odsłania, z jakich podproblemów się składa. Pomaga zrozumieć, dlaczego programowanie dynamiczne działa i jak opcja bifurkacji dzieli problem na dwa niezależne podproblemy.

### Wizualizacja helisy 3D

Realistyczny model struktury RNA w Three.js — rotacja, zoom, podświetlanie par zasad w przestrzeni trójwymiarowej.
