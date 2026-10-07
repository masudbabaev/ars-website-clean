/* Progressive enhancements for the generated Projects system. */
(() => {
  'use strict';
  const projects = window.ARS_PROJECTS || [];
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const lang = () => document.documentElement.lang === 'en' ? 'en' : 'az';
  const txt = (az,en) => lang() === 'en' ? en : az;
  const local = (x) => typeof x === 'string' ? x : x?.[lang()] || '';
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = (s) => String(s).toLocaleLowerCase(lang() === 'az' ? 'az' : 'en').normalize('NFKD').replace(/\p{M}/gu,'');
  const bilingual = (v, tag='span') => `<${tag} data-az="${esc(v.az)}" data-en="${esc(v.en)}">${esc(local(v))}</${tag}>`;
  const purl = p => `/projects/${p.slug}/`;
  const assigned = id => projects.filter(p => p.team.some(t => t.person === id));
  let view = new URLSearchParams(location.search).get('view') === 'network' ? 'network' : 'list';
  let matched = projects;
  const translate = (root = document) => window.ARS_TRANSLATE(root);
  function filterProjects(updateURL = false) {
    if (!$('#project-list')) return;
    const q = $('#project-search').value.trim();
    const status = $('#project-status').value, field = $('#project-field').value;
    const role = $('#project-role').value, institution = $('#project-institution').value;
    matched = projects.filter(p => (!status || p.status === status) && (!field || p.fields.includes(field)) && (!role || (p.open_roles||[]).some(r => r.title.en === role)) && (!institution || (p.institutions||[]).includes(institution)) && (!q || norm([p.title.az,p.title.en,p.question.az,p.question.en,...p.team.map(t => profiles[t.person]?.name || ''),...(p.open_roles||[]).flatMap(r=>[r.title.az,r.title.en])].join(' ')).includes(norm(q))));
    $$('#project-list [data-project]').forEach(el => el.hidden = !matched.some(p=>p.slug===el.dataset.project));
    $('#project-count').textContent = `${matched.length} / ${projects.length} ${txt('layihə','projects')}`;
    $('#project-no-results').hidden = matched.length > 0 || !projects.length;
    $('#project-list').hidden = view !== 'list';
    $('#project-network').hidden = view !== 'network';
    $$('[data-project-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.projectView === view)));
    if (view === 'network') drawNetwork(matched);
    if (updateURL) {
      const u = new URL(location.href);
      Object.entries({q,status,field,role,institution,view:view==='list'?'':view}).forEach(([k,v])=>v?u.searchParams.set(k,v):u.searchParams.delete(k));
      history.replaceState(null,'',u);
    }
  }
  function drawNetwork(items) {
    const container = $('#network-canvas');
    if (!container) return;
    if (!items.length) { container.innerHTML = `<p class="network-link-list">${txt('Göstəriləcək layihə yoxdur.','There are no projects to display.')}</p><p class="network-link-list"><a href="/join.html?intent=propose">${txt('Layihə təklif et','Propose a project')}</a></p>`; return; }
    const width=900, height=Math.max(520,Math.ceil(items.length/3)*310);
    const positions = new Map(items.map((p,i)=>[p.slug,{x:150+(i%3)*300,y:150+Math.floor(i/3)*310}]));
    const people = [...new Set(items.flatMap(p=>p.team.map(t=>t.person)))];
    const personPoints = new Map(people.map(id => {
      const memberOf=items.filter(p=>p.team.some(t=>t.person===id));
      const average=memberOf.reduce((a,p)=>({x:a.x+positions.get(p.slug).x/memberOf.length,y:a.y+positions.get(p.slug).y/memberOf.length}),{x:0,y:0});
      const p=memberOf[0], index=p.team.findIndex(t=>t.person===id), angle=2*Math.PI*index/p.team.length;
      return [id,{x:average.x+96*Math.cos(angle),y:average.y+80*Math.sin(angle)+20}];
    }));
    let edges='', nodes='';
    for (const p of items) {
      const a=positions.get(p.slug);
      for (const t of p.team) {const b=personPoints.get(t.person);edges+=`<path d="M${a.x} ${a.y}L${b.x} ${b.y}"/>`;}
      const label=local(p.title);
      nodes+=`<a href="${purl(p)}" aria-label="${esc(label)}"><title>${esc(label)}</title><circle class="network-project" cx="${a.x}" cy="${a.y}" r="19"/><text x="${a.x}" y="${a.y-32}" text-anchor="middle">${esc(label.length>29?label.slice(0,27)+'…':label)}</text></a>`;
    }
    for (const id of people) {
      const point=personPoints.get(id), name=profiles[id]?.name || id;
      nodes+=`<a href="/people/${id}/" aria-label="${esc(name)}"><title>${esc(name)}</title><circle class="network-person" cx="${point.x}" cy="${point.y}" r="9"/><text x="${point.x}" y="${point.y+23}" text-anchor="middle">${esc(name.split(' ')[0])}</text></a>`;
    }
    container.innerHTML=`<svg class="project-network-svg" viewBox="0 0 ${width} ${height}" role="group" aria-label="${txt('Layihə və komanda üzvlüyü şəbəkəsi','Projects and team membership network')}">${edges}${nodes}</svg><ul class="network-link-list">${items.map(p=>`<li><a href="${purl(p)}">${esc(local(p.title))}</a></li>`).join('')}${people.map(id=>`<li><a href="/people/${id}/">${esc(profiles[id]?.name||id)}</a></li>`).join('')}</ul>`;
  }
  if ($('#project-list')) {
    $('[data-project-tools]').hidden=false;
    const params=new URLSearchParams(location.search);
    for (const [id,key] of [['project-search','q'],['project-status','status'],['project-field','field'],['project-role','role'],['project-institution','institution']]) {
      const el=$('#'+id), value=params.get(key);
      if (value && (el.tagName!=='SELECT' || [...el.options].some(o=>o.value===value))) el.value=value;
      el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>filterProjects(true));
    }
    $$('[data-project-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.projectView;filterProjects(true);}));
    $('#project-reset').addEventListener('click',()=>{$$('.project-tools input,.project-tools select').forEach(e=>e.value='');filterProjects(true);});
    if(params.get('audience')==='institution') {
      const note=document.createElement('p');note.className='open-role-highlight';
      note.innerHTML=`<a href="/contact.html?topic=partnership">${bilingual({az:'Layihəyə dəstək və ya ev sahibliyi barədə bizimlə əlaqə saxlayın.',en:'Contact us about sponsoring or hosting a project.'})}</a>`;
      $('.project-list-section .container').prepend(note);
    }
  }
  function filterPeople() {
    if (!$('#people-project')) return;
    const slug=$('#people-project').value, query=norm($('#people-search').value.trim());let count=0;
    $$('[data-person]').forEach(card=>{
      const person=profiles[card.dataset.person];
      const includes=!slug || assigned(card.dataset.person).some(p=>p.slug===slug);
      const matches=!query || norm([person.name,...person.interests.az,...person.interests.en].join(' ')).includes(query);
      card.hidden=!(includes&&matches); if (!card.hidden)count++;
    });
    $('#people-count').textContent=`${count} ${txt('nəfər','people')}`;
  }
  if ($('#people-project')) { $('[data-people-tools]').hidden=false;$('#people-project').addEventListener('change',filterPeople);$('#people-search').addEventListener('input',filterPeople); }
  function profileProjects(id) {
    const dialog=$('#profile-dialog');if (!dialog || !profiles[id])return;
    let section=$('#profile-projects-section');
    if (!section) {section=document.createElement('section');section.id='profile-projects-section';$('.profile-content',dialog).append(section);}
    const items=assigned(id);
    section.innerHTML=`<h3>${txt('Layihələr','Projects')}</h3>`+(items.length?items.map(p=>{
      const t=p.team.find(t=>t.person===id);
      return `<article class="profile-project"><a href="${purl(p)}"><h4>${esc(local(p.title))}</h4></a><strong>${esc(local(t.role))}</strong><p>${esc(local(t.note))}</p></article>`;
    }).join(''):`<p>${txt('Açıq layihə kataloqunda iştirak hələ göstərilmir.','No project participation is listed in the public catalogue yet.')}</p>`)+`<a class="profile-permalink" href="/people/${id}/">${txt('Profilin daimi linki','Permanent profile link')} →</a>`;
  }
  document.addEventListener('ars:profile',e=>profileProjects(e.detail));
  $$('.person-card[data-profile]').forEach(card=>{
    const list=assigned(card.dataset.profile);if (!list.length)return;
    const tags=document.createElement('div');tags.className='project-tags';
    tags.innerHTML=list.map(p=>bilingual(p.title)).join('');card.append(tags);
  });
  if (location.hash==='#departments') {history.replaceState(null,'',location.pathname+location.search+'#projects');$('#projects')?.scrollIntoView();}
  const feedbackProject = projects.find(p => p.slug === new URLSearchParams(location.search).get('project'));
  if (feedbackProject && $('#ars-contact-form')) {
    const field=document.createElement('input');field.type='hidden';field.name='project';field.value=feedbackProject.slug;
    const context=document.createElement('p');context.innerHTML=`<a class="project-detail-link" href="${purl(feedbackProject)}">${bilingual(feedbackProject.title)}</a>`;
    $('#ars-contact-form').prepend(context,field);
  }
  // Join flow is ordinary linked sections without JavaScript.
  let intent='join';
  function setIntent(value,update=false) {
    intent=['join','propose','learn'].includes(value)?value:'join';
    $$('[data-join-panel]').forEach(p=>p.hidden=p.dataset.joinPanel!==intent);
    $$('.join-choices [data-join-intent]').forEach(a=>a.dataset.joinIntent===intent?a.setAttribute('aria-current','step'):a.removeAttribute('aria-current'));
    if (update) {const u=new URL(location.href);u.searchParams.set('intent',intent);u.hash='join-'+intent;history.replaceState(null,'',u);$('#join-'+intent)?.scrollIntoView({block:'start'});}
  }
  if ($('[data-join-panel]')) {
    const params=new URLSearchParams(location.search);
    setIntent(params.get('intent')||location.hash.replace('#join-','')||'join');
    $$('[data-join-intent]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();setIntent(a.dataset.joinIntent,true);}));
    window.addEventListener('hashchange',()=>setIntent(location.hash.replace('#join-','')));
  }
  const roles=projects.flatMap(p=>(p.open_roles||[]).map(r=>({p,r,value:p.slug+'/'+r.id})));
  function filterRoles() {
    if (!$('#join-role')) return;
    const field=$('#join-field').value,career=$('#join-career').value;
    const options=roles.filter(({p,r})=>(!field||p.fields.includes(field))&&(!career||r.career_stages.includes(career)));
    $$('#join-role option').forEach(o=>{if(!o.value)return;o.hidden=o.disabled=!options.some(r=>r.value===o.value);});
    if (!options.some(r=>r.value===$('#join-role').value)) $('#join-role').value='';
    $('#join-role-count').textContent=`${options.length} ${txt('uyğun rol','matching roles')}`;
    $('#join-role-results').innerHTML=options.map(({p,r,value})=>`<article class="project-role-card"><h3>${esc(local(r.title))}</h3><a class="project-detail-link" href="${purl(p)}">${esc(local(p.title))}</a><p>${esc(local(r.commitment))}</p><p>${esc(local(r.description))}</p><div class="project-tags">${r.skills.map(s=>`<span>${esc(local(s))}</span>`).join('')}</div><button class="button button-primary" type="button" data-select-role="${value}">${txt('Bu rolu seç','Select this role')}</button></article>`).join('');
    const submit=$('[data-intent="join"] button[type="submit"]');if(submit)submit.disabled=!options.length || $('[data-intent="join"]').dataset.sending==='true';
    $$('[data-select-role]').forEach(b=>b.addEventListener('click',()=>{$('#join-role').value=b.dataset.selectRole;$('#join-role').dispatchEvent(new Event('change'));$('#join-role').focus();}));
  }
  if ($('#join-role')) {
    filterRoles(); const params=new URLSearchParams(location.search);const value=params.get('project')+'/'+params.get('role');
    if (roles.some(r=>r.value===value)) $('#join-role').value=value;
    $('#join-field').addEventListener('change',filterRoles);$('#join-career').addEventListener('change',filterRoles);
  }
  function fieldError(field) {
    if (field.type!=='checkbox' && field.required) field.setCustomValidity(field.value.trim()?'':'required');
    const bad=!field.validity.valid;
    field.setAttribute('aria-invalid',String(bad));
    const wrapper=field.closest('.project-field,.form-consent');
    let error=$('.project-field-error',wrapper);
    if(!error) {error=document.createElement('span');error.className='project-field-error';error.id='error-'+(field.id||field.name)+'-'+field.form.dataset.intent;wrapper.append(error);field.setAttribute('aria-describedby',`${field.getAttribute('aria-describedby')||''} ${error.id}`.trim());}
    error.hidden=!bad;
    error.textContent=bad?(field.type==='email'?txt('Düzgün e-poçt ünvanı daxil edin.','Enter a valid email address.'):field.type==='checkbox'?txt('Davam etmək üçün razılıq tələb olunur.','Consent is required to continue.'):txt('Bu sahəni doldurun.','Please complete this field.')):'';
    return !bad;
  }
  const formMessages={sending:['Göndərilir…','Sending…'],success:['Müraciətiniz göndərildi. Nəzərdən keçirildikdən sonra sizinlə əlaqə saxlanılacaq.','Your request was sent. The team will review it and respond.'],error:['Göndərilmədi. Yenidən cəhd edin və ya info@azresearchsociety.org ünvanına yazın.','Your request could not be sent. Try again or email info@azresearchsociety.org.'],validation:['Zəhmət olmasa, işarələnmiş sahələri yoxlayın.','Please check the highlighted fields.']};
  function formStatus(form,state) { const el=$('.project-form-status',form);el.dataset.state=state;el.textContent=state?txt(...formMessages[state]):''; }
  $$('.project-form').forEach(form=>{
    form.noValidate=true;
    $$('[required]',form).forEach(field=>{
      ['input','change'].forEach(type=>field.addEventListener(type,()=>{if(field.getAttribute('aria-invalid')==='true')fieldError(field);formStatus(form,'');}));
    });
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(form.dataset.sending==='true')return;const fields=$$('[required]',form), validity=fields.map(fieldError);
      if(validity.includes(false)){formStatus(form,'validation');fields[validity.indexOf(false)].focus();return;}
      if(form.dataset.intent==='join'&&!roles.some(r=>r.value===$('#join-role').value)){formStatus(form,'validation');return;}
      const submit=$('button[type="submit"]',form);submit.disabled=true;form.dataset.sending='true';formStatus(form,'sending');
      const data=new FormData(form);data.set('language',lang());data.set('source','ARS Projects');
      if(form.dataset.intent==='join'){data.set('career_stage',$('#join-career').value);data.set('field',$('#join-field').value);}
      try {
        const response=await fetch(form.action,{method:'POST',body:data,headers:{Accept:'application/json'}});
        if(!response.ok)throw Error('Submission failed');
        form.reset();$$('[aria-invalid]',form).forEach(f=>{f.removeAttribute('aria-invalid');f.setCustomValidity('');});$$('.project-field-error',form).forEach(f=>f.hidden=true);formStatus(form,'success');
      } catch(error) {formStatus(form,'error');}
      finally {form.dataset.sending='false';submit.disabled=false;}
    });
  });
  $$('.project-share').forEach(button=>{
    button.hidden=false;button.addEventListener('click',async()=>{
      const status=$('.share-status',button.parentElement),u=new URL(location.href);u.hash='';u.search='';
      try {
        if(navigator.share)await navigator.share({title:document.title,url:u.href});
        else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(u.href);status.textContent=txt('Link kopyalandı.','Link copied.');}
        else {status.textContent=u.href;}
      }catch(error){if(error.name!=='AbortError')status.textContent=u.href;}
    });
  });
  function refresh() {
    translate();filterProjects();filterPeople();filterRoles();
    $$('.project-form').forEach(form=>{const state=$('.project-form-status',form).dataset.state;if(state)formStatus(form,state);$$('[aria-invalid="true"]',form).forEach(fieldError);});
    if(typeof currentProfile!=='undefined'&&currentProfile)profileProjects(currentProfile);
  }
  document.addEventListener('ars:language',refresh);
  refresh();
})();
