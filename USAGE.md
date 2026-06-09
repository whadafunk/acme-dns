# acme-dns Usage Guide

## Registration

Each domain (or wildcard) that needs ACME DNS-01 validation requires its own registration. A registration creates a dedicated subdomain under `acme.upsigma.cc` and returns credentials used for challenge updates.

### Basic registration

```bash
curl -s -X POST http://localhost:8053/register | python3 -m json.tool
```

Example response:

```json
{
    "username": "a59d6a2c-1b3e-4f7a-9c8d-2e5f6b7a8c9d",
    "password": "Bx7kP2mNqR9vT4wL6yZ8uA3cD5eF1gH0",
    "fulldomain": "a59d6a2c-1b3e-4f7a-9c8d-2e5f6b7a8c9d.acme.upsigma.cc",
    "subdomain": "a59d6a2c-1b3e-4f7a-9c8d-2e5f6b7a8c9d",
    "allowfrom": []
}
```

Save all four values — you will need them when configuring your ACME client.

### Registration with IP allowlist

To restrict which IPs are permitted to call the update endpoint for this account, pass an `allowfrom` list at registration time. Accepts individual IPs and CIDR ranges.

```bash
curl -s -X POST http://localhost:8053/register \
  -H "Content-Type: application/json" \
  -d '{"allowfrom": ["192.168.1.0/24", "10.0.0.5/32"]}' \
  | python3 -m json.tool
```

The `allowfrom` restriction is set once at registration and cannot be changed afterward. If you need different restrictions, register again and create a new CNAME.

---

## The ACME CNAME record

After registration, create a CNAME in your DNS that points the ACME challenge subdomain for your domain to the `fulldomain` returned by registration:

```
_acme-challenge.<your-domain>.  CNAME  <fulldomain>.
```

### Examples

| Domain you want a cert for | CNAME to add |
|---|---|
| `example.com` | `_acme-challenge.example.com CNAME a59d6a2c-….acme.upsigma.cc.` |
| `*.example.com` | `_acme-challenge.example.com CNAME a59d6a2c-….acme.upsigma.cc.` |
| `api.example.com` | `_acme-challenge.api.example.com CNAME a59d6a2c-….acme.upsigma.cc.` |

Note that a wildcard cert (`*.example.com`) and the apex cert (`example.com`) share the same CNAME record at `_acme-challenge.example.com`. You can request both with a single registration.

---

## Multiple domains

Each distinct domain (or subdomain) that you want a certificate for needs its own registration and its own CNAME, because each gets a separate `_acme-challenge` TXT record written during validation.

```
# Register once per domain
curl -s -X POST http://localhost:8053/register | python3 -m json.tool  # for example.com
curl -s -X POST http://localhost:8053/register | python3 -m json.tool  # for api.example.com
curl -s -X POST http://localhost:8053/register | python3 -m json.tool  # for shop.example.com

# Then add a CNAME for each
_acme-challenge.example.com     CNAME  <fulldomain-1>.acme.upsigma.cc.
_acme-challenge.api.example.com CNAME  <fulldomain-2>.acme.upsigma.cc.
_acme-challenge.shop.example.com CNAME <fulldomain-3>.acme.upsigma.cc.
```

---

## Wildcard certificates

Wildcard certs (`*.example.com`) require a DNS-01 challenge — they cannot be issued via HTTP-01. acme-dns is ideal for this use case.

The challenge record is always placed at `_acme-challenge.<apex>`, regardless of whether you are requesting `*.example.com` or `example.com`. One registration and one CNAME covers both:

```
_acme-challenge.example.com CNAME <fulldomain>.acme.upsigma.cc.
```

Your ACME client can then request a SAN certificate covering both `example.com` and `*.example.com` in a single request.

---

## Updating a challenge (manual / debugging)

ACME clients do this automatically, but you can also push a TXT value manually to verify your setup:

```bash
curl -s -X POST http://localhost:8053/update \
  -H "X-Api-User: <username>" \
  -H "X-Api-Key: <password>" \
  -H "Content-Type: application/json" \
  -d '{"subdomain": "<subdomain>", "txt": "test-value-1234567890123456789012"}' \
  | python3 -m json.tool
```

The `txt` value must be exactly 43 characters (standard ACME challenge token length). A successful update returns HTTP 200 with `{"txt": "..."}`.

Then verify propagation:

```bash
dig TXT _acme-challenge.your-domain.com
# Should show a CNAME pointing to acme.upsigma.cc, then the TXT value
```

---

## ACME client configuration

Most clients support acme-dns natively or via a plugin. Store the credentials from `/register` in the format your client expects.

### certbot (acme-dns-certbot plugin)

```ini
# /etc/letsencrypt/acmedns.json
{
  "your-domain.com": {
    "username": "<username>",
    "password": "<password>",
    "fulldomain": "<fulldomain>",
    "subdomain": "<subdomain>",
    "allowfrom": []
  }
}
```

```bash
certbot certonly \
  --authenticator dns-acme-dns \
  --dns-acme-dns-credentials /etc/letsencrypt/acmedns.json \
  -d example.com -d '*.example.com'
```

### Lego

```bash
ACME_DNS_API_BASE=http://your-server:8053 \
ACME_DNS_STORAGE_PATH=/etc/lego/acmedns.json \
lego --dns acme-dns --domains example.com --domains '*.example.com' \
  --email admin@example.com run
```

---

## Health check

```bash
curl -s http://localhost:8053/health
# Returns HTTP 200 with no body if the service is up
```
