# EASYDOC Local

This folder is a self-contained local distribution of the current EASYDOC
backend and web frontend. The application source is copied from the canonical
folders one level above before it starts:

- `../backend` -> `local/backend`
- `../frontend` -> `local/frontend`

`local/backend` and `local/frontend` are generated mirrors. Make feature
changes in the canonical source, then run `update.ps1`. This keeps the local
version aligned with every approved change without maintaining a second code
branch.

## Requirements

- Docker Desktop running with Docker Compose v2.
- Windows PowerShell 5.1 or PowerShell 7.
- Ports `4300`, `8100`, `8180`, `9100`, and `9101` available.

## Start

From the project root:

```powershell
cd .\local
.\start.ps1
```

The first startup builds the backend and Angular containers, initializes
MongoDB, Redis, MinIO, OnlyOffice, Celery, and loads the idempotent synthetic
EASYDOC seed for March through July 2026.

Open:

- Web: `http://localhost:4300`
- API documentation: `http://localhost:8100/api/docs`
- MinIO console: `http://localhost:9101`
- OnlyOffice: `http://localhost:8180`

Administrator account:

```text
directora@easydoc.edu
password123
```

## Update after a feature change

Run this after any backend or frontend change made in the main project:

```powershell
cd .\local
.\update.ps1
```

It synchronizes the current sources, rebuilds the affected containers, and
runs the idempotent seed again. To skip the seed for a quick frontend-only
iteration, use `./update.ps1 -SkipSeed`. The local backend deliberately
restarts on update instead of using a Windows bind-mount reloader, which keeps
startup reliable.

## Verify and stop

```powershell
.\verify.ps1
.\stop.ps1
```

`stop.ps1` preserves the local MongoDB, Redis, and MinIO volumes. The local
stack uses its own service names and ports, so it can coexist with the main
development stack on `4200` and `8000`.

## Local AI assets

The backend runs the offline document intelligence and deterministic training
artifacts included in the synchronized source. A Vosk Spanish ASR model is
optional and is never downloaded automatically. To enable it, place the model
under `local/backend/local_models/vosk-es/` and restart with `./update.ps1`.

Do not place production credentials in this folder. The local Compose file has
development-only secrets and synthetic data.
