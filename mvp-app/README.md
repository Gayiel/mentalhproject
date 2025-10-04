# mentalh-mvp (Vite + React)

A small development app containing the MentalHealth MVP demo. It reads mood logs from the host app's localStorage (key: `accessibleMoodHistory`) and provides an evaluator UI that posts to a local Flask API at `http://127.0.0.1:5000/evaluate`.

## Quick start (Windows cmd.exe)

1) Install dependencies

   cd mvp-app
   npm install

2) Start the Vite dev server

   npm run dev

3) Run the local Flask API (separate terminal)

   cd api
   python -m pip install -r requirements.txt
   python app.py

## Notes

- The app attempts to call `POST http://127.0.0.1:5000/evaluate` by default. If the API is unreachable or times out, the app will automatically use a safe local fallback evaluator and display that result.
- The demo uses Tailwind utility classes for quick styling. If you want consistent production styling, install/configure Tailwind in the Vite project or replace classes with a CSS file.

## Troubleshooting

- If you see CORS or network errors when calling /evaluate, ensure the Flask API is running and reachable at 127.0.0.1:5000.
- On Windows, use the provided cmd commands above. If you prefer PowerShell, run the commands sequentially or replace `&&` with `;`.

Enjoy — the Vite dev server auto-reloads the app as you edit source files.
