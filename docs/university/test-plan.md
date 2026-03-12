# E-Y (Eternity Wallet) — Plan Testow
## Przedmiot: Jakosc Oprogramowania

**Aplikacja:** E-Y (Eternity Wallet)
**Repozytorium:** https://github.com/Eternity-CORP/eternity-app
**Zespol:** Danylo Lohachov, [________]

---

## 1. TESTY FUNKCJONALNOSCI (13 testow)

### FT-01: Tworzenie nowego portfela (Wallet Creation)
- **Warunki wstepne:** Aplikacja zainstalowana, brak istniejacego portfela
- **Kroki:**
  1. Uruchom aplikacje
  2. Wybierz "Create New Wallet"
  3. Zapisz wyswietlona fraze seed (12 slow)
  4. Potwierdz fraze seed w kolejnym kroku
  5. Ustaw PIN / biometrie
- **Oczekiwany wynik:** Portfel utworzony, wyswietla sie adres ETH (0x...), balans = 0
- **Priorytet:** Krytyczny

### FT-02: Import istniejacego portfela (Wallet Import)
- **Warunki wstepne:** Posiadanie waznej frazy seed (12 slow BIP-39)
- **Kroki:**
  1. Uruchom aplikacje
  2. Wybierz "Import Wallet"
  3. Wprowadz 12-wyrazowa fraze seed
  4. Potwierdz
- **Oczekiwany wynik:** Portfel zaimportowany, adres zgodny z oczekiwanym, balans zaladowany
- **Priorytet:** Krytyczny

### FT-03: Wysylanie ETH na adres
- **Warunki wstepne:** Portfel z balansem > 0 ETH (testnet Sepolia)
- **Kroki:**
  1. Przejdz do "Send"
  2. Wpisz adres docelowy (0x...)
  3. Wpisz kwote (np. 0.001 ETH)
  4. Wybierz siec (Sepolia)
  5. Potwierdz transakcje
- **Oczekiwany wynik:** Transakcja wyslana, hash TX wyswietlony, balans zmniejszony
- **Priorytet:** Krytyczny

### FT-04: Wysylanie ETH przez @username
- **Warunki wstepne:** Portfel z balansem, odbiorca ma zarejestrowany @username
- **Kroki:**
  1. Przejdz do "Send"
  2. Wpisz @username odbiorcy
  3. Wpisz kwote
  4. Potwierdz
- **Oczekiwany wynik:** System rozwiazuje @username na adres, transakcja wyslana
- **Priorytet:** Wysoki

### FT-05: Generowanie kodu BLIK
- **Warunki wstepne:** Zalogowany uzytkownik z portfelem
- **Kroki:**
  1. Przejdz do "Receive"
  2. Wybierz "BLIK Code"
  3. Kod 6-cyfrowy zostaje wyswietlony
  4. Timer odlicza 2 minuty
- **Oczekiwany wynik:** Kod BLIK wyswietlony (6 cyfr), wygasa po 2 min
- **Priorytet:** Wysoki

### FT-06: Platnosc przez kod BLIK
- **Warunki wstepne:** Nadawca z balansem, odbiorca z aktywnym kodem BLIK
- **Kroki:**
  1. Nadawca wchodzi w "Send"
  2. Wybiera "BLIK Code"
  3. Wpisuje 6-cyfrowy kod odbiorcy
  4. Wpisuje kwote
  5. Potwierdza transakcje
- **Oczekiwany wynik:** Transfer zrealizowany, oba portfele zaktualizowane w real-time (WebSocket)
- **Priorytet:** Wysoki

### FT-07: Rejestracja @username
- **Warunki wstepne:** Portfel utworzony, brak zarejestrowanego username
- **Kroki:**
  1. Przejdz do Settings > Username
  2. Wpisz zadany username (np. @eternaki)
  3. Potwierdz
- **Oczekiwany wynik:** Username zarejestrowany, widoczny w profilu
- **Priorytet:** Wysoki

### FT-08: Walidacja @username — duplikat
- **Warunki wstepne:** Username "@testuser" juz istnieje w systemie
- **Kroki:**
  1. Przejdz do Settings > Username
  2. Wpisz "@testuser"
  3. Potwierdz
- **Oczekiwany wynik:** Blad: "Username already taken"
- **Priorytet:** Sredni

### FT-09: Wyswietlanie historii transakcji
- **Warunki wstepne:** Portfel z co najmniej kilkoma transakcjami
- **Kroki:**
  1. Przejdz do zakladki "Activity" / "History"
  2. Przeglad listy transakcji
- **Oczekiwany wynik:** Lista transakcji z datami, kwotami, adresami, statusami (confirmed/pending)
- **Priorytet:** Sredni

### FT-10: Skanowanie QR code do odbioru
- **Warunki wstepne:** Portfel utworzony
- **Kroki:**
  1. Przejdz do "Receive"
  2. Wybierz "QR Code"
  3. QR code zostaje wyswietlony
  4. Zeskanuj QR code innym urzadzeniem
- **Oczekiwany wynik:** QR zawiera poprawny adres portfela, mozliwe do zeskanowania
- **Priorytet:** Sredni

### FT-11: Asystent AI — wyslanie wiadomosci
- **Warunki wstepne:** Zalogowany uzytkownik z portfelem
- **Kroki:**
  1. Przejdz do AI Assistant
  2. Wpisz "Send 0.01 ETH to @testuser"
  3. AI parsuje intencje i proponuje transakcje
  4. Uzytkownik potwierdza
- **Oczekiwany wynik:** AI poprawnie rozpoznaje intencje, tworzy transakcje do potwierdzenia
- **Priorytet:** Sredni

### FT-12: Przelaczanie sieci (Network Switching)
- **Warunki wstepne:** Portfel z wieloma sieciami
- **Kroki:**
  1. Przejdz do Settings > Networks
  2. Przelacz z Ethereum na Polygon
  3. Sprawdz balans
- **Oczekiwany wynik:** Balans zaktualizowany dla wybranej sieci
- **Priorytet:** Sredni

### FT-13: Obsluga wygasniecia kodu BLIK
- **Warunki wstepne:** Aktywny kod BLIK
- **Kroki:**
  1. Wygeneruj kod BLIK
  2. Poczekaj 2 minuty
  3. Sprobuj uzyc kodu
- **Oczekiwany wynik:** Kod odrzucony z komunikatem "BLIK code expired"
- **Priorytet:** Sredni

---

## 2. TESTY WYDAJNOSCI (3 testy)

### PT-01: Czas odpowiedzi REST API pod obciazeniem
- **Cel:** Sprawdzic czy API odpowiada w akceptowalnym czasie przy wielu zapytaniach
- **Narzedzie:** Apache JMeter / k6 / autocannon
- **Kroki:**
  1. Przygotuj scenariusz: 50 rownoczesnych uzytkownikow
  2. Kazdy wysyla GET /health, GET /username/check, POST /blik/generate
  3. Uruchom test przez 60 sekund
  4. Zmierz: sredni czas odpowiedzi, p95, p99, error rate
- **Kryterium akceptacji:**
  - Sredni czas odpowiedzi < 200ms
  - p95 < 500ms
  - Error rate < 1%
- **Priorytet:** Wysoki

### PT-02: Wydajnosc WebSocket — jednoczesne polaczenia
- **Cel:** Sprawdzic czy WebSocket serwer obsluguje wiele jednoczesnych polaczen
- **Narzedzie:** Artillery / k6 / custom script (socket.io-client)
- **Kroki:**
  1. Nawiaz 100 jednoczesnych polaczen WebSocket
  2. Kazde polaczenie subskrybuje na eventy transakcji
  3. Wyslij broadcast event do wszystkich klientow
  4. Zmierz: czas dostarczenia, utracone polaczenia, zuzycie pamieci serwera
- **Kryterium akceptacji:**
  - 100% polaczen aktywnych przez 5 minut
  - Czas dostarczenia eventu < 100ms
  - Brak memory leaks
- **Priorytet:** Wysoki

### PT-03: Czas kompilacji smart contractow
- **Cel:** Zmierzyc czas kompilacji i deploymentu kontraktow
- **Narzedzie:** Hardhat (wbudowane metryki)
- **Kroki:**
  1. Wyczysc cache: `npx hardhat clean`
  2. Kompiluj: `npx hardhat compile` — zmierz czas
  3. Deploy na lokalna siec: `npx hardhat node` + deploy script — zmierz czas
  4. Uruchom pelny zestaw testow: `npx hardhat test` — zmierz czas
- **Kryterium akceptacji:**
  - Kompilacja < 30 sekund
  - Deploy < 10 sekund
  - Testy (102 test cases) < 60 sekund
- **Priorytet:** Sredni

---

## 3. TESTY INSTALACJI I DEINSTALACJI (4 testy)

### IT-01: Instalacja srodowiska deweloperskiego (pelna)
- **Warunki wstepne:** Czysta maszyna z Node.js 20+ i pnpm 9+
- **Kroki:**
  1. `git clone https://github.com/Eternity-CORP/eternity-app.git`
  2. `cd eternity-app`
  3. `pnpm install`
  4. `cp apps/api/.env.example apps/api/.env`
  5. `docker compose -f docker-compose.local.yml up -d`
  6. `pnpm api` (w jednym terminalu)
  7. `pnpm mobile:only` (w drugim terminalu)
- **Oczekiwany wynik:**
  - `pnpm install` konczy sie bez bledow
  - PostgreSQL dziala w Docker
  - API startuje na localhost:3000
  - Expo dev server startuje, QR code wyswietlony
- **Priorytet:** Krytyczny

### IT-02: Instalacja z brakujacymi wymaganiami
- **Warunki wstepne:** System bez Docker
- **Kroki:**
  1. `pnpm install` — OK
  2. `docker compose -f docker-compose.local.yml up -d` — blad
  3. `pnpm api` — blad polaczenia z baza
- **Oczekiwany wynik:** Czytelne komunikaty bledow wskazujace na brak Docker/PostgreSQL
- **Priorytet:** Sredni

### IT-03: Deinstalacja srodowiska
- **Kroki:**
  1. Zatrzymaj serwery (Ctrl+C)
  2. `docker compose -f docker-compose.local.yml down -v` (usun DB + volumes)
  3. `rm -rf node_modules` (lub `pnpm prune`)
  4. Sprawdz czy porty 3000, 5432 sa zwolnione
- **Oczekiwany wynik:** Wszystkie procesy zatrzymane, dane usuniete, porty wolne
- **Priorytet:** Sredni

### IT-04: Instalacja aplikacji mobilnej (Expo Go)
- **Warunki wstepne:** Telefon z Expo Go, serwer API uruchomiony
- **Kroki:**
  1. Uruchom `pnpm mobile:go`
  2. Zeskanuj QR code z terminala aplikacja Expo Go
  3. Aplikacja laduje sie na urzadzeniu
- **Oczekiwany wynik:** Aplikacja uruchamia sie, ekran logowania/tworzenia portfela widoczny
- **Priorytet:** Wysoki

---

## 4. TESTY KOMPILACJI (4 testy)

### CT-01: Kompilacja TypeScript — caly monorepo
- **Kroki:**
  1. `pnpm typecheck`
- **Oczekiwany wynik:** Brak bledow TypeScript we wszystkich workspace'ach
- **Priorytet:** Krytyczny

### CT-02: Build produkcyjny API
- **Kroki:**
  1. `pnpm --filter @e-y/api build`
  2. Sprawdz folder `apps/api/dist/`
- **Oczekiwany wynik:** Build ukonczony, pliki JS w dist/, brak bledow
- **Priorytet:** Wysoki

### CT-03: Build produkcyjny Web App
- **Kroki:**
  1. `pnpm --filter @e-y/web build`
  2. Sprawdz folder `apps/web/.next/`
- **Oczekiwany wynik:** Next.js build ukonczony, brak bledow, strony wygenerowane
- **Priorytet:** Wysoki

### CT-04: Kompilacja Smart Contracts
- **Kroki:**
  1. `cd contracts`
  2. `npx hardhat compile`
  3. Sprawdz folder `artifacts/`
- **Oczekiwany wynik:** Kontrakty skompilowane, ABI wygenerowane w artifacts/
- **Priorytet:** Wysoki

---

## 5. TESTY WHITE-BOX (automatyczne, 3 testy)

Testy white-box bazuja na znajomosci kodu zrodlowego. Uzywamy frameworkow: **Hardhat + Chai** (smart contracts), **Jest** (TypeScript).

### WB-01: Test jednostkowy — walidacja kodu BLIK (Jest)
- **Plik:** `scripts/tests/blik.test.ts`
- **Co testuje (white-box):** Wewnetrzna logika generowania i walidacji 6-cyfrowych kodow BLIK, sprawdzanie wygasniecia (2 min TTL), unikalnosc kodow w bazie
- **Pokrycie kodu:**
  - `apps/api/src/blik/blik.service.ts` — metody `generate()`, `validate()`, `isExpired()`
  - Sciezki: happy path, expired code, invalid format, already claimed
- **Uruchomienie:** `pnpm test:all` lub `npx tsx scripts/tests/index.ts blik`
- **Liczba asercji:** 12

### WB-02: Test jednostkowy — system username (Jest)
- **Plik:** `scripts/tests/username.test.ts`
- **Co testuje (white-box):** Logika rejestracji username, walidacja formatu (regex), sprawdzanie duplikatow, case-insensitive matching
- **Pokrycie kodu:**
  - `apps/api/src/username/username.service.ts` — metody `register()`, `check()`, `resolve()`
  - Sciezki: valid registration, duplicate, invalid chars, too short/long
- **Uruchomienie:** `npx tsx scripts/tests/index.ts username`
- **Liczba asercji:** 15

### WB-03: Test jednostkowy — swap/bridge service (Jest)
- **Plik:** `apps/mobile/src/services/__tests__/swap-service.test.ts`
- **Co testuje (white-box):** Wewnetrzna logika formatowania kwot tokenow (wei → human readable), parsowanie inputu uzytkownika, detekcja cross-chain swap, rozwiazywanie nazw sieci
- **Pokrycie kodu:**
  - `apps/mobile/src/services/swap-service.ts` — metody `formatAmount()`, `parseAmount()`, `isCrossChain()`, `getChainName()`
  - Sciezki: zero amount, max uint256, unknown network, native vs ERC-20
- **Uruchomienie:** `cd apps/mobile && npx jest swap-service`
- **Liczba asercji:** ~40

---

## Podsumowanie

| Kategoria | Liczba testow | Status |
|-----------|--------------|--------|
| Testy funkcjonalnosci | 13 | Do wprowadzenia w Testopia |
| Testy wydajnosci | 3 | Do przeprowadzenia i raportowania |
| Testy instalacji/deinstalacji | 4 | Do przeprowadzenia i raportowania |
| Testy kompilacji | 4 | Do przeprowadzenia i raportowania |
| Testy white-box (automatyczne) | 3 | Istniejace testy — wyniki do raportowania |
| **RAZEM** | **27** | |

### Istniejaca infrastruktura testowa
- **379 istniejacych test cases** w projekcie
- Frameworki: Hardhat + Chai, Jest, Custom HTTP Runner
- Polecenia: `pnpm test:all`, `pnpm test:api`, `cd contracts && npx hardhat test`
