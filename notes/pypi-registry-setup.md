# Registering a new library on PyPI (Trusted Publisher)

We publish to PyPI via [Trusted Publisher](https://docs.pypi.org/trusted-publishers/)
(OIDC) — no `TWINE_USERNAME`/`TWINE_PASSWORD` secret to store or rotate.
`.github/workflows/release.yml`'s `publish-pypi` job sets
`PYPI_TRUSTED_PUBLISHER: "1"` and `permissions.id-token: write`, and
`publib-pypi` handles the OIDC token exchange.

Every library needs **two manual, one-time registrations** before its first
release: a PyPI "pending publisher" and a matching GitHub Environment. This
doesn't get easier at library #50 than at library #1 — PyPI ties a pending
publisher to one project name, so there is no way to batch-register several
libraries at once.

## Why a GitHub Environment per library

PyPI matches a Trusted Publisher against the tuple (owner, repo, workflow
filename, **environment**). Every library in this catalog shares the same
repo and the same workflow file (`release.yml`), so **environment name is
the only field left to tell libraries apart**. Registering two PyPI projects
with the same environment name fails with:

> A pending trusted publisher matching this configuration has already been
> registered for a different project name.

That's why `publish-pypi` uses `environment: pypi-${{ matrix.pkg.name }}` —
each library gets its own environment, named `pypi-<folder-name>`.

## Fields to fill in on pypi.org

Go to <https://pypi.org/manage/account/publishing/> (account-level "Add a
new pending publisher" — used because the project doesn't exist on PyPI
yet).

| Field | Value | Where it comes from |
| --- | --- | --- |
| PyPI Project Name | e.g. `cdk8s-catalog-metric-server` | `packages/<lib>/package.json` → `jsii.targets.python.distName` |
| Owner | `cdk-x` | GitHub org |
| Repository name | `cdk8s-catalog` | this repo |
| Workflow filename | `release.yml` | always this file, for every library |
| Environment name | `pypi-<folder-name>` (e.g. `pypi-metric-server`) | the `packages/<folder-name>` directory name — **must be unique per library**, see above |

Note: PyPI **Project Name** (`cdk8s-catalog-metric-server`) is what you
`pip install`; the `jsii.targets.python.module` field
(`cdk8s_catalog_metric_server`) is what you `import` in Python — different
values, don't confuse them when filling in the form.

## GitHub-side setup

1. Repo Settings → Environments → New environment → name it **exactly**
   `pypi-<folder-name>` (must match what you typed on PyPI, including the
   `pypi-` prefix).
2. No secrets needed in the environment — Trusted Publisher is secret-free.
   Optionally add protection rules (required reviewers, branch restriction)
   if you want an extra gate before a release can publish.
3. Nothing else to do in the workflow itself — `publish-pypi`
   (`.github/workflows/release.yml`) already discovers every library
   dynamically via `tools/list-release-projects.mjs` and fans out one job
   run per package. Adding a library never requires editing the workflow.

## Checklist for a new library

- [ ] Confirm `packages/<lib>/package.json` has `jsii.targets.python.distName`
      and `.module` set.
- [ ] Register a pending publisher on
      <https://pypi.org/manage/account/publishing/> with the table above.
- [ ] Create the matching GitHub Environment (`pypi-<folder-name>`).
- [ ] First release: until the project exists on PyPI, pass `first_release`
      when triggering the workflow (see `.github/workflows/release.yml`
      inputs).
