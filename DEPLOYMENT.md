# Deployment Guide - MapifyIt Part 1

## Quick Deployment Options

### 1. Vercel (Easiest for Frontend)

**Steps:**
1. Push your code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Set root directory to `frontend`
5. Add environment variable: `VITE_MAPTILER_KEY` (your MapTiler API key)
6. Deploy!

**Public URL will be:** `https://your-project.vercel.app`

### 2. Netlify

**Steps:**
1. Push your code to GitHub
2. Go to https://netlify.com
3. Import your repository
4. Build settings:
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/dist`
5. Add environment variable: `VITE_MAPTILER_KEY`
6. Deploy!

**Public URL will be:** `https://your-project.netlify.app`

### 3. GitHub Pages

**Steps:**
1. Update `vite.config.js` to add `base: '/your-repo-name/'`
2. Build: `cd frontend && npm run build`
3. Push `dist` folder to `gh-pages` branch
4. Enable GitHub Pages in repository settings

## Backend Deployment (Optional)

The map works with static data, but for dynamic POIs from OSM:

### Railway
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select backend folder
4. Add environment variables if needed

### Render
1. Go to https://render.com
2. New Web Service
3. Connect GitHub repo
4. Root directory: `backend`
5. Build command: `npm install`
6. Start command: `npm start`

## Environment Variables

### Frontend (.env)
```
VITE_MAPTILER_KEY=your_maptiler_key_here
VITE_API_URL=https://your-backend-url.com
```

### Backend (.env)
```
PORT=5000
NODE_ENV=production
```

## Getting MapTiler API Key (Free)

1. Visit https://www.maptiler.com/cloud/
2. Sign up (free account)
3. Go to "Keys" section
4. Copy your API key
5. Add to environment variables

**Free Tier:** 100,000 requests/month (sufficient for testing)

## Testing Deployment

After deployment, verify:
- ✅ Map loads with vector tiles
- ✅ Roads are visible
- ✅ POI markers appear
- ✅ Administrative boundaries show
- ✅ Popups work on click
- ✅ Map is responsive

## Troubleshooting

**Map not loading:**
- Check MapTiler API key is set correctly
- Verify CORS settings if using custom backend
- Check browser console for errors

**POIs not showing:**
- Backend API is optional - map uses default POIs if backend unavailable
- Check backend is deployed and accessible
- Verify API URL in environment variables

**Vector tiles not working:**
- MapTiler key might be invalid or expired
- Check network tab for 403/401 errors
- Fallback to OSM raster tiles should work

