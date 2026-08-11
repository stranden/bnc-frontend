# BNC Frontend

Vue 3 frontend for the [Broadcast Network Controller (BNC)](../bnc-backend)
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

The app runs entirely on mock data by default (`VITE_USE_MOCK=true`), so no
backend is required to develop against it. Sign in with any username and a
password of at least three characters.

To point it at a running backend:

```env
VITE_USE_MOCK=false
VITE_PROXY_TARGET=http://localhost:8000
```

## Features

| Area              | Route                | Notes                                                              |
|-------------------|----------------------|--------------------------------------------------------------------|
| Login             | `/login`             | Pluggable auth provider (see below).                                |
| Overview          | `/`                  | Counts and recent devices for the active site.                      |
| Sites             | `/sites`             | BNC-tagged sites; a single site becomes the default automatically.  |
| Devices           | `/devices`           | List, create, edit and delete switches.                             |
| Switch ports      | `/devices/:id/ports` | Stage template assignments per port, review the diff, then apply.   |
| Port templates    | `/templates`         | Built-in AES67 / ST 2110 / Dante / data / uplink profiles + custom. |
| VLANs & subnets   | `/vlans`             | Create VLANs with optional routing, DHCP and multicast/IGMP.        |

### Default site

When the backend returns exactly one site, it is selected automatically and the
site switcher collapses to a static label. The selection is persisted in both
`localStorage` and a `bnc_site` cookie (the cookie so a future SSR or proxy
layer can read it server-side). If the persisted site later disappears from
NetBox, the selection is cleared rather than silently showing nothing.

### Switchport templates

Templates are BNC-owned broadcast profiles, not NetBox objects. Each one
describes how a class of port should be configured: VLAN and port mode, MTU,
QoS/DSCP marking, PTP profile and intervals, IGMP snooping/querier behaviour,
and edge protection. Five profiles ship built in — SMPTE ST 2110, AES67, Dante,
Standard Data and Media Uplink. Built-ins cannot be edited or deleted, but can
be cloned into an editable custom template.

Assignments on the switch-port page are staged client-side, so a whole patch can
be laid out before anything is pushed. "Review & apply" first runs a dry run
against the backend and shows the resulting diff, and only then applies it.

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

The backend currently exposes only read-only list endpoints. Everything else is
served by the mock transport in `src/api/mock/`, which implements the contract
the backend is expected to grow. Each entry in `src/api/index.ts` is annotated
`backend: exists` or `backend: pending`.

Implemented upstream today:

```
GET  /sites  /devices  /device-types  /prefixes  /ip-addresses  /vlan-groups  /vlans
GET  /healthz  /readyz
POST /webhooks/netbox
```

Expected by this frontend, still to be implemented:

```
POST   /auth/login                    PATCH  /devices/{id}
POST   /auth/logout                   DELETE /devices/{id}
GET    /auth/me                       GET    /interfaces?device_id=
POST   /devices                       PATCH  /interfaces/{id}
POST   /vlans                         POST   /interfaces/apply-templates
DELETE /vlans/{id}                    GET    /switchport-templates
                                      POST   /switchport-templates
                                      PATCH  /switchport-templates/{slug}
                                      DELETE /switchport-templates/{slug}
```

The backend also does not yet report whether a device carries
`bnc-state: manage`. The frontend reads an optional `manageable` boolean on the
device schema; until it is populated, no device is treated as pushable.

With `VITE_MOCK_UNIMPLEMENTED=true` (the default) the real endpoints are used
where they exist and the rest fall back to the mock, so the two can be wired up
incrementally.

## Project layout

```
src/
  api/          transport, typed endpoint modules, mock backend
  components/   reusable UI (modal, forms, badges, site switcher)
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
