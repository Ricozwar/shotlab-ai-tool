<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1XiBeElOJAvwKEIPdddO2veMeEKcxA-50

## Deploy

Wdrożenie aplikacji jest zoptymalizowane pod kątem usług PaaS:
- **Frontend:** [Vercel](https://vercel.com) (zero-config, auto-deploy z GitHuba).
- **Backend:** Serwer VPS (Docker) lub usługa webowa [Render](https://render.com).
- **Baza/Auth:** Supabase Cloud.

Pełny opis wdrożenia MVP znajduje się w pliku: [SHOTLAB_AI_TOOL/DOCKER_DEPLOY.md](SHOTLAB_AI_TOOL/DOCKER_DEPLOY.md).

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
