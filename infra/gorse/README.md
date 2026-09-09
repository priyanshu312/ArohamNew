# Gorse recommender

Powers `/api/recommendations/*` and the product injection in `/api/chat`.

## What's here

| file | purpose |
|---|---|
| `config.toml` | Gorse config. The default (no file) has `collaborative.type = "none"` and no `positive_feedback_types`, so nothing ever trains — this file fixes that. |
| `docker-compose.yml` | Local stack: `gorse-in-one` + Redis (needs the **redis-stack** image — Gorse uses RediSearch) + Postgres. |
| `seed-nakshra.js` | Wipes Gorse and reseeds it with the real Supabase catalog (numeric product IDs) + synthetic feedback so the model has something to learn from until real events flow in. |

## Local

```bash
cd infra/gorse
docker compose up -d
node seed-nakshra.js          # reset + seed
docker restart gorse-setup-gorse-1   # force an immediate model fit (else waits fit_period = 5m)
curl localhost:8088/api/recommend/seed_user_7?n=5      # personalised
curl localhost:8088/api/item/16/neighbors?n=5          # frequently-bought-together
curl localhost:8088/api/non-personalized/popular?n=5   # cold-start
```

Then point the backend at it: `GORSE_URL=http://localhost:8088`.

## Hosting on Render

Gorse needs 3 processes. Options:

1. **One Render Web Service** running `zhenghaoz/gorse-in-one` (Docker) + a Render **Key Value** (Redis) instance + a Render **Postgres** instance.
   - ⚠️ Render Key Value is plain Redis — **no RediSearch module**. Gorse's search index (`documents`) needs RediSearch, so this will fail with `No such index documents`. Use a Redis provider that ships RediSearch (Redis Cloud free tier, Upstash with search, or run `redis/redis-stack-server` as its own private service).
2. Set env on the Gorse service:
   - `GORSE_CACHE_STORE=redis://<redis-stack-host>:6379`
   - `GORSE_DATA_STORE=postgres://<user>:<pass>@<host>:5432/<db>?sslmode=require`
   - Mount `config.toml` at `/etc/gorse/config.toml` (Render: commit it and set the Docker command `-c /etc/gorse/config.toml`, or bake it into a small Dockerfile `FROM zhenghaoz/gorse-in-one` + `COPY config.toml /etc/gorse/config.toml`).
3. On the **backend** service set `GORSE_URL=https://<gorse-service>.onrender.com`.
4. Run `seed-nakshra.js` once against the hosted Gorse (`GORSE_URL=... node seed-nakshra.js`).
5. Pin the image — `docker inspect` the working container for its digest and use `zhenghaoz/gorse-in-one@sha256:…` so a `latest` bump can't change the config schema under you.

## Feeding real events

`seed-nakshra.js` is a bootstrap only. For live personalisation the backend should POST to `GORSE_URL/api/feedback` on real actions, using these exact types (they match `config.toml`'s `positive_feedback_types` / `read_feedback_types`):

| action | FeedbackType |
|---|---|
| product page view | `read` |
| wishlist / add-to-cart | `like` |
| purchase | `buy` |

`backend/scripts/sync_gorse.js` already pushes the catalog; wire a feedback call into the telemetry / cart / order routes.
