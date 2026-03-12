# Algorytm Nussinov — Interaktywna wizualizacja predykcji struktury drugorzędowej RNA

**Przedmiot:** Metody Bioinformatyki (MBI), Politechnika Warszawska, semestr 2025/2026L

**Autorzy:**

- Oliwier Szypczyn, nr albumu 325 240
- Kacper Multan, nr albumu 325 199

**Data:** marzec 2026

---

## 1. Wstęp

Funkcja cząsteczki RNA jest ściśle powiązana z jej strukturą przestrzenną, której fundamentem jest struktura drugorzędowa: zbiór par zasad powstających w wyniku zaginania jednoniciowej cząsteczki.

Celem projektu jest stworzenie interaktywnej aplikacji webowej, która w sposób edukacyjny demonstruje działanie algorytmu Nussinov (1978), klasycznego algorytmu programowania dynamicznego służącego do predykcji struktury drugorzędowej RNA. Aplikacja umożliwia użytkownikowi wprowadzenie własnej sekwencji RNA i śledzenie krok po kroku procesu wypełniania macierzy DP oraz traceback, z jednoczesną wizualizacją wynikowej struktury.

Aplikacja jest realizowana jako zbiór statycznych plików (HTML + CSS + JavaScript), wykonujących się w całości po stronie klienta w przeglądarce internetowej, bez użycia serwera ani bazy danych. Interfejs użytkownika jest w języku polskim.

---

## 2. Kontekst biologiczny

### 2.1. Cząsteczka RNA

Kwas rybonukleinowy (RNA) jest polimerem nukleotydowym, zbudowanym z czterech zasad azotowych: adeniny (A), uracylu (U), guaniny (G) i cytozyny (C). W odróżnieniu od dwuniciowego DNA, RNA występuje najczęściej jako pojedyncza nić, która może zaginać się i tworzyć wewnątrzcząsteczkowe pary zasad.

### 2.2. Pary zasad

Pary zasad powstają dzięki wiązaniom wodorowym między komplementarnymi nukleotydami:

- **Pary kanoniczne (Watson-Crick):** A–U (2 wiązania wodorowe) oraz G–C (3 wiązania wodorowe)
- **Para wobble:** G–U — słabsza para, ale powszechnie występująca w naturalnych strukturach RNA

### 2.3. Struktura drugorzędowa

Struktura drugorzędowa RNA to zbiór par zasad $(i, j)$, gdzie $i < j$, tworzących się w wyniku zaginania nici. Typowe motywy strukturalne to:

- **Pętle spinki do włosów (hairpin loops)** — zamknięta pętla z jednym regionem sparowanym
- **Pętle wewnętrzne (internal loops)** — dwa regiony sparowane z niesparowanymi nukleotydami po obu stronach
- **Wybrzuszenia (bulges)** — niesparowane nukleotydy po jednej stronie helisy
- **Pętle wielogałęziowe (multiloops)** — punkt rozgałęzienia trzech lub więcej helis

### 2.4. Ograniczenia modelu Nussinov

Algorytm Nussinov maksymalizuje liczbę par zasad, co stanowi uproszczenie problemu. Bardziej realistyczne podejście (algorytm Zuker, 1981) minimalizuje energię swobodną struktury, uwzględniając parametry termodynamiczne (stacking, loop penalties). Niemniej algorytm Nussinov jest doskonałym narzędziem dydaktycznym — prezentuje istotę podejścia DP do predykcji struktury RNA w zrozumiałej formie.

---

## 3. Opis algorytmu

### 3.1. Sformułowanie problemu

**Dane wejściowe:**

- Sekwencja RNA: $s = s_1 s_2 \ldots s_n$, gdzie $s_i \in \{A, U, G, C\}$
- Minimalna odległość pętli: parametr $k$ (domyślnie $k = 1$, zakres 1–4)
- Zbiór dozwolonych par: $\{(A,U), (U,A), (G,C), (C,G)\}$, opcjonalnie wobble $\{(G,U), (U,G)\}$

**Cel:** Znaleźć strukturę drugorzędową (zbiór par zasad) maksymalizującą liczbę par.

### 3.2. Rekurencja programowania dynamicznego

Definiujemy macierz $M$ o wymiarach $n \times n$, gdzie $M[i][j]$ oznacza maksymalną liczbę par zasad w podsekwencji $s_i \ldots s_j$.

**Warunki początkowe:**

$$M[i][j] = 0 \quad \text{dla} \quad j - i \leq k$$

**Relacja rekurencyjna** (dla $j - i > k$):

$$M[i][j] = \max \begin{cases} M[i+1][j] & \text{(i) i niesparowane} \\ M[i][j-1] & \text{(ii) j niesparowane} \\ M[i+1][j-1] + \delta(i,j) & \text{(iii) i sparowane z j} \\ \max_{i < t < j} \left( M[i][t] + M[t+1][j] \right) & \text{(iv) bifurkacja} \end{cases}$$

gdzie:

$$\delta(i,j) = \begin{cases} 1 & \text{jeśli } s_i \text{ i } s_j \text{ tworzą dozwoloną parę} \\ 0 & \text{w przeciwnym przypadku} \end{cases}$$

**Kolejność wypełniania:** Macierz wypełniana jest po przekątnych, od podsekwencji długości $k+2$ do całej sekwencji. Gwarantuje to, że wartości podproblemów są obliczone przed ich użyciem.

**Wynik:** $M[0][n-1]$ — maksymalna liczba par zasad w całej sekwencji.

### 3.3. Traceback

Procedura traceback odtwarza optymalną strukturę na podstawie wypełnionej macierzy:

```
TRACEBACK(i, j):
    jesli j - i <= k: return
    jesli M[i][j] == M[i+1][j]:
        TRACEBACK(i+1, j)                          // i niesparowane
    w.p.p. jesli M[i][j] == M[i][j-1]:
        TRACEBACK(i, j-1)                           // j niesparowane
    w.p.p. jesli M[i][j] == M[i+1][j-1] + d(i,j) i d(i,j) = 1:
        zapisz pare (i, j)
        TRACEBACK(i+1, j-1)                         // i sparowane z j
    w.p.p.:
        znajdz t takie, ze M[i][j] == M[i][t] + M[t+1][j]
        TRACEBACK(i, t)                             // bifurkacja
        TRACEBACK(t+1, j)
```

Wynikiem jest lista par $(i, j)$ tworzących optymalną strukturę drugorzędową, zapisywaną również w notacji dot-bracket.

### 3.4. Złożoność obliczeniowa

| Aspekt | Złożoność |
|--------|-----------|
| Czasowa | $O(n^3)$ — pętla bifurkacji $O(n)$ dla każdej z $O(n^2)$ komórek |
| Pamięciowa | $O(n^2)$ — macierz $n \times n$ |
| Traceback | $O(n^2)$ w najgorszym przypadku |

### 3.5. Przykład

Dla sekwencji **GGGAAAUCC** ($n = 9$, $k = 1$, bez wobble):

Wypełniona macierz $M$:

|       | G(0) | G(1) | G(2) | A(3) | A(4) | A(5) | U(6) | C(7) | C(8) |
|-------|------|------|------|------|------|------|------|------|------|
| **G(0)** | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 3 |
| **G(1)** |   | 0 | 0 | 0 | 0 | 0 | 1 | 2 | 3 |
| **G(2)** |   |   | 0 | 0 | 0 | 0 | 1 | 2 | 2 |
| **A(3)** |   |   |   | 0 | 0 | 0 | 1 | 1 | 1 |
| **A(4)** |   |   |   |   | 0 | 0 | 1 | 1 | 1 |
| **A(5)** |   |   |   |   |   | 0 | 0 | 0 | 0 |
| **U(6)** |   |   |   |   |   |   | 0 | 0 | 0 |
| **C(7)** |   |   |   |   |   |   |   | 0 | 0 |
| **C(8)** |   |   |   |   |   |   |   |   | 0 |

Wynik: $M[0][8] = 3$ pary zasad.

Traceback identyfikuje pary: $(1, 8)$ G–C, $(2, 7)$ G–C, $(4, 6)$ A–U.

Notacja dot-bracket: `.((.(.)))`

---

## 4. Założenia projektowe

### 4.1. Forma aplikacji

- Aplikacja jest zbiorem statycznych plików (HTML, CSS, JavaScript) wykonujących się w całości po stronie klienta w przeglądarce
- Brak serwera, bazy danych, procesu budowania i zewnętrznych zależności (npm, frameworki)
- Uruchomienie: otwarcie pliku `index.html` w przeglądarce (np. `google-chrome index.html`)

### 4.2. Założenia architektoniczne

- Separacja logiki algorytmu od warstwy wizualizacji (wzorzec zbliżony do MVC)
- Wizualizacje oparte na SVG generowanym dynamicznie przez JavaScript
- Responsywny interfejs dostosowujący się do rozmiaru okna przeglądarki
- Interfejs użytkownika w języku polskim

### 4.3. Założenia dotyczące interakcji

- Dwa tryby pracy: edukacyjny (krok po kroku) i natychmiastowy (wynik od razu)
- Interaktywne wizualizacje z wzajemnym podświetlaniem (macierz $\leftrightarrow$ diagram łukowy)
- Nawigacja klawiaturą i myszką
- Konfigurowalne parametry algorytmu (minimalna długość pętli, pary wobble)

### 4.4. Założenia dotyczące danych wejściowych

- Akceptowane sekwencje RNA (znaki A, U, G, C) oraz automatyczna konwersja DNA (T $\to$ U)
- Obsługa formatu FASTA
- Walidacja w czasie rzeczywistym
- Zestaw przykładowych sekwencji o różnej długości

---

## 5. Planowane funkcjonalności

### 5.1. Wprowadzanie danych

- Pole do wpisania sekwencji RNA z walidacją w czasie rzeczywistym
- Obsługa formatu FASTA oraz automatyczna konwersja DNA (T $\to$ U)
- Przykładowe sekwencje o różnej długości
- Konfiguracja parametrów: minimalna długość pętli, pary wobble G–U

### 5.2. Wizualizacja macierzy DP

- Interaktywna macierz z kolorowaniem komórek wg wartości
- Podświetlanie zależności komórki (skąd pochodzi wartość) i ścieżki traceback
- Możliwość kliknięcia komórki w celu wyświetlenia szczegółów obliczenia

### 5.3. Diagram łukowy

- Wizualizacja struktury drugorzędowej jako diagram łukowy (arc diagram)
- Kolory łuków odpowiadające typom par zasad (A–U, G–C, G–U)
- Wzajemne podświetlanie z macierzą (hover/kliknięcie)
- Wyświetlanie notacji dot-bracket

### 5.4. Tryb edukacyjny

- Krokowa animacja wypełniania macierzy i traceback z kontrolkami nawigacji
- Regulowana prędkość animacji
- Opis słowny każdego kroku po polsku
- Nawigacja klawiaturą

### 5.5. Tryb natychmiastowy

- Wyświetlenie pełnego wyniku bez animacji krokowej

### 5.6. Drzewo rekursji

- Wizualizacja rozkładu podproblemów podczas traceback
- Pokazanie, jak bifurkacja dzieli problem na niezależne części

### 5.7. Panel statystyk

- Podsumowanie wyników: liczba par, procent sparowanych nukleotydów, zawartość GC, rozkład typów par

### 5.8. Sekcja "O algorytmie"

- Wbudowany opis teoretyczny algorytmu z pseudokodem, relacjami rekurencyjnymi i analizą złożoności

---

## 6. Podsumowanie

Projekt łączy aspekt algorytmiczny (programowanie dynamiczne) z biologicznym (predykcja struktury drugorzędowej RNA), tworząc interaktywne narzędzie edukacyjne. Podejście czysto klienckie (statyczne pliki HTML + JS + CSS) zapewnia prostotę wdrożenia i dostępność — aplikacja działa w dowolnej nowoczesnej przeglądarce bez konfiguracji.
