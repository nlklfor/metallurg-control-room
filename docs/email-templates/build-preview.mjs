// Renders every *.html template in this folder with sample values into
// _preview.html for eyeballing. Run: node docs/email-templates/build-preview.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

const SAMPLE = {
  "{{ .Email }}": "mtllrg@proton.me",
  "{{ .NewEmail }}": "new-address@proton.me",
  "{{ .Token }}": "048213",
  "{{ .ConfirmationURL }}":
    "https://control.metallurg.store/auth/callback?token=pkce_9f2c1b7ee4a0&type=magiclink",
  "{{ .SiteURL }}": "https://control.metallurg.store",
  "{{ .RedirectTo }}": "https://control.metallurg.store/",
};

const render = (html) =>
  Object.entries(SAMPLE).reduce(
    (acc, [k, v]) => acc.split(k).join(v),
    html,
  );

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".html") && f !== "_preview.html")
  .sort();

const frames = files
  .map((f) => {
    const rendered = render(readFileSync(join(dir, f), "utf8"))
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
    return `<section>
    <h2>${f}</h2>
    <iframe title="${f}" srcdoc="${rendered}"></iframe>
  </section>`;
  })
  .join("\n");

const page = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>METALLURG auth email templates — preview</title>
<style>
  body{margin:0;background:#d4d4d4;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#0a0a0a}
  header{padding:20px 24px;background:#0a0a0a;color:#fff}
  header b{letter-spacing:.04em}
  header span{color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:.2em;margin-left:10px}
  section{max-width:680px;margin:28px auto;padding:0 16px}
  h2{font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;text-transform:uppercase;letter-spacing:.15em;color:#6b7280;margin:0 0 10px}
  iframe{width:100%;height:760px;border:1px solid #0a0a0a;background:#e5e5e5;display:block}
</style></head>
<body>
<header><b>METALLURG</b><span>auth email templates — sample data, local preview only</span></header>
${frames}
</body></html>`;

writeFileSync(join(dir, "_preview.html"), page);
console.log(`Wrote _preview.html (${files.length} templates)`);
