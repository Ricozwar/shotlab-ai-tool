# Specyfikacja produktowa: Shotlab AI Tool (wersja B2B)

Dokument powstał na podstawie wywiadu z Product Ownerem. Stan na: styczeń 2026.

---

## 1. Cel i odbiorcy

### 1.1 Odbiorcy
- **B2B**: producenci i sprzedawcy produktów **gabarytowych**, trudnych lub drogich w fotografii w realnych aranżacjach.
- Głównie **meble**, możliwe przedmioty użytku domowego.
- Skala: od **mikro** (kilka produktów) po **duże agencje reklamowe** i **fabryki** z bardzo dużą liczbą produktów.

### 1.2 Przewaga konkurencyjna
- **Brak konieczności promptowania** – wyniki w uporządkowanej formie.
- **Łatwe zapisywanie** – bez przewijania rozmowy z modelem (np. jak w Gemini).
- **Prosty interfejs** – gotowe opcje zamiast pisania; klik zamiast promptu.

### 1.3 Landing i wejście do aplikacji
- Landing: **https://shotlab.pl** (istniejący – usługa „my robimy sesję”).
- Docelowo: podstrona z opisem **aplikacji** + link do **app.shotlab.pl** (subdomena z aplikacją).
- Link prowadzi na zewnętrzną subdomenę; brak wspólnej sesji landing ↔ aplikacja.

---

## 2. Fazy wdrożenia

### 2.1 MVP (pierwsza wersja)
- **Cel**: product–market fit, rozpromowanie, zaproszeni użytkownicy.
- **Bez płatności** – jeden plan (Starter) z limitem kredytów.
- Dostęp: **link do aplikacji** – kto ma link, może wejść. Rejestracja i logowanie jak w docelowej wersji (Google).
- **Język**: EN.
- **RODO/regulamin**: minimum (minimalny tekst przy rejestracji).
- **Metryki sukcesu**: NPS, feedback, chęć zapłaty (ile osób chce płacić).

### 2.2 Po MVP
- Wprowadzenie płatności (Stripe), plany, dokup kredytów.
- Wielojęzyczność PL + EN (auto z przeglądarki).
- Rozbudowa funkcji według feedbacku.

---

## 3. Autentykacja i konta

### 3.1 MVP
- **Tylko logowanie przez Google** (OAuth).
- Rejestracja = pierwsze logowanie przez Google (brak osobnego formularza email+hasło).

### 3.2 Docelowo (opcjonalnie)
- Możliwość dodania logowania email+hasło.

---

## 4. Plany i kredyty

### 4.1 Model biznesowy (docelowo)
- **Hybryda**: plany z miesięcznym limitem + **dokup kredytów**.
- Subskrypcja: **miesięczna** (głównie) i **roczna**.
- Marża: 40–50% na kosztach generacji (Gemini/Veo).

### 4.2 Kredyty
- **1 obraz = 1 kredyt**
- **1 rolka = 5 kredytów** (do weryfikacji – koszt Veo ~40× wyższy niż obraz; może być konieczne 20–40 kredytów za rolkę lub wyższa cena kredytu).
- **Licznik kredytów** w **headerze** aplikacji.
- **Cennik** w aplikacji – czytelnie: ile kosztuje obraz, ile rolka, ile użytkownik ma kredytów.

### 4.3 Plan Free (docelowo)
- **5 obrazów na całe konto** – jednorazowo, bez odnawiania.

### 4.4 Plany płatne (docelowo)
- **Trzy plany** (np. Starter, Pro, Business).
- Użytkownik **od rejestracji** ma przypisany **Starter** z limitem (darmowy do wyczerpania limitu).
- Po wyczerpaniu limitu – **musi zapłacić**, żeby dalej korzystać (modal z checkoutem).

### 4.5 Wyczerpanie limitu
- **Komunikat** + **zablokowanie przycisków** generowania + **modal z checkoutem**.

### 4.6 MVP – limit
- **50 kredytów** na start (1 obraz = 1, 1 rolka = 5).
- Proporcję kredytów do kosztów API należy zweryfikować (szczególnie Veo).

---

## 5. Funkcje produktu

### 5.1 Zakres
- **Pełna** funkcjonalność obecnej aplikacji (obrazy, tło, style, warianty kolorystyczne, rolki, formaty, rozdzielczości itd.).

### 5.2 Rolki (Veo)
- Użytkownik może **wrócić do generowania zdjęć** podczas generowania rolki.
- **Powiadomienie w aplikacji**, gdy rolka jest gotowa – **tylko przy otwartej karcie** (WebSocket/SSE).
- Po odświeżeniu strony – brak powiadomienia, ale gotowa rolka widoczna na liście.
- Koszt rolki w kredytach – patrz p. 4.2.

### 5.3 Archiwum
- **MVP i na start**: **brak archiwum** po stronie serwera.
- Użytkownik ma dostęp **tylko do plików z bieżącej sesji** (pobrane w przeglądarce).
- Docelowo: ewentualnie archiwum 7 dni (do osobnej decyzji).

---

## 6. Cennik i płatności (docelowo)

### 6.1 Gdzie cennik
- **Landing** (shotlab.pl) – opis i cennik.
- **W aplikacji** – przy płatności opcja **zmiany planu** (Stripe Customer Portal lub ekran wyboru planu).

### 6.2 Waluty
- **EUR**, **PLN**, ewentualnie **USD** i inne – aplikacja **globalna**.

### 6.3 Powiadomienia
- Na start: **Stripe** (faktury, status) + **komunikaty w aplikacji**.
- Bez osobnych e-maili („limit się kończy”, „rolka gotowa” itd.) w pierwszej wersji.

---

## 7. Technologia i hosting

### 7.1 Frontend
- **Vercel** – build z repo, hostowanie SPA.
- Domena: **app.shotlab.pl** (custom domain w Vercel).

### 7.2 Backend
- **Hetzner VPS** – Node.js (Express), API, proxy do Gemini/Veo, auth, kolejki (rolki).
- Domena API: **api.shotlab.pl**.

### 7.3 Baza danych
- **Supabase** (PostgreSQL) – użytkownicy, subskrypcje, usage, kredyty.
- Nie: Airtable (nie do zastosowań produkcyjnych backendu).

### 7.4 Płatności (docelowo)
- **Stripe** – subskrypcje, dokup kredytów, webhooki.

---

## 8. UI/UX – ustalenia

- **Licznik kredytów**: w **headerze**, zawsze widoczny.
- **Język**: automatycznie z przeglądarki (MVP: EN; docelowo PL + EN).
- **Starter**: plan domyślny po rejestracji, z limitem (w MVP: 50 kredytów).

---

## 9. Uwagi techniczne do implementacji

### 9.1 Kredyty a koszty API (orientacja)
- Obraz (Gemini/Imagen): ~0,02–0,04 USD/obraz → 1 kredyt = 1 obraz jest realistyczny.
- Rolka (Veo 8 s): ~1,20–3,20 USD/rolka → **1 rolka = 5 kredytów** może być za tanio; zalecana **weryfikacja** i ewentualnie więcej kredytów za rolkę lub wyższa cena kredytu.

### 9.2 Asynchroniczne rolki (MVP / docelowo)
- Backend: **kolejka zadań** (np. Bull + Redis) dla generowania rolek.
- Powiadomienie w czasie rzeczywistym: **WebSocket** lub **SSE** – tylko gdy użytkownik ma otwartą aplikację.

### 9.3 Archiwum (jeśli w przyszłości)
- Wymaga: przechowywanie plików (np. Supabase Storage, S3), URL-e zamiast base64, job czyszczący pliki starsze niż 7 dni.
- MVP: bez archiwum – tylko sesja w przeglądarce.

---

## 10. Podsumowanie MVP vs docelowa wersja

| Aspekt | MVP | Docelowa wersja |
|--------|-----|------------------|
| Płatności | Nie | Stripe, plany, dokup kredytów |
| Auth | Tylko Google | Google (+ opcjonalnie email/hasło) |
| Plan | Jeden (Starter, 50 kredytów) | Free + 3 plany płatne |
| Język | EN | PL + EN (auto) |
| Cennik w app | Nie | Tak, zmiana planu |
| Licznik kredytów | Tak, w headerze | Tak |
| Rolki w tle + powiadomienie | Tak (WebSocket/SSE) | Tak |
| Archiwum | Nie (tylko sesja) | Opcjonalnie 7 dni |
| Landing | shotlab.pl + link do app | + podstrona aplikacji, app.shotlab.pl |

---

*Dokument do aktualizacji w miarę decyzji produktowych i technicznych.*
