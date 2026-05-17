# parenting-frontend deployment

Target: Coolify on Hetzner (server `localhost`, project `parenting`).
Domain: `https://parenting-frontend.gazar.dev`.

## Coolify app configuration

| Field | Value |
| --- | --- |
| Project | `parenting` (uuid `s35iqmgh39h6wa4mrqbn0ofz`) |
| Environment | `production` (uuid `dnjqw5w8uy3roj5syk2t067h`) |
| Server | `localhost` (uuid `t25g5ksj0hjcqgzshfyd4isd`) |
| Source | Private GitHub App `coolify-gazar` (uuid `hwmdbfg5r0aancx5a203cie3`) |
| Repo | (this repo) |
| Branch | `main` |
| Build pack | Dockerfile |
| Base directory | `/` (monorepo root) |
| Dockerfile location | `apps/parenting-frontend/Dockerfile` |
| Port | `8080` |
| Domain | `https://parenting-frontend.gazar.dev` |

## Build args (set in Coolify env vars, "Build Variable" toggle ON)

| Key | Value |
| --- | --- |
| `VITE_API_URL` | `https://parenting-backend.gazar.dev` |
| `VITE_GOOGLE_CLIENT_ID` | `35022839592-bohavqg09vi3ql9aroloirosa4i7onpe.apps.googleusercontent.com` |
| `VITE_SENTRY_DSN` | (from Sentry project) |
| `VITE_GOOGLE_TAG_ID` | `G-6RZSVM0EM3` |

Vite inlines these at build time, so they must be marked as Build Variables in Coolify (not just runtime env).

## Create the app via API

Token is at `vps/coolify-token.txt` (gitignored).

```bash
TOKEN=$(cat vps/coolify-token.txt)
curl -X POST http://178.105.103.56:8000/api/v1/applications/private-github-app \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_uuid": "s35iqmgh39h6wa4mrqbn0ofz",
    "environment_name": "production",
    "server_uuid": "t25g5ksj0hjcqgzshfyd4isd",
    "github_app_uuid": "hwmdbfg5r0aancx5a203cie3",
    "git_repository": "<owner>/<repo>",
    "git_branch": "main",
    "build_pack": "dockerfile",
    "base_directory": "/",
    "dockerfile_location": "/apps/parenting-frontend/Dockerfile",
    "ports_exposes": "8080",
    "name": "parenting-frontend",
    "domains": "https://parenting-frontend.gazar.dev"
  }'
```

Response returns the application `uuid`. Save it; the GH Actions deploy trigger needs it.

## Deploy trigger (after first manual deploy succeeds)

```
GET http://178.105.103.56:8000/api/v1/deploy?uuid=<APP_UUID>
Authorization: Bearer $COOLIFY_TOKEN
```

Mirror `.github/workflows/deploy-backend.yml` to add a GH Actions workflow that hits this endpoint on pushes to `apps/parenting-frontend/**`.

## Notes

- The Dockerfile builds with `pnpm install --filter parenting-frontend...` from the monorepo root; `packages/shared` and `packages/ui` are pulled in automatically.
- Nginx serves on port 8080 with SPA fallback to `index.html`, but `/sitemap.xml` and `/robots.txt` return 404 if missing (don't fall through to the SPA, otherwise crawlers see /login).
- Later cutover to `raised.info`: add the domain in Coolify alongside `parenting-frontend.gazar.dev`, update Sentry `tracePropagationTargets`, and let Coolify provision the cert.
