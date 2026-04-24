# Dokumentacja techniczna — Algorytm Nussinov: Interaktywna wizualizacja

**Przedmiot:** Metody Bioinformatyki (MBI), Politechnika Warszawska, semestr 2025/2026L

**Autorzy:**
- Oliwier Szypczyn, nr albumu 325 240
- Kacper Multan, nr albumu 325 199

**Repozytorium:** [github.com/oszypczy/Nussinov](https://github.com/oszypczy/Nussinov)

**Demo:** [oszypczy.github.io/Nussinov](https://oszypczy.github.io/Nussinov/)

---

## 1. Cel projektu

Aplikacja jest interaktywnym narzędziem edukacyjnym demonstrującym działanie algorytmu Nussinov (1978) — klasycznego algorytmu programowania dynamicznego służącego do predykcji struktury drugorzędowej RNA. Użytkownik może wprowadzić własną sekwencję RNA i śledzić krok po kroku: wypełnianie macierzy DP, procedurę traceback, a następnie oglądać wynikową strukturę w trzech niezależnych wizualizacjach.

---

## 2. Kontekst biologiczny

Cząsteczka RNA jest jednoniciowym polimerem nukleotydowym (zasady: A, U, G, C). Nic RNA może zaginać się i tworzyć wewnątrzcząsteczkowe pary zasad stabilizowane wiązaniami wodorowymi:

- **A–U**: 2 wiązania wodorowe (para Watson-Crick)
- **G–C**: 3 wiązania wodorowe (para Watson-Crick, silniejsza)
- **G–U**: para wobble — słabsza, ale powszechna w naturalnych strukturach RNA

Zbiór par zasad tworzy **strukturę drugorzędową**: hairpin loops, internal loops, bulges, multiloops. Algorytm Nussinov jest uproszczeniem — maksymalizuje liczbę par zamiast minimalizować energię swobodną (podejście termodynamiczne reprezentuje algorytm Zuker, 1981). Mimo to jest doskonałym modelem dydaktycznym ukazującym istotę rekurencji DP w problemach bioinformatycznych.

---

## 3. Algorytm

### 3.1. Rekurencja

Macierz $M[i][j]$ przechowuje maksymalną ważoną liczbę par zasad w podsekwencji $s_i \ldots s_j$.

Warunki początkowe: $M[i][j] = 0$ dla $j - i \leq k$ (zbyt krótka podsekwencja, brak par).

Rekurencja (dla $j - i > k$):

$$M[i][j] = \max \begin{cases} M[i+1][j] & \text{i niesparowane} \\ M[i][j-1] & \text{j niesparowane} \\ M[i+1][j-1] + \delta(i,j) & \text{i sparowane z j} \\ \max_{i < t < j} \left( M[i][t] + M[t+1][j] \right) & \text{bifurkacja} \end{cases}$$

### 3.2. Ważona ocena par (modyfikacja względem klasycznego algorytmu)

W klasycznym algorytmie Nussinov $\delta(i,j) \in \{0, 1\}$. W implementacji zastosowano ważony schemat:

| Para | Wartość $\delta$ |
|------|-----------------|
| G–C / C–G | 3 |
| A–U / U–A | 2 |
| G–U / U–G | 1 (tylko przy włączonej opcji wobble) |
| brak pary | 0 |

Decyzja motywowana biologicznie: silniejsze pary (G–C, 3 wiązania wodorowe) powinny być preferowane przez algorytm nad słabszymi (A–U, 2 wiązania). Schemat wagowy zachowuje poprawność algorytmu — optymalizacja nadal jest spójna, a traceback niezmiennie odtwarza strukturę odpowiadającą wartości w $M[0][n-1]$.

### 3.3. Kolejność wypełniania

Macierz wypełniana jest po przekątnych: zewnętrzna pętla iteruje po długości podsekwencji $\ell = k+2, \ldots, n$, wewnętrzna po pozycji startowej $i = 0, \ldots, n-\ell$. Gwarantuje to, że każda komórka jest obliczana dopiero po obliczeniu wszystkich podproblemów, od których zależy.

### 3.4. Traceback

Procedura rekurencyjna od $M[0][n-1]$. Priorytet przypadków: `skip_i` → `skip_j` → `pair` → `bifurcation`. Kolejność ma znaczenie: przy kilku równoważnych optymalnych rozwiązaniach algorytm deterministycznie wybiera to samo — ważne dla spójności animacji krokowej z wizualizacją drzewa rekurencji i helisy 3D.

### 3.5. Złożoność obliczeniowa

| Aspekt | Złożoność |
|--------|-----------|
| Czasowa (wypełnianie) | $O(n^3)$ — pętla bifurkacji $O(n)$ na komórkę, $O(n^2)$ komórek |
| Pamięciowa | $O(n^2)$ — macierz $n \times n$ |
| Traceback | $O(n^2)$ w najgorszym przypadku |

Aplikacja ostrzega przy sekwencjach dłuższych niż 50 nukleotydów (bez blokady).

---

## 4. Architektura aplikacji

```
Nussinov/
├── index.html          — struktura UI, ładowanie skryptów
├── css/
│   └── style.css       — style, layout, animacje CSS
├── js/
│   ├── utils.js        — walidacja sekwencji, logika par zasad, przykłady
│   ├── nussinov.js     — algorytm DP, traceback, generowanie kroków, drzewo rekurencji
│   ├── matrix-view.js  — widok SVG macierzy DP
│   ├── arc-view.js     — widok SVG diagramu łukowego
│   ├── tree-view.js    — widok SVG drzewa rekurencji
│   ├── helix-view.js   — widok 3D helisy (Three.js / WebGL)
│   └── controller.js   — orkiestracja widoków, obsługa zdarzeń, tryby animacji
└── docs/
    ├── propozycja-projektu.md
    ├── plan.md
    └── dokumentacja.md
```

### 4.1. Wzorzec organizacji kodu

Kod zorganizowany jest w wzorcu zbliżonym do MVC:

- **Model** (`nussinov.js`): klasa `NussinovModel` — algorytm, dane, generowanie kroków. Brak zależności od DOM.
- **Widoki** (`*-view.js`): każdy widok zarządza własnym fragmentem DOM/Canvas, eksponuje metody publiczne i callbacki (`onCellHover`, `onArcClick`, `onNodeHover`, `onNodeClick`).
- **Kontroler** (`controller.js`): inicjalizuje model i widoki, wiąże callbacki, zarządza stanem animacji.

### 4.2. Brak systemu modułów

Skrypty ładowane są kolejno tagami `<script>` w `index.html`. Klasy i obiekty eksponowane są na obiekt `window` (np. `window.NussinovModel = class { ... }`). Decyzja podyktowana wymaganiem uruchamiania aplikacji bezpośrednio przez otwarcie `index.html` w przeglądarce (protokół `file://`), bez serwera deweloperskiego. ES6 modules są niezgodne z `file://` ze względu na politykę CORS przeglądarek.

Kolejność ładowania: `utils.js` → `nussinov.js` → `matrix-view.js` → `arc-view.js` → `tree-view.js` → `helix-view.js` → `controller.js`.

---

## 5. Opis wizualizacji

### 5.1. Macierz DP

Kolorowanie gradientem: wartość 0 to biały, wartość maksymalna to nasycony kolor akcentowy — percepcyjnie ułatwia identyfikację "gorących" obszarów macierzy. Hover podświetla komórki zależne (te, z których pochodzi wartość), kliknięcie otwiera panel z pełnym opisem obliczenia. W trybie traceback komórki na aktywnej ścieżce wyróżnione są osobnym kolorem.

### 5.2. Diagram łukowy

Nukleotydy rozmieszczone wzdłuż osi poziomej; pary zasad reprezentowane jako łuki Béziera nad sekwencją. Kolor łuku zależy od typu pary: A–U (niebieski), G–C (czerwony), G–U (zielony). Pod sekwencją wyświetlana notacja dot-bracket. Hover na łuku synchronizuje podświetlenie z macierzą DP i odwrotnie.

### 5.3. Drzewo rekurencji

Wizualizacja drzewa wywołań procedury traceback. Każdy węzeł reprezentuje podproblem $M[i][j]$ z wartością i odpowiadającym fragmentem sekwencji. Kolor węzła koduje podjętą decyzję:

| Kolor | Decyzja |
|-------|---------|
| Niebieski | skip\_i lub skip\_j (pominięcie skrajnego nukleotydu) |
| Zielony | para i–j (sparowanie skrajnych nukleotydów) |
| Fioletowy | bifurkacja (podział na dwa niezależne podproblemy) |

Na krawędziach bifurkacji wyświetlane zakresy obu podproblemów. Węzły drzewa i komórki macierzy są wzajemnie synchronizowane przy hover. Kliknięcie węzła odpowiadającego parze podświetla tę parę w helisie 3D.

Layout drzewa SVG obliczany jest w dwóch fazach: najpierw zliczanie liści (szerokość poddrzewa), następnie centrowanie węzłów wewnętrznych nad ich dziećmi. Krawędzie rysowane jako sześcienne krzywe Béziera.

### 5.4. Helisa 3D (Three.js / WebGL)

Model przestrzenny struktury RNA renderowany w WebGL. Geometria oparta na parametrach helisy A-RNA:

Elementy sceny:
- **Szkielet** (backbone): rura Catmull-Rom wzdłuż osi helisy
- **Sfery nukleotydów**: każdy nukleotyd to sfera z emisyjnym kolorem (A: zielony, U: żółty, G: niebieski, C: czerwony)
- **Cylindry par zasad**: łączą sparowane nukleotydy; kolor cylindra odpowiada typowi pary (A–U: niebieski, G–C: czerwony, G–U: zielony)

Sterowanie: przeciągnięcie myszą — obrót sceny, scroll — zoom, dwuklik — wznowienie auto-rotacji.

---

## 6. Uwagi implementacyjne

### 6.1. Leniwa inicjalizacja helisy

Kontekst WebGL (`Three.js`) tworzony jest dopiero przy pierwszym przełączeniu na zakładkę "Helisa 3D". Przy ukrytym elemencie (`display:none`) przeglądarka zwraca zerowe wymiary kontenera, co uniemożliwia poprawne ustawienie kamery i renderera. Lazy init eliminuje ten problem bez konieczności użycia `ResizeObserver` lub opóźnień czasowych.

### 6.2. Rozróżnienie kliknięcia od przeciągnięcia

Raycast (wykrywanie klikniętego obiektu 3D) uruchamiany jest wyłącznie, gdy ruch myszy między `mousedown` a `mouseup` nie przekroczył progu 3 pikseli. Bez tego filtru zakończenie obrotu orbitalnego wyzwalało niechciane zaznaczenie pary zasad.

### 6.3. Synchronizacja widoków

Kontroler pełni rolę mediatora między widokami. Każdy widok eksponuje callbacki (`onCellHover`, `onArcClick`, `onNodeHover`, `onNodeClick`), które kontroler wiąże ze sobą podczas inicjalizacji. Brak bezpośrednich zależności między widokami — każdy widok "nie wie" o istnieniu innych.

Kliknięcie węzła drzewa rekurencji:
1. Wyświetla szczegóły komórki macierzy dla danego $M[i][j]$
2. Jeśli $(i, j)$ jest parą zasad — podświetla tę parę w helisie 3D

### 6.4. Tryb natychmiastowy a tryb edukacyjny

W trybie natychmiastowym model obliczany jest jednorazowo i wszystkie widoki inicjalizowane pełnymi danymi (macierz, pary, drzewo, helisa). W trybie edukacyjnym kolejne kroki aplikowane są do widoków stopniowo przez kontroler (animacja z `requestAnimationFrame` i regulowanym opóźnieniem). Oba tryby korzystają z tego samego obiektu `NussinovModel` — różni je jedynie sposób konsumpcji kroków przez kontroler.


---

## 7. Stos technologiczny i zależności

| Technologia | Zastosowanie | Uzasadnienie wyboru |
|-------------|-------------|---------------------|
| HTML5 / CSS3 | Struktura i style | Brak zewnętrznych zależności UI |
| JavaScript ES6+ | Algorytm i widoki | Vanilla JS, bez frameworków |
| SVG (inline, generowany przez JS) | Macierz DP, diagram łukowy, drzewo rekurencji | Precyzyjne renderowanie wektorowe, pełna kontrola nad DOM, natywna obsługa zdarzeń |
| Three.js (CDN, UMD) | Helisa 3D (WebGL) | Abstrakcja WebGL; UMD build ładowany przez `<script>` — kompatybilny z `file://` |

Three.js ładowany jest przez CDN (UMD global build). ES modules (`import`) byłyby niezgodne z wybraną architekturą ładowania skryptów bez bundlera. OrbitControls nie jest używany — sterowanie kamerą zaimplementowane ręcznie, co redukuje zależności do minimum.

---

## 8. Wejście i walidacja

- Akceptowane znaki: A, U, G, C (wielkość liter ignorowana)
- Automatyczna konwersja T → U (DNA → RNA) z komunikatem dla użytkownika
- Obsługa formatu FASTA: linie nagłówkowe (`>`) pomijane
- Usuwanie białych znaków i cyfr (numeracja w formacie FASTA)
- Walidacja w czasie rzeczywistym; obliczenia uruchamiane po naciśnięciu "Oblicz"
- Ostrzeżenie (bez blokady) przy sekwencjach dłuższych niż 50 nukleotydów
- Parametry konfigurowalne: minimalna długość pętli $k \in \{1,2,3,4\}$, opcja par wobble G–U

---

## 9. Tryby pracy

### Tryb edukacyjny

Animacja krok po kroku z kontrolkami play/pause, nawigacją wstecz/dalej i regulacją prędkości. Każdy krok opisany jest zdaniem po polsku widocznym pod macierzą. Skróty klawiszowe: `←`/`→` (krok), `Spacja` (play/pause).

### Tryb natychmiastowy

Macierz, diagram i helisa wypełniane jednocześnie bez animacji. Umożliwia szybką analizę wyników dla różnych sekwencji.

---

## 10. Znane ograniczenia

- Przy sekwencjach powyżej ~40 nukleotydów drzewo rekurencji może być bardzo szerokie — wymaga poziomego przewijania
- Algorytm Nussinov może zwracać różne optymalne struktury przy remisach; implementacja deterministycznie wybiera pierwszą zgodnie z priorytetem przypadków
- Helisa 3D nie odwzorowuje rzeczywistej geometrii przestrzennej cząsteczki RNA — jest modelem schematycznym opartym na uproszczonych parametrach helisy A-RNA
