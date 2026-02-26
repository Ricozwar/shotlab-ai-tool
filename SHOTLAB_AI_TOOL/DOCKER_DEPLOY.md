# Deploy MVP w Dockerze (Hetzner)

Aplikacja działa w dwóch kontenerach: **backend** (Node/Express) i **frontend** (Nginx + zbudowany Vite). Nginx serwuje aplikację i przekierowuje `/api` do backendu.

---

## Wymagania na serwerze

- **Docker** i **Docker Compose**
- Dostęp SSH (np. `root@IP`)

---

## 1. Przygotowanie Supabase i zmiennych

Zrób wszystko z sekcji „1. Baza i auth” w [MVP_README.md](./MVP_README.md): projekt Supabase, schema, Google OAuth, JWT Secret.

---

## 2. Kod na serwerze

Na serwerze (np. w `/opt/shotlab` lub w katalogu użytkownika) musisz mieć cały repozytorium (frontend + `SHOTLAB_AI_TOOL/backend`). Możesz:

- **Sklonować repo**, albo  
- **Wgrać pliki** (np. `scp` / `rsync` z komputera).

Struktura na serwerze:

```
/opt/shotlab/
  docker-compose.yml
  Dockerfile.frontend
  .dockerignore
  .env                    ← utworzysz w kroku 3
  docker/
    nginx.conf
  (pliki frontendu: package.json, src, index.html, vite.config.ts, itd.)
  SHOTLAB_AI_TOOL/
    backend/
      Dockerfile
      package.json
      src/
      ...
```

---

## 3. Plik `.env` na serwerze

W katalogu z `docker-compose.yml` utwórz `.env` (np. `nano .env`) z zawartością:

```env
# Backend (wymagane do działania API)
API_KEY=twój_klucz_google_ai
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=twój_jwt_secret_z_supabase

# Adres publiczny aplikacji (CORS) – po ustawieniu domeny zmień na https://app.shotlab.pl
FRONTEND_URL=http://188.245.89.46

# Opcjonalnie: do buildu frontendu (Supabase – logowanie Google)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Po skonfigurowaniu domeny i SSL ustaw `FRONTEND_URL=https://app.shotlab.pl` i w Supabase dodaj ten URL do Redirect URLs.

---

## 4. Uruchomienie

Na serwerze, w katalogu z `docker-compose.yml`:

```bash
docker compose build
docker compose up -d
```

Aplikacja będzie dostępna na **porcie 80** (np. `http://188.245.89.46`). Backend nie jest wystawiony na zewnątrz – dostęp tylko przez Nginx (`/api`).

---

## 5. Domena i SSL (opcjonalnie)

Gdy masz domenę (np. `app.shotlab.pl` → IP serwera):

1. Zamiast serwować na porcie 80 z poziomu Docker, możesz postawić **Nginx (host)** z SSL (certbot) i proxy do `http://127.0.0.1:80` (kontener frontend), albo  
2. Przekierować port 80 w firewallu na kontener i SSL zrobić wewnątrz kontenera (wymaga osobnej konfiguracji Nginx z certyfikatem).

Prościej: Nginx na hoście z certbotem, proxy do `localhost:80` (kontener).

---

## 6. Przydatne komendy

```bash
# Logi
docker compose logs -f

# Restart po zmianie .env
docker compose up -d

# Przebudowa po zmianie kodu
docker compose build --no-cache
docker compose up -d
```

---

## Podsumowanie

| Element        | Opis |
|----------------|------|
| Backend        | Kontener Node, port 3001 (wewnętrzny), zmienne z `.env` |
| Frontend       | Kontener Nginx, port 80 (publiczny), proxy `/api` → backend |
| `.env` na serwerze | API_KEY, SUPABASE_*, FRONTEND_URL, opcjonalnie VITE_SUPABASE_* |
| Supabase       | Schema, Google OAuth, JWT Secret – jak w MVP_README |
