# Render deployment — one Docker web service

This serves React, Flask and Socket.IO on the same HTTPS domain. It avoids the Vite development proxy in production. The repository's Dockerfile installs Node/Python dependencies, builds React and starts one threaded Gunicorn worker with the matching scheduler. Do not configure multiple workers or replicas with the current matcher.

## Free demonstration setup

1. Push the latest code and sign into Render. Choose **New → Web Service** and connect `Sri-amxn/Taxi-clone`.
2. Branch: `main`. Runtime/language: **Docker**. Leave **Root Directory blank**. Dockerfile path: `./Dockerfile`. Leave Docker command override blank; the image has its own startup command.
3. Choose the Free instance if offered. Availability and terms may change; review Render's current plan information before confirming.
4. Add environment variables:
   - `DEMO_MODE=1` — initializes disposable SQLite demo tables before serving traffic.
   - `SECRET_KEY` — a long random secret, stable across redeployments.
   - `USER_CODE_SECRET` — a different stable random secret.
   - `VITE_GOOGLE_MAPS_BROWSER_KEY` — your website-restricted browser key. This is a build argument and intentionally public in the frontend bundle. Redeploy after changing it.
   - `GOOGLE_MAPS_SERVER_KEY` — your Routes API server key; private runtime variable. Never prefix it with `VITE_`.
5. Generate each secret locally using `python -c "import secrets; print(secrets.token_hex(32))"`. Enter it in Render, not GitHub or chat. Do not copy the same value for both secrets.
6. Health check path: `/healthz`. Click **Create Web Service** / deploy.
7. Wait for build completion and the Gunicorn log showing `0.0.0.0:<port>`. Open the supplied `https://...onrender.com` address. Register a demo account.
8. Add `https://YOUR-SERVICE.onrender.com/*` to the Google browser key's website restrictions. Allow Maps JavaScript API and Places API (New). Configure Routes API access and server-key restrictions for Render's outbound network. Google's quotas/billing are independent of Render hosting.

Maps are optional for checking page delivery. Without Google keys, the UI reports unavailable maps; demo quotes are approximate if no server key is present. With a server key, route requests use Google even when DEMO_MODE=1.

## Limits you must understand

Free web services can sleep, interrupt background matching and take time to wake. SQLite on the service filesystem is ephemeral: accounts, rides and settings can disappear on restart/redeploy. Use this for a temporary demonstration, not real riders or durable data. Do not enter important personal records. Free hosting does not make Google Maps free.

For durable deployment, provision an external database, apply reviewed migrations and seed required fare/share settings. The Dockerfile includes the ODBC runtime library but **does not install Microsoft's SQL Server ODBC Driver 18**; a SQL Server deployment needs that additional driver installation and verified TLS/database configuration. Setting DATABASE_URL alone does not complete that setup. A PostgreSQL database would also require an appropriate driver and compatibility testing; do not paste a PostgreSQL URL into the existing configuration unmodified.

## Frequent failures

- `requirements.txt not found`: wrong root directory/runtime. Use Docker with an empty root and the repository Dockerfile.
- `gunicorn: command not found`: old deployment or wrong start settings. Pull the updated requirements and use the Docker CMD.
- No open port / localhost binding: do not use the local `python app.py` entrypoint on Render. Use the provided image CMD.
- `no such table`: demo initialization did not run, or a production database lacks migrations. Review startup logs and DEMO_MODE.
- Page loads but API returns HTML/empty JSON: old frontend-only deployment or wrong service URL. This setup serves both from the same service.
- Google quota/auth errors: fix Google Cloud configuration; redeploying Render does not reset Google quotas.

When troubleshooting, share the first failing log line and traceback, with keys/passwords removed. This guide describes the prepared configuration; an actual Render deployment is only verified once Render reports healthy and the app works on its URL.
