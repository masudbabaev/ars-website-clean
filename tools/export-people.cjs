// Read the existing profile source without executing DOM or network code.
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'script.js'), 'utf8');
const start = source.indexOf('const translations =');
const end = source.indexOf('\ndocument.querySelectorAll(".brand")', start);
if (start < 0 || end < 0) throw Error('Profile source boundary missing');
const data = vm.runInNewContext(source.slice(start, end) + `\nObject.fromEntries(Object.entries(profiles).map(([id,p]) => [id, {...p, role: {az: translations.az[p.roleKey], en: translations.en[p.roleKey]}, linkLabels: Object.fromEntries((p.links||[]).map(l => [l.labelKey, {az: translations.az[l.labelKey], en: translations.en[l.labelKey]}]))}]))`, {}, {timeout: 1000});
process.stdout.write(JSON.stringify(data));
