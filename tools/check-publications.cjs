const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const people = JSON.parse(require('node:child_process').execFileSync('node', [path.join(__dirname, 'export-people.cjs')]));
const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const render = source.slice(source.indexOf('function renderProfile('), source.indexOf('\nlet profileTrigger'));
function element() {
  return { children: [], textContent: '', append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; }, parentElement: {} };
}
const counts = {verified: 0, pending: 0, supplied: 0};
for (const language of ['az', 'en']) {
  for (const [id, person] of Object.entries(people)) {
    const list = element();
    const context = { profiles: people, document: {documentElement: {lang: language}, createElement: element, dispatchEvent() {}}, translations: {az: {}, en: {}}, CustomEvent: function(){}, profileDialog: {}, profileImage: {}, profileName: {}, profileRole: {}, profileBio: element(), profileInterests: element(), profileLinks: element(), profilePublications: list, profilePublicationsSection: {}, makeProfileLink: element, makeExternalLink(text, href) { return {textContent: text, href}; } };
    vm.runInNewContext(render + '\nrenderProfile(' + JSON.stringify(id) + ');', context);
    assert.equal(list.children.length, (person.publications || []).length);
    for (const [i, pub] of (person.publications || []).entries()) {
      if (language === 'en') counts[pub.verification]++;
      const card = list.children[i];
      assert(card.children[0].textContent.length > 0);
      assert(!card.children[0].textContent.startsWith('DOI '));
      if (pub.title) assert.equal(card.children[0].textContent, pub.title);
      const links = card.children[2].children.filter(x => x.href);
      assert.equal(links.length, pub.suppressDoi ? 0 : 1);
      if (pub.note) assert.equal(card.children[3].textContent, pub.note[language]);
      if (pub.verification === 'verified') assert(pub.source && pub.title);
      const html = fs.readFileSync(path.join(root, 'people', id, 'index.html'), 'utf8');
      assert(html.includes('publication-title'));
      assert(!html.includes('class="publication-title">DOI '));
    }
  }
}
const html = fs.readFileSync(path.join(root, 'people.html'), 'utf8');
for (const [page, role, count] of [['scientific-board.html', true, 15], ['executive-board.html', false, 7]]) {
  const start = html.indexOf('<a class="choice-card reveal" href="' + page + '">');
  const preview = html.slice(start, html.indexOf('</a>', start));
  assert.equal((preview.match(/<img /g) || []).length, count);
  for (const person of Object.values(people).filter(p => ['roleAdvisory', 'roleAdvisoryHead'].includes(p.roleKey) === role)) assert(preview.includes(person.image));
}
assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),20);
assert.equal(counts.pending + counts.supplied, 0);
console.log('Passed bilingual drawer rendering, 20 verified records only, DOI link counts, static profiles, 15 Scientific and 7 Executive preview portraits.', counts);
