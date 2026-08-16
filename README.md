# BNC Frontend

Vue 3 frontend for the [Broadcast Network Controller (BNC)](https://github.com/stranden/bnc-backend)
backend.

BNC uses [NetBox](https://netbox.dev) as its SSoT/NSoT — there is no separate
database. The frontend therefore never talks to NetBox directly; it only calls
the BNC backend, which enforces the tag scope:

| NetBox tag              | Meaning                                                            |
|-------------------------|--------------------------------------------------------------------|
| `external-ctrl: bnc`    | The object is visible to BNC at all (read scope).                   |
| `bnc-state: manage`     | BNC may additionally *change* the device — push port configuration. |

Devices lacking `bnc-state: manage` are rendered read-only throughout the UI,
and the "apply templates" action is disabled for them.

## Stack

- Vue 3 (`<script setup>`, Composition API) + TypeScript
- Vite
- Pinia (state) and Vue Router (routing, auth guard)
- Tailwind CSS v4 + DaisyUI v5 (custom dark `bnc` theme)

## Getting started

```bash
cp .env.example .env
npm install
npm run dev
```

The frontend always talks to the real BNC backend — there is no mock mode.
Set `VITE_BACKEND_URL` to point the dev server at a running backend:

```env
VITE_BACKEND_URL=http://localhost:8000
```

## Features

| Area              | Route                | Notes                                                              |
|-------------------|----------------------|--------------------------------------------------------------------|
| Login             | `/login`             | Pluggable auth provider (see below).                                |
| Overview          | `/`                  | Counts and recent devices for the active site.                      |
| Sites             | `/sites`             | BNC-tagged sites; a single site becomes the default automatically.  |
| Devices           | `/devices`           | List, create, edit and delete switches. *(backend not implemented yet)* |
| Switch ports      | `/devices/:id/ports` | Stage template assignments per port, review the diff, then apply. *(backend not implemented yet)* |
| Network templates | `/templates`         | Read-only broadcast traffic classes (AES67, Dante, Data, SMPTE 2110). |
| VLANs             | `/vlans`             | Create, edit and delete VLANs at the active site, tagged with a network template. |

### Default site

When the backend returns exactly one site, it is selected automatically and the
site switcher collapses to a static label. The selection is persisted in both
`localStorage` and a `bnc_site` cookie (the cookie so a future SSR or proxy
layer can read it server-side). If the persisted site later disappears from
NetBox, the selection is cleared rather than silently showing nothing.

### Network templates

Network templates are BNC-owned traffic classes (AES67, Dante, Data, SMPTE
2110) served read-only from the backend (`GET /templates`). A VLAN can be
tagged with a template's slug to describe the traffic class it carries; the
frontend cannot create, edit or delete templates.

## Authentication

The auth method is not settled yet, so the provider is selected at build time
via `VITE_AUTH_PROVIDER` and everything above it (login view, router guard,
transport) is provider-agnostic:

- **`dev`** (default) — accepts any credentials locally, no backend call.
  Appropriate while the backend has no auth at all.
- **`token`** — `POST /auth/login` returns a bearer token, which is stored and
  attached to every subsequent request. A `401` clears the session and bounces
  the user to the login page.
- **`netbox`** — the user pastes their own NetBox API token, which becomes the
  bearer token. BNC then acts as that user against NetBox, which keeps NetBox's
  own permissions and change log meaningful.

Adding OIDC/SAML later is a single extra branch in `stores/auth.ts`.

## Backend status

Everything the frontend calls goes straight to the real backend — there is no
mock transport. Each entry in `src/api/index.ts` is annotated `backend:
exists` or `backend: pending`; endpoints marked `pending` will fail with a
normal HTTP error until the backend implements them.

Implemented upstream today:

```
GET  /sites  /sites/{id}
GET  /vlans  /vlans/{vid}   POST /vlans   PATCH /vlans/{vid}   DELETE /vlans/{vid}
GET  /templates  /templates/{slug}
GET  /healthz  /readyz
```

Expected by this frontend, still to be implemented:

```
POST   /auth/login                    PATCH  /devices/{id}
POST   /auth/logout                   DELETE /devices/{id}
GET    /auth/me                       GET    /interfaces?device_id=
GET    /devices                       PATCH  /interfaces/{id}
GET    /device-types                  POST   /interfaces/apply-templates
POST   /devices                       GET    /ip-addresses
```

The backend also does not yet report whether a device carries
`bnc-state: manage`. The frontend reads an optional `manageable` boolean on the
device schema; until it is populated, no device is treated as pushable.

## Project layout

```
src/
  api/          transport and typed endpoint modules
  components/   reusable UI (modal, forms, badges, site switcher)
  config.ts     runtime + build-time configuration
  layouts/      authenticated app shell
  router/       routes and auth guard
  stores/       Pinia stores: auth, site, devices, templates, ipam, toast
  types/        types mirroring the backend Pydantic schemas
  utils/        IPv4/CIDR helpers
  views/        page components
```

## Scripts

```bash
npm run dev      # dev server
npm run build    # type-check (vue-tsc) and production build
npm run preview  # preview the production build
```
