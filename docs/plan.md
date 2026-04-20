# Plan implementacji: Algorytm Nussinov

## Predykcja struktury drugorzedowej RNA

**Przedmiot:** Bioinformatyka, Politechnika Warszawska, 2025/2026

---

## 1. Cel aplikacji

Interaktywna demonstracja algorytmu Nussinov — klasycznego algorytmu programowania dynamicznego do przewidywania struktury drugorzedowej czasteczki RNA. Uzytkownik wprowadza sekwencje RNA (A, U, G, C), a aplikacja wizualizuje krok po kroku wypelnianie macierzy, traceback i rysuje wynikowa strukture drugorzedowa.

## 2. Kontekst biologiczny

Czasteczka RNA wystepuje najczesciej jako pojedyncza nic, ktora moze zaginac sie i tworzyc pary zasad sama ze soba (komplementarne: A–U, G–C, oraz slabsza para wobble G–U). Prowadzi to do struktur drugorzedowych (hairpin loops, internal loops, bulges).

Algorytm Nussinov (1978) maksymalizuje liczbe par zasad w sekwencji, zakladajac brak pseudowezlow.

## 3. Algorytm

### 3.1. Dane wejsciowe

- Sekwencja RNA: s = s_1 s_2 ... s_n, gdzie s_i in {A, U, G, C}
- Minimalna odleglosc petli: parametr k (domyslnie k = 1)
- Zbior dozwolonych par: {(A,U), (U,A), (G,C), (C,G)}, opcjonalnie wobble {(G,U), (U,G)}

### 3.2. Macierz programowania dynamicznego

Macierz M o wymiarach n x n, gdzie M[i][j] = max liczba par zasad w podsekwencji s_i...s_j.

Warunki poczatkowe: M[i][j] = 0 dla j - i <= k

Rekurencja (dla j - i > k):

    M[i][j] = max(
        M[i+1][j],                          // i niesparowane
        M[i][j-1],                           // j niesparowane
        M[i+1][j-1] + delta(i,j),            // i sparowane z j
        max_{i<t<j}( M[i][t] + M[t+1][j] )   // bifurkacja
    )

gdzie delta(i,j) to wazona ocena pary zasad:

    delta(i,j) = 3   gdy para C-G / G-C
               = 2   gdy para A-U / U-A
               = 1   gdy para G-U / U-G  (tylko przy allowWobble)
               = 0   w przeciwnym przypadku

Kolejnosc wypelniania: po przekatnych — od podsekwencji dlugosci k+2 do calej sekwencji.

### 3.3. Traceback

    TRACEBACK(i, j):
        jesli j - i <= k: return
        jesli M[i][j] == M[i+1][j]:          TRACEBACK(i+1, j)
        w.p.p. jesli M[i][j] == M[i][j-1]:   TRACEBACK(i, j-1)
        w.p.p. jesli M[i][j] == M[i+1][j-1] + delta(i,j):
            zapisz pare (i, j)
            TRACEBACK(i+1, j-1)
        w.p.p.:
            znajdz t: M[i][j] == M[i][t] + M[t+1][j]
            TRACEBACK(i, t)
            TRACEBACK(t+1, j)

### 3.4. Zlozonosc

- Czasowa: O(n^3)
- Pamieciowa: O(n^2)

## 4. Decyzje projektowe

- **Organizacja kodu:** Klasyczne `<script>` bez ES6 modules — dziala z `google-chrome index.html`
- **Rendering:** SVG (macierz + diagram lukowy)
- **Jezyk UI:** Polski
- **Limit sekwencji:** Ostrzezenie powyzej 50 nukleotydow, bez blokady
- **Technologie:** HTML5, CSS3, JavaScript ES6+ — zero frameworkow, bundlerow, zaleznosci

## 5. Architektura plikow

```
Algorytm-Nussinov/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── utils.js            # walidacja, pary zasad (ladowany pierwszy)
│   ├── nussinov.js          # NussinovModel — algorytm + kroki
│   ├── matrix-view.js       # MatrixView — SVG macierzy
│   ├── arc-view.js          # ArcView — SVG diagramu lukowego
│   └── controller.js        # Controller — orkiestracja (ladowany ostatni)
└── docs/
    └── plan.md
```

Kolejnosc ladowania: utils -> nussinov -> matrix-view -> arc-view -> controller.
Klasy na `window` (np. `window.NussinovModel = class { ... }`).
Kontroler inicjalizowany po DOMContentLoaded.

## 6. Model (`nussinov.js`)

```javascript
class NussinovModel {
    constructor(sequence, minLoopLength = 1, allowWobble = false)
    generateFillSteps()      // -> tablica krokow wypelniania
    generateTracebackSteps() // -> tablica krokow traceback
    getMatrix()              // -> macierz n x n
    getPairs()               // -> lista par [(i,j), ...]
}
```

Format kroku:

```javascript
{
    type: "fill" | "traceback",
    i, j,
    value,
    case: "skip_i" | "skip_j" | "pair" | "bifurcation",
    dependencies: [[i2, j2], ...],
    description: "opis po polsku"
}
```

Wypelnianie po przekatnych (diagonal od k+2 do n).
Traceback rekurencyjny — generuje kroki + zbiera pary.

## 7. Widok macierzy (`matrix-view.js`)

- SVG `<rect>` + `<text>` w siatce
- Naglowki: nukleotydy sekwencji
- Kolorowanie: gradient bialy -> intensywny kolor wg wartosci
- Podswietlanie: aktualna komorka, zaleznosci, sciezka traceback
- Hover: podswietla zaleznosci komorki
- Klik: wyswietla opis obliczenia

## 8. Widok diagramu lukowego (`arc-view.js`)

- SVG: litery nukleotydow wzdluz osi X
- Luki: polkoliste `<path>` z krzywymi Beziera
- Kolory: A-U niebieski, G-C czerwony, G-U zielony
- Animacja: luki pojawiaja sie stopniowo w traceback
- Hover na luku podswietla komorke macierzy i odwrotnie

## 9. Kontroler (`controller.js`)

- Stan: currentStepIndex, phase (idle/fill/traceback/done), isPlaying, animationSpeed
- Przyciski: Nastepny krok, Poprzedni krok, Odtwarzaj, Pauza, Reset, Przejdz do traceback
- Animacja ciagla: setInterval z regulowanym opoznieniem (suwak predkosci)
- Klawisze: strzalki <- / -> do nawigacji krokow

## 10. Interfejs uzytkownika (`index.html`)

### Panel wejsciowy (gora)
- Input z walidacja live (regex [AUGCaugc]*)
- Automatyczna konwersja T -> U z informacja dla uzytkownika
- Usuwanie bialych znakow i cyfr (format FASTA)
- Select z przykladowymi sekwencjami: GGGAAAUCC, GGUCCACGUCCAG, ACGUAGCUAGCUA
- Suwak: minimalna odleglosc petli (1-4)
- Checkbox: pary wobble G-U
- Przycisk "Oblicz"

### Panel glowny (srodek)
- Lewa strona: SVG macierzy
- Prawa strona: SVG diagramu lukowego

### Pasek sterowania (dol)
- Przyciski nawigacji z tooltipami
- Suwak predkosci animacji
- Etykieta: "Krok 5/42 — Wypelnianie macierzy"
- Opis slowny aktualnej operacji

### Interakcje
- Hover na komorce macierzy podswietla zaleznosci
- Klik na komorce wyswietla szczegoly obliczenia
- Hover na luku podswietla komorke macierzy i odwrotnie
- Strzalki <- / -> do nawigacji krokow
- Plynne przejscia CSS na podswietleniach

## 11. Walidacja danych wejsciowych (`utils.js`)

- Akceptowane znaki: A, U, G, C (male litery konwertowane automatycznie)
- T -> U z informacja dla uzytkownika
- Biale znaki i cyfry usuwane (FASTA)
- Ostrzezenie powyzej 50 nukleotydow (bez blokady)

## 12. Kolejnosc implementacji

1. `utils.js` — walidacja, pary zasad, helpery
2. `nussinov.js` — algorytm z generowaniem krokow
3. `index.html` + `css/style.css` — szkielet UI
4. `matrix-view.js` — wizualizacja macierzy SVG
5. `arc-view.js` — diagram lukowy SVG
6. `controller.js` — orkiestracja krokow i animacji
7. Integracja, interakcje miedzy widokami, testy

## 13. Testowanie

- Porownanie wynikow z recznie obliczonymi przykladami
- Testy przegladarkowe: Chrome, Firefox, Edge
- Uruchomienie: `google-chrome index.html`
- Przypadki brzegowe: pusty ciag, 1 nukleotyd, 2 nukleotydy, brak mozliwych par
