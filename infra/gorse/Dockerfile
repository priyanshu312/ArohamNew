# Gorse recommender for Render (or any Docker host).
# gorse-in-one bundles master + server + worker in one process.
# Cache + data both live in Postgres, so no Redis/RediSearch dependency.
FROM zhenghaoz/gorse-in-one:latest

COPY config.toml /etc/gorse/config.toml

# gorse-in-one's entrypoint already runs: gorse-in-one -c /etc/gorse/config.toml
# GORSE_DATA_STORE / GORSE_CACHE_STORE are supplied by the environment (render.yaml).
EXPOSE 8088
