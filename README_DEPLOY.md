# Cittu Lucky Box — Online Deployment

This repo contains both the **Node.js server** and the **public** UI (game + admin).

## Quick Deploy (Render)
1. Push this folder to a **GitHub repository**.
2. Go to https://render.com → New → Web Service → Connect your repo.
3. Confirm settings:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**: add `ADMIN_PASS` (e.g., `changeme`)
4. Deploy. Your app will be available like `https://your-app.onrender.com`.
   - Player: `/` (or `/multi.html` depending on your project)
   - Admin: `/admin` (enter the Admin Pass you set).

## Local Run
```bash
npm install
ADMIN_PASS=changeme npm start
# open http://localhost:3000/
# admin at http://localhost:3000/admin
```

## Notes
- The server must listen on `process.env.PORT` for cloud hosting.
- All API calls in the frontend should be relative paths (e.g., `/click`) so it works locally and online.
- Files saved on Render free tier may reset on redeploy. Export logs if needed.
