# TODO — Pozostałe funkcjonalności

## 1. Drzewo rekursji (propozycja §5.6)

Wizualizacja rozkładu podproblemów podczas traceback. Pokazanie, jak bifurkacja dzieli problem na niezależne części.

- SVG tree diagram z wywołaniami rekurencyjnymi traceback
- Zaznaczenie par zasad i punktów bifurkacji
- Synchronizacja z krokami traceback w trybie edukacyjnym

## 2. Panel statystyk (propozycja §5.7)

Podsumowanie wyników po obliczeniu:

- Liczba par zasad
- Procent sparowanych nukleotydów
- Zawartość GC w sekwencji
- Rozkład typów par (A–U, G–C, G–U)

Dane dostępne z `NussinovModel` (`getPairs()`, `seq`), brakuje panelu UI.

## 3. Sekcja "O algorytmie" (propozycja §5.8)

Wbudowany opis teoretyczny algorytmu:

- Pseudokod
- Relacje rekurencyjne
- Analiza złożoności (O(n³) czas, O(n²) pamięć)
- Kontekst biologiczny (pary zasad, struktura drugorzędowa)

Forma: modal lub rozwijana sekcja w interfejsie.
