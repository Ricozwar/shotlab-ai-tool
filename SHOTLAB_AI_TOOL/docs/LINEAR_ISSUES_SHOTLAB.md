# Zadania (issues) do projektu Shotlab w Linear

Poniżej lista tasków do dodania do istniejącego projektu **Shotlab** w Linear.  
Możesz je dodać ręcznie lub użyć skryptu `scripts/linear-create-issues.mjs` (wymaga API key z Linear).

## Dodanie issue'ów przez skrypt (Linear API)

1. **API key:** W Linear → **Settings** → **API** → **Personal API keys** → utwórz klucz.
2. **Uruchomienie** (z katalogu `SHOTLAB_AI_TOOL` lub repo root, w zależności od ścieżki do skryptu):
   ```bash
   set LINEAR_API_KEY=lin_api_xxxxxxxx
   node scripts/linear-create-issues.mjs
   ```
   Opcjonalnie:
   - `LINEAR_TEAM_KEY=SHOTLAB` – jeśli Twój zespół ma inny klucz (np. SHOTLAB).
   - `LINEAR_PROJECT_ID=uuid-projektu` – jeśli chcesz przypisać issue'y do konkretnego projektu (ID z URL w Linear).
3. Skrypt wczyta listę z `scripts/linear-issues.json`, znajdzie zespół (po nazwie „Shotlab” lub pierwszy), ewentualnie projekt „Shotlab”, i utworzy wszystkie issue'y.

---

## 1. MVP – Deploy (Hetzner)

### 1.1 [Infra] Przygotowanie VPS Hetzner pod Node i Nginx
**Opis:** Skonfigurowanie świeżej maszyny (Ubuntu/Debian): aktualizacje, użytkownik deploy (opcjonalnie), firewall (22, 80, 443), Node.js (LTS) z repozytorium lub nvm.  
**Kryteria akceptacji:**
- SSH działa, Node w wersji LTS dostępny w PATH.
- Porty 80/443 otwarte, 22 ograniczony do potrzeb.

**Etykiety:** `mvp`, `deploy`, `infra`

---

### 1.2 [Infra] Domena i DNS dla app.shotlab.pl oraz api.shotlab.pl
**Opis:** Ustawienie rekordów A/CNAME w DNS tak, aby `app.shotlab.pl` i `api.shotlab.pl` wskazywały na IP VPS Hetzner.  
**Kryteria akceptacji:**
- `app.shotlab.pl` i `api.shotlab.pl` rozwiązują się na docelowy serwer.

**Etykiety:** `mvp`, `deploy`, `infra`

---

### 1.3 [Infra] SSL (Let's Encrypt) dla app i api
**Opis:** Instalacja certbota, uzyskanie certyfikatów dla `app.shotlab.pl` i `api.shotlab.pl`, automatyczne odnowienie.  
**Kryteria akceptacji:**
- HTTPS działa dla obu subdomen, certyfikat odnawiany automatycznie.

**Etykiety:** `mvp`, `deploy`, `infra`

---

### 1.4 [Backend] Deploy backendu na Hetzner (PM2 + env)
**Opis:** Wdrożenie aplikacji Express z katalogu `backend/`: skopiowanie plików (lub clone repo), `npm install --production`, `npm run build`, konfiguracja `.env` (API_KEY, SUPABASE_*, FRONTEND_URL), uruchomienie przez PM2 z autostartem.  
**Kryteria akceptacji:**
- Backend działa pod `http://127.0.0.1:3001`, PM2 restart przy rebootie, zmienne env ustawione.

**Etykiety:** `mvp`, `deploy`, `backend`

---

### 1.5 [Infra] Nginx: reverse proxy dla API i serwowanie frontendu
**Opis:** Konfiguracja Nginx: `api.shotlab.pl` → proxy do `http://127.0.0.1:3001`; `app.shotlab.pl` → root do katalogu z zbudowanym frontendem (np. `dist/`).  
**Kryteria akceptacji:**
- `https://api.shotlab.pl/health` zwraca 200 OK.
- `https://app.shotlab.pl` serwuje SPA (index.html dla SPA fallback).

**Etykiety:** `mvp`, `deploy`, `infra`

---

### 1.6 [Frontend] Build produkcyjny i deploy na Hetzner
**Opis:** Ustawienie zmiennych produkcyjnych (VITE_API_URL=https://api.shotlab.pl, VITE_SUPABASE_*), `npm run build`, wgranie zawartości `dist/` na VPS do katalogu obsługiwanego przez Nginx.  
**Kryteria akceptacji:**
- Aplikacja pod `https://app.shotlab.pl` ładuje się i komunikuje z API po HTTPS.

**Etykiety:** `mvp`, `deploy`, `frontend`

---

### 1.7 [Supabase] Projekt, schema i Google OAuth w Supabase
**Opis:** Utworzenie projektu Supabase, uruchomienie skryptu `backend/supabase-schema.sql` (tabele `users`, `daily_usage`), włączenie Google OAuth (Client ID/Secret z GCP), skopiowanie JWT Secret do backendu. W Supabase Redirect URLs dodać `https://app.shotlab.pl`.  
**Kryteria akceptacji:**
- Logowanie „Sign in with Google” na app.shotlab.pl przekierowuje do Google i po autoryzacji wraca do aplikacji z zalogowanym użytkownikiem.

**Etykiety:** `mvp`, `backend`, `auth`

---

## 2. MVP – Jakość i dokumentacja

### 2.1 [Docs] MVP_README – uzupełnienie o konkretne komendy (PM2, Nginx)
**Opis:** Rozszerzenie MVP_README.md o gotowe fragmenty konfiguracji Nginx i komendy PM2 (start, restart, logi), aby deploy dało się odtworzyć krok po kroku.  
**Kryteria akceptacji:**
- Ktoś z repo może wdrożyć MVP na nowy VPS według README bez domysłów.

**Etykiety:** `mvp`, `docs`

---

### 2.2 [Legal] Minimum RODO/regulamin przy rejestracji (MVP)
**Opis:** Dodać krótki tekst (np. checkbox lub link) przy pierwszym logowaniu: zgoda na przetwarzanie danych, link do polityki prywatności/regulaminu (strona lub plik). Zgodnie ze specyfikacją: „minimum” na MVP.  
**Kryteria akceptacji:**
- Użytkownik przed pierwszym użyciem widzi informację/akceptację RODO; treść zatwierdzona przez PO.

**Etykiety:** `mvp`, `frontend`, `legal`

---

### 2.3 [QA] Testy E2E / smoke: logowanie, generowanie obrazu, limit
**Opis:** Przeprowadzenie (ręcznie lub skryptem) scenariuszy: wejście na app → logowanie Google → wygenerowanie jednego obrazu → sprawdzenie licznika w headerze → (opcjonalnie) wyczerpanie limitu i komunikat. Udokumentowanie wyników lub dodanie prostego E2E (np. Playwright).  
**Kryteria akceptacji:**
- Scenariusz logowanie → generowanie → limit jest przetestowany i opisany (lub zautomatyzowany).

**Etykiety:** `mvp`, `qa`

---

## 3. Post-MVP – Płatności (Stripe)

### 3.1 [Backend] Stripe: produkty i ceny (plany Starter / Pro / Business)
**Opis:** W Stripe Dashboard utworzenie produktów i cen (miesięczne/roczne) dla planów zgodnych ze specyfikacją. Zapisać price_id w konfiguracji backendu.  
**Kryteria akceptacji:**
- W Stripe istnieją produkty i ceny gotowe do użycia w Checkout Session.

**Etykiety:** `post-mvp`, `payments`, `backend`

---

### 3.2 [Backend] Endpoint POST /api/create-checkout-session i webhook Stripe
**Opis:** Endpoint przyjmujący wybór planu (price_id), tworzący Stripe Checkout Session z success_url/cancel_url i client_reference_id=userId. Osobny endpoint POST /api/webhooks/stripe z weryfikacją podpisu i obsługą zdarzeń subscription.created/updated/deleted, invoice.paid – aktualizacja tabeli subskrypcji w DB.  
**Kryteria akceptacji:**
- Po wywołaniu create-checkout-session użytkownik może opłacić subskrypcję; webhook aktualizuje stan w bazie.

**Etykiety:** `post-mvp`, `payments`, `backend`

---

### 3.3 [Backend] Schema DB: subskrypcje (Stripe customer/subscription ID, plan, status)
**Opis:** Migracja/rozszerzenie bazy: tabela subscriptions (userId, stripeCustomerId, stripeSubscriptionId, planId, status, currentPeriodEnd, timestamps). Backend przy webhooku zapisuje/aktualizuje rekordy.  
**Kryteria akceptacji:**
- Stan subskrypcji po płatności jest odzwierciedlony w DB i dostępny dla API.

**Etykiety:** `post-mvp`, `payments`, `backend`

---

### 3.4 [Backend] GET /api/subscription i egzekwowanie limitów według planu
**Opis:** Endpoint zwracający aktualny plan użytkownika i limity (obrazy/reels na okres). Przed generowaniem obrazu/rolki i remove-background backend sprawdza limity z planu (i ewentualnie usage); przy przekroczeniu zwraca 403 z czytelnym komunikatem.  
**Kryteria akceptacji:**
- Frontend może wyświetlić plan i limity; generowanie blokowane po przekroczeniu z jasnym komunikatem.

**Etykiety:** `post-mvp`, `payments`, `backend`

---

### 3.5 [Frontend] Strona cennika i przycisk „Kup” (Stripe Checkout)
**Opis:** Ekran/sekcja z opisem planów i cenami, przycisk „Kup” przekierowujący na Stripe Checkout (wywołanie backendu create-checkout-session). Po powrocie z success_url odświeżenie danych subskrypcji (GET /api/subscription).  
**Kryteria akceptacji:**
- Użytkownik może wybrać plan, przejść do Stripe, zapłacić i wrócić do aplikacji z aktywnym planem.

**Etykiety:** `post-mvp`, `payments`, `frontend`

---

### 3.6 [Frontend] Licznik kredytów w headerze (zgodny z planem)
**Opis:** W headerze wyświetlanie aktualnego limitu i zużycia (np. „X / Y kredytów” lub „X obrazów, Z rolek”) na podstawie GET /api/subscription i ewentualnie GET /api/usage. Przy wyczerpaniu – komunikat i modal z zachętą do zakupu/zmiany planu.  
**Kryteria akceptacji:**
- Licznik odzwierciedla plan i usage; przy braku kredytów widoczna jest jasna zachęta do płatności.

**Etykiety:** `post-mvp`, `payments`, `frontend`

---

### 3.7 [Frontend] Link „Zarządzaj subskrypcją” (Stripe Customer Portal)
**Opis:** Backend generuje link do Stripe Customer Portal (billing portal); frontend wyświetla przycisk/link „Zarządzaj subskrypcją” otwierający ten link w nowej karcie.  
**Kryteria akceptacji:**
- Użytkownik może zmienić plan, anulować subskrypcję i pobrać faktury przez Stripe.

**Etykiety:** `post-mvp`, `payments`, `frontend`

---

## 4. Post-MVP – Funkcje produktu

### 4.1 [Backend] Kolejka zadań (Bull + Redis) dla generowania rolek
**Opis:** Zamiast synchronicznego wywołania Veo w requestcie: dodanie zadania do kolejki (Bull), worker wywołuje Veo i zapisuje wynik (np. w DB lub storage). Endpoint zwraca jobId; frontend może odpytować status lub otrzymać powiadomienie (SSE/WebSocket).  
**Kryteria akceptacji:**
- Generowanie rolki nie blokuje requestu; status jest śledzony; po zakończeniu wynik dostępny dla użytkownika.

**Etykiety:** `post-mvp`, `backend`, `reels`

---

### 4.2 [Backend + Frontend] Powiadomienie w aplikacji gdy rolka gotowa (WebSocket lub SSE)
**Opis:** Po zakończeniu jobu rolki backend wysyła event (WebSocket lub SSE) do zalogowanego użytkownika. Frontend przy otwartej karcie pokazuje powiadomienie (toast/banner) że rolka jest gotowa. Zgodnie ze specyfikacją: tylko przy otwartej karcie.  
**Kryteria akceptacji:**
- Użytkownik z otwartą aplikacją dostaje powiadomienie bez odświeżania strony; po odświeżeniu rolka i tak jest na liście.

**Etykiety:** `post-mvp`, `backend`, `frontend`, `reels`

---

### 4.3 [Backend] Archiwum 7 dni (opcjonalnie)
**Opis:** Zgodnie ze specyfikacją: opcjonalnie archiwum 7 dni. Wymaga: zapis wygenerowanych plików (np. Supabase Storage lub S3), zwracanie listy/URLi w API, job czyszczący pliki starsze niż 7 dni.  
**Kryteria akceptacji:**
- Użytkownik widzi listę ostatnich 7 dni; pliki starsze są usuwane; dokumentacja dla PO czy wchodzi w zakres.

**Etykiety:** `post-mvp`, `backend`, `feature`

---

### 4.4 [Frontend] Wielojęzyczność PL + EN (auto z przeglądarki)
**Opis:** Wykrywanie locale z przeglądarki (navigator.language), zestaw tłumaczeń (np. i18next lub prosty słownik), przełączanie PL/EN w UI. MVP jest EN; po MVP dodanie PL i auto.  
**Kryteria akceptacji:**
- Aplikacja wyświetla teksty w PL lub EN zgodnie z ustawieniem; możliwość ręcznej zmiany języka (opcjonalnie).

**Etykiety:** `post-mvp`, `frontend`, `i18n`

---

## 5. Post-MVP – Landing i marketing

### 5.1 [Landing] Podstrona aplikacji na shotlab.pl + link do app.shotlab.pl
**Opis:** Na istniejącym landingu shotlab.pl dodać podstronę opisującą aplikację (co robi, dla kogo, cennik), z przyciskiem/linkiem prowadzącym na https://app.shotlab.pl.  
**Kryteria akceptacji:**
- Odwiedzający shotlab.pl może przejść na podstronę aplikacji i stamtąd do app.shotlab.pl.

**Etykiety:** `post-mvp`, `landing`, `marketing`

---

### 5.2 [Docs] Cennik w aplikacji i na landingu (zgodność z planami)
**Opis:** Ujednolicenie opisu cen i planów w aplikacji oraz na stronie shotlab.pl; aktualizacja przy zmianach w Stripe.  
**Kryteria akceptacji:**
- Cennik w app i na landingu jest spójny z ofertą Stripe.

**Etykiety:** `post-mvp`, `docs`, `marketing`

---

## Podsumowanie

| Kategoria        | Liczba issue’ów |
|------------------|------------------|
| MVP Deploy       | 7                |
| MVP Jakość/Docs  | 3                |
| Post-MVP Stripe  | 7                |
| Post-MVP Funkcje | 4                |
| Post-MVP Landing | 2                |
| **Razem**        | **23**           |

---

*Po dodaniu do Linear można ustawić etykiety (np. `mvp`, `post-mvp`, `deploy`, `backend`, `frontend`), priorytety i przypisać do odpowiednich milestone’ów.*
