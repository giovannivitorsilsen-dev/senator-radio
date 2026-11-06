# Dedicated Server — Linux, Windows, Docker

## Current scope
The deployable **game service** is the Node.js 3D-browser multiplayer test. C/C++/Java/Lua modules are still separate prototypes. This repository does not yet contain a production RP server, persistent player identities or a native client.

## Linux (Ubuntu / Debian)
Install Node.js 22 LTS and npm, then:
```sh
npm install
sh deploy/linux/start-server.sh
```
Visit `http://localhost:3000`. For Internet traffic place behind a TLS reverse proxy (HTTPS/WSS) and apply firewall/rate limiting.

## Windows
Install Node.js 22 LTS. From PowerShell in the repository:
```powershell
powershell -ExecutionPolicy Bypass -File deploy/windows/start-server.ps1
```

## Docker
Install Docker Engine with Compose plugin on Linux or Docker Desktop on Windows:
```sh
docker compose up --build -d game
docker compose ps
docker compose logs -f game
```
For a disposable PostgreSQL instance, create a local `.env` file using `deploy/.env.example`, set a strong unique password and run `docker compose -f compose.yaml -f compose.postgres.yaml up -d postgres`. It is intentionally **not connected to the game yet** and is **not exposed** to the Internet.

## Database choices
- PostgreSQL: `database/postgresql/001_core.sql`
- MariaDB/MySQL: `database/mariadb/001_core.sql`
- SQLite: future tests/local storage adapter
- HeidiSQL, DBeaver, pgAdmin, phpMyAdmin are optional tools; XAMPP can provide a local MariaDB environment on Windows.
- SQL migrations are draft schemas. Do not use with real payment/staff/user data until authentication, permissions, persistence, backup, migration versioning and integration tests are implemented.

## Security baseline
Do not enable public administration or client-side powers. Do not store keys in source control. The present WebSocket demo is **unauthenticated** and unsuitable for public, paid, or regulated services. Restrict exposure to trusted testers and shut down test hosting when unused.

## Cross-play
The browser-based prototype can be tested on Android, Windows and Linux using compatible modern browsers. Native Linux, Windows and Android game applications are **not yet compiled**. The future desktop administration app remains separate from mobile gameplay.
