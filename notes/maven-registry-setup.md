# Registering on Maven Central

We publish via `publib-maven`, using the new **Central Publisher Portal**
(`MAVEN_SERVER_ID=central-ossrh` in `.github/workflows/release.yml` — the
old `ossrh`/Nexus endpoint stopped working in July 2025).

Unlike PyPI, Maven Central registration is **per namespace (groupId), not
per package**. Verify `com.cdk-x` once, and every current and future
artifactId under it (`cdk8s-catalog-core`, `cdk8s-catalog-metric-server`,
...) can be published with no further manual registration — a big
difference from the PyPI checklist in `notes/pypi-registry-setup.md`.

## Why the groupId is `com.cdk-x`, not `io.github.cdkx`

Maven Central offers two namespace-verification paths:

- **`io.github.<username>`**: verified automatically by creating a public
  repo under that *exact* GitHub account.
- **A domain you own, reversed** (e.g. `com.cdk-x` for `cdk-x.com`):
  verified via a DNS TXT record.

We originally used `io.github.cdkx`, but the GitHub account `cdkx` (no
hyphen) turned out to belong to an unrelated third party — Java package
identifiers can't contain hyphens, so `io.github.cdk-x` (matching our real
org name) was never an option either. Since the org owns `cdk-x.com`, we
switched to the domain-verification path instead: `com.cdk-x`.

Note the resulting split in `package.json`'s `jsii.targets.java` block —
`maven.groupId` (the Maven coordinate, hyphens allowed) differs slightly
from `package` (the generated Java package name, must be a valid Java
identifier, no hyphen):

```json
"java": {
  "package": "com.cdkx.cdk8scatalog.core",
  "maven": { "groupId": "com.cdk-x", "artifactId": "cdk8s-catalog-core" }
}
```

`maven.groupId` must match the verified namespace exactly — that's the
value Sonatype checks on publish. `package` is just internal code
organization and is free to differ.

## One-time setup

1. Sign in at <https://central.sonatype.com/> (GitHub login works).
2. Account → **Namespaces** → Add Namespace → `com.cdk-x`.
3. Add the DNS TXT record Sonatype gives you to `cdk-x.com`'s DNS, wait for
   propagation, click Verify.
4. Account → **Generate User Token** → gives a username/password pair
   (distinct from your login) → store as GitHub secrets `MAVEN_USERNAME` /
   `MAVEN_PASSWORD`.
5. Generate a GPG key (Maven Central requires all artifacts signed).
   Real name / email are just an identity label on the key — use something
   attributable to the project, not a personal identity, e.g. real name
   `cdk-x`, email `team@cdk-x.com`, so the key isn't tied to one person and
   is easy to hand off later.
   ```sh
   brew install gnupg
   gpg --full-generate-key                       # RSA and RSA, 4096, no expiration, set a passphrase
   gpg -a --export <fingerprint> > public.pem
   gpg -a --export-secret-keys <fingerprint> > private.pem
   ```
   The fingerprint is the long hex string under the `pub` line (`gpg
   --list-secret-keys --keyid-format LONG` to see it again — it's under
   `sec`) — **not** the one under `sub`, that's a separate encryption
   subkey.

   Store `private.pem`'s contents as `MAVEN_GPG_PRIVATE_KEY`, the passphrase
   as `MAVEN_GPG_PRIVATE_KEY_PASSPHRASE`.

   **Upload the public key** (`public.pem`'s contents, the
   `-----BEGIN PGP PUBLIC KEY BLOCK-----` block) to a public keyserver —
   this is required, not optional: Sonatype validates signed artifacts by
   looking up the public key by fingerprint, so if it isn't discoverable
   there, publishing fails. Submitted to both for redundancy:
   - <https://keyserver.ubuntu.com/> ("Submit Key")
   - <https://keys.openpgp.org/> (also asks to confirm the email by link,
     doesn't block the key itself being searchable)

   The public key is public by design — it does **not** go into GitHub
   secrets, only the keyservers above.
6. Add the four secrets to the repo (Settings → Secrets and variables →
   Actions): `MAVEN_USERNAME`, `MAVEN_PASSWORD`, `MAVEN_GPG_PRIVATE_KEY`,
   `MAVEN_GPG_PRIVATE_KEY_PASSPHRASE`.

No OIDC/Trusted Publisher option exists for Maven Central today (unlike
PyPI) — these are long-lived secrets, so treat them accordingly (rotate the
user token periodically, keep the GPG key backed up somewhere safe).

## Adding a new library

Nothing to do here once the namespace is verified — just make sure the new
library's `package.json` sets `jsii.targets.java.maven.groupId` to
`com.cdk-x` (matching every other library) and a unique `artifactId`. No
per-package Maven Central registration step, unlike PyPI.
