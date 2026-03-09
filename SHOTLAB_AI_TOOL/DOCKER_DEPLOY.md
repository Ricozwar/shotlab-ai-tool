# Wdrożenie MVP (Vercel + Hetzner/Render)

Dla maksymalnego uproszczenia procesu wdrożenia i obniżenia kosztów, aplikacja została podzielona na nowoczesne usługi PaaS oraz prosty serwer backendowy.

## Architektura wdrożenia

- **Frontend (React/Vite):** [Vercel](https://vercel.com) (lub Cloudflare Pages) – automatyczny deploy, darmowy SSL i CDN.
- **Backend (Node.js/Express):** Serwer VPS (np. Hetzner) w kontenerze Docker lub darmowa usługa [Render](https://render.com).
- **Baza danych i Autoryzacja:** [Supabase](https://supabase.com) Cloud – darmowy poziom (Free Tier) w zupełności wystarczy dla MVP.

---

## 1. Baza i Auth (Supabase)

Zrób wszystko z sekcji „1. Baza i auth” w [MVP_README.md](./MVP_README.md):
- Załóż projekt na Supabase
- Wgraj schemat bazy
- Skonfiguruj Google OAuth
- Skopiuj klucze (URL, Anon Key, Service Role Key, JWT Secret)

---

## 2. Wdrożenie Frontendu (Vercel)

Zamiast budować kontenery Docker, frontend jest wdrażany bezpośrednio na Vercel z GitHuba:

1. Zaloguj się na [Vercel.com](https://vercel.com).
2. Dodaj nowy projekt ("Add New..." -> "Project") i wybierz repozytorium z GitHub.
3. W sekcji **Environment Variables** dodaj:
   - `VITE_API_URL` (np. `https://api.twojadomena.pl` lub URL z Render, dla lokalnego testowania: `http://localhost:3001`)
   - `VITE_SUPABASE_URL` (z Supabase)
   - `VITE_SUPABASE_ANON_KEY` (z Supabase)
4. Kliknij **Deploy**. Vercel sam zainstaluje zależności, zbuduje projekt i opublikuje pod publicznym adresem URL z certyfikatem SSL.
5. (Opcjonalnie) W ustawieniach domeny w Vercel podepnij własną domenę (np. `app.shotlab.pl`).
6. **Ważne:** Dodaj uzyskany adres URL do "Redirect URLs" w konfiguracji uwierzytelniania w Supabase.

---

## 3. Wdrożenie Backendu (Hetzner VPS z Docker)

Jeśli chcesz używać VPS (np. Hetzner), backend będzie działał w kontenerze Docker. 

Na serwerze (np. w `/opt/shotlab` lub w katalogu użytkownika):

1. Sklonuj repozytorium lub prześlij pliki (m.in. `docker-compose.yml` oraz katalog `SHOTLAB_AI_TOOL/backend`).
2. Utwórz plik `.env` obok pliku `docker-compose.yml`:

```env
# Klucz API Google (Gemini)
API_KEY=twój_klucz_google_ai

# Połączenie z Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=twój_jwt_secret_z_supabase

# Adres publiczny frontendu (CORS) – niezbędne, by przeglądarka nie blokowała zapytań
FRONTEND_URL=https://app.shotlab.pl
```

3. Uruchom kontener:

```bash
docker compose build
docker compose up -d
```

Backend działa na porcie 3001. 

### Udostępnianie Backendu na zewnątrz (Nginx + SSL)
Jeżeli używasz VPS, aby podpiąć domenę (np. `api.shotlab.pl`) i wygenerować certyfikat SSL dla backendu:
1. Skonfiguruj Nginx (na głównym systemie VPS) jako reverse proxy do portu `3001`.
2. Wygeneruj certyfikat za pomocą Let's Encrypt (Certbot).
3. Przypisz URL (np. `https://api.shotlab.pl`) do zmiennej `VITE_API_URL` we wdrożeniu frontendu (Vercel).

---

## Alternatywa: Całkowicie bezserwerowy backend (Render.com)

Jeśli chcesz uniknąć konfiguracji VPS:
1. Zaloguj się na [Render.com](https://render.com).
2. Dodaj "Web Service" i wskaż to repozytorium.
3. Zmień katalog główny ("Root Directory") na `SHOTLAB_AI_TOOL/backend`.
4. Ustaw polecenia:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
5. Wklej zmienne środowiskowe z punktu 3. (API_KEY, SUPABASE_URL, itd.).
6. Po opublikowaniu, wklej uzyskany adres URL serwisu Render do zmiennej `VITE_API_URL` na Vercel. 
*(Uwaga: na darmowym planie Render aplikacja "zasypia" po 15 min nieaktywności, co wydłuża czas pierwszego odpowiedzi API).*

---

## Podsumowanie

| Element | Gdzie hostowane? | Utrzymanie | Koszt |
|---|---|---|---|
| Frontend | Vercel | Auto-deploy po każdym commit'cie (Git push) | $0 |
| Backend | VPS Hetzner / Render | Docker (Hetzner) / Auto-deploy (Render) | od ok. 4 EUR (VPS) lub $0 (Render) |
| Baza / Auth | Supabase Cloud | Pełne zarządzanie przez chmurę | $0 |
