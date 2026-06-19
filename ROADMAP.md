# acme-dns Roadmap

## Current State

Private/internal deployment. GUI frontend at `https://acme.home.lan`, acme-dns API at `http://acme.upsigma.cc:80`. The GUI backend proxies all acme-dns API calls server-side, so the browser never talks to acme-dns directly.

## Architecture Notes

- **GUI frontend → GUI backend (Node.js) → acme-dns API**: all acme-dns calls are server-side proxied. The browser never directly calls acme-dns.
- **`corsorigins` in config.cfg**: configures CORS on the acme-dns API. Has no practical effect in the current setup because nothing calls acme-dns from a browser. Left in config for completeness.
- **`/update` endpoint**: already credential-protected via `X-Api-User` / `X-Api-Key` headers.
- **`/register` endpoint**: open, no credentials required. Currently safe because the server is on a private network.

---

## Public Service Roadmap

### P0 — Required before going public

- [ ] **TLS on acme-dns API** — enable `tls = "letsencrypt"` in `config.cfg`. Credentials travel in headers; plaintext HTTP is not acceptable publicly.
- [ ] **Rate limiting on `/register`** — acme-dns has no built-in rate limiting. Anyone can bulk-register accounts and fill the database/DNS zone. Implement at the reverse proxy level (nginx `limit_req`, Cloudflare rules, etc.).
- [ ] **GUI authentication** — the GUI is an admin interface and should not be publicly reachable. Put it behind basic auth or a proper login system.

### P1 — Important hardening

- [ ] **`disable_registration` kill switch** — establish an operational procedure to flip this off quickly if `/register` abuse is detected.
- [ ] **Encourage `allowfrom` on registrations** — document and surface in the GUI that users should set `allowfrom` to their server's IP. This prevents `/update` calls from arbitrary IPs even with valid credentials.
- [ ] **Abuse monitoring** — log and alert on registration rate spikes, failed update attempts, etc.

### P2 — Nice to have

- [ ] **HSTS** — enable `hsts_enabled = true` once TLS is stable.
- [ ] **User-facing documentation** — public landing page explaining how to use the service with certbot/acme.sh/lego (can reuse the modal content from the GUI).
- [ ] **Invite-only registration** — optionally gate `/register` behind a token to control growth before fully opening up.
