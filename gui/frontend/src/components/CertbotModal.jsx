import React, { useState } from 'react'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-xs text-blue-400 hover:text-blue-200 font-medium shrink-0">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function CodeBlock({ code }) {
  return (
    <div className="bg-gray-900 rounded-lg px-4 py-3 font-mono text-sm text-green-400 flex items-start justify-between gap-4">
      <pre className="whitespace-pre-wrap break-all flex-1">{code}</pre>
      <CopyButton text={code} />
    </div>
  )
}

function Step({ number, title, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{number}</span>
        <p className="text-sm font-medium text-gray-800">{title}</p>
      </div>
      {children}
    </div>
  )
}

function DownloadButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
    >
      {label}
    </button>
  )
}

export default function CertbotModal({ registration, onClose }) {
  const { username, password, fulldomain, subdomain, domain, allowfrom } = registration
  const [tab, setTab] = useState('certbot')

  const acmednsBase = `http://${fulldomain.split('.').slice(1).join('.')}`
  const jsonFile = `acmedns-${domain}.json`
  const iniFile = `acmedns-${domain}.ini`

  const jsonContent = JSON.stringify({
    [domain]: { username, password: password || '<password>', fulldomain, subdomain, allowfrom: allowfrom || [] }
  }, null, 2)

  const iniContent = [
    `dns_acmedns_api_url = ${acmednsBase}`,
    `dns_acmedns_registration_file = ./${jsonFile}`,
  ].join('\n')

  const certbotCmd = [
    `chmod 600 ${jsonFile} ${iniFile}`,
    'certbot certonly \\',
    '  --authenticator dns-acmedns \\',
    `  --dns-acmedns-credentials ./${iniFile} \\`,
    '  --config-dir . --work-dir . --logs-dir . \\',
    `  -d ${domain} -d '*.${domain}'`,
  ].join('\n')

  const acmeshCmd = [
    `ACMEDNS_UPDATE_URL="${acmednsBase}/update" \\`,
    `ACMEDNS_USERNAME="${username}" \\`,
    `ACMEDNS_PASSWORD="${password || '<password>'}" \\`,
    `ACMEDNS_SUBDOMAIN="${subdomain}" \\`,
    `acme.sh --issue --dns dns_acmedns -d ${domain} -d '*.${domain}'`,
  ].join('\n')

  const legoCmd = [
    `ACME_DNS_STORAGE_PATH=./${jsonFile} \\`,
    `lego --dns acme-dns --email <your-email> \\`,
    `  --domains ${domain} --domains '*.${domain}' run`,
  ].join('\n')

  const hookScript = `#!/usr/bin/env python
import json
import os
import requests
import sys

ACMEDNS_URL = "${acmednsBase}"
STORAGE_PATH = "./${jsonFile}"
ALLOW_FROM = ${JSON.stringify(allowfrom || [])}
FORCE_REGISTER = False

DOMAIN = os.environ["CERTBOT_DOMAIN"]
if DOMAIN.startswith("*."):
    DOMAIN = DOMAIN[2:]
VALIDATION_DOMAIN = "_acme-challenge." + DOMAIN
VALIDATION_TOKEN = os.environ["CERTBOT_VALIDATION"]


class AcmeDnsClient(object):
    def __init__(self, acmedns_url):
        self.acmedns_url = acmedns_url

    def register_account(self, allowfrom):
        if allowfrom:
            res = requests.post(self.acmedns_url + "/register",
                                data=json.dumps({"allowfrom": allowfrom}))
        else:
            res = requests.post(self.acmedns_url + "/register")
        if res.status_code == 201:
            return res.json()
        print("Registration failed: HTTP {} {}".format(res.status_code, res.text))
        sys.exit(1)

    def update_txt_record(self, account, txt):
        update = {"subdomain": account["subdomain"], "txt": txt}
        headers = {"X-Api-User": account["username"],
                   "X-Api-Key": account["password"],
                   "Content-Type": "application/json"}
        res = requests.post(self.acmedns_url + "/update",
                            headers=headers, data=json.dumps(update))
        if res.status_code != 200:
            print("Update failed: HTTP {} {}".format(res.status_code, res.text))
            sys.exit(1)


class Storage(object):
    def __init__(self, storagepath):
        self.storagepath = storagepath
        self._data = self.load()

    def load(self):
        try:
            with open(self.storagepath, "r") as fh:
                return json.loads(fh.read())
        except IOError:
            if os.path.isfile(self.storagepath):
                print("ERROR: Storage file exists but cannot be read")
                sys.exit(1)
        except ValueError:
            print("ERROR: Storage JSON is corrupted")
            sys.exit(1)
        return {}

    def save(self):
        try:
            with os.fdopen(os.open(self.storagepath,
                                   os.O_WRONLY | os.O_CREAT, 0o600), "w") as fh:
                fh.truncate()
                fh.write(json.dumps(self._data))
        except IOError:
            print("ERROR: Could not write storage file.")
            sys.exit(1)

    def put(self, key, value):
        if key.startswith("*."):
            key = key[2:]
        self._data[key] = value

    def fetch(self, key):
        return self._data.get(key)


if __name__ == "__main__":
    client = AcmeDnsClient(ACMEDNS_URL)
    storage = Storage(STORAGE_PATH)

    account = storage.fetch(DOMAIN)
    if FORCE_REGISTER or not account:
        account = client.register_account(ALLOW_FROM)
        storage.put(DOMAIN, account)
        storage.save()
        cname = "{} CNAME {}.".format(VALIDATION_DOMAIN, account["fulldomain"])
        print("Add this CNAME record:\\n{}".format(cname))

    client.update_txt_record(account, VALIDATION_TOKEN)
`

  const hookCmd = [
    'chmod +x acme-dns-auth.py',
    'certbot certonly \\',
    '  --manual \\',
    '  --manual-auth-hook ./acme-dns-auth.py \\',
    '  --preferred-challenges dns \\',
    '  --config-dir . --work-dir . --logs-dir . \\',
    `  -d ${domain} -d '*.${domain}'`,
  ].join('\n')

  function download(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
  }

  const noPassword = !password

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Generate Certificate</h2>
            <p className="text-xs text-gray-500 mt-0.5">{domain}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 flex gap-4 border-b border-gray-100 shrink-0">
          {['certbot', 'acme.sh', 'lego', 'hook'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {noPassword && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              Password not saved — download credentials from the registration details to get the correct files.
            </p>
          )}

          {tab === 'certbot' && <>
            <Step number="1" title="Install the acme-dns plugin">
              <div className="pl-7">
                <CodeBlock code="pip install certbot-dns-acmedns" />
              </div>
            </Step>

            <Step number="2" title="Download credentials files">
              <p className="text-xs text-gray-500 pl-7">Save both files in the same directory, then run the command below from that directory.</p>
              <div className="pl-7 flex gap-2">
                <DownloadButton label={`↓ ${jsonFile}`} onClick={() => download(jsonContent, jsonFile, 'application/json')} />
                <DownloadButton label={`↓ ${iniFile}`} onClick={() => download(iniContent, iniFile)} />
              </div>
            </Step>

            <Step number="3" title="Run certbot">
              <div className="pl-7">
                <CodeBlock code={certbotCmd} />
              </div>
              <p className="text-xs text-gray-400 pl-7">
                Requests a cert for <span className="font-mono">{domain}</span> and <span className="font-mono">*.{domain}</span>. Remove the wildcard if you don't need it.
              </p>
            </Step>
          </>}

          {tab === 'acme.sh' && <>
            <Step number="1" title="Install acme.sh">
              <div className="pl-7">
                <CodeBlock code="curl https://get.acme.sh | sh" />
              </div>
            </Step>

            <Step number="2" title="Issue the certificate">
              <div className="pl-7">
                <CodeBlock code={acmeshCmd} />
              </div>
              <p className="text-xs text-gray-400 pl-7">
                All credentials are inlined. Cert is saved to <span className="font-mono">~/.acme.sh/{domain}/</span>. Renewal is set up automatically via cron.
              </p>
            </Step>
          </>}

          {tab === 'lego' && <>
            <Step number="1" title="Install lego">
              <div className="pl-7">
                <CodeBlock code="brew install lego" />
              </div>
            </Step>

            <Step number="2" title="Download credentials file">
              <div className="pl-7 flex gap-2">
                <DownloadButton label={`↓ ${jsonFile}`} onClick={() => download(jsonContent, jsonFile, 'application/json')} />
              </div>
            </Step>

            <Step number="3" title="Issue the certificate">
              <div className="pl-7">
                <CodeBlock code={legoCmd} />
              </div>
              <p className="text-xs text-gray-400 pl-7">
                Replace <span className="font-mono">&lt;your-email&gt;</span> with your email. Cert is saved to <span className="font-mono">./.lego/certificates/</span>.
              </p>
            </Step>
          </>}
          {tab === 'hook' && <>
            <Step number="1" title="Download the auth hook script">
              <p className="text-xs text-gray-500 pl-7">Pre-filled with your registration credentials and acme-dns URL.</p>
              <div className="pl-7 flex gap-2">
                <DownloadButton label="↓ acme-dns-auth.py" onClick={() => download(hookScript, 'acme-dns-auth.py')} />
                <DownloadButton label={`↓ ${jsonFile}`} onClick={() => download(jsonContent, jsonFile, 'application/json')} />
              </div>
            </Step>

            <Step number="2" title="Run certbot">
              <p className="text-xs text-gray-500 pl-7">Keep both files in the same directory and run from there.</p>
              <div className="pl-7">
                <CodeBlock code={hookCmd} />
              </div>
              <p className="text-xs text-gray-400 pl-7">
                No plugin needed — certbot calls the script directly to fulfill the DNS challenge.
              </p>
            </Step>
          </>}
        </div>
      </div>
    </div>
  )
}
