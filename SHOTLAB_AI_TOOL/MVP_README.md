# MVP – wdrożenie (Hetzner VPS, Supabase, 7‑dniowy trial)

Krótki przewodnik: uruchomienie MVP z limitami 50 zdjęć/dzień, 3 rolki/dzień i 7‑dniowym trialem od pierwszego logowania. Auth: tylko Google (Supabase).

---

## 1. Baza i auth (Supabase)

1. **Projekt Supabase**  
   Utwórz projekt w [Supabase](https://supabase.com). Zapisz: **Project URL** i **anon key** (Settings → API). Do backendu potrzebny też **service_role key** (te same Settings → API).

2. **Schema**  
   W Supabase: **SQL Editor** → wklej zawartość pliku `backend/supabase-schema.sql` i uruchom. Powstaną tabele `users` i `daily_usage`.

3. **Google OAuth**  
   - W Supabase: **Authentication → Providers** → włącz **Google**.  
   - W [Google Cloud Console](https://console.cloud.google.com): utwórz projekt (lub użyj istniejącego), **APIs & Services → Credentials** → **Create Credentials → OAuth 2.0 Client ID**. Typ: **Web application**.  
   - **Authorized redirect URIs**: dodaj URL zwrotny z Supabase (Authentication → URL Configuration → „Redirect URLs”; zwykle `https://<project-ref>.supabase.co/auth/v1/callback`).  
   - Skopiuj **Client ID** i **Client Secret** do Supabase (Google provider).  
   - **JWT Secret**: w Supabase → **Settings → API** jest „JWT Secret”. Ten sam wpisz w backendzie jako `SUPABASE_JWT_SECRET` (weryfikacja tokenów).

---

## 2. Backend (Express na VPS)

1. **Zmienne środowiskowe**  
   W katalogu `backend/` skopiuj `.env.example` do `.env` i uzupełnij:

   - `API_KEY` – klucz Google AI (Gemini/Veo).  
   - `SUPABASE_URL` – Project URL z Supabase.  
   - `SUPABASE_SERVICE_ROLE_KEY` – service_role key z Supabase.  
   - `SUPABASE_JWT_SECRET` – JWT Secret z Supabase (Settings → API).  
   - `FRONTEND_URL` – URL frontendu (np. `https://app.shotlab.pl` lub `http://localhost:5173` w dev).  
   - Opcjonalnie: `PORT=3001`.

2. **Uruchomienie**  
   - `npm install` w `backend/`.  
   - `npm run build` (jeśli jest skrypt).  
   - Produkcja: np. **PM2**: `pm2 start dist/index.js --name shotlab-api` (ścieżka do pliku wejściowego zależna od Twojego `package.json`).

3. **Nginx (proxy)**  
   Na VPS skonfiguruj Nginx tak, aby np. `https://api.shotlab.pl` (lub `https://app.shotlab.pl/api`) proxy’ował do `http://127.0.0.1:3001`. Backend nasłuchuje na `PORT`.

---

## 3. Frontend (Vite/React)

1. **Zmienne**  
   W katalogu frontendu (gdzie jest Vite) utwórz `.env` (lub `.env.production`):

   - `VITE_API_URL` – pełny URL backendu (np. `https://api.shotlab.pl`).  
   - `VITE_SUPABASE_URL` – Project URL z Supabase.  
   - `VITE_SUPABASE_ANON_KEY` – anon (public) key z Supabase.

2. **Build**  
   - `npm run build`.  
   - Pliki z `dist/` serwuj przez Nginx (np. pod `https://app.shotlab.pl`) lub innym serwerem HTTP.

---

## 4. Domena i SSL

- Ustaw DNS: np. `app.shotlab.pl` → IP VPS, ewentualnie `api.shotlab.pl` → ten sam IP.  
- Na VPS: SSL (np. certbot/Let’s Encrypt) dla Nginx.  
- W Supabase w **Redirect URLs** dodaj dokładny URL logowania, np. `https://app.shotlab.pl`.

---

## 5. Podsumowanie

| Gdzie        | Co ustawić |
|-------------|------------|
| Supabase    | Schema z `supabase-schema.sql`, Google provider, JWT Secret |
| Backend .env | `API_KEY`, `SUPABASE_*`, `FRONTEND_URL`, opcjonalnie `PORT` |
| Frontend .env | `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| VPS         | Backend (np. PM2), Nginx (API + frontend), SSL |

Po wdrożeniu: użytkownik loguje się przez Google; frontend wysyła requesty z tokenem w nagłówku `Authorization`; backend sprawdza limity (50 zdjęć, 3 rolki na dzień) i trial 7 dni od `users.created_at`.
