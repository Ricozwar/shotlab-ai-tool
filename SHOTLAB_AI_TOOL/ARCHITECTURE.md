# Plan architektury: Shotlab AI Tool – wersja produkcyjna

Dokument opisuje architekturę wdrożenia obecnej aplikacji (frontend Vite + React, Gemini/Veo) z backendem, logowaniem, subskrypcjami i płatnościami Stripe. Realizacja krok po kroku w kolejnych fazach.

---

## 1. Stan obecny (as-is)

| Element | Opis |
|--------|------|
| **Frontend** | Vite + React 19 + TypeScript, SPA |
| **Funkcje** | Generowanie obrazów (Gemini), usuwanie tła, reels (Veo 3.1) |
| **API** | Wywołania `@google/genai` z kluczem (`process.env.API_KEY`) – **klucz w obecnej formie nie może być w przeglądarce** |
| **Backend** | Brak – aplikacja jest wyłącznie frontendowa |
| **Użytkownicy** | Brak – brak auth i rozliczeń |

**Wniosek:** Do wersji zewnętrznej konieczny jest backend (proxy do AI, auth, subskrypcje, Stripe).

---

## 2. Cel (to-be)

- Aplikacja **dostępna z zewnątrz** (publiczny URL).
- **Logowanie** – użytkownicy mają konta (rejestracja/logowanie).
- **Subskrypcje** – dostęp do funkcji (generowanie obrazów/reels) w ramach planów (np. Free / Pro / Business).
- **Płatności Stripe** – checkout subskrypcji, odnawialne płatności, ewentualnie jednorazowe dodatki.

---

## 3. Architektura wysokopoziomowa

```
                    [ Użytkownik ]
                           |
                           v
                    [ Przeglądarka ]
                           |
         +-----------------+------------------+
         |                 |                  |
         v                 v                  v
   [ Frontend SPA ]  [ Backend API ]    [ Stripe ]
   (Vite/React)     (Node/Express      (Checkout,
   - UI, formularze   lub podobny)       Subskrypcje,
   - wywołania API   - Auth (JWT)        Webhooks)
   - token w header  - Proxy do Gemini/Veo
                      - Subskrypcje (DB)
                      - Webhooks Stripe
         |                 |
         |                 v
         |           [ Baza danych ]
         |           (PostgreSQL lub
         |            Supabase/PlanetScale)
         |
         v
   [ Hosting frontendu ]
   (Vercel / Netlify / same serwer)
```

---

## 4. Komponenty systemu

### 4.1 Frontend (obecna aplikacja – dostosowana)

- **Źródło:** Obecny projekt w `AI Tool` (Vite + React).
- **Zmiany:**
  - Usunięcie bezpośredniego użycia `@google/genai` i klucza API z przeglądarki.
  - Zastąpienie wywołań AI przez **wywołania własnego backendu** (np. `POST /api/generate-image`, `POST /api/remove-background`, `POST /api/generate-reel`).
  - Dodanie warstwy **auth**: logowanie/rejestracja, przechowywanie tokena (JWT w memory + optional httpOnly cookie), wysyłanie `Authorization: Bearer <token>` do API.
  - UI: ekrany Logowanie / Rejestracja, strona Subskrypcja / Cennik (link do Stripe Checkout), ewentualnie „Konto” z aktualnym planem i linkiem do Stripe Customer Portal.
- **Build:** `npm run build` → statyczne pliki (np. `dist/`).
- **Hosting:** Vercel, Netlify, lub serwer (np. Nginx serwujący `dist/`).

### 4.2 Backend (nowy)

- **Rola:**  
  - Uwierzytelnianie (rejestracja, logowanie, odświeżanie tokenów).  
  - Sprawdzanie subskrypcji (czy użytkownik ma aktywny plan, limity).  
  - Proxy do Google AI: wywołania Gemini (obraz, usuwanie tła) i Veo (reel) – **klucz API tylko na serwerze**.  
  - Integracja ze Stripe: tworzenie sesji Checkout, obsługa webhooków (subskrypcja utworzona/odnowiona/anulowana).

- **Propozycja stosu:** Node.js + Express (lub Fastify), TypeScript.  
  Alternatywy: Next.js API Routes (jeśli frontend przeniesiesz do Next), lub osobna aplikacja Node.

- **Endpointy (szkic):**
  - `POST /api/auth/register` – rejestracja (email/hasło).
  - `POST /api/auth/login` – logowanie → zwrot JWT (access + opcjonalnie refresh).
  - `GET /api/auth/me` – aktualny użytkownik (z tokena).
  - `POST /api/generate-image` – body: prompt, mode, aspectRatio, productImageBase64, enhancements, imageSize → proxy do Gemini, zwrot URL/base64.
  - `POST /api/remove-background` – body: imageBase64 → proxy do Gemini, zwrot obrazu.
  - `POST /api/generate-reel` – body: prompt, firstFrameImageBase64 → proxy do Veo, zwrot wideo (np. URL lub stream).
  - `GET /api/subscription` – aktualny plan użytkownika i limity (z DB + ewentualnie Stripe).
  - `POST /api/create-checkout-session` – tworzy Stripe Checkout Session dla wybranego planu, zwraca URL.
  - `POST /api/webhooks/stripe` – webhook Stripe (subscription.created/updated/deleted, payment_intent.succeeded itd.) – aktualizacja DB (status subskrypcji, plan, okres).

- **Baza danych (Backend):**
  - **Użytkownicy:** id, email, hash hasła, createdAt.
  - **Subskrypcje:** userId, stripeCustomerId, stripeSubscriptionId, planId (np. free/pro/monthly/yearly), status (active/canceled/past_due), currentPeriodEnd, createdAt, updatedAt.
  - **Plany (można w DB lub w kodzie):** np. free (limit N generacji/miesiąc), pro (więcej + reels), business (jeszcze więcej / wyższe limity).
  - **Użycie (opcjonalnie):** licznik generacji obrazów/reels per user per okres – do egzekwowania limitów.

- **Bezpieczeństwo:**  
  - Hasła: bcrypt/argon2.  
  - JWT: krótki czas życia access tokena, opcjonalnie refresh.  
  - Rate limiting na endpointy.  
  - Walidacja wejścia (rozmiar obrazu, długość promptu).  
  - Klucz Google API tylko w zmiennych środowiskowych serwera.

### 4.3 Stripe

- **Produkty/Ceny:**  
  - Np. produkt „Shotlab AI Tool” z cenami: miesięczna (Pro), roczna (Pro), miesięczna (Business) itd.  
  - Subskrypcje odnawialne (recurring).

- **Checkout:**  
  - Backend tworzy [Checkout Session](https://stripe.com/docs/checkout) z `mode: 'subscription'`, `success_url`, `cancel_url`, `client_reference_id` = userId.  
  - Po opłaceniu Stripe przekierowuje na success_url; frontend może pokazać „Dziękujemy” i odświeżyć dane subskrypcji (GET /api/subscription).

- **Webhooks:**  
  - Endpoint `POST /api/webhooks/stripe` (np. `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`).  
  - Weryfikacja podpisu (`stripe.webhooks.constructEvent`).  
  - Aktualizacja tabeli subskrypcji w DB (status, current_period_end, plan).

- **Customer Portal (opcjonalnie):**  
  - Link z frontendu „Zarządzaj subskrypcją” → backend generuje link do [Stripe Customer Portal](https://stripe.com/docs/customer-management/portal) (zmiana planu, anulowanie, faktury).

### 4.4 Baza danych

- **Rekomendacja:** PostgreSQL (np. Supabase, Neon, Railway) lub MySQL (PlanetScale).  
  Supabase daje też gotową auth – wtedy można rozważyć Supabase Auth zamiast własnego JWT (ale nadal potrzebny backend do proxy AI i Stripe).

- **Tabele (minimalny zestaw):**  
  - users (id, email, passwordHash, createdAt).  
  - subscriptions (userId, stripeCustomerId, stripeSubscriptionId, planId, status, currentPeriodEnd, createdAt, updatedAt).  
  - usage (userId, periodStart, periodEnd, imagesCount, reelsCount) – jeśli limity per okres.

### 4.5 Hosting i deployment

- **Frontend:**  
  - Vercel / Netlify (build z repo, env: `VITE_API_URL=https://api.twoja-domena.com`).  
  - Lub ten sam serwer co backend (Nginx: `/` → `dist/`, `/api` → proxy do Node).

- **Backend:**  
  - Node na VPS (Railway, Render, Fly.io, DigitalOcean, AWS EC2) lub serverless (Vercel Functions / Netlify Functions – z limitami czasu dla długich operacji Veo).  
  - Zmienne środowiskowe: `API_KEY` (Google), `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`, `FRONTEND_URL` (do CORS i redirectów).

- **Domena / SSL:**  
  - Domena dla frontendu i osobna subdomena dla API (np. `app.shotlab.com`, `api.shotlab.com`) lub jedna domena z proxy.  
  - SSL: Let’s Encrypt (np. przez Caddy/Nginx) lub przez Vercel/Netlify.

---

## 5. Przepływ użytkownika (uproszczony)

1. Użytkownik wchodzi na stronę → widzi landing lub od razu aplikację (zależnie od UX).
2. **Niezalogowany:** przy próbie generacji → przekierowanie do logowania/rejestracji.
3. **Logowanie / Rejestracja** → backend zwraca JWT → frontend zapisuje token i ustawia nagłówek dla kolejnych requestów.
4. **Subskrypcja:** użytkownik wybiera plan (Free/Pro/Business) → „Kup” → backend tworzy Stripe Checkout Session → redirect do Stripe → płatność → redirect z powrotem → webhook aktualizuje DB → frontend pokazuje „Masz plan Pro”.
5. **Generowanie:** frontend wywołuje `POST /api/generate-image` z tokenem → backend sprawdza JWT, sprawdza limity subskrypcji → jeśli OK, wywołuje Gemini → zwraca wynik do frontendu.
6. **Zarządzanie subskrypcją:** link „Zarządzaj” → Stripe Customer Portal (zmiana planu, anulowanie, faktury).

---

## 6. Fazy wdrożenia (krok po kroku)

Realizacja w kolejności:

| Faza | Zakres | Efekt |
|------|--------|--------|
| **1** | Katalog SHOTLAB_AI_TOOL, dokumentacja (ten plan), wybór stosu backendu i hostingu | Plan i decyzje gotowe |
| **2** | Backend szkielet: Express + TypeScript, env (API_KEY, JWT_SECRET), CORS, health check | Działający serwer, gotowy na endpointy |
| **3** | Baza: schemat users + subscriptions (+ usage jeśli potrzeba), migracje, połączenie z backendu | DB gotowa |
| **4** | Auth: rejestracja, logowanie, JWT, endpoint /api/auth/me | Użytkownicy mogą się rejestrować i logować |
| **5** | Proxy AI: przeniesienie logiki z geminiService/veoService do backendu, endpointy /api/generate-image, /api/remove-background, /api/generate-reel (chronione auth) | Generowanie działa przez API, klucz tylko na serwerze |
| **6** | Frontend: zamiana wywołań Gemini/Veo na wywołania backendu, ekrany logowania/rejestracji, przechowywanie tokena | Aplikacja korzysta z backendu i wymaga logowania |
| **7** | Stripe: produkty/ceny, Checkout Session w backendzie, webhook, zapis subskrypcji w DB, endpoint GET /api/subscription | Subskrypcje można kupować i są zapisywane |
| **8** | Limity: sprawdzanie planu i limitów przed generowaniem (np. Free: 10/mies., Pro: 100/mies.), endpoint usage | Egzekwowanie limitów |
| **9** | Frontend: strona cennika, przycisk „Kup”, wyświetlanie aktualnego planu, link do Stripe Customer Portal | Pełny UX subskrypcji |
| **10** | Deployment: hostowanie frontendu i backendu, domena, SSL, env w produkcji, ewentualnie CI/CD | Aplikacja dostępna na zewnątrz |

---

## 7. Pliki i repozytorium (propozycja)

W katalogu **SHOTLAB_AI_TOOL** można trzymać:

- `ARCHITECTURE.md` – ten dokument.
- `README.md` – krótki opis projektu i link do ARCHITECTURE.md.
- W kolejnych krokach: osobne repozytoria lub monorepo, np.:
  - `shotlab-frontend` – obecna aplikacja (skopiowana i dostosowana).
  - `shotlab-backend` – Node + Express, auth, proxy AI, Stripe.

Albo jeden repo z folderami: `frontend/`, `backend/`, `docs/` (wtedy ARCHITECTURE.md w `docs/` lub w root).

---

## 8. Podsumowanie

- **Frontend:** Obecna aplikacja Vite+React – zostaje, z wymianą wywołań AI na własne API i dodaniem auth + subskrypcji w UI.
- **Backend:** Nowa aplikacja Node (Express) – auth (JWT), proxy do Gemini/Veo, subskrypcje w DB, Stripe Checkout + webhooks, limity.
- **Stripe:** Subskrypcje odnawialne, Checkout, webhooks, opcjonalnie Customer Portal.
- **Baza:** Użytkownicy + subskrypcje (+ usage).
- **Deployment:** Frontend i backend na wybranym hostingu, domena, SSL.

Kolejne kroki realizacji można wykonywać zgodnie z fazami 2–10 powyżej.
