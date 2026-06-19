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

export default function CertbotModal({ registration, onClose }) {
  const { username, password, fulldomain, subdomain, domain, allowfrom } = registration

  const credentialsJson = JSON.stringify({
    [domain]: { username, password: password || '<password>', fulldomain, subdomain, allowfrom: allowfrom || [] }
  }, null, 2)

  const credentialsFile = `acmedns-${domain}.json`

  const certbotCmd = [
    'certbot certonly \\',
    '  --authenticator dns-acmedns \\',
    `  --dns-acmedns-credentials ./${credentialsFile} \\`,
    '  --config-dir . --work-dir . --logs-dir . \\',
    `  -d ${domain} -d '*.${domain}'`,
  ].join('\n')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Generate Certificate — Certbot</h2>
            <p className="text-xs text-gray-500 mt-0.5">{domain}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5">
          <Step number="1" title="Install the acme-dns plugin">
            <CodeBlock code="pip install certbot-dns-acmedns" />
          </Step>

          <Step number="2" title="Save your credentials file">
            <p className="text-xs text-gray-500 pl-7">Save this as <span className="font-mono">{credentialsFile}</span> in your working directory</p>
            {!password && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 ml-7">
                Password not saved — re-open this registration's details and use "Download acmedns.json" to get the correct credentials.
              </p>
            )}
            <div className="pl-7">
              <CodeBlock code={credentialsJson} />
            </div>
          </Step>

          <Step number="3" title="Run certbot">
            <div className="pl-7">
              <CodeBlock code={certbotCmd} />
            </div>
            <p className="text-xs text-gray-400 pl-7">
              This requests certificates for both <span className="font-mono">{domain}</span> and <span className="font-mono">*.{domain}</span>. Remove the wildcard if you don't need it.
            </p>
          </Step>
        </div>
      </div>
    </div>
  )
}
