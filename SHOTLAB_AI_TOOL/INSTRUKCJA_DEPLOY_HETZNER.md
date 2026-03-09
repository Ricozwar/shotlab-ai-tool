# Instrukcja Wdrożenia – Frontend na Vercel, Backend na Hetzner VPS

Poniżej znajduje się kompletny, krok po kroku opis najszybszego sposobu wdrożenia naszej aplikacji.

---

## 1. Wdrożenie Frontendu (Vercel)

Frontend (React + Vite) hostujemy na Vercelu, ponieważ jest to darmowe, szybkie i nie wymaga konfiguracji certyfikatów SSL. Vercel sam pobierze kod z GitHuba i go opublikuje.

### Krok po kroku:
1. Zaloguj się na **[Vercel.com](https://vercel.com/)** z użyciem konta GitHub.
2. Kliknij **"Add New Project"**.
3. Na liście repozytoriów z GitHuba znajdź repozytorium **shotlab-ai-tool** i kliknij "Import".
4. W sekcji **"Environment Variables"** dodaj następujące zmienne (wartości Supabase znajdziesz w ich panelu z poprzedniego etapu MVP):
   - `VITE_SUPABASE_URL` = `https://<twoj-identyfikator>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<twoj-anon-key-z-supabase>`
   - `VITE_API_URL` = `https://api.shotlab.pl` (zastąp to swoją docelową domeną, która będzie podpięta pod VPS z backendem)
5. Kliknij **Deploy**. 

> Vercel przypisze tymczasową domenę (np. `shotlab-ai-tool.vercel.app`). Możesz podpiąć do niej własną domenę w ustawieniach projektu w Vercel ("Settings" -> "Domains").

**WAŻNE:** Adres aplikacji przypisany przez Vercel (lub Twoją domenę podpiętą pod Vercel) musisz:
1. Dodać do **Redirect URLs** w panelu Authentication -> URL Configuration w panelu **Supabase**.
2. Wkleić jako zmienną `FRONTEND_URL` w konfiguracji backendu na Hetznerze (aby mechanizm CORS pozwolił na połączenie).

---

## 2. Wdrożenie Backendu (Hetzner VPS)

Backend hostujemy na VPS w Hetzner, co zapewnia nam szybką obsługę zapytań do AI, pozbycie się limitów czasowych i "usypiania" (które jest standardem np. w darmowym Renderze) oraz pełną kontrolę. Zastosujemy tam **Docker Compose**.

### Przygotowanie serwera VPS (Hetzner)
1. Wykup serwer (np. typ CX22 - 2 vCPU, 4GB RAM wystarczy z naddatkiem) z obrazem **Ubuntu 24.04**.
2. Zaloguj się na serwer przez SSH: `ssh root@<IP_SERWERA>`
3. Zainstaluj Docker'a (jeśli nie jest jeszcze zainstalowany):
   ```bash
   apt update
   apt install docker.io docker-compose-v2 -y
   ```

### Pobranie kodu i konfiguracja
1. Będąc na serwerze w dowolnym folderze, w którym chcesz trzymać aplikację (np. `/opt/shotlab`), sklonuj repozytorium:
   ```bash
   mkdir -p /opt/shotlab
   cd /opt/shotlab
   git clone https://github.com/Ricozwar/shotlab-ai-tool.git .
   ```
   *(Ewentualnie wejdź w folder pobrany git clone: `cd shotlab-ai-tool`)*

2. Utwórz plik `.env` obok pliku `docker-compose.yml`:
   ```bash
   nano .env
   ```
3. Wklej do pliku `.env` zmienne:
   ```env
   # Backend (wymagane do działania API)
   API_KEY=twój_klucz_google_ai_gemini

   SUPABASE_URL=https://<twoj-identyfikator>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<twoj-service-role-key-z-supabase>
   SUPABASE_JWT_SECRET=<twoj-jwt-secret-z-supabase>

   # Adres pod jakim widnieje Frontend na Vercelu (wymagane dla CORS!)
   FRONTEND_URL=https://shotlab-ai-tool.vercel.app
   ```
4. Zapisz plik (`CTRL+O`, `Enter`, `CTRL+X`).

### Uruchomienie Backendu
Uruchom kontener z backendem w tle:
```bash
docker compose build
docker compose up -d
```
Backend od teraz nasłuchuje w tle na porcie `3001` (na localhost serwera).

---

## 3. Podpięcie Domeny i Certyfikatu SSL (dla Backendu)

Vercel ogarnia SSL dla Frontendu. Musimy jednak zapewnić HTTPS dla naszego API na Hetznerze, aby Frontend (działający przez HTTPS) zechciał się z nim komunikować. Wykorzystamy Nginx i darmowy Let's Encrypt.

### Instalacja i Konfiguracja Nginx:
```bash
apt install nginx certbot python3-certbot-nginx -y
```

Utwórz plik konfiguracyjny (np. używasz domeny api.shotlab.pl):
```bash
nano /etc/nginx/sites-available/api.shotlab.pl
```
Wklej poniższy blok, zamieniając `api.shotlab.pl` na Twoją domenę:
```nginx
server {
    listen 80;
    server_name api.shotlab.pl;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Zapisz plik (`CTRL+O`, `Enter`, `CTRL+X`).

Aktywuj stronę i zrestartuj Nginx:
```bash
ln -s /etc/nginx/sites-available/api.shotlab.pl /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Generowanie certyfikatu SSL:
Uruchom wtyczkę certbot (upewnij się wcześniej, że domena u Twojego rejestratora jest przekierowana na adres IP serwera VPS):
```bash
certbot --nginx -d api.shotlab.pl
```
Postępuj zgodnie z instrukcjami na ekranie. Certbot sam zmodyfikuje odpowiednio plik konfiguracyjny Nginx dodając zabezpieczenia SSL (HTTPS).

---
**Gotowe!** Twój backend działa teraz na bezpiecznym połączeniu `https://api.shotlab.pl`, a frontend na Vercelu bez problemu się z nim łączy.

**Zarządzanie / Aktualizacje:**
Jeśli wgrasz nowe aktualizacje z backendem na GitHub, zaloguj się na serwer, wejdź w folder aplikacji i wykonaj:
```bash
git pull origin main
docker compose build --no-cache
docker compose up -d
```