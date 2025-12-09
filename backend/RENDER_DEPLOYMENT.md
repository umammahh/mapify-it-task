# Render Deployment Guide

## Prerequisites

1. Ensure your backend folder structure is:
```
backend/
├── data/
│   ├── islamabad.geojson
│   ├── rawPois.geojson
│   ├── enrichedPois.geojson
│   └── hospitalsData.geojson
├── index.js
├── package.json
└── package-lock.json
```

## Deployment Steps

### 1. Push to GitHub
Make sure your code is pushed to GitHub with the `backend/` folder containing all files.

### 2. Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `mapifyit-backend` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend` ⚠️ **Important!**
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 3. Environment Variables

Add these in Render Dashboard → Environment:

```
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
PORT=10000
```

**Note**: Render automatically sets `PORT`, but you can override it. The `FRONTEND_URL` should match your deployed frontend URL.

### 4. Deploy

Click "Create Web Service" and wait for deployment to complete.

### 5. Update Frontend

Update your frontend's `VITE_DATA_BASE_URL` environment variable to point to your Render backend:

```
VITE_DATA_BASE_URL=https://your-backend.onrender.com/data
```

## Testing

After deployment, test these endpoints:

- `https://your-backend.onrender.com/` - Should return `{ status: 'ok', message: 'MapifyIt backend' }`
- `https://your-backend.onrender.com/test-data` - Should list all data files
- `https://your-backend.onrender.com/data/islamabad.geojson` - Should return GeoJSON data
- `https://your-backend.onrender.com/data/rawPois.geojson` - Should return POIs GeoJSON

## Troubleshooting

### Data files not found
- Verify `backend/data/` folder exists in your repository
- Check Root Directory is set to `backend` in Render settings
- Check logs in Render dashboard for path errors

### CORS errors
- Ensure `FRONTEND_URL` environment variable matches your frontend URL exactly
- Check browser console for CORS error details
- Verify frontend is using the correct backend URL

### Port issues
- Render sets PORT automatically, don't hardcode it
- The code uses `process.env.PORT || 5000` which works correctly

## File Structure Verification

Your backend should have:
- ✅ `package.json` with `"start": "node index.js"`
- ✅ `index.js` as the main file
- ✅ `data/` folder with GeoJSON files
- ✅ CORS configured to allow your frontend origin
- ✅ Data path set to `path.join(__dirname, 'data')`

