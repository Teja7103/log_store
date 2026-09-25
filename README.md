# Upload API (Render-ready)

Accepts `multipart/form-data` file uploads and stores them on the server disk.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET /` | HTML test form | |
| `GET /health` | Health check | |
| `POST /api/upload` | Upload files, form field `files` (up to 20, 100MB each) | |
| `GET /api/files` | List stored files | |
| `GET /api/files/:filename` | Download a file | |
| `DELETE /api/files/:filename` | Delete a file | |

## Run locally

```bash
npm install
npm start
# open http://localhost:3000
```

Upload test:

```bash
curl -F "files=@/path/to/a.log" -F "files=@/path/to/b.log" http://localhost:3000/api/upload
curl http://localhost:3000/api/files
```

## Deploy on Render

Option A — Dashboard:
1. Push this folder to GitHub.
2. Render → New → Web Service → select repo.
3. Build command: `npm install`, Start command: `npm start`.
4. (Optional, to persist uploads) Add a Disk: mount path `/opt/render/project/uploads`, and set env `UPLOAD_DIR=/opt/render/project/uploads`. Requires a paid instance type (Starter+).

Option B — Blueprint (`render.yaml` included):
1. Push to GitHub.
2. Render → New → Blueprint → select repo. It creates the web service + 1GB disk.

> Note: without a persistent disk, files on Render Free are ephemeral and disappear on restart/redeploy.
