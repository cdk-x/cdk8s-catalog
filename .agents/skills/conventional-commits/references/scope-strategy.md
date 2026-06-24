# Scope Strategy Guide

Detailed guidance for choosing scopes based on repository type. This reference is loaded on demand when the agent needs help mapping files to scopes.

Scopes come from three sources: the repo description (`AGENTS.md` / `claude.md`), directory names, or the user. This guide helps when none of those are clear.

## Table of Contents

1. [Monorepo with Package Manager Workspaces](#monorepo-with-package-manager-workspaces)
2. [Monorepo with Nx / Turborepo / Lerna](#monorepo-with-nx--turborepo--lerna)
3. [Single-Package Application](#single-package-application)
4. [Library / SDK](#library--sdk)
5. [Microservices Repo](#microservices-repo)
6. [Simple / Small Repo](#simple--small-repo)
7. [Scope Naming Conventions](#scope-naming-conventions)

---

## Monorepo with Package Manager Workspaces

**Detection:** `package.json` has a `workspaces` field, or `pnpm-workspace.yaml` exists.

**Strategy:** Each workspace package becomes a scope. The scope name matches the package directory name (not the npm package name).

```
my-monorepo/
├── packages/
│   ├── auth/          → scope: auth
│   ├── api/           → scope: api
│   ├── shared/        → scope: shared
│   └── ui/            → scope: ui
├── package.json       → scope: repo
└── .github/           → scope: repo (or ci)
```

**Auto-discovery:** The script detects `packages/` and maps each subdirectory to a scope. Root-level files get scope `repo`.

**Why scopes matter here:** In a monorepo, scopes are essential for understanding which package a commit affects. Without them, changelogs and `git log --grep` become much less useful.

---

## Monorepo with Nx / Turborepo / Lerna

**Detection:** `nx.json`, `turbo.json`, or `lerna.json` exists at the root.

**Strategy:** Same as workspaces, but projects may live in `apps/` and `libs/` (Nx convention) or `packages/` (Turborepo/Lerna).

```
nx-workspace/
├── apps/
│   ├── web/           → scope: web
│   └── mobile/        → scope: mobile
├── libs/
│   ├── core/          → scope: core
│   ├── ui/            → scope: ui
│   └── testing/       → scope: testing
├── tools/
│   └── generators/    → scope: tools (or generators)
├── nx.json            → scope: repo
└── .github/           → scope: repo
```

**Tip:** Use `nx show projects` or inspect `project.json` / `workspace.json` to get the canonical project list. This is more reliable than scanning directories because Nx projects can have custom names.

---

## Single-Package Application

**Detection:** Single `package.json` at root, `src/` directory with feature modules.

**Strategy:** Use top-level directories inside `src/` as scopes. Only go one level deep — don't create scopes for every sub-directory.

```
my-app/
├── src/
│   ├── auth/          → scope: auth
│   ├── payments/      → scope: payments
│   ├── users/         → scope: users
│   ├── database/      → scope: database
│   ├── middleware/     → scope: middleware
│   └── main.ts        → scope: app (or no scope)
├── test/              → scope matches the module being tested
├── package.json       → scope: repo
└── Dockerfile         → scope: repo (or docker)
```

**Auto-discovery:** The script detects `src/` subdirectories as scopes. Root-level files get scope `repo`.

**Tip:** Single-package apps often have cross-cutting changes (e.g., a migration that touches `database/` and `users/`). In those cases, omit the scope or split the commit — both are fine.

---

## Library / SDK

**Detection:** Single package published to a registry, with `src/` or `lib/` containing the library code.

**Strategy:** Scopes map to major feature areas of the library. If the library is small, scope by layer (API, internals, types).

```
my-library/
├── src/
│   ├── client/        → scope: client
│   ├── server/        → scope: server
│   ├── types/         → scope: types
│   └── index.ts       → scope: (no scope or lib name)
├── examples/          → scope: examples
├── docs/              → scope: docs
└── package.json       → scope: repo
```

**For very small libraries** (< 10 files), scopes may not add value. In that case, omit them or use just 2-3 broad scopes.

---

## Microservices Repo

**Detection:** Multiple service directories, each with their own Dockerfile or deployment config.

**Strategy:** Each service is a scope. Shared infrastructure gets its own scope.

```
platform/
├── services/
│   ├── auth-service/      → scope: auth-service
│   ├── billing-service/   → scope: billing-service
│   └── gateway/           → scope: gateway
├── infra/
│   ├── terraform/         → scope: infra
│   └── k8s/               → scope: infra
├── shared/
│   └── proto/             → scope: proto (or shared)
└── docker-compose.yml     → scope: repo
```

---

## Simple / Small Repo

**Detection:** Few files, no clear module structure, single-purpose project.

**Strategy:** Scopes are optional. If used at all, keep them minimal:

- **`app`** — application code
- **`config`** — configuration files
- **`docs`** — documentation

Or just don't use scopes at all. A clean commit history with good types and subjects is more valuable than forced scopes on a 5-file repo.

```
# Both are perfectly fine:
feat: add dark mode toggle
feat(ui): add dark mode toggle
```

---

## Scope Naming Conventions

| Rule | Good | Bad |
|------|------|-----|
| Lowercase, no spaces | `auth-service` | `Auth Service` |
| Kebab-case for multi-word | `user-profile` | `userProfile`, `user_profile` |
| Short but descriptive | `auth` | `authentication-and-authorization` |
| Match the directory name | `api` (for `packages/api/`) | `backend` (when dir is `api/`) |
| Avoid generic names | `payments`, `billing` | `module1`, `feature` |
| Consistent depth | All scopes at same level | Mix of `auth` and `auth-login-oauth` |
