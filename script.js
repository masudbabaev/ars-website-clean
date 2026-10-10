document.documentElement.classList.add("js");

const pageLoader = document.getElementById("page-loader") || (() => {
  const loader = document.createElement("div");
  loader.className = "page-loader";
  loader.id = "page-loader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-live", "polite");
  loader.setAttribute("aria-label", "ARS website loading");
  loader.innerHTML = `
    <div class="loader-inner">
      <div class="loader-logo" aria-hidden="true">
        <img class="loader-logo-ghost" src="/assets/ars-logo.png?v=22" alt="" width="662" height="700" />
        <span class="loader-logo-fill"><img src="/assets/ars-logo.png?v=22" alt="" width="662" height="700" /></span>
      </div>
      <div class="loader-meta"><span>ARS</span><strong><span id="loader-progress">00</span>%</strong></div>
      <div class="loader-track" aria-hidden="true"><span></span></div>
      <p class="loader-tagline">PEOPLE · IDEAS · RESEARCH · IMPACT</p>
    </div>`;
  document.body.prepend(loader);
  return loader;
})();
const loaderCounter = document.getElementById("loader-progress");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const saveDataEnabled = Boolean(navigator.connection?.saveData);
document.documentElement.classList.toggle("save-data", saveDataEnabled);
let loaderValue = 0;
let loaderFrame = 0;
let loaderFinished = false;

function setLoaderProgress(value) {
  loaderValue = Math.max(0, Math.min(100, value));
  pageLoader?.style.setProperty("--loader-progress", `${loaderValue}%`);
  if (loaderCounter) loaderCounter.textContent = String(Math.round(loaderValue)).padStart(2, "0");
}

function hidePageLoader() {
  if (!pageLoader || loaderFinished) return;
  loaderFinished = true;
  setLoaderProgress(100);
  pageLoader.classList.add("is-complete");
  pageLoader.setAttribute("aria-hidden", "true");
  document.body.classList.remove("loader-active");
  document.body.classList.add("site-ready");
}

function startEntryLoader() {
  if (!pageLoader || reducedMotion) {
    hidePageLoader();
    return;
  }

  let entryLoaderShown = false;
  try {
    entryLoaderShown = sessionStorage.getItem("ars-entry-loader-shown") === "true";
    if (!entryLoaderShown) sessionStorage.setItem("ars-entry-loader-shown", "true");
  } catch (error) { /* Storage may be unavailable in private browsing. */ }
  if (entryLoaderShown) {
    hidePageLoader();
    return;
  }

  const startingValue = 0;
  const minimumDuration = 480;
  const completionDuration = 90;
  const startedAt = performance.now();
  let loadReady = document.readyState === "complete";
  let completionStartedAt = 0;
  let completionFrom = 88;

  setLoaderProgress(startingValue);
  document.body.classList.add("loader-active");
  pageLoader.setAttribute("aria-hidden", "false");
  if (!loadReady) window.addEventListener("load", () => { loadReady = true; }, { once: true });

  function advance(now) {
    const elapsed = now - startedAt;
    if (!loadReady || elapsed < minimumDuration) {
      const phase = Math.min(elapsed / minimumDuration, 1);
      setLoaderProgress(startingValue + (88 - startingValue) * (1 - Math.pow(1 - phase, 2)));
      loaderFrame = requestAnimationFrame(advance);
      return;
    }

    if (!completionStartedAt) {
      completionStartedAt = now;
      completionFrom = loaderValue;
    }
    const phase = Math.min((now - completionStartedAt) / completionDuration, 1);
    setLoaderProgress(completionFrom + (100 - completionFrom) * phase);
    if (phase < 1) loaderFrame = requestAnimationFrame(advance);
    else window.setTimeout(hidePageLoader, 20);
  }

  loaderFrame = requestAnimationFrame(advance);
  window.setTimeout(hidePageLoader, 4000);
}

startEntryLoader();

document.addEventListener("click", (event) => {
  if (reducedMotion || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[href]");
  if (!link || link.target || link.hasAttribute("download")) return;

  const destination = new URL(link.href, window.location.href);
  if (!/^https?:$/.test(destination.protocol) || destination.origin !== window.location.origin) return;
  const sameDocument = destination.pathname === window.location.pathname && destination.search === window.location.search;
  if (sameDocument && destination.hash) return;

  try {
    if (sessionStorage.getItem("ars-entry-loader-shown") === "true") return;
  } catch (error) { /* Use the short transition when storage is unavailable. */ }

  event.preventDefault();
  cancelAnimationFrame(loaderFrame);
  loaderFinished = false;
  setLoaderProgress(0);
  pageLoader?.classList.remove("is-complete");
  pageLoader?.setAttribute("aria-hidden", "false");
  document.body.classList.add("loader-active");
  const transitionStartedAt = performance.now();
  function leave(now) {
    const phase = Math.min((now - transitionStartedAt) / 180, 1);
    setLoaderProgress(42 * phase);
    if (phase < 1) loaderFrame = requestAnimationFrame(leave);
    else window.location.assign(destination.href);
  }
  loaderFrame = requestAnimationFrame(leave);
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) hidePageLoader();
});

const siteProgress = document.createElement("div");
siteProgress.className = "site-progress";
siteProgress.setAttribute("aria-hidden", "true");
siteProgress.innerHTML = "<span></span>";
document.body.append(siteProgress);

const backToTop = document.createElement("button");
backToTop.className = "back-to-top";
backToTop.type = "button";
backToTop.innerHTML = '<span aria-hidden="true">\u2191</span>';
document.body.append(backToTop);
backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" }));

const siteHeader = document.querySelector(".site-header");
let scrollTicking = false;

function updateScrollInterface() {
  const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
  siteProgress.style.setProperty("--page-progress", `${progress * 100}%`);
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 28);
  backToTop.classList.toggle("is-visible", window.scrollY > Math.min(620, window.innerHeight * 0.72));
  scrollTicking = false;
}

window.addEventListener("scroll", () => {
  if (scrollTicking) return;
  scrollTicking = true;
  requestAnimationFrame(updateScrollInterface);
}, { passive: true });
window.addEventListener("resize", updateScrollInterface, { passive: true });
updateScrollInterface();

const currentFile = window.location.pathname.split("/").pop() || "index.html";
document.querySelectorAll(".site-nav a").forEach((link) => {
  const linkFile = new URL(link.href, window.location.href).pathname.split("/").pop() || "index.html";
  if (linkFile === currentFile) link.setAttribute("aria-current", "page");
});

const socialIconMarkup = {
  email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3zM3 7l9 7 9-7" /></svg>',
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10v7M8 7.5v.1M12 17v-4c0-1.7 1-3 2.7-3 1.5 0 2.3 1 2.3 3v4M12 10v7" /></svg>',
  instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" /></svg>',
  youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10 9 5 3-5 3z" /></svg>'
};

document.querySelectorAll(".social-links").forEach((group) => {
  const links = [...group.querySelectorAll(".social-link")];
  links.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const type = href.startsWith("mailto:") ? "email" : ["linkedin", "instagram", "youtube"].find((network) => href.includes(network));
    if (!type) return;
    const label = link.querySelector("span")?.textContent.trim() || type;
    link.classList.add(`social-link--${type}`);
    link.dataset.socialLabel = label;
    if (!link.hasAttribute("aria-label")) link.setAttribute("aria-label", label);
    if (!link.querySelector("svg")) link.insertAdjacentHTML("afterbegin", socialIconMarkup[type]);
  });
  if (links.length) group.classList.add("social-icons-ready");
});

const hero = document.querySelector(".hero");
if (hero) {
  hero.id = hero.id || "home";
  const logoScene = hero.querySelector("[data-logo-scene]");
  const scenePlane = logoScene?.querySelector(".scene-plane");
  const network = document.createElement("div");
  network.className = "hero-network";
  network.setAttribute("aria-hidden", "true");
  network.innerHTML = `
    <svg viewBox="0 0 620 620" focusable="false">
      <g class="network-lines"><path d="M90 180 235 95 390 155 525 85M90 180 170 330 325 275 390 155M170 330 295 485 470 415 325 275M470 415 545 260 390 155" /></g>
      <g class="network-rings"><circle cx="325" cy="275" r="126" /><circle cx="325" cy="275" r="205" /></g>
    </svg>
    <i style="--node-x:14%;--node-y:29%;--node-color:var(--blue)"></i>
    <i style="--node-x:38%;--node-y:15%;--node-color:var(--red)"></i>
    <i style="--node-x:63%;--node-y:25%;--node-color:var(--green)"></i>
    <i style="--node-x:85%;--node-y:14%;--node-color:var(--blue)"></i>
    <i style="--node-x:27%;--node-y:53%;--node-color:var(--green)"></i>
    <i class="network-core" style="--node-x:52%;--node-y:44%;--node-color:var(--red)"></i>
    <i style="--node-x:88%;--node-y:42%;--node-color:var(--red)"></i>
    <i style="--node-x:47%;--node-y:78%;--node-color:var(--blue)"></i>
    <i style="--node-x:76%;--node-y:67%;--node-color:var(--green)"></i>`;
  (scenePlane || hero).prepend(network);

  let heroInView = true;
  const syncHeroAnimationState = () => {
    hero.classList.toggle("animations-paused", reducedMotion || saveDataEnabled || document.hidden || !heroInView);
  };
  if ("IntersectionObserver" in window) {
    const heroObserver = new IntersectionObserver(([entry]) => {
      heroInView = entry.isIntersecting;
      syncHeroAnimationState();
    }, { threshold: 0.01 });
    heroObserver.observe(hero);
  }
  document.addEventListener("visibilitychange", syncHeroAnimationState);
  syncHeroAnimationState();

  if (!reducedMotion && !saveDataEnabled && window.matchMedia("(pointer: fine)").matches) {
    let heroFrame = 0;
    hero.addEventListener("pointermove", (event) => {
      cancelAnimationFrame(heroFrame);
      heroFrame = requestAnimationFrame(() => {
        const bounds = hero.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        hero.style.setProperty("--hero-shift-x", `${x * 24}px`);
        hero.style.setProperty("--hero-shift-y", `${y * 18}px`);
        hero.style.setProperty("--hero-pointer-x", `${(x + 0.5) * 100}%`);
        hero.style.setProperty("--hero-pointer-y", `${(y + 0.5) * 100}%`);
      });
    }, { passive: true });
    hero.addEventListener("pointerleave", () => {
      hero.style.setProperty("--hero-shift-x", "0px");
      hero.style.setProperty("--hero-shift-y", "0px");
    });

    logoScene?.addEventListener("pointermove", (event) => {
      const bounds = logoScene.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      logoScene.style.setProperty("--scene-rotate-x", `${y * -7}deg`);
      logoScene.style.setProperty("--scene-rotate-y", `${x * 7}deg`);
    }, { passive: true });
    logoScene?.addEventListener("pointerleave", () => {
      logoScene.style.setProperty("--scene-rotate-x", "0deg");
      logoScene.style.setProperty("--scene-rotate-y", "0deg");
    });
  }
}

if (document.body.dataset.page === "home") {
  const railSections = [
    ["home", "railHome"], ["about", "navAbout"], ["programs", "navPrograms"],
    ["workshop", "navWorkshop"], ["projects", "navProjects"], ["people", "navTeam"],
    ["community", "navCommunity"]
  ].filter(([id]) => document.getElementById(id));
  const sectionRail = document.createElement("nav");
  sectionRail.className = "section-rail";
  sectionRail.setAttribute("aria-label", "Səhifə bölmələri");
  sectionRail.dataset.i18nAriaLabel = "sectionNavigation";
  sectionRail.innerHTML = railSections.map(([id, key], index) => `<a href="#${id}" data-section-link="${id}"><i></i><span>${String(index + 1).padStart(2, "0")}</span><b data-i18n="${key}"></b></a>`).join("");
  document.body.append(sectionRail);

  if ("IntersectionObserver" in window) {
    const railObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        sectionRail.querySelectorAll("a").forEach((link) => link.classList.toggle("is-current", link.dataset.sectionLink === entry.target.id));
      });
    }, { rootMargin: "-42% 0px -48%", threshold: 0 });
    railSections.forEach(([id]) => railObserver.observe(document.getElementById(id)));
  }
}

if (!reducedMotion && !saveDataEnabled && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".program-card, .person-card, .choice-card, .workshop-week, .purpose-grid article, .program-feature-grid article").forEach((card) => {
    card.classList.add("has-spotlight");
    const light = document.createElement("span");
    light.className = "card-light";
    light.setAttribute("aria-hidden", "true");
    card.prepend(light);
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const localX = event.clientX - bounds.left;
      const localY = event.clientY - bounds.top;
      card.style.setProperty("--spot-x", `${localX}px`);
      card.style.setProperty("--spot-y", `${localY}px`);
      card.style.setProperty("--tilt-x", `${((localY / bounds.height) - 0.5) * -4}deg`);
      card.style.setProperty("--tilt-y", `${((localX / bounds.width) - 0.5) * 5}deg`);
    }, { passive: true });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    });
  });
}

const translations = {
  az: {
    skip: "Əsas məzmuna keç", navLabel: "Əsas naviqasiya", languageLabel: "Dil seçimi", statsLabel: "Cəmiyyət haqqında göstəricilər", valuesLabel: "Dəyərlərimiz", journeyLabel: "Uzunmüddətli inkişaf yolu", menuOpen: "Menyunu aç", menuClose: "Menyunu bağla", backToTop: "Səhifənin əvvəlinə qayıt", navAbout: "Haqqımızda", navPrograms: "Proqramlar", navWorkshop: "Emalatxana", navProjects: "Layihələr", navTeam: "İnsanlar", navCommunity: "İcma", navContact: "Əlaqə",
    heroEyebrow: "Elm · Tədqiqat · Əməkdaşlıq", heroTitle: "Azərbaycan elmini<br /><em>birlikdə irəli aparaq.</em>", heroText: "Dünyanın hər yerində çalışan azərbaycanlı tədqiqatçıları, tələbələri və elm həvəskarlarını bir araya gətirən açıq platforma.", joinUs: "İcmaya qoşul", explorePrograms: "Proqramları kəşf et", livingLogoLabel: "ARS qlobal tədqiqat şəbəkəsi", livingLogoKicker: "CANLI TƏDQİQAT ŞƏBƏKƏSİ", livingLogoStatus: "İdeyaları sərhədlər boyunca birləşdiririk", railHome: "Ana səhifə", sectionNavigation: "Səhifə bölmələri",
    manifestoLabel: "Bizim manifestimiz", people: "İNSANLAR", ideas: "İDEYALAR", research: "TƏDQİQAT", impact: "TƏSİR", manifestoText: "Güclü elmi icma bilik paylaşımı və davamlı əməkdaşlıqla yaranır.", scroll: "Daha çox kəşf et",
    aboutLabel: "Haqqımızda", aboutLead: "Sərhədləri aşan, biliyi paylaşan və <em>Azərbaycan elminin gələcəyini</em> birlikdə quran tədqiqatçılar şəbəkəsiyik.", aboutText1: "Azərbaycan Tədqiqat Cəmiyyəti (ARS) müxtəlif elm sahələrindən olan azərbaycanlı alim və tələbələr arasında əlaqə yaradan qeyri-kommersiya təşəbbüsüdür.", aboutText2: "Məqsədimiz açıq dialoq, mentorluq və multidissiplinar əməkdaşlıq üçün əlçatan mühit formalaşdırmaqdır.", problemLabel: "Problem", problemTitle: "İmkanlara birbaşa çıxış məhduddur", problemText: "Bir çox tələbə aktiv tədqiqatçılara, laboratoriyalara və real layihələrə aparan formal kanallara çıxış tapa bilmir.", purposeLabel: "Məqsədimiz", purposeTitle: "Ortaq sualları real nəticələrə çevirmək", purposeText: "Fərqli sahələrdən insanları bir araya gətirərək əməkdaşlıq, tədqiqat və ölçülə bilən akademik nəticələr yaradırıq.", statApplicants: "İlk mərhələ müraciətçisi", statPathways: "İcma fəaliyyət istiqaməti", valueBorderless: "Sərhədsizlik", valueOpen: "Açıq icma", valueInterdisciplinary: "Fənlərarası", valueResults: "Nəticə yönümlülük", valueGrowth: "İnkişaf və töhfə",
    programsLabel: "İcma modeli", programsTitle: "İdeyadan real<br /><em>tədqiqat nəticəsinə.</em>", programsIntro: "ARS proqramları ilk elmi maraqdan başlayaraq bacarıq, əməkdaşlıq və görünən akademik nəticəyə qədər aydın inkişaf yolu yaradır.", seminarsTitle: "Tədqiqatçı görüşləri", seminarsText: "Aktiv tədqiqatçılar, onların təcrübəsi və iş istiqamətləri ilə birbaşa tanışlıq.", networkTitle: "Mentor uyğunlaşdırılması", networkText: "Tələbələri maraqlarına uyğun mentor və tədqiqat istiqaməti ilə əlaqələndirmək.", mentorshipTitle: "Aylıq masterklaslar", mentorshipText: "Elmi yazı, məlumatların təhlili, layihə təklifi, qrant və rəy prosesi üzrə praktiki bacarıqlar.", sprintsTitle: "Layihə sprintləri və ortaq laboratoriyalar", sprintsText: "İştirakçıları real tədqiqat problemləri ətrafında birləşdirən nəticə yönümlü əməkdaşlıq.", outputsTitle: "Nəticələrin təqdimatı", outputsText: "Öyrənməni məqalə, poster, məlumat dəsti və təqdimat kimi konkret akademik nəticələrə çevirmək.", learnMore: "Ətraflı", journeyTitle: "Uzunmüddətli hədəf", journeyCommunity: "Tədqiqat icması", journeySociety: "Tədqiqat cəmiyyəti", journeyNetwork: "Tədqiqat şəbəkəsi", journeyCenter: "Müstəqil tədqiqat mərkəzi", programPathLabel: "Dörd mərhələli tədqiqat yolu", programPathTitle: "Maraqdan elmi təsirə gedən aydın yol.", programPathHint: "Hər mərhələni seçərək iştirakçıların necə əlaqə qurduğunu, bacarıq qazandığını, əməkdaşlıq etdiyini və nəticəsini paylaşdığını görün.", phaseConnect: "İdeya", phaseDevelop: "İnkişaf", phaseCollaborate: "Əməkdaşlıq", phasePublish: "Nəşr", phaseConnectText: "İnsanları, ideyaları və uyğun istiqaməti bir araya gətiririk.", phaseDevelopText: "Tədqiqat aparmaq üçün praktik və ötürülə bilən bacarıqlar qururuq.", phaseCollaborateText: "Ortaq sualları strukturlaşdırılmış layihələrə çeviririk.", phasePublishText: "Görülən işi görünən və paylaşılması mümkün elmi nəticəyə çeviririk.", programIncludes: "Bu mərhələyə daxildir", programOutcome: "Gözlənilən nəticə", connectOutcome: "Daha aydın istiqamət və doğru elmi əlaqələr", developOutcome: "Müstəqil işləmək üçün əsas tədqiqat bacarıqları", collaborateOutcome: "Komanda işi, layihə təcrübəsi və yoxlanılan nəticələr", publishOutcome: "Məqalə, poster, məlumat dəsti və ya elmi təqdimat", programPathCta: "Bu mərhələ ilə maraqlanıram", programOverviewLabel: "ARS tədqiqat yolu",
    workshopLabel: "Tədqiqat Metodları Seminarı", workshopBadge: "Pulsuz · Onlayn · 2, 9 və 16 oktyabr", workshopTitle: "Tədqiqat sualından<br /><em>nəşr yoluna.</em>", workshopSummary: "Tələbələr və erkən karyeralı tədqiqatçılar üçün üç əlaqəli sessiya, praktik tapşırıqlar və aydın inkişaf yolu.", scheduleLabel: "Seminar proqramı", scheduleTitle: "Sessiyanı seçin.<br /><em>Yolu kəşf edin.</em>", scheduleIntro: "Hər sessiya əvvəlkinin üzərində qurulur: əvvəlcə düzgün sual formalaşdırılır, sonra metodoloji plan hazırlanır və sonda iş nəşrə yönəldilir.", foundationsShort: "Tədqiqatın əsasları", designShort: "Tədqiqat dizaynı", publicationShort: "Elmi nəşr", sessionOneLabel: "1-ci sessiya", sessionTwoLabel: "2-ci sessiya", sessionThreeLabel: "3-cü sessiya", sessionOneDate: "2 oktyabr 2026 · 20:00 Bakı vaxtı", sessionTwoDate: "9 oktyabr 2026 · 20:00 Bakı vaxtı", sessionThreeDate: "16 oktyabr 2026 · 20:00 Bakı vaxtı", sessionOneDuration: "45 dəqiqə", sessionTwoDuration: "40 dəqiqə", sessionThreeDuration: "60 dəqiqə · 20 dəq. sual-cavab", foundationsTitle: "Tədqiqatın əsasları və ədəbiyyat icmalı", foundationsText: "Tədqiqat sualı, hipotez, məqsədlər, ədəbiyyat axtarışı və tədqiqat boşluğunun müəyyənləşdirilməsi.", designTitle: "Tədqiqat dizaynı və metodoloji keyfiyyət", designText: "Dizayn, dəyişənlər, seçmə, seçmə ölçüsü, qərəz, təkrarlana bilmə, analiz planı və nəticələrin şərhi.", publicationTitle: "Elmi yazı və nəşr prosesi", publicationText: "Məqalə strukturu, jurnal seçimi, təqdimetmə, rəy prosesi, nəşr etikası və süni intellektdən istifadənin açıqlanması.", presenterLabel: "Təqdimatçı", onlineLabel: "Onlayn", taskLabel: "Praktik tapşırıq", sessionOneTask: "Bir tədqiqat sualı, iki məqsəd və ilkin axtarış strategiyası hazırlamaq.", sessionTwoTask: "Seçmə, mümkün qərəz və analiz planını əhatə edən qısa tədqiqat dizaynı hazırlamaq.", sessionThreeTask: "Uyğun jurnal seçmək və qısa məqalə planı və ya təqdimetmə yoxlama siyahısı hazırlamaq.", scheduleTimeNote: "Bütün sessiyalar cümə günü saat 20:00-da Bakı vaxtı ilə (UTC+4) başlayır. Sessiyalar ingilis, Azərbaycan və ya iki dildə keçirilə bilər.", workshopHowLabel: "İştirak formatı", workshopHowTitle: "Öyrən.<br /><em>Tətbiq et.</em>", workshopHowText: "Seminar xarici auditoriya üçün nəzərdə tutulub və əvvəlcədən tədqiqat təcrübəsi tələb etmir. Hər həftə əsas anlayışlar aydın şəkildə izah edilir, sessiyadan sonra isə növbəti mövzuya hazırlayan qısa praktik tapşırıq verilir.", benefitsTitle: "İştirakçı nə qazanacaq?", benefitOne: "Aydın və əsaslandırılmış tədqiqat sualı qurmaq bacarığı", benefitTwo: "Dizayn, seçmə, qərəz və analiz planını birlikdə düşünmək bacarığı", benefitThree: "Məqaləni strukturlaşdırmaq və uyğun jurnal seçmək üçün praktik yol xəritəsi", benefitFour: "Üç tapşırıq vasitəsilə öz tədqiqat və nəşr planının ilkin versiyası", registrationStatus: "Qeydiyyat açıqdır", registrationTitle: "Qalan sessiyalara qoşulun", registrationText: "Birinci sessiya tamamlanıb, lakin yeni iştirakçılar 9 və 16 oktyabr sessiyalarına hələ də qoşula bilərlər. Seminar pulsuz və onlayndır.", workshopCta: "Qalan sessiyalara qeydiyyat", calendarCta: "Təqvimə əlavə et", registrationNote: "Gec qoşulmaq mümkündür. Qeydiyyat qalan sessiyaları əhatə edir.", nextSessionLabel: "Növbəti sessiya", countdownLabel: "Sessiyaya qalan vaxt", countdownDays: "gün", countdownHours: "saat", countdownMinutes: "dəqiqə", countdownSeconds: "saniyə", countdownLive: "Sessiya indi başlayır", countdownComplete: "Seminar seriyası tamamlanıb", sessionTabsLabel: "Seminar sessiyaları", scheduleTitleSmall: "Cədvəl", scheduleTextSmall: "2, 9 və 16 oktyabr · 20:00 Bakı vaxtı", tasksTitle: "Praktik tapşırıqlar", tasksText: "Hər sessiya növbəti mərhələyə hazırlayan qısa nəticə yaradır", sessionCompleted: "Tamamlandı", sessionNext: "Növbəti", sessionUpcoming: "Qarşıdadır", sessionLive: "Canlı", localTimeLabel: "Sizin vaxtınız", sessionResources: "Sessiya materialları", recordingCta: "Yazını izlə", slidesCta: "Slaydları yüklə",
    teamLabel: "İcra Şurası", teamTitle: "İdeyanın arxasındakı<br /><em>insanlarla tanış olun.</em>", advisoryLabel: "Elmi Məsləhət Şurası", advisoryTitle: "Təcrübəni elmi istiqamətə<br /><em>çevirən mütəxəssislər.</em>", roleFounder: "Təsisçi", roleCofounder: "Həmtəsisçi", roleResearch: "Tədqiqat Proqramları Direktoru", roleComms: "Kommunikasiya və İctimaiyyətlə Əlaqələr Rəhbəri", roleProject: "Layihə Koordinatoru", roleAdmin: "İnzibati İşlər üzrə Mütəxəssis", roleClinical: "Klinik psixoloq", roleAdvisory: "Elmi Məsləhət Şurasının üzvü", roleAdvisoryHead: "Elmi Məsləhət Şurasının rəhbəri", leadershipLayer: "Rəhbərlik", operationsLayer: "Proqramlar və əməliyyatlar", chairLayer: "Şura rəhbəri", advisoryMembersLayer: "Şura üzvləri", boardHint: "Profilə baxmaq üçün şəxsi seçin", ibrahimProfile: "Sakarya Universiteti · PhD namizədi<br />Bərk cisim fizikası · DFT", masudProfile: "KFUPM · PhD namizədi<br />Qaz hidratları · Lay modelləşdirilməsi", humayProfile: "Imperial College London · MSc<br />Aerokosmik sahə · Maye mexanikası", jaleProfile: "VMU & JGU · Sosiolinqvistika<br />Kod-dəyişmə · Dil variasiyası", nargizProfile: "Xəzər Universiteti<br />Data analitikası · Neyroelm", zehraProfile: "Xəzər Universiteti<br />Lay modelləşdirilməsi · Maşın öyrənməsi", xeyranseProfile: "Xəzər Tibb Mərkəzi<br />Klinik psixologiya · Psixoterapiya", amilProfile: "NCBJ / NOMATEN · BEU · UCL<br />Hesablama materialşünaslığı · Süni intellekt", azizehProfile: "Sabancı Universiteti<br />Ağıllı örtüklər · Biomateriallar", sabrinProfile: "Al Ain Universiteti · Abu Dabi<br />Tibb təhsili · Rəqəmsal səhiyyə", ulkarProfile: "Fizika İnstitutu · ADDA<br />Fotokataliz · Kondensə olunmuş maddə fizikası", nijatProfile: "ECOHUB · Sakarya Universiteti<br />Analitik kimya · Davamlı materiallar", orkhanProfile: "ADNSU · Universal Energy<br />Enerji sistemləri · Bərpa olunan enerji", xediceProfile: "Genetik Ehtiyatlar İnstitutu · doktorant<br />Genetika · Bioinformatika", gehremanProfile: "Adam Mickiewicz Universiteti · Sapienza<br />Koqnitiv psixologiya · Şahid yaddaşı", viewProfile: "Profilə bax", closeProfile: "Profili bağla", profileAbout: "Haqqında", profileInterests: "Elmi maraqlar", profileLinks: "Əlaqə, elmi və peşəkar profillər", profilePublications: "Seçilmiş nəşrlər", email: "E-poçt", linkedIn: "LinkedIn", googleScholar: "Google Scholar", orcid: "ORCID", scopus: "Scopus", researchGate: "ResearchGate",
    peopleEyebrow: "ARS insanları", peoplePageTitle: "Cəmiyyətimizi formalaşdıran<br /><em>insanlarla tanış olun.</em>", peoplePageText: "İcra Şurası cəmiyyətin gündəlik istiqamətini və proqramlarını idarə edir. Elmi Məsləhət Şurası isə akademik keyfiyyət, tədqiqat prioritetləri və uzunmüddətli inkişaf üzrə məsləhət verir.", executiveChoiceTitle: "İcra Şurası", executiveChoiceText: "ARS-in strategiyasını, proqramlarını, kommunikasiyasını və icma fəaliyyətini idarə edən komanda.", advisoryChoiceTitle: "Elmi Məsləhət Şurası", advisoryChoiceText: "Cəmiyyətin elmi istiqamətini gücləndirən və müxtəlif sahələr üzrə təcrübə təqdim edən tədqiqatçılar.", exploreBoard: "Şuraya bax", backToPeople: "İnsanlar bölməsinə qayıt", executivePageText: "Cəmiyyətin missiyasını gündəlik fəaliyyətə çevirən və proqramların həyata keçirilməsinə rəhbərlik edən komanda.", advisoryPageText: "ARS-in elmi keyfiyyətini, fənlərarası istiqamətini və tədqiqat əlaqələrini dəstəkləyən mütəxəssislər.",
    communityKicker: "Elmin gələcəyində sənin də yerin var", communityTitle: "Maraq göstər.<br />Əlaqə qur.<br /><em>Təsir yarat.</em>", communityText: "Tədqiqatçı, tələbə, mentor və ya elm həvəskarı olmağınızdan asılı olmayaraq, ARS icması sizin üçün açıqdır.", becomeMember: "Üzv olmaq üçün yaz",
    contactLabel: "Əlaqə", contactTitle: "Sualınız və ya ideyanız var?<br /><em>Bizə yazın.</em>", contactIntro: "Üzvlük, tədbirlər, tərəfdaşlıq və elmi əməkdaşlıq barədə müraciətlərinizi bu forma vasitəsilə göndərə bilərsiniz.", formName: "Ad və soyad", formEmail: "E-poçt ünvanı", formOrganization: "Universitet və ya təşkilat", formCountry: "Ölkə", formTopic: "Müraciətin mövzusu", formChooseTopic: "Mövzu seçin", topicProjectFeedback: "Layihə haqqında rəy", topicMembership: "Üzvlük", topicWorkshop: "Təlim və tədbirlər", topicPartnership: "Tərəfdaşlıq", topicSpeaker: "Spiker təklifi", topicAdvisory: "Elmi Məsləhət Şurası", topicGeneral: "Ümumi müraciət", topicOther: "Digər", formMessage: "Mesaj", formConsent: "Məlumatlarımın müraciətimə cavab vermək məqsədilə emal edilməsinə razıyam.", formSubmit: "Mesajı göndər", formSending: "Göndərilir…", formSuccess: "Təşəkkür edirik. Mesajınız ARS komandasına göndərildi.", formError: "Mesaj göndərilmədi. Bir qədər sonra yenidən cəhd edin və ya bizə e-poçt göndərin.", formRequired: "Bu sahəni doldurun.", formEmailInvalid: "Düzgün e-poçt ünvanı daxil edin.", formMessageShort: "Mesaj ən azı 20 simvoldan ibarət olmalıdır.", formConsentRequired: "Davam etmək üçün razılığınızı təsdiqləyin.", formErrorsSummary: "Zəhmət olmasa işarələnmiş sahələri yoxlayın.",
    notFoundTitle: "Səhifə tapılmadı.", notFoundText: "Axtardığınız səhifə köçürülmüş, yenilənmiş və ya mövcud olmaya bilər.", notFoundCta: "Ana səhifəyə qayıt", footerTagline: "Azərbaycanlı tədqiqatçıları dünya miqyasında birləşdiririk.", footerExplore: "Kəşf et", footerConnect: "Əlaqə", metaDescription: "Azərbaycan Tədqiqat Cəmiyyəti — azərbaycanlı tədqiqatçıları birləşdirən qlobal elmi icma."
  },
  en: {
    skip: "Skip to main content", navLabel: "Primary navigation", languageLabel: "Language selection", statsLabel: "Society highlights", valuesLabel: "Our values", journeyLabel: "Long-term development path", menuOpen: "Open menu", menuClose: "Close menu", backToTop: "Back to the top", navAbout: "About", navPrograms: "Programs", navWorkshop: "Workshop", navProjects: "Projects", navTeam: "People", navCommunity: "Community", navContact: "Contact",
    heroEyebrow: "Science · Research · Collaboration", heroTitle: "Advancing Azerbaijani science,<br /><em>together.</em>", heroText: "An open platform connecting Azerbaijani researchers, students, and science enthusiasts across the world.", joinUs: "Join the community", explorePrograms: "Explore our programs", livingLogoLabel: "ARS global research network", livingLogoKicker: "LIVE RESEARCH NETWORK", livingLogoStatus: "Connecting ideas across borders", railHome: "Home", sectionNavigation: "Page sections",
    manifestoLabel: "Our manifesto", people: "PEOPLE", ideas: "IDEAS", research: "RESEARCH", impact: "IMPACT", manifestoText: "A strong scientific community grows through knowledge-sharing and lasting collaboration.", scroll: "Discover more",
    aboutLabel: "About us", aboutLead: "We are a network of researchers crossing borders, sharing knowledge, and shaping <em>the future of Azerbaijani science</em> together.", aboutText1: "Azerbaijan Research Society (ARS) is a non-profit initiative connecting Azerbaijani scholars and students across scientific disciplines.", aboutText2: "Our mission is to create an accessible environment for open dialogue, mentorship, and multidisciplinary collaboration.", problemLabel: "The problem", problemTitle: "Direct access to opportunity is limited", problemText: "Many students cannot find formal pathways to active researchers, laboratories, and real research projects.", purposeLabel: "Our purpose", purposeTitle: "Turn shared questions into real outcomes", purposeText: "We bring people together across disciplines to create collaboration, research, and measurable academic outcomes.", statApplicants: "Applicants in our first round", statPathways: "Community pathways", valueBorderless: "Borderless", valueOpen: "Open community", valueInterdisciplinary: "Interdisciplinary", valueResults: "Result-oriented", valueGrowth: "Growth & contribution",
    programsLabel: "Community model", programsTitle: "From an idea to a real<br /><em>research outcome.</em>", programsIntro: "ARS programs create a clear progression from first scientific curiosity to skills, collaboration, and visible academic outcomes.", seminarsTitle: "Researcher meetups", seminarsText: "Direct exposure to active researchers, their experience, and areas of work.", networkTitle: "Mentor matching", networkText: "Connecting students with mentors and research directions that fit their interests.", mentorshipTitle: "Monthly masterclasses", mentorshipText: "Practical skills in academic writing, data analysis, proposals, grants, and peer review.", sprintsTitle: "Project sprints & shared labs", sprintsText: "Result-oriented collaboration bringing participants together around real research problems.", outputsTitle: "Presenting results", outputsText: "Turning learning into papers, posters, datasets, presentations, and other concrete academic outputs.", learnMore: "Learn more", journeyTitle: "Long-term goal", journeyCommunity: "Research community", journeySociety: "Research society", journeyNetwork: "Research network", journeyCenter: "Independent research center", programPathLabel: "Four-stage research pathway", programPathTitle: "A clear route from curiosity to research impact.", programPathHint: "Select each stage to see how participants connect, build capability, collaborate, and share their work.", phaseConnect: "Idea", phaseDevelop: "Develop", phaseCollaborate: "Collaborate", phasePublish: "Publish", phaseConnectText: "We bring people, ideas, and the right research direction together.", phaseDevelopText: "We build practical, transferable skills for doing rigorous research.", phaseCollaborateText: "We turn shared questions into structured research projects.", phasePublishText: "We help convert completed work into visible, shareable academic outputs.", programIncludes: "This stage includes", programOutcome: "Expected outcome", connectOutcome: "Clearer direction and the right research relationships", developOutcome: "Core research skills for more independent work", collaborateOutcome: "Team experience, project evidence, and tested results", publishOutcome: "A paper, poster, dataset, or scientific presentation", programPathCta: "I am interested in this stage", programOverviewLabel: "ARS research pathway",
    workshopLabel: "Research Methods Workshop", workshopBadge: "Free · Online · 2, 9 & 16 October", workshopTitle: "From a research question<br /><em>to publication.</em>", workshopSummary: "Three connected sessions, practical assignments, and a clear development path for students and early-career researchers.", scheduleLabel: "Workshop program", scheduleTitle: "Choose a session.<br /><em>Explore the journey.</em>", scheduleIntro: "Each session builds on the previous one: formulate a sound question, design the study, then prepare the work for publication.", foundationsShort: "Research foundations", designShort: "Study design", publicationShort: "Scientific publication", sessionOneLabel: "Session 1", sessionTwoLabel: "Session 2", sessionThreeLabel: "Session 3", sessionOneDate: "2 October 2026 · 20:00 Baku time", sessionTwoDate: "9 October 2026 · 20:00 Baku time", sessionThreeDate: "16 October 2026 · 20:00 Baku time", sessionOneDuration: "45 minutes", sessionTwoDuration: "40 minutes", sessionThreeDuration: "60 minutes · 20-minute Q&A", foundationsTitle: "Foundations of Research and Literature Review", foundationsText: "Research questions, hypotheses, objectives, literature searching, and identifying a research gap.", designTitle: "Study Design and Methodological Quality", designText: "Design, variables, sampling, sample size, bias, reproducibility, analysis planning, and interpretation.", publicationTitle: "Scientific Writing and Publication Pathway", publicationText: "Paper structure, journal selection, submission, peer review, publication ethics, and disclosure of AI use.", presenterLabel: "Presenter", onlineLabel: "Online", taskLabel: "Practical assignment", sessionOneTask: "Draft one research question, two objectives, and a basic search strategy.", sessionTwoTask: "Prepare a short study design covering sampling, possible bias, and an analysis plan.", sessionThreeTask: "Select a suitable journal and prepare a brief paper outline or submission checklist.", scheduleTimeNote: "All sessions begin on Friday at 20:00 Baku time (UTC+4). Sessions may be delivered in English, Azerbaijani, or bilingually.", workshopHowLabel: "Participation format", workshopHowTitle: "Learn.<br /><em>Apply.</em>", workshopHowText: "The workshop is designed for an external audience and does not require advanced research experience. Each week explains the essential concepts clearly and ends with a short practical assignment that prepares participants for the next stage.", benefitsTitle: "What will participants gain?", benefitOne: "The ability to build a clear, defensible research question", benefitTwo: "A joined-up understanding of design, sampling, bias, and analysis planning", benefitThree: "A practical roadmap for structuring a paper and selecting a journal", benefitFour: "A first version of a personal research and publication plan through three assignments", registrationStatus: "Registration is open", registrationTitle: "Join the remaining sessions", registrationText: "Session 1 is complete, but new participants can still join the sessions on 9 and 16 October. The workshop is free and online.", workshopCta: "Register for remaining sessions", calendarCta: "Add to calendar", registrationNote: "Late joining is available. Registration covers the remaining sessions.", nextSessionLabel: "Next session", countdownLabel: "Time until the session", countdownDays: "days", countdownHours: "hours", countdownMinutes: "minutes", countdownSeconds: "seconds", countdownLive: "The session is starting now", countdownComplete: "The workshop series is complete", sessionTabsLabel: "Workshop sessions", scheduleTitleSmall: "Schedule", scheduleTextSmall: "2, 9 & 16 October · 20:00 Baku time", tasksTitle: "Practical assignments", tasksText: "Each session produces a short output that prepares participants for the next stage", sessionCompleted: "Completed", sessionNext: "Next", sessionUpcoming: "Upcoming", sessionLive: "Live", localTimeLabel: "Your time", sessionResources: "Session resources", recordingCta: "Watch recording", slidesCta: "Download slides",
    teamLabel: "Executive Board", teamTitle: "Meet the people<br /><em>behind the idea.</em>", advisoryLabel: "Scientific Advisory Board", advisoryTitle: "Experts turning experience into<br /><em>scientific direction.</em>", roleFounder: "Founder", roleCofounder: "Co-founder", roleResearch: "Director of Research Programs", roleComms: "Head of Communications & Public Relations", roleProject: "Project Coordinator", roleAdmin: "Administrative Affairs Specialist", roleClinical: "Clinical Psychologist", roleAdvisory: "Scientific Advisory Board member", roleAdvisoryHead: "Head of the Scientific Advisory Board", leadershipLayer: "Leadership", operationsLayer: "Programs & operations", chairLayer: "Board head", advisoryMembersLayer: "Board members", boardHint: "Select a person to view their profile", ibrahimProfile: "Sakarya University · PhD candidate<br />Solid-state physics · DFT", masudProfile: "KFUPM · PhD candidate<br />Gas hydrates · Reservoir modelling", humayProfile: "Imperial College London · MSc<br />Aerospace · Fluid mechanics", jaleProfile: "VMU & JGU · Sociolinguistics<br />Code-switching · Language variation", nargizProfile: "Khazar University<br />Data analytics · Neuroscience", zehraProfile: "Khazar University<br />Reservoir modelling · Machine learning", xeyranseProfile: "Khazar Medical Center<br />Clinical psychology · Psychotherapy", amilProfile: "NCBJ / NOMATEN · BEU · UCL<br />Computational materials science · AI", azizehProfile: "Sabancı University<br />Smart coatings · Biomaterials", sabrinProfile: "Al Ain University · Abu Dhabi<br />Medical education · Digital health", ulkarProfile: "Institute of Physics · ASMA<br />Photocatalysis · Condensed-matter physics", nijatProfile: "ECOHUB · Sakarya University<br />Analytical chemistry · Sustainable materials", orkhanProfile: "ASOIU · Universal Energy<br />Energy systems · Renewable energy", xediceProfile: "Genetic Resources Institute · PhD candidate<br />Genetics · Bioinformatics", gehremanProfile: "Adam Mickiewicz University · Sapienza<br />Cognitive psychology · Eyewitness memory", viewProfile: "View profile", closeProfile: "Close profile", profileAbout: "About", profileInterests: "Research interests", profileLinks: "Contact, academic & professional profiles", profilePublications: "Selected publications", email: "Email", linkedIn: "LinkedIn", googleScholar: "Google Scholar", orcid: "ORCID", scopus: "Scopus", researchGate: "ResearchGate",
    peopleEyebrow: "People at ARS", peoplePageTitle: "Meet the people shaping<br /><em>our society.</em>", peoplePageText: "The Executive Board leads the society's daily direction and programs. The Scientific Advisory Board advises on academic quality, research priorities, and long-term development.", executiveChoiceTitle: "Executive Board", executiveChoiceText: "The team responsible for ARS strategy, programs, communications, and community operations.", advisoryChoiceTitle: "Scientific Advisory Board", advisoryChoiceText: "Researchers who strengthen the society's scientific direction and contribute expertise across disciplines.", exploreBoard: "Explore the board", backToPeople: "Back to People", executivePageText: "The team turning the society's mission into daily action and leading the delivery of its programs.", advisoryPageText: "Experts supporting ARS's scientific quality, interdisciplinary direction, and research connections.",
    communityKicker: "You have a place in the future of science", communityTitle: "Stay curious.<br />Make connections.<br /><em>Create impact.</em>", communityText: "Whether you are a researcher, student, mentor, or science enthusiast, the ARS community is open to you.", becomeMember: "Write to become a member",
    contactLabel: "Contact", contactTitle: "Have a question or an idea?<br /><em>Write to us.</em>", contactIntro: "Use this form for membership, events, partnerships, and scientific collaboration enquiries.", formName: "Full name", formEmail: "Email address", formOrganization: "University or organization", formCountry: "Country", formTopic: "Reason for contacting", formChooseTopic: "Choose a topic", topicProjectFeedback: "Project feedback", topicMembership: "Membership", topicWorkshop: "Workshops and events", topicPartnership: "Partnership", topicSpeaker: "Speaker proposal", topicAdvisory: "Scientific Advisory Board", topicGeneral: "General enquiry", topicOther: "Other", formMessage: "Message", formConsent: "I agree that my information may be processed for the purpose of responding to my enquiry.", formSubmit: "Send message", formSending: "Sending…", formSuccess: "Thank you. Your message has been sent to the ARS team.", formError: "Your message could not be sent. Please try again later or email us directly.", formRequired: "Please complete this field.", formEmailInvalid: "Enter a valid email address.", formMessageShort: "Your message must contain at least 20 characters.", formConsentRequired: "Confirm your consent before continuing.", formErrorsSummary: "Please review the highlighted fields.",
    notFoundTitle: "Page not found.", notFoundText: "The page you are looking for may have moved, changed, or no longer exists.", notFoundCta: "Return home", footerTagline: "Connecting Azerbaijani researchers around the world.", footerExplore: "Explore", footerConnect: "Connect", metaDescription: "Azerbaijan Research Society connects Azerbaijani researchers, students, and science enthusiasts around the world."
  },
  amil: {
    name: "Amil Aligayev",
    roleKey: "roleAdvisoryHead",
    image: "assets/amil.webp?v=14",
    bio: {
      az: [
        "Amil Aligayev materialşünas və hesablama fizikidir. O, Polşada Milli Nüvə Tədqiqatları Mərkəzinin NOMATEN Mükəmməllik Mərkəzində assistent professor, Bakı Mühəndislik Universitetinin Elmi-Tədqiqat Mərkəzində tədqiqatçı və University College London-da elmi işçidir.",
        "Tədqiqatlarında sıxlıq funksionalı nəzəriyyəsi, molekulyar dinamika, çoxmiqyaslı modelləşdirmə və süni intellektdən istifadə edir. Elmi fəaliyyəti kataliz, hidrogen və CO₂ çevrilməsi, nüvə və konstruksiya materialları, ikiölçülü materiallar, sensor texnologiyaları və kristal strukturların proqnozlaşdırılmasını əhatə edir."
      ],
      en: [
        "Amil Aligayev is a materials scientist and computational physicist. He is an Assistant Professor at the NOMATEN Centre of Excellence, National Centre for Nuclear Research in Poland, a researcher at Baku Engineering University, and a Research Fellow at University College London.",
        "His work combines density functional theory, molecular dynamics, multiscale modelling, and artificial intelligence. His research spans catalysis, hydrogen and CO₂ conversion, nuclear and structural materials, two-dimensional materials, sensing technologies, and AI-assisted crystal-structure prediction."
      ]
    },
    interests: {
      az: ["Hesablama materialşünaslığı", "Çoxmiqyaslı modelləşdirmə", "Nanomateriallar", "Materialların kəşfində süni intellekt", "DFT və molekulyar dinamika"],
      en: ["Computational materials science", "Multiscale modelling", "Nanomaterials", "AI for materials discovery", "DFT & molecular dynamics"]
    },
    links: [
      { labelKey: "linkedIn", url: "https://www.linkedin.com/in/amilaligayev/" },
      { labelKey: "googleScholar", url: "https://scholar.google.com/citations?user=BpMftfMAAAAJ&hl=en&oi=ao" }
    ]
  },
  azizeh: {
    name: "Dr. Azizeh Hosseinjany",
    roleKey: "roleAdvisory",
    image: "assets/azizeh.webp?v=14",
    bio: {
      az: [
        "Azizeh Hosseinjany Sabancı Universitetinin Mühəndislik və Təbiət Elmləri fakültəsində postdoktoral tədqiqatçıdır. Hazırda TÜBİTAK-ın metal səthlər üçün ağıllı örtüklər layihəsində funksional örtüklər, səth mühəndisliyi, korroziyadan mühafizə və qabaqcıl metal materialları araşdırır.",
        "O, 2025-ci ildə Koç Universitetində Mexanika mühəndisliyi üzrə doktorluq dərəcəsi alıb. Doktorantura tədqiqatında biotibbi yüksək entropiyalı ərintilərin maşın öyrənməsi ilə dizaynını hesablama və eksperimental üsullarla birləşdirib; mikrostruktur, korroziya, nazik təbəqələr, ion ayrılması, səth xarakterizasiyası və biouyğunluğu öyrənib."
      ],
      en: [
        "Azizeh Hosseinjany is a postdoctoral researcher at the Faculty of Engineering and Natural Sciences at Sabancı University. Her current TÜBİTAK project on smart coatings for metal surfaces focuses on functional coatings, surface engineering, corrosion protection, and advanced metallic materials.",
        "She received her PhD in Mechanical Engineering from Koç University in 2025. Her doctoral research combined computational and experimental methods to design biomedical high-entropy alloys with machine learning, covering microstructure, corrosion, thin films, ion release, surface characterization, and biocompatibility."
      ]
    },
    interests: {
      az: ["Ağıllı və funksional örtüklər", "Səth mühəndisliyi", "Yüksək entropiyalı ərintilər", "Korroziya və elektrokimya", "Biomateriallar", "Materialşünaslıqda maşın öyrənməsi"],
      en: ["Smart & functional coatings", "Surface engineering", "High-entropy alloys", "Corrosion & electrochemistry", "Biomaterials", "Machine learning in materials science"]
    },
    links: [
      { labelKey: "email", text: "a.hosseinjany@sabanciuniv.edu", url: "mailto:a.hosseinjany@sabanciuniv.edu" },
      { labelKey: "email", text: "ahosseinjany20@ku.edu.tr", url: "mailto:ahosseinjany20@ku.edu.tr" },
      { labelKey: "linkedIn", url: "https://www.linkedin.com/in/azizeh-hosseinjany-5472a8b5/" },
      { labelKey: "googleScholar", url: "https://scholar.google.com/citations?user=ZeQXwcIAAAAJ" }
    ]
  },
  sabrin: {
    name: "Dr. Sabrin Ali Azim",
    roleKey: "roleAdvisory",
    image: "assets/sabrin.webp?v=14",
    bio: {
      az: [
        "Sabrin Ali Azim tibb üzrə fəlsəfə doktoru, dosent, ağız və üz-çənə cərrahı və tədqiqatçıdır. O, Azərbaycan Tibb Universitetində stomatologiya, ağız və üz-çənə cərrahiyyəsi ixtisası və doktorantura təhsili alıb, hazırda Abu Dabidə Al Ain Universitetində fəaliyyət göstərir.",
        "Onun işi klinik tibb və stomatologiyanı tibb təhsili, süni intellekt, rəqəmsal transformasiya, keyfiyyət təminatı, akkreditasiya, institusional idarəetmə və səhiyyə siyasəti ilə birləşdirir. BƏƏ universitetlərində tədris, kurikulum və qiymətləndirmə, tədqiqata rəhbərlik və keyfiyyət təminatı sahələrində təcrübəyə malikdir."
      ],
      en: [
        "Sabrin Ali Azim is an Associate Professor, PhD in medicine, oral and maxillofacial surgeon, and researcher. She completed her dentistry, oral and maxillofacial surgery specialization, and doctoral training at Azerbaijan Medical University and is currently based at Al Ain University in Abu Dhabi.",
        "Her interdisciplinary work connects clinical medicine and dentistry with medical education, artificial intelligence, digital transformation, quality assurance, accreditation, institutional governance, and health policy. She has experience in university teaching, curriculum and assessment, research supervision, and quality assurance in the UAE."
      ]
    },
    interests: {
      az: ["Tibb və stomatoloji təhsil", "Süni intellekt və rəqəmsal səhiyyə", "Səhiyyə sistemləri və idarəetmə", "Keyfiyyət təminatı və akkreditasiya", "Ağız və üz-çənə cərrahiyyəsi"],
      en: ["Medical & dental education", "AI & digital health", "Health systems & governance", "Quality assurance & accreditation", "Oral & maxillofacial surgery"]
    },
    links: [
      { labelKey: "orcid", url: "https://orcid.org/0000-0002-8933-2196" },
      { labelKey: "scopus", url: "https://www.scopus.com/authid/detail.uri?authorId=57189626522" },
      { labelKey: "researchGate", url: "https://www.researchgate.net/profile/Sabrin-Azim" },
      { labelKey: "googleScholar", url: "https://scholar.google.com/scholar?q=%22Sabrin+Ali+Azim%22" }
    ],
    publications: [
      {
        "doi": "10.1186/s12909-024-06545-1",
        "title": "Current challenges in dental education: A scoping review",
        "authors": "Annamma, L. M., et al.",
        "year": 2024,
        "journal": "BMC Medical Education",
        "verification": "verified",
        "source": "https://link.springer.com/article/10.1186/s12909-024-06545-1",
        "citation": "Annamma, L. M., et al.. (2024). Current challenges in dental education: A scoping review. BMC Medical Education."
      },
      {
        "doi": "10.1016/j.sdentj.2024.10.003",
        "title": "Undergraduate dental curricula in Middle Eastern and Arabic-speaking African nations: A cross-sectional study",
        "authors": "Annamma, L. M., Al Khabuli, J., Azim, S. A., et al.",
        "year": 2024,
        "journal": "The Saudi Dental Journal",
        "verification": "verified",
        "source": "https://pmc.ncbi.nlm.nih.gov/articles/PMC11976074/",
        "citation": "Annamma, L. M., Al Khabuli, J., Azim, S. A., et al.. (2024). Undergraduate dental curricula in Middle Eastern and Arabic-speaking African nations: A cross-sectional study. The Saudi Dental Journal."
      }
    ]
  }
};

translations.az.peoplePageText = "ARS üzvlərini, onların elmi maraqlarını və layihələrdə iştirakını kəşf edin. İcra və Elmi Məsləhət şuraları cəmiyyətin fəaliyyətinə istiqamət verir.";
translations.en.peoplePageText = "Discover ARS members, their research interests and project participation. The Executive and Scientific Advisory boards guide the society’s work.";
translations.az.roleMember = "ARS üzvü";
translations.en.roleMember = "ARS member";

const profiles = {
  amil: translations.amil,
  azizeh: translations.azizeh,
  sabrin: translations.sabrin,
  xedice: {
    name: "Xədicə Amanova (Bayramova)",
    roleKey: "roleAdvisory",
    image: "assets/xedice.webp?v=32",
    bio: {
      az: [
        "Xədicə Amanova (Bayramova) genetika mütəxəssisi və elmi-tədqiqatçıdır. O, Bakı Dövlət Universitetində biologiya üzrə bakalavr, Azərbaycan Respublikası Elm və Təhsil Nazirliyinin Genetik Ehtiyatlar İnstitutunda isə genetika üzrə magistr dərəcəsi alıb. Həmin institutda beş il elmi-tədqiqatçı kimi fəaliyyət göstərib.",
        "Hazırda Genetik Ehtiyatlar İnstitutunda doktorantura təhsili alır və genetika ilə bioinformatika istiqamətlərində araşdırmalar aparır. Tədqiqatları pangenomika, genomik məlumatların analizi, genetik müxtəliflik və mənşənin öyrənilməsi, hesablama biologiyası, eləcə də süni intellekt və maşın öyrənməsinin biologiyada tətbiqini birləşdirir."
      ],
      en: [
        "Xədicə Amanova (Bayramova) is a genetics specialist and researcher. She holds a bachelor's degree in Biology from Baku State University and a master's degree in Genetics from the Genetic Resources Institute of Azerbaijan's Ministry of Science and Education. She worked as a researcher at the institute for five years.",
        "She is currently pursuing a PhD at the Genetic Resources Institute and conducts research in genetics and bioinformatics. Her work combines pangenomics, genomic-data analysis, genetic diversity and origins, computational biology, and applications of artificial intelligence and machine learning in biology."
      ]
    },
    interests: {
      az: ["Genetika", "Molekulyar biologiya", "Bioinformatika və hesablama biologiyası", "Pangenomika və genomik məlumatların analizi", "Genetik müxtəliflik və təkamül", "Biologiyada süni intellekt və maşın öyrənməsi"],
      en: ["Genetics", "Molecular biology", "Bioinformatics & computational biology", "Pangenomics & genomic-data analysis", "Genetic diversity & evolution", "AI & machine learning in biology"]
    },
    links: [
      { labelKey: "linkedIn", url: "https://www.linkedin.com/in/khadija-amanzadeh/" },
      { labelKey: "email", text: "khadijamanzadeh@gmail.com", url: "mailto:khadijamanzadeh@gmail.com" },
      { labelKey: "researchGate", url: "https://www.researchgate.net/publication/377635528_ISSN_2223-5817_print_ISSN_2790-7988_on-line_ELMI_SRLRI_CILD_XII_No1_PROCEEDINGS_of_the_Genetic_Resources_Institute_Ministry_of_Science_and_Education_of_the_Republic_of_Azerbaijan_VOLUME_XII_No1" }
    ]
  },
  gehreman: {
    name: "Qəhrəman Qasımov",
    roleKey: "roleAdvisory",
    image: "assets/gehreman.webp?v=32",
    bio: {
      az: [
        "Qəhrəman Qasımov Polşanın Adam Mickiewicz Universitetində Research in Cognitive Science proqramı üzrə magistratura təhsili alır. Hazırda Erasmus+ mübadilə proqramı çərçivəsində təhsilini Roma Sapienza Universitetində Cognitive Forensic Science istiqaməti üzrə davam etdirir. O, bakalavr dərəcəsini Xəzər Universitetində psixologiya ixtisası üzrə əldə edib.",
        "Onun tədqiqatları koqnitiv psixologiya çərçivəsində şahid yaddaşı, dezinformasiya effekti, yaddaşın yenidən qurulması, yönləndirici suallar və insan–süni intellekt qarşılıqlı əlaqəsini əhatə edir. Hazırkı işində əvvəlki yaddaş testinin sonrakı yönləndirici suallara cavab verməyə təsirini araşdırır. Elmi Tədqiqat İnstitutunda tədqiqatçı kimi fəaliyyət göstərir və Avropa Psixologiya və Hüquq Assosiasiyasının üzvüdür."
      ],
      en: [
        "Qəhrəman Qasımov is pursuing a master's degree in Research in Cognitive Science at Adam Mickiewicz University in Poland. He is currently studying Cognitive Forensic Science at Sapienza University of Rome through the Erasmus+ exchange programme. He earned his bachelor's degree in Psychology from Khazar University.",
        "His research covers eyewitness memory, the misinformation effect, memory reconstruction, leading questions, and cognitive processes in human–AI interaction. His current study examines how a prior memory test influences responses to subsequent leading questions. He works as a researcher at a research institute and is a member of the European Association of Psychology and Law."
      ]
    },
    interests: {
      az: ["Koqnitiv psixologiya", "Şahid yaddaşı və dezinformasiya effekti", "Yaddaşın yenidən qurulması", "Yönləndirici suallar və yaddaş", "İnsan–süni intellekt qarşılıqlı əlaqəsində koqnitiv proseslər"],
      en: ["Cognitive psychology", "Eyewitness memory & the misinformation effect", "Memory reconstruction", "Leading questions & memory", "Cognitive processes in human–AI interaction"]
    },
    links: []
  },
  ulkar: {
    name: "Ulkar Samadova",
    roleKey: "roleAdvisory",
    image: "assets/ulkar.webp?v=15",
    bio: {
      az: [
        "Ulkar Samadova kondensə olunmuş maddə fizikası və dayanıqlı enerji materialları üzrə çalışan fizikdir. O, Azərbaycan Respublikası Elm və Təhsil Nazirliyinin Fizika İnstitutunda Elektrik mühəndisliyi və yüksək gərginlik fizikası laboratoriyasının böyük elmi işçisi, Azərbaycan Dövlət Dəniz Akademiyasında isə Tətbiqi mexanika kafedrasının müəllimidir.",
        "Tədqiqatları fotokatalitik CO₂ reduksiyası, ikiölçülü perovskit və xalkopirit heterostrukturlar, yarımkeçirici və ferrit nanokompozitlərin elektrik, maqnit, termoelektrik və fotokatalitik xassələrini əhatə edir. O, material sintezi və interfeys mühəndisliyini eksperimental xarakterizasiya və nəzəri modelləşdirmə ilə birləşdirir."
      ],
      en: [
        "Ulkar Samadova is a physicist working in condensed-matter physics and sustainable-energy materials. She is a Senior Scientist in the Laboratory of Electrical Engineering and High Voltage Physics at the Institute of Physics of Azerbaijan's Ministry of Science and Education, and a Lecturer in Applied Mechanics at the Azerbaijan State Marine Academy.",
        "Her research spans photocatalytic CO₂ reduction, two-dimensional perovskite and chalcopyrite heterostructures, and the electrical, magnetic, thermoelectric, and photocatalytic properties of semiconductor and ferrite nanocomposites. She combines material synthesis and interface engineering with experimental characterization and theoretical modelling."
      ]
    },
    interests: {
      az: ["Fotokatalitik CO₂ reduksiyası", "Kondensə olunmuş maddə fizikası", "2D heterostrukturlar", "Yarımkeçirici materiallar", "Maqnit və termoelektrik xassələr"],
      en: ["Photocatalytic CO₂ reduction", "Condensed-matter physics", "2D heterostructures", "Semiconductor materials", "Magnetic & thermoelectric properties"]
    },
    links: [
      { labelKey: "email", text: "ulkar.samadova@adda.edu.az", url: "mailto:ulkar.samadova@adda.edu.az" },
      { labelKey: "orcid", url: "https://orcid.org/0000-0002-8564-9217" },
      { labelKey: "googleScholar", url: "https://scholar.google.com/citations?user=MW93RKoAAAAJ" }
    ],
    publications: [
      {
        "doi": "10.3390/e28060632",
        "title": "Insights of photocatalytic properties of Fe/TiO₂ bio-based particles: Experimental and modeling design toward methyl orange photodegradation",
        "authors": "Aleksandar Jovanović et al.",
        "year": 2026,
        "journal": "Entropy",
        "verification": "verified",
        "source": "https://www.mdpi.com/1099-4300/28/6/632",
        "citation": "Aleksandar Jovanović et al.. (2026). Insights of photocatalytic properties of Fe/TiO₂ bio-based particles: Experimental and modeling design toward methyl orange photodegradation. Entropy."
      },
      {
        "doi": "10.1002/smll.202407206",
        "title": "Novel single perovskite material for visible-light photocatalytic CO₂ reduction via joint experimental and DFT study",
        "authors": "Samadova, U. F., et al.",
        "year": 2025,
        "journal": "Small",
        "verification": "verified",
        "source": "https://pubmed.ncbi.nlm.nih.gov/39568297/",
        "citation": "Samadova, U. F., et al.. (2025). Novel single perovskite material for visible-light photocatalytic CO₂ reduction via joint experimental and DFT study. Small."
      },
      {
        "doi": "10.1016/j.apsusc.2024.162022",
        "title": "Dissociative mechanism from NH₃ and CH₄ on Ni-doped graphene: Tuning electronic and optical properties",
        "authors": "Amil Aligayev et al.",
        "year": 2025,
        "journal": "Applied Surface Science",
        "verification": "verified",
        "source": "https://www.sciencedirect.com/science/article/pii/S0169433224027387",
        "citation": "Amil Aligayev et al.. (2025). Dissociative mechanism from NH₃ and CH₄ on Ni-doped graphene: Tuning electronic and optical properties. Applied Surface Science."
      },
      {
        "doi": "10.1016/j.ijhydene.2024.12.515",
        "title": "Computational study of water adsorption and dissociative mechanisms impacting g-C₃N₄'s optical and electronic properties",
        "authors": "Amil Aligayev et al.",
        "year": 2025,
        "journal": "International Journal of Hydrogen Energy",
        "verification": "verified",
        "source": "https://www.sciencedirect.com/science/article/pii/S0360319925000023",
        "citation": "Amil Aligayev et al.. (2025). Computational study of water adsorption and dissociative mechanisms impacting g-C₃N₄'s optical and electronic properties. International Journal of Hydrogen Energy."
      }
    ]
  },
  nijat: {
    name: "Nijat Jabrayilov",
    roleKey: "roleAdvisory",
    image: "assets/nijat.webp?v=15",
    bio: {
      az: [
        "Nijat Jabrayilov kimya mühəndisi, analitik kimyaçı və ECOHUB Kimya və Biotexnologiya A.Ş.-də elmi-tədqiqat və inkişaf rəhbəridir. O, Sumqayıt Dövlət Universitetində Kimya mühəndisliyi üzrə bakalavr, Muğla Sıtkı Koçman Universitetində Analitik kimya üzrə magistr təhsili alıb və Sakarya Universitetində Analitik kimya üzrə doktorantdır.",
        "O, kənd təsərrüfatı tullantılarının dəyərləndirilməsi, biokütlə əsaslı materiallar, bioloji parçalana bilən polimerlər, fotokataliz, çirkab suların təmizlənməsi və davamlı kimyəvi texnologiyalar üzrə tədqiqat və pilot tətbiqləri əlaqələndirir. Təcrübəsi material sintezi, UV–Vis, FTIR, HPLC, GC, elektrokimyəvi sistemlər və universitet-sənaye əməkdaşlığını əhatə edir."
      ],
      en: [
        "Nijat Jabrayilov is a chemical engineer, analytical chemist, and R&D Manager at ECOHUB Kimya ve Biyoteknoloji A.Ş. He holds a BSc in Chemical Engineering from Sumgait State University and an MSc in Analytical Chemistry from Muğla Sıtkı Koçman University, and is pursuing a PhD in Analytical Chemistry at Sakarya University.",
        "He coordinates research and pilot applications in agricultural-waste valorisation, biomass-derived materials, biodegradable polymers, photocatalysis, wastewater treatment, and sustainable chemical technologies. His experience covers material synthesis, UV–Vis, FTIR, HPLC, GC, electrochemical systems, and university–industry collaboration."
      ]
    },
    interests: {
      az: ["Analitik kimya", "Funksional və nanostrukturlu materiallar", "Fotokataliz", "Biokütlənin dəyərləndirilməsi", "Bioloji parçalana bilən polimerlər", "Ətraf mühit texnologiyaları"],
      en: ["Analytical chemistry", "Functional & nanostructured materials", "Photocatalysis", "Biomass valorisation", "Biodegradable polymers", "Environmental technologies"]
    },
    links: [
      { labelKey: "orcid", url: "https://orcid.org/0000-0003-0331-0090" },
      { labelKey: "googleScholar", url: "https://scholar.google.com/citations?user=rKFDNfEAAAAJ&hl=tr&authuser=1" },
      { labelKey: "researchGate", url: "https://www.researchgate.net/profile/Nijat-Jabrayilov?ev=hdr_xprf" }
    ],
    publications: [
      {
        "doi": "10.1016/j.surfin.2026.110604",
        "title": "Precipitation-induced assembly of a g-C₅N₆–Ag nanohybrid catalyst for synergistic UV and visible-light-driven photocatalytic degradation of methylene blue",
        "authors": "Idrissa Compaore et al.",
        "year": 2026,
        "journal": "Surfaces and Interfaces",
        "verification": "verified",
        "source": "https://www.sciencedirect.com/science/article/pii/S2468023026021796",
        "citation": "Idrissa Compaore et al.. (2026). Precipitation-induced assembly of a g-C₅N₆–Ag nanohybrid catalyst for synergistic UV and visible-light-driven photocatalytic degradation of methylene blue. Surfaces and Interfaces."
      },
      {
        "doi": "10.1002/ceat.70234",
        "title": "Sn–Cu–Fe-doped graphitic g-C₃N₄ hetero photocatalyst for the removal of methylene blue",
        "authors": "Nijat Jabrayilov et al.",
        "year": 2026,
        "journal": "Chemical Engineering & Technology",
        "verification": "verified",
        "source": "https://onlinelibrary.wiley.com/doi/10.1002/ceat.70234",
        "citation": "Nijat Jabrayilov et al.. (2026). Sn–Cu–Fe-doped graphitic g-C₃N₄ hetero photocatalyst for the removal of methylene blue. Chemical Engineering & Technology."
      },
      {
        "doi": "10.1007/s10653-026-03072-4",
        "title": "Alterations in trace element profiles in gastric cancer tissues: Diagnostic biomarker potential and association with clinical stages",
        "authors": "Deniz Gezer et al.",
        "year": 2026,
        "journal": "Environmental Geochemistry and Health",
        "verification": "verified",
        "source": "https://pubmed.ncbi.nlm.nih.gov/41709064/",
        "citation": "Deniz Gezer et al.. (2026). Alterations in trace element profiles in gastric cancer tissues: Diagnostic biomarker potential and association with clinical stages. Environmental Geochemistry and Health."
      },
      {
        "doi": "10.1016/j.surfin.2025.107928",
        "title": "Controlled synthesis pathways of g-C₂N₃ derivatives for tailored structure and enhanced photocatalytic activity",
        "authors": "Nijat Jabrayilov et al.",
        "year": 2025,
        "journal": "Surfaces and Interfaces",
        "verification": "verified",
        "source": "https://www.sciencedirect.com/science/article/pii/S2468023025021790",
        "citation": "Nijat Jabrayilov et al.. (2025). Controlled synthesis pathways of g-C₂N₃ derivatives for tailored structure and enhanced photocatalytic activity. Surfaces and Interfaces."
      }
    ]
  },
  orkhan: {
    name: "Orkhan Jafarli",
    roleKey: "roleAdvisory",
    image: "assets/orkhan.webp?v=36",
    bio: {
      az: [
        "Orkhan Jafarli enerji mühəndisi, tədqiqatçı və Azərbaycan Dövlət Neft və Sənaye Universitetində doktorantdır. O, həmin universitetdə İstilik energetikası üzrə bakalavr və Bərpa olunan enerji mənbələri üzrə magistr dərəcələri alıb. Enerji sektorunda təxminən beş illik təcrübəsi var; Səngəçal Elektrik Stansiyasında növbə rəisi və Səngəçal bp Terminalında növbə elektrik mühəndisi kimi çalışıb. Hazırda Universal Energy-nin günəş elektrik stansiyasında fəaliyyət göstərir.",
        "Onun tədqiqatları enerji sistemləri, istilik enerjisi, bərpa olunan isitmə, enerji səmərəliliyi, istilik nasosları, geotermal və günəş enerjisi, mərkəzləşdirilmiş istilik təchizatı, model proqnozlaşdırıcı idarəetmə və enerji sistemlərinin optimallaşdırılmasını əhatə edir. Enerji sistemlərinin modelləşdirilməsini texniki-iqtisadi, ekoloji və optimallaşdırma yanaşmaları ilə birləşdirir; həmçinin Energy Conversion and Management: X və Renewable Energy jurnalları üçün rəyçi kimi fəaliyyət göstərir."
      ],
      en: [
        "Orkhan Jafarli is an energy engineer, researcher, and PhD student at Azerbaijan State Oil and Industry University. He holds a bachelor's degree in Thermal Power Engineering and a master's degree in Renewable Energy Sources from ASOIU. He has approximately five years of energy-sector experience, including work as a Shift Supervisor at the Sangachal Power Plant and a Shift Electrical Engineer at the Sangachal bp Terminal. He currently works at a solar power plant operated by Universal Energy.",
        "His research spans energy systems, thermal energy, renewable heating, energy efficiency, heat pumps, geothermal and solar energy, district heating, model predictive control, and energy-system optimization. He combines energy-system modelling with techno-economic, environmental, and optimization approaches and also reviews research for Energy Conversion and Management: X and Renewable Energy."
      ]
    },
    interests: {
      az: ["Enerji sistemlərinin modelləşdirilməsi", "Bərpa olunan enerji", "Enerji səmərəliliyi", "İstilik nasosları və geotermal enerji", "Günəş enerjisi və mərkəzləşdirilmiş istilik", "Model proqnozlaşdırıcı idarəetmə"],
      en: ["Energy-system modelling", "Renewable energy", "Energy efficiency", "Heat pumps & geothermal energy", "Solar energy & district heating", "Model predictive control"]
    },
    links: [
      { labelKey: "email", text: "orkhanjafarr@gmail.com", url: "mailto:orkhanjafarr@gmail.com" },
      { labelKey: "linkedIn", url: "https://www.linkedin.com/in/orkhan-jafarli-9188b71b4/" },
      { labelKey: "googleScholar", url: "https://scholar.google.com/citations?user=LxQSDdYAAAAJ&hl=ru" }
    ]
  },
  ibrahim: {
    name: "İbrahim Məmmədov",
    roleKey: "roleFounder",
    image: "assets/ibrahim.webp?v=10",
    bio: {
      az: [
        "İbrahim Məmmədov Azərbaycan Dövlət Neft və Sənaye Universitetində Elektrik mühəndisliyi üzrə bakalavr, Sənaye komplekslərinin avtomatlaşdırılması və elektrik intiqalı üzrə magistr təhsili alıb. Magistratura dövründə müxtəlif şirkətlərdə elektrik mühəndisi kimi çalışıb və inteqrasiya olunmuş monitorinq-idarəetmə sistemi vasitəsilə mancanaq dəzgahının səmərəliliyinin artırılmasını araşdırıb.",
        "Hazırda Sakarya Universitetində Elektrik və Elektronika Mühəndisliyi üzrə doktorantdır. Tədqiqatları bərk cisim fizikası, superkeçiricilər və yarımkeçiricilər üzərində cəmlənir. DFT və ilk prinsiplər hesablamaları ilə materialların struktur, elektron və fonon xassələrini, o cümlədən RT₃X₂ birləşmələrində yüksək superkeçiricilik keçid temperaturunu araşdırır."
      ],
      en: [
        "İbrahim Məmmədov holds a bachelor's degree in Electrical Engineering and a master's degree in Automation of Industrial Complexes and Electric Drives from Azerbaijan State Oil and Industry University. Alongside his graduate studies, he worked as an electrical engineer and researched efficiency improvement in sucker-rod pumping through an integrated monitoring and control system.",
        "He is currently a PhD candidate in Electrical and Electronics Engineering at Sakarya University. His research focuses on solid-state physics, superconductors, and semiconductors. Using density functional theory and first-principles calculations, he studies structural, electronic, and phonon properties, including high superconducting transition temperatures in RT₃X₂ compounds."
      ]
    },
    interests: {
      az: ["Bərk cisim fizikası", "DFT və ilk prinsiplər", "Superkeçirici materiallar", "Elektron və fonon xassələri"],
      en: ["Solid-state physics", "DFT & first principles", "Superconducting materials", "Electronic & phonon properties"]
    },
    links: [
      { labelKey: "email", text: "ibrahim.mammadov@azresearchsociety.org", url: "mailto:ibrahim.mammadov@azresearchsociety.org" },
      { labelKey: "linkedIn", url: "https://www.linkedin.com/in/ibrahim-mammadov2024/" },
      { labelKey: "googleScholar", url: "https://scholar.google.com/citations?hl=en&user=jq8s5RAAAAAJ" }
    ]
  },
  masud: {
    name: "Məsud Babayev",
    roleKey: "roleCofounder",
    image: "assets/masud.webp?v=33",
    bio: {
      az: [
        "Məsud Babayev Azərbaycan Dövlət Neft və Sənaye Universitetində Neft-qaz mühəndisliyi üzrə bakalavr, Xəzər Universitetində Neft-qaz yataqlarının işlənilməsi üzrə magistr təhsili alıb. Magistratura dövründə SOCAR-da mühəndis kimi çalışıb.",
        "Hazırda Kral Fəhd Neft və Minerallar Universitetinin (KFUPM) Neft Mühəndisliyi və Yer Elmləri Kollecində doktorant, Mikroflüidika laboratoriyasında elmi-tədqiqat assistenti və universitetdə tədris assistentidir. Tədqiqatları qaz hidratlarının nüvələnmə kinetikası, CO₂ sekvestrasiyası üçün CH₄-CO₂ əvəzlənməsi, molekulyar dinamika, lay simulyasiyası, qeyri-müəyyənliyin qiymətləndirilməsi, SAGD və neft-mədən sistemlərinin optimallaşdırılmasını əhatə edir."
      ],
      en: [
        "Masud Babayev holds a bachelor's degree in Petroleum Engineering from Azerbaijan State Oil and Industry University and a master's degree in Oil and Gas Field Development from Khazar University. During his graduate studies, he worked as an engineer at SOCAR.",
        "He is currently a PhD student at the College of Petroleum Engineering and Geosciences at King Fahd University of Petroleum and Minerals (KFUPM), a research assistant in the Microfluidics Laboratory, and a teaching assistant. His research spans gas-hydrate nucleation kinetics, CH₄-CO₂ replacement for carbon sequestration, molecular dynamics, reservoir simulation, uncertainty assessment, SAGD, and optimization of oilfield systems."
      ]
    },
    interests: {
      az: ["Qaz hidratları", "Molekulyar dinamika", "Lay modelləşdirilməsi", "CO₂ sekvestrasiyası", "SAGD optimallaşdırılması"],
      en: ["Gas hydrates", "Molecular dynamics", "Reservoir modelling", "CO₂ sequestration", "SAGD optimization"]
    },
    links: [
      { labelKey: "email", text: "masud.babayev@azresearchsociety.org", url: "mailto:masud.babayev@azresearchsociety.org" },
      { labelKey: "linkedIn", url: "https://www.linkedin.com/in/masudbabayev" },
      { labelKey: "googleScholar", url: "https://scholar.google.com/citations?view_op=list_works&hl=en&user=AyVFs9oAAAAJ" }
    ],
    publications: [
      {
        "doi": "10.5510/OGP2024SI101005",
        "title": "Energy and efficiency optimization in sucker-rod pumping using discrete-imitation modeling concept: Application to well operations in the Bibi-Eibat field of Azerbaijan",
        "authors": "Jamalbayov, M. A., Valiyev, N. A., Ibrahimov, Kh. M., Babayev, M. M., & Novruzova, S. H.",
        "year": 2024,
        "journal": "SOCAR Proceedings",
        "verification": "verified",
        "source": "https://proceedings.socar.az/uploads/pdf/103/095_101_OGP2024SI101005%2B.pdf",
        "citation": "Jamalbayov, M. A., Valiyev, N. A., Ibrahimov, Kh. M., Babayev, M. M., & Novruzova, S. H.. (2024). Energy and efficiency optimization in sucker-rod pumping using discrete-imitation modeling concept: Application to well operations in the Bibi-Eibat field of Azerbaijan. SOCAR Proceedings."
      },
      {
        "doi": "10.14800/IOGR.1305",
        "title": "Enhancing SAGD efficiency: A study on steam quality and injection rate optimization",
        "authors": "Babayev, M., Penkov, G., & Asadov, S.",
        "year": 2024,
        "journal": "Improved Oil and Gas Recovery",
        "verification": "verified",
        "source": "https://smartscitech.com/index.php/IOGR/article/view/1305",
        "citation": "Babayev, M., Penkov, G., & Asadov, S.. (2024). Enhancing SAGD efficiency: A study on steam quality and injection rate optimization. Improved Oil and Gas Recovery."
      },
      {
        "doi": "10.1021/acs.jpcb.5c07438",
        "title": "Minimizing dissolution effects in CO₂-water interfacial tension measurements using the rising pendant drop method",
        "authors": "Yu, W., Babayev, M., & Sultan, A. S.",
        "year": 2026,
        "journal": "The Journal of Physical Chemistry B",
        "verification": "verified",
        "source": "https://pubs.acs.org/doi/10.1021/acs.jpcb.5c07438",
        "citation": "Yu, W., Babayev, M., & Sultan, A. S.. (2026). Minimizing dissolution effects in CO₂-water interfacial tension measurements using the rising pendant drop method. The Journal of Physical Chemistry B."
      }
    ]
  },
  xeyranse: {
    name: "Xeyrənsə Rüstəmova",
    roleKey: "roleClinical",
    image: "assets/xeyranse.webp?v=24",
    bio: {
      az: [
        "Xeyrənsə Rüstəmova 2018–2022-ci illərdə Bakı Dövlət Universitetində Sosial elmlər və psixologiya ixtisası üzrə bakalavr, 2023–2025-ci illərdə Odlar Yurdu Universitetində Klinik psixologiya üzrə magistr təhsili alıb. Magistratura təhsili ilə paralel olaraq bir sıra kurs və beynəlxalq təlimlərdə iştirak edib.",
        "2025-ci ildən Xəzər Tibb Mərkəzinin Poliklinika şöbəsində psixoloq kimi fəaliyyət göstərir, yeniyetmə və böyüklərlə onlayn və üz-üzə seanslar keçirir. Klinik psixologiya, psixoterapiya və klinik qiymətləndirmə ilə maraqlanır; praktik biliklərini hal müzakirələri, klinik yanaşmalar və praktik yönümlü təlimlər vasitəsilə tələbələrlə bölüşməyi hədəfləyir."
      ],
      en: [
        "Xeyrənsə Rüstəmova earned a bachelor's degree in Social Sciences and Psychology from Baku State University in 2018–2022 and a master's degree in Clinical Psychology from Odlar Yurdu University in 2023–2025. Alongside her graduate studies, she completed a range of courses and international training programs.",
        "Since 2025, she has worked as a psychologist in the outpatient department of Khazar Medical Center, providing online and in-person sessions for adolescents and adults. Her interests include clinical psychology, psychotherapy, and clinical assessment; she aims to share practical knowledge through case discussions, clinical approaches, and practice-oriented training that strengthens students' clinical thinking and practical skills."
      ]
    },
    interests: {
      az: ["Klinik psixologiya", "Psixoterapiya", "Klinik qiymətləndirmə"],
      en: ["Clinical psychology", "Psychotherapy", "Clinical assessment"]
    },
    links: []
  },
  humay: {
    name: "Humay Zeynalova",
    roleKey: "roleResearch",
    image: "assets/humay.webp?v=10",
    bio: {
      az: [
        "Humay Zeynalova Koç Universitetində Mexanika mühəndisliyi üzrə bakalavr təhsili alıb və Imperial College London-da Mexanika mühəndisliyi üzrə magistr təhsilini davam etdirir. O, Azərbaycan Respublikasının Dövlət Proqramı təqaüdçüsüdür.",
        "Təhsil müddətində istehsalat təcrübələri keçib, mexanika mühəndisliyi klubunda rəhbərlik edib və tələbələrin peşəkar inkişafına yönələn layihələr təşkil edib. Universitetin dron komandasında fəaliyyəti onun aerodinamika, hesablama maye mexanikası və multidissiplinar dizayna marağını gücləndirib."
      ],
      en: [
        "Humay Zeynalova holds a bachelor's degree in Mechanical Engineering from Koç University and is pursuing a master's degree in Mechanical Engineering at Imperial College London. She is a recipient of Azerbaijan's State Program scholarship.",
        "Her experience includes industrial placements, leadership in a mechanical engineering club, and organizing student professional-development initiatives. Work with her university's drone team deepened her interests in aerodynamics, computational fluid dynamics, and multidisciplinary design."
      ]
    },
    interests: {
      az: ["Maye mexanikası", "Hesablama maye mexanikası", "Turbulent axınlar", "Maşın dizaynı"],
      en: ["Fluid mechanics", "Computational fluid dynamics", "Turbulent flows", "Machine design"]
    },
    links: [
      { labelKey: "email", text: "humay.zeynalova@azresearchsociety.org", url: "mailto:humay.zeynalova@azresearchsociety.org" },
      { labelKey: "linkedIn", url: "https://www.linkedin.com/in/humayzeynalova/" }
    ]
  },
  jale: {
    name: "Jalə Əhmədova",
    roleKey: "roleComms",
    image: "assets/jale.webp?v=10",
    bio: {
      az: [
        "Jalə Əhmədova Azərbaycan Dillər Universitetində İngilis dili müəllimliyi üzrə bakalavr, Vytautas Magnus Universiteti və Johannes Gutenberg Universitetində Sosiolinqvistika və Multilinqvizm üzrə birgə magistr təhsili alıb. Magistratura çərçivəsində Stockholm Universitetində mübadilə proqramında iştirak edib.",
        "Onun peşəkar təcrübəsi təhsil və akademik idarəçilik sahələrini əhatə edir. Tədqiqat maraqları azərbaycanlı çoxdilli danışanların gündəlik ünsiyyətdə dillər arasında keçidi, bu təcrübələrə münasibət, dil variasiyası və dil istifadəsində dəyişikliklər üzərində cəmlənir."
      ],
      en: [
        "Jalə Əhmədova holds a bachelor's degree in English Language Teaching from Azerbaijan University of Languages and a joint master's degree in Sociolinguistics and Multilingualism from Vytautas Magnus University and Johannes Gutenberg University. Her graduate studies also included an exchange at Stockholm University.",
        "Her professional experience spans education and academic administration. Her research interests focus on multilingual Azerbaijani speakers, everyday code-switching, attitudes toward multilingual practices, language variation, and changes in language use."
      ]
    },
    interests: {
      az: ["Sosiolinqvistika", "Multilinqvizm və dil təması", "Kod-dəyişmə", "Dil variasiyası və ideologiyaları"],
      en: ["Sociolinguistics", "Multilingualism & language contact", "Code-switching", "Language variation & ideologies"]
    },
    links: [
      { labelKey: "email", text: "zhala.ahmadova@azresearchsociety.org", url: "mailto:zhala.ahmadova@azresearchsociety.org" },
      { labelKey: "linkedIn", url: "https://www.linkedin.com/in/zhala-artemis-ahmadova-a09b4b172/" }
    ]
  },
  nargiz: {
    name: "Nargiz Ismayilli",
    roleKey: "roleProject",
    image: "assets/nargiz.webp?v=10",
    bio: {
      az: [
        "Nargiz Ismayilli Xəzər Universitetində Kimya və biologiya müəllimliyi üzrə təhsil alıb. Westlake Summer School çərçivəsində Çində neyroelm və neyrotexnologiya laboratoriyasında qonaq tələbə kimi tədqiqat mühitini müşahidə edib, həmçinin genetika və biokimya laboratoriyalarında praktiki təcrübə qazanıb.",
        "O, Women in Tech Central Asia & Caucasus proqramının Aspiring Teen kateqoriyasında finalist olub, Qazaxıstanda Azərbaycanı təmsil edib və Dubayda Youth Dialogue Forum-a seçilən azərbaycanlı iştirakçı olub. İki dəfə Technest təqaüdü qazanıb və One Health konfransında ekoloji çirklənmənin beyin sağlamlığına təsiri barədə elmi abstrakt təqdim edib."
      ],
      en: [
        "Nargiz Ismayilli studied Chemistry and Biology Education at Khazar University. Through Westlake Summer School in China, she observed research in a neuroscience and neurotechnology laboratory as a visiting student and gained practical experience in genetics and biochemistry laboratories.",
        "She was a finalist in the Women in Tech Central Asia & Caucasus Aspiring Teen category, represented Azerbaijan in Kazakhstan, and was selected as an Azerbaijani participant in the Youth Dialogue Forum in Dubai. She has twice received a Technest scholarship and presented a scientific abstract on environmental pollution and brain health at a One Health conference."
      ]
    },
    interests: {
      az: ["Neyroelm və neyrotexnologiya", "Bioinformatika və data elmi", "Hesablama biologiyası", "Molekulyar və hüceyrəvi tədqiqatlar"],
      en: ["Neuroscience & neurotechnology", "Bioinformatics & data science", "Computational biology", "Molecular & cellular research"]
    },
    links: [
      { labelKey: "email", text: "nargiz.ismayilli@azresearchsociety.org", url: "mailto:nargiz.ismayilli@azresearchsociety.org" },
      { labelKey: "linkedIn", url: "https://www.linkedin.com/in/nargiz-ismay%C4%B1ll%C4%B1/" }
    ]
  },
  zehra: {
    name: "Zəhra Omarova",
    roleKey: "roleAdmin",
    image: "assets/zehra.webp?v=10",
    bio: {
      az: [
        "Zəhra Omarova Xəzər Universitetində Neft-qaz mühəndisliyi üzrə bakalavr tələbəsidir. O, SPE Khazar, IMechE Khazar və SEG tələbə bölmələrində fəal iştirak edib və SEG Khazar Student Chapter-in prezidenti kimi fəaliyyət göstərib.",
        "EAGE Local Chapter Azerbaijan çərçivəsində GR karotaj məlumatları və qazma parametrlərindən, eləcə də maşın öyrənməsi metodlarından istifadə etməklə məsaməliliyin proqnozlaşdırılmasını araşdırıb. Maraqları lay modelləşdirilməsi, hasilatın optimallaşdırılması, maşın öyrənməsi və lay parametrlərinin proqnozlaşdırılmasını əhatə edir."
      ],
      en: [
        "Zəhra Omarova is an undergraduate Petroleum Engineering student at Khazar University. She has been active in the SPE Khazar, IMechE Khazar, and SEG student chapters and has served as president of the SEG Khazar Student Chapter.",
        "Through EAGE Local Chapter Azerbaijan, she researched porosity prediction using gamma-ray logs, drilling parameters, and machine-learning methods. Her interests include reservoir modelling, production optimization, machine learning, and reservoir-parameter prediction."
      ]
    },
    interests: {
      az: ["Lay modelləşdirilməsi", "Maşın öyrənməsi", "Hasilatın optimallaşdırılması", "Lay parametrlərinin proqnozu"],
      en: ["Reservoir modelling", "Machine learning", "Production optimization", "Reservoir-parameter prediction"]
    },
    links: [
      { labelKey: "email", text: "zahra.omarova@azresearchsociety.org", url: "mailto:zahra.omarova@azresearchsociety.org" },
      { labelKey: "linkedIn", url: "https://www.linkedin.com/in/zahra-omarova-9040ba297/" }
    ]
  },

  "ayten-merdanova": {
    "name": "Aytən Mərdanova",
    "roleKey": "roleAdvisory",
    "image": "assets/ayten-merdanova.webp?v=36",
    "bio": {
      "az": [
        "Aytən Mərdanova analitik kimya və ümumi kimya üzrə mütəxəssis və tədqiqatçıdır. Gəncə Dövlət Universitetində kimya müəllimliyi üzrə bakalavr və analitik kimya üzrə magistr təhsili alıb. 2018–2025-ci illərdə İstanbul Universiteti-Cerrahpaşada analitik kimya üzrə doktorantura təhsili alıb.",
        "Tədqiqat maraqları analitik metodların hazırlanması və instrumental analiz üsullarını əhatə edir. HPLC, FT-IR, spektroflüorimetriya və spektrofotometriya ilə işləyir və spektroflüorimetriya üzrə elmi nəşri var.",
        "Doktorantura dövründə tədqiqat layihələrində iştirak edib. İşlərindən biri canlı xərçəng hüceyrələrində hipoxlorit turşusunun aşağı konsentrasiyalarda təyini üçün yeni spektroflüorimetrik metodun hazırlanmasını və digər biokimyəvi birləşmələrin təyinə təsirinin araşdırılmasını əhatə edib."
      ],
      "en": [
        "Aytən Mərdanova is a specialist and researcher in analytical and general chemistry. She holds a bachelor’s degree in Chemistry Teaching and a master’s degree in Analytical Chemistry from Ganja State University. She undertook doctoral studies in Analytical Chemistry at Istanbul University-Cerrahpaşa from 2018 to 2025.",
        "Her research interests include analytical method development and instrumental analysis. She works with HPLC, FT-IR, spectrofluorometry and spectrophotometry, and has a scientific publication in spectrofluorometry.",
        "During her doctoral studies, she participated in research projects, including the development of a new spectrofluorometric method for detecting low concentrations of hypochlorous acid in living cancer cells and investigating interference from other biochemical compounds."
      ]
    },
    "interests": {
      "az": [
        "Analitik və ümumi kimya",
        "Analitik metodların hazırlanması",
        "Instrumental analiz",
        "HPLC və FT-IR",
        "Spektroflüorimetriya və spektrofotometriya"
      ],
      "en": [
        "Analytical & general chemistry",
        "Analytical method development",
        "Instrumental analysis",
        "HPLC & FT-IR",
        "Spectrofluorometry & spectrophotometry"
      ]
    },
    "links": []
  },
  "orxan-refiyev": {
    "name": "Orxan Rəfiyev",
    "roleKey": "roleAdvisory",
    "image": "assets/orxan-refiyev.webp?v=36",
    "bio": {
      "az": [
        "Orxan Rəfiyev kompüter mühəndisi, verilənlər bazası mütəxəssisi və tədqiqatçıdır. ADA Universitetində kompüter mühəndisliyi üzrə bakalavr (GPA 3.80) və dövlət idarəçiliyi üzrə magistr təhsili alıb. Texas A&M Beynəlxalq Universitetində və Vytautas Magnus Universitetində mübadilə semestrləri keçib. London İmperial Kollecində MSc Geo-Energy with Machine Learning and Data Science proqramı üzrə təhsil alır.",
        "Milli Aviasiya Akademiyasında 3338.01 — “Sistemli analiz, idarəetmə və informasiyanın işlənməsi” ixtisası üzrə “Alternativ enerji mənbələrinin süni intellektlə sistemli analizi və idarə edilməsi” mövzusunda iddiaçıdır.",
        "Onun işi kompüter mühəndisliyi və verilənlər elmini enerji sistemlərinin modelləşdirilməsi və süni intellektlə birləşdirir. Magistr tədqiqat layihəsini SLB-nin Abinqdon Texnologiya Mərkəzində iterativ əlaqəli lay-geomexaniki simulyasiya mövzusunda yerinə yetirib. IKTEX MMC-də iki ildən artıq PostgreSQL verilənlər bazası administratoru kimi çalışıb."
      ],
      "en": [
        "Orxan Rəfiyev is a computer engineer, database specialist and researcher. He holds a bachelor’s degree in Computer Engineering (GPA 3.80) and a master’s degree in Public Administration from ADA University. He completed exchange semesters at Texas A&M International University and Vytautas Magnus University. He is studying on the MSc Geo-Energy with Machine Learning and Data Science programme at Imperial College London.",
        "He is pursuing doctoral research at the National Aviation Academy under speciality 3338.01 — Systems Analysis, Control and Information Processing — on the systematic analysis and management of alternative energy sources using artificial intelligence.",
        "His work connects computer engineering and data science with energy-system modelling and artificial intelligence. He carried out his master’s research project on iteratively coupled reservoir–geomechanical simulation at SLB’s Abingdon Technology Centre. He worked for more than two years as a PostgreSQL database administrator at IKTEX LLC."
      ]
    },
    "interests": {
      "az": [
        "Alternativ enerji mənbələrinin sistemli analizi",
        "Enerji sistemlərində süni intellekt və maşın öyrənməsi",
        "Ağıllı şəbəkə, SCADA və enerji idarəetmə sistemləri",
        "Enerji sistemlərində kibertəhlükəsizlik",
        "Lay geomexanikası və enerji sistemlərinin modelləşdirilməsi"
      ],
      "en": [
        "Systems analysis of alternative energy sources",
        "AI & machine learning in energy systems",
        "Smart grids, SCADA & energy management systems",
        "Cybersecurity in energy systems",
        "Reservoir geomechanics & energy-system modelling"
      ]
    },
    "links": []
  },
  "ali-madayen": {
    "name": "Dr. Ali Madayen",
    "roleKey": "roleAdvisory",
    "image": "assets/ali-madayen.webp?v=36",
    "bio": {
      "az": [
        "Ali Madayen maşın mühəndisliyi üzrə fəlsəfə doktoru və tədqiqatçıdır. O, Təbriz Universitetində magistr, Orta Doğu Texniki Universitetində (METU) isə doktorantura təhsili alıb və 2026-cı ildə maşın mühəndisliyi üzrə fəlsəfə doktoru elmi dərəcəsini əldə edib. Onun akademik və peşəkar fəaliyyəti hesablama mexanikası, maye mexanikası, biofluid mexanikası və mexaniki qan dövranı dəstəyi cihazlarının mühəndisliyi istiqamətlərini əhatə edir.",
        "Onun işi mühəndislik mexanikasını hesablama maye dinamikası (CFD), turbulent və sıxılan axınlar, aerodinamika, istilik və kütlə ötürülməsi, ürək-damar fiziologiyası və tibbi cihazların modelləşdirilməsi ilə birləşdirir. O, ventrikulyar yardım cihazlarının (VAD) dizaynı və optimallaşdırılması, qan axınının və hemolizin hesablanması, xəstəyə uyğun mexaniki qan dövranı dəstəyi sistemləri və çoxmiqyaslı ürək-damar modelləşdirilməsi sahələrində tədqiqat təcrübəsinə malikdir. Bundan əlavə, o, CFD kodları hazırlayır, maye-bərk cisim qarşılıqlı təsiri (FSI) məsələlərini simulyasiya edir və turbulent axınların modelləşdirilməsi üzərində işləyir."
      ],
      "en": [
        "Ali Madayen holds a PhD in Mechanical Engineering and is a researcher. He earned his master’s degree at the University of Tabriz and completed his doctorate at Middle East Technical University (METU) in 2026. His academic and professional work spans computational mechanics, fluid mechanics, biofluid mechanics and the engineering of mechanical circulatory support devices.",
        "His work connects engineering mechanics with computational fluid dynamics (CFD), turbulent and compressible flows, aerodynamics, heat and mass transfer, cardiovascular physiology and medical-device modelling. His experience includes ventricular assist device (VAD) design and optimisation, blood-flow and haemolysis calculations, patient-specific circulatory support and multiscale cardiovascular modelling. He also develops CFD codes, simulates fluid–structure interaction (FSI) and studies turbulence modelling."
      ]
    },
    "interests": {
      "az": [
        "Hesablama maye dinamikası (CFD)",
        "Maye-bərk cisim qarşılıqlı təsiri (FSI)",
        "Turbulent axınlar və turbulentliyin modelləşdirilməsi",
        "Sıxılan axınlar",
        "Aerodinamika",
        "Biofluid mexanikası",
        "Mexaniki qan dövranı dəstəyi cihazları",
        "Ventrikulyar yardım cihazları (VAD)",
        "Qan uyğunluğu və hemoliz",
        "Ürək-damar sistemlərinin hesablama modelləşdirilməsi",
        "İstilik və kütlə ötürülməsi",
        "Cihaz dizaynı və optimallaşdırılması",
        "Mikroölçülü biofluidika"
      ],
      "en": [
        "Computational fluid dynamics (CFD)",
        "Fluid–structure interaction (FSI)",
        "Turbulent flows & turbulence modelling",
        "Compressible flows",
        "Aerodynamics",
        "Biofluid mechanics",
        "Mechanical circulatory support devices",
        "Ventricular assist devices (VAD)",
        "Haemocompatibility & haemolysis",
        "Computational cardiovascular modelling",
        "Heat & mass transfer",
        "Device design & optimisation",
        "Microscale biofluidics"
      ]
    },
    "links": [],
    "publications": [
      {
        "doi": "10.1007/s10439-025-03834-8",
        "title": "Optimized FDA Blood Pump: A Case Study in System-Level Customized Ventricular Assist Device Designs",
        "authors": "Canberk Yıldırım et al.",
        "year": 2025,
        "journal": "Annals of Biomedical Engineering",
        "verification": "verified",
        "source": "https://link.springer.com/article/10.1007/s10439-025-03834-8",
        "citation": "Canberk Yıldırım et al.. (2025). Optimized FDA Blood Pump: A Case Study in System-Level Customized Ventricular Assist Device Designs. Annals of Biomedical Engineering."
      }
    ]
  },
  "natiq-soltanov": {
    "name": "Natiq Soltanov",
    "roleKey": "roleAdvisory",
    "image": "assets/natiq-soltanov.webp?v=36",
    "bio": {
      "az": [
        "Natiq Soltanov İstanbul Texniki Universitetində doktorantdır. O, bakalavr təhsilini Bakı Ali Neft Məktəbində Neft və Qaz Mühəndisliyi ixtisası üzrə, magistratura təhsilini isə İstanbul Texniki Universitetində Neft və  Qaz Mühəndisliyi üzrə tamamlamışdır. Magistratura tədqiqatında yeraltı qaz anbarlarında CO₂-nin yastıq qazı kimi istifadəsini ədədi modelləşdirmə üsulları ilə araşdırmışdır.",
        "Hazırda İstanbul Texniki Universitetində doktorantura təhsilini davam etdirir. Onun tədqiqatları CO₂-nin geoloji saxlanması, peridotit süxurlarında mineral karbonlaşma, reaktiv axın modelləşdirilməsi və maşın öyrənməsi metodlarının bu proseslərin proqnozlaşdırılmasında tətbiqinə yönəlmişdir. "
      ],
      "en": [
        "Natiq Soltanov is a PhD student at Istanbul Technical University. He earned his bachelor’s degree in Petroleum Engineering at Baku Higher Oil School and his master’s degree in Petroleum Engineering at Istanbul Technical University. His master’s research used numerical modelling to investigate CO₂ as cushion gas in underground gas storage.",
        "His doctoral research focuses on geological CO₂ storage, mineral carbonation in peridotite rocks, reactive-flow modelling and the application of machine learning to predicting these processes."
      ]
    },
    "interests": {
      "az": [
        "CO₂-nin geoloji saxlanması və mineral karbonlaşma",
        "Reaktiv axın və rezervuar modelləşdirilməsi",
        "Peridotit formasiyalarında CO₂ mineralizasiyası",
        "Maşın öyrənməsi və məlumat əsaslı proqnozlaşdırma",
        "Karbon tutma, istifadə və saxlanması (CCUS)"
      ],
      "en": [
        "Geological CO₂ storage & mineral carbonation",
        "Reactive-flow & reservoir modelling",
        "CO₂ mineralisation in peridotite formations",
        "Machine learning & data-driven prediction",
        "Carbon capture, utilisation & storage (CCUS)"
      ]
    },
    "links": [
      {
        "labelKey": "linkedIn",
        "url": "https://www.linkedin.com/in/natigsoltanov/"
      },
      {
        "labelKey": "googleScholar",
        "url": "https://scholar.google.com/citations?user=thBFvswAAAAJ&hl=en"
      }
    ],
    "publications": [
      {
        "doi": "10.2118/232354-MS",
        "title": "Rapid CO₂ Mineralization in Oman's Peridotite Formation: Insights from Reactive Transport Simulation",
        "authors": "N. Soltanov et al.",
        "year": 2026,
        "journal": "SPE Conference at Oman Petroleum & Energy Show",
        "verification": "verified",
        "source": "https://research.itu.edu.tr/en/publications/rapid-cosub2sub-mineralization-in-omans-peridotite-formation-insi/",
        "citation": "N. Soltanov et al.. (2026). Rapid CO₂ Mineralization in Oman's Peridotite Formation: Insights from Reactive Transport Simulation. SPE Conference at Oman Petroleum & Energy Show."
      }
    ]
  },
  "shamxal-baybekov": {
    "name": "Dr. Şamxal Baybekov",
    "roleKey": "roleAdvisory",
    "image": "assets/shamxal-baybekov.webp?v=36",
    "bio": {
      "az": [
        "Şamxal Baybekov kimya üzrə fəlsəfə doktoru, kemoinformatika üzrə mütəxəssisdir. O, Bakı Mühəndislik Universitetində kimya mühəndisliyi üzrə bakalavr təhsili alıb, Strasburq Universitetində kompleks sistemlərin kimyası üzrə magistr təhsili alıb və kemoinformatika üzrə doktorantura təhsilini tamamlayıb. Hazırda Insilico Medicine şirkətində kemoinformatika üzrə verilənlər elmi mütəxəssisi, eyni zamanda Azərbaycan Dövlət Neft və Sənaye Universitetinin Kemoinformatika və Hesablama Kimyası tədqiqat qrupunda böyük elmi işçi kimi fəaliyyət göstərir.",
        "Onun işi süni intellekt, informatika və verilənlər elmi metodlarının kimyəvi problemlərin həllinə tətbiqinə yönəlib. Bura ADMET, fiziki-kimyəvi və bioloji xassələri proqnozlaşdıran maşın öyrənməsi modellərinin hazırlanması, kimyəvi fəzanın tədqiqi və təhlili, eləcə də eksperimental tədqiqatçıların istifadə edəcəyi kemoinformatika alətlərinin hazırlanması daxildir. O, həmçinin Fransa və Azərbaycanda çalışan tədqiqatçıları birləşdirən ALİM Elmi Assosiasiyasının (Association Scientifique ALİM) üzvüdür."
      ],
      "en": [
        "Shamkhal Baybekov holds a PhD in Chemistry and is a specialist in cheminformatics. He earned a bachelor's degree in chemical engineering from Baku Engineering University, a master's degree in complex systems chemistry from the University of Strasbourg, and completed his doctoral studies in cheminformatics. He currently works as a Cheminformatics Data Scientist at Insilico Medicine and, at the same time, as a Senior Researcher in the Cheminformatics and Computational Chemistry research group at the Azerbaijan State Oil and Industry University.",
        "His work focuses on applying artificial intelligence, informatics, and data science methods to solving chemical problems. This includes developing machine learning models that predict ADMET, physicochemical, and biological properties; exploring and analyzing chemical space; and developing cheminformatics tools for use by experimental researchers. He is also a member of the Scientific Association ALIM (Association Scientifique ALIM), which brings together researchers working in France and Azerbaijan."
      ]
    },
    "interests": {
      "az": [
        "Kemoinformatika",
        "QSAR/QSPR modelləşdirməsi",
        "Dərman kəşfində süni intellekt və maşın öyrənməsi",
        "İzah edilə bilən süni intellekt",
        "Kimyəvi fəzanın analizi"
      ],
      "en": [
        "Cheminformatics",
        "QSAR/QSPR modelling",
        "AI & machine learning in drug discovery",
        "Explainable artificial intelligence",
        "Chemical space analysis"
      ]
    },
    "links": [
      {
        "labelKey": "email",
        "url": "mailto:baybekov.shamkhal@gmail.com"
      },
      {
        "labelKey": "linkedIn",
        "url": "https://www.linkedin.com/in/shamkhal-baybekov/"
      },
      {
        "labelKey": "researchGate",
        "url": "https://www.researchgate.net/profile/Shamkhal-Baybekov-2"
      },
      {
        "labelKey": "googleScholar",
        "url": "https://scholar.google.com/citations?user=l-3hVW0AAAAJ&hl=en"
      }
    ]
  },
  "senan-goyushlu": {
    "name": "Sənan Göyüşlü",
    "roleKey": "roleAdvisory",
    "image": "assets/senan-goyushlu.webp?v=36",
    "bio": {
      "az": [
        "Sənan Sərdar oğlu Göyüşlü texnika elmləri üzrə fəlsəfə doktoru proqramının doktorantı, kimya mühəndisi və tədqiqatçıdır. O, Azərbaycan Dövlət Neft və Sənaye Universitetində SABAH qrupunda Kimya mühəndisliyi üzrə bakalavr, Sumqayıt Dövlət Universitetində “Əsas üzvi sintezin kimyası və texnologiyası” üzrə magistr, həmçinin Azərbaycan Dövlət Neft və Sənaye Universitetində “Neftin emalı” üzrə fərqlənmə diplomu ilə magistr təhsili almışdır. Hazırda akademik Y.H. Məmmədəliyev adına Neft-Kimya Prosesləri İnstitutunda “Neft, qaz və kömürün emalı və texnologiyası” istiqaməti üzrə elmi tədqiqatlar aparır və neft emalı sahəsində peşəkar təcrübəyə malikdir. Onun əsas elmi maraqları polimer-modifikasiya olunmuş bitumların alınması, struktur-reoloji və termiki xassələrinin tədqiqi, həmçinin bitum üçün yeni polimer əsaslı əlavələrin işlənib hazırlanmasıdır.",
        "Web of Science ResearcherID: PXX-1088-2026."
      ],
      "en": [
        "Sənan Sərdar oğlu Göyüşlü is a doctoral researcher in technical sciences, a chemical engineer and a researcher. He earned a bachelor’s degree in Chemical Engineering through the SABAH programme at Azerbaijan State Oil and Industry University, a master’s degree in the Chemistry and Technology of Basic Organic Synthesis at Sumgait State University, and a further master’s degree in Petroleum Refining with distinction at Azerbaijan State Oil and Industry University. He conducts research in petroleum, gas and coal processing technology at the Y. H. Mammadaliyev Institute of Petrochemical Processes and has professional experience in petroleum refining. His main interests are polymer-modified bitumen, its structural, rheological and thermal properties, and new polymer-based bitumen additives.",
        "Web of Science ResearcherID: PXX-1088-2026."
      ]
    },
    "interests": {
      "az": [
        "Neftin emalı və neft-kimya texnologiyaları",
        "Bitum və polimer-modifikasiya olunmuş bitumlar",
        "Sintetik termoelastoplastlar və polimer əlavələr",
        "Bitumun reoloji, struktur və termiki xassələri",
        "Termiki analiz (TGA, DTA, DTG)",
        "Neft məhsullarının keyfiyyətinin və istismar xassələrinin yaxşılaşdırılması",
        "Kimya mühəndisliyi və proses texnologiyaları"
      ],
      "en": [
        "Petroleum refining & petrochemical technologies",
        "Bitumen & polymer-modified bitumen",
        "Synthetic thermoplastic elastomers & polymer additives",
        "Rheological, structural & thermal properties of bitumen",
        "Thermal analysis (TGA, DTA, DTG)",
        "Quality & performance of petroleum products",
        "Chemical engineering & process technologies"
      ]
    },
    "links": [
      {
        "labelKey": "linkedIn",
        "url": "https://www.linkedin.com/in/sanan-goyushlu-026399432/"
      },
      {
        "labelKey": "orcid",
        "url": "https://orcid.org/0009-0003-8633-7930"
      }
    ],
    "publications": [
      {
        "doi": "10.1039/D6RA03668f",
        "title": "Influence of polymer additives on the rheological properties of bitumens",
        "authors": "Leylufer I. Aliyeva; Sanan S. Goyushlu",
        "year": 2026,
        "journal": "RSC Advances",
        "verification": "verified",
        "source": "https://pubmed.ncbi.nlm.nih.gov/42491544/",
        "citation": "Leylufer I. Aliyeva; Sanan S. Goyushlu. (2026). Influence of polymer additives on the rheological properties of bitumens. RSC Advances."
      },
    ]
  },
  "elshen-abdullayev": {
    "name": "Elşən Abdullayev",
    "roleKey": "roleAdvisory",
    "image": "assets/elshen-abdullayev.webp?v=36",
    "bio": {
      "az": [
        "Elşən Abdullayev diaqnostik radioloq (MD) və tədqiqatçıdır. O, Azərbaycan Tibb Universitetində təhsil alıb, diaqnostik radiologiya sahəsində 15 ildən artıq təcrübəyə malikdir. Hazırda Qətər Əmirliyində Apex Health və ona bağlı xəstəxanalar qrupunda Radiologiya şöbəsinin rəhbəri və baş həkim səlahiyyətlərini icra edən kimi fəaliyyət göstərir. Selinus Universitetində süni intellektə əsaslanan opportunistik skrininq üzrə doktorantura təhsili alır.",
        "Onun işi kardiovaskulyar KT, neyroradiologiya və damar görüntüləməsini süni intellekt, teleradiologiya və rəqəmsal səhiyyə ilə birləşdirir. ESR, RSNA, AOSR və KSR-in üzvüdür."
      ],
      "en": [
        "Elşən Abdullayev is a diagnostic radiologist (MD) and researcher. He studied at Azerbaijan Medical University and has more than 15 years of experience in diagnostic radiology. He currently serves as Head of Radiology and Acting Chief Medical Officer at Apex Health and its affiliated hospital group in Qatar. He is pursuing doctoral studies at Selinus University in AI-based opportunistic screening.",
        "His work combines cardiovascular CT, neuroradiology and vascular imaging with artificial intelligence, teleradiology and digital health. He is a member of ESR, RSNA, AOSR and KSR."
      ]
    },
    "interests": {
      "az": [
        "Süni intellekt və opportunistik ürək-damar skrininqi",
        "Kardiak KT (KT koronaroqrafiya, TAVI planlaması, koronar kalsium skorlaması)",
        "Neyroradiologiya",
        "Damar görüntüləməsi",
        "Döş qəfəsi KT-si",
        "Teleradiologiya və rəqəmsal səhiyyə"
      ],
      "en": [
        "AI & opportunistic cardiovascular screening",
        "Cardiac CT: coronary angiography, TAVI planning & coronary calcium scoring",
        "Neuroradiology",
        "Vascular imaging",
        "Chest CT",
        "Teleradiology & digital health"
      ]
    },
    "links": [
      {
        "labelKey": "orcid",
        "url": "https://orcid.org/0009-0009-4584-2766"
      },
      {
        "labelKey": "linkedIn",
        "url": "https://www.linkedin.com/in/e1san/"
      },
      {
        "labelKey": "googleScholar",
        "url": "https://scholar.google.com/citations?user=Sd1iA-sAAAAJ&hl=en"
      }
    ],
    "publications": [
      {
        "doi": "10.26044/ecr2026/c-25367",
        "title": "Deep learning-based automated quantification of left ventricular strain from standard cine MRI: validation and prognostic value in heart failure patients",
        "authors": "E. Abdullayev",
        "year": 2026,
        "journal": "ECR 2026 · Educational exhibit",
        "verification": "verified",
        "source": "https://epos.myesr.org/poster/esr/ecr2026/C-25367",
        "citation": "E. Abdullayev. (2026). Deep learning-based automated quantification of left ventricular strain from standard cine MRI: validation and prognostic value in heart failure patients. ECR 2026 · Educational exhibit."
      },
      {
        "doi": "10.26044/ecr2025/c-26408",
        "title": "AI-Powered Pulmonary Nodule Detection System: A Multi-Center Validation Study",
        "authors": "E. Abdullayev",
        "year": 2025,
        "journal": "ECR 2025 · Scientific exhibit",
        "verification": "verified",
        "source": "https://epos.myesr.org/poster/esr/ecr2025/C-26408",
        "citation": "E. Abdullayev. (2025). AI-Powered Pulmonary Nodule Detection System: A Multi-Center Validation Study. ECR 2025 · Scientific exhibit."
      },
      {
        "doi": "10.61788/njn.v2i26.02",
        "title": "Radiological Diagnostics of Spinal Infections",
        "authors": "E. E. Abdullayev",
        "year": 2024,
        "journal": "National Journal of Neurology",
        "verification": "verified",
        "source": "https://mnj.az/index.php/pub/article/view/16",
        "citation": "E. E. Abdullayev. (2024). Radiological Diagnostics of Spinal Infections. National Journal of Neurology."
      },
      {
        "doi": "10.53347/rid-203942",
        "title": "Subacute sclerosing panencephalitis",
        "authors": "",
        "year": "",
        "journal": "Radiopaedia · Case study",
        "verification": "verified",
        "source": "https://radiopaedia.org/cases/subacute-sclerosing-panencephalitis-4",
        "citation": "Subacute sclerosing panencephalitis. Radiopaedia · Case study."
      },
    ]
  },
  "mahammad-jamalbayov": {
    "name": "Dr. Mahammad Jamalbayov",
    "roleKey": "roleAdvisory",
    "image": "assets/mahammad-jamalbayov.webp?v=39",
    "bio": {
      "az": [
        "Məhəmməd Asəf oğlu Camalbəyov texnika elmləri doktoru, dosent, neft və qaz yataqlarının işlənməsi, istismarı və kompüter modelləşdirilməsi sahəsində 40 ildən artıq elmi və praktiki təcrübəyə malik alim və mühəndisdir. 2016-cı ildən SOCAR-da aparıcı tədqiqatçı kimi çalışır. Azərbaycan Dövlət Neft və Sənaye Universitetində neft mühəndisliyi üzrə magistr, Azərbaycan Milli Elmlər Akademiyasında fəlsəfə doktoru, Bakı Dövlət Universitetində isə elmlər doktoru elmi dərəcəsi alıb.",
        "Onun elmi fəaliyyətinin əsas istiqamətləri neft-qaz laylarının energetikası, layların işlənmə mexanizmlərinin müəyyənləşdirilməsi, karbohidrogen sistemlərində süzülmə proseslərinin riyazi modelləşdirilməsi, quyuların istismar rejimlərinin optimallaşdırılması və mürəkkəb dinamik sistemlərin kompüter simulyasiyasıdır. O, Diskret-İmitasiya Modelləşdirmə Konsepsiyasının (DIMC) müəllifidir; bu konsepsiya əsasında nasos–quyu–lay sisteminin inteqrə olunmuş dinamik simulyasiyası üçün X-Oil Laboratory proqram kompleksi hazırlanıb.",
        "Alim 200-dən artıq elmi əsərin, o cümlədən məqalələrin, ixtiraların və proqram məhsullarının müəllifidir. Tədqiqatlarının nəticələri SPE Journal, Petroleum Research, Arabian Journal of Geosciences və digər beynəlxalq nəşrlərdə dərc olunub."
      ],
      "en": [
        "Mahammad Jamalbayov is a Doctor of Technical Sciences, associate professor, and petroleum engineer with more than 40 years of research and field experience in oil and gas field development, production and computer modelling. He has been a Lead Researcher at SOCAR since 2016. He holds a master's degree in Petroleum Engineering from Azerbaijan State Oil and Industry University, a PhD from the Azerbaijan National Academy of Sciences, and a Doctor of Science degree from Baku State University.",
        "His research covers reservoir energetics, identification of reservoir drive mechanisms, mathematical modelling of flow in hydrocarbon systems, optimization of well operating regimes, and computer simulation of complex dynamic systems. He is the author of the Discrete-Imitation Modelling Concept (DIMC), on which the X-Oil Laboratory software for integrated dynamic simulation of the pump–well–reservoir system is built.",
        "He has authored more than 200 scientific works, including articles, inventions and software products. His results have been published in SPE Journal, Petroleum Research, the Arabian Journal of Geosciences and other international outlets."
      ]
    },
    "interests": {
      "az": [
        "Neft və qaz yataqlarının işlənməsi",
        "Lay energetikası",
        "Lay rejiminin erkən müəyyənləşdirilməsi",
        "Süzülmənin riyazi modelləşdirilməsi",
        "Diskret-imitasiya modelləşdirməsi",
        "Ştanqlı quyu nasosları",
        "Dövri nasos rejimi",
        "Quyuların hidrodinamik tədqiqi",
        "Qaz-kondensat və yüngül neft layları",
        "Kompüter simulyasiyası"
      ],
      "en": [
        "Oil & gas field development",
        "Reservoir energetics",
        "Early identification of reservoir drive",
        "Mathematical modelling of porous-media flow",
        "Discrete-imitation modelling",
        "Sucker-rod pumping",
        "Intermittent pumping",
        "Well-test interpretation",
        "Gas-condensate & light-oil reservoirs",
        "Computer simulation"
      ]
    },
    "links": [],
    "publications": [
      {
        "title": "The Early Determination Method of Reservoir Drive of Oil Deposits Based on Jamalbayli Indexes",
        "authors": "",
        "year": 2024,
        "journal": "SPE Journal",
        "verification": "verified",
        "doi": "10.2118/221480-PA",
        "source": "https://doi.org/10.2118/221480-PA",
        "citation": "(2024). The Early Determination Method of Reservoir Drive of Oil Deposits Based on Jamalbayli Indexes. SPE Journal."
      },
      {
        "title": "The discrete-imitation modeling concept of the “sucker-rod pump-well-reservoir” system and the optimization of the pumping process",
        "authors": "Mahammad A. Jamalbayov, Nazim A. Valiyev",
        "year": 2024,
        "journal": "Petroleum Research",
        "verification": "verified",
        "doi": "10.1016/j.ptlrs.2024.04.001",
        "source": "https://doi.org/10.1016/j.ptlrs.2024.04.001",
        "citation": "Mahammad A. Jamalbayov, Nazim A. Valiyev. (2024). The discrete-imitation modeling concept of the “sucker-rod pump-well-reservoir” system and the optimization of the pumping process. Petroleum Research."
      },
      {
        "title": "The Discrete-Imitational Modeling of the Pump-Well-Reservoir System with Intermittent Sucker-Rod Pumping",
        "authors": "",
        "year": 2024,
        "journal": "SPE Middle East Artificial Lift Conference and Exhibition",
        "verification": "verified",
        "doi": "10.2118/221528-MS",
        "source": "https://doi.org/10.2118/221528-MS",
        "citation": "(2024). The Discrete-Imitational Modeling of the Pump-Well-Reservoir System with Intermittent Sucker-Rod Pumping. SPE Middle East Artificial Lift Conference and Exhibition."
      },
      {
        "title": "Determination of Dynamic Drainage Area of a Gas Condensate Well, Monitoring of Aquifer Activity, and Quantitative Evaluation of Aquifer Performance",
        "authors": "",
        "year": 2024,
        "journal": "Arabian Journal of Geosciences",
        "verification": "verified",
        "doi": "10.1007/s12517-024-11966-9",
        "source": "https://doi.org/10.1007/s12517-024-11966-9",
        "citation": "(2024). Determination of Dynamic Drainage Area of a Gas Condensate Well, Monitoring of Aquifer Activity, and Quantitative Evaluation of Aquifer Performance. Arabian Journal of Geosciences."
      },
      {
        "title": "A Stationary Oil Inflow to the Wellbore Taking into Account the Initial Pressure Gradient",
        "authors": "",
        "year": 2020,
        "journal": "Arabian Journal of Geosciences",
        "verification": "verified",
        "doi": "10.1007/s12517-020-05868-9",
        "source": "https://doi.org/10.1007/s12517-020-05868-9",
        "citation": "(2020). A Stationary Oil Inflow to the Wellbore Taking into Account the Initial Pressure Gradient. Arabian Journal of Geosciences."
      }
    ]
  }

};

document.querySelectorAll(".brand").forEach((brand) => {
  if (brand.querySelector(".brand-copy")) return;
  const copy = document.createElement("span");
  copy.className = "brand-copy";
  const name = document.createElement("strong");
  name.textContent = "Azerbaijan Research Society";
  const motto = document.createElement("small");
  motto.textContent = "People · Ideas · Research · Impact";
  copy.append(name, motto);
  brand.append(copy);
});

const affiliationMarks = {
  ibrahim: { mark: "SAÜ", label: "Sakarya University", tone: "blue" },
  masud: { mark: "KFUPM", label: "King Fahd University of Petroleum & Minerals", tone: "teal" },
  humay: { mark: "ICL", label: "Imperial College London", tone: "navy" },
  jale: { mark: "VMU", label: "Vytautas Magnus University", tone: "green" },
  nargiz: { mark: "XU", label: "Khazar University", tone: "red" },
  zehra: { mark: "XU", label: "Khazar University", tone: "red" },
  xeyranse: {
    mark: "XTM",
    label: { az: "Xəzər Tibb Mərkəzi", en: "Khazar Medical Center" },
    tone: "blue"
  },
  amil: { mark: "NCBJ", label: "National Centre for Nuclear Research / NOMATEN", tone: "blue" },
  azizeh: { mark: "SU", label: "Sabancı University", tone: "red" },
  sabrin: { mark: "AAU", label: "Al Ain University", tone: "navy" },
  ulkar: { mark: "IoP", label: "Institute of Physics", tone: "green" },
  nijat: { mark: "ECO", label: "ECOHUB", tone: "teal" },
  orkhan: { mark: "ASOIU", label: "Azerbaijan State Oil and Industry University", tone: "blue" },
  xedice: {
    mark: "GRI",
    label: { az: "Genetik Ehtiyatlar İnstitutu", en: "Genetic Resources Institute" },
    tone: "green"
  },
  gehreman: { mark: "AMU", label: "Adam Mickiewicz University", tone: "navy" },
  "mahammad-jamalbayov": { mark: "SOCAR", label: "State Oil Company of the Republic of Azerbaijan", tone: "blue" }
};

document.querySelectorAll(".person-card[data-profile]").forEach((card) => {
  const details = affiliationMarks[card.dataset.profile];
  const heading = card.querySelector("h3");
  if (!details || !heading || heading.parentElement?.classList.contains("person-name-row")) return;
  const row = document.createElement("div");
  row.className = "person-name-row";
  const mark = document.createElement("span");
  mark.className = "affiliation-mark";
  mark.dataset.tone = details.tone;
  mark.textContent = details.mark;
  const affiliationLabel = typeof details.label === "string" ? details.label : details.label.az;
  mark.title = affiliationLabel;
  mark.setAttribute("aria-label", affiliationLabel);
  if (typeof details.label !== "string") {
    mark.dataset.affiliationAz = details.label.az;
    mark.dataset.affiliationEn = details.label.en;
  }
  heading.replaceWith(row);
  row.append(heading, mark);
});

document.querySelectorAll("[data-board-visualization]").forEach((board) => {
  board.addEventListener("pointermove", (event) => {
    const bounds = board.getBoundingClientRect();
    board.style.setProperty("--pointer-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
    board.style.setProperty("--pointer-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
  });
});

const programTabs = [...document.querySelectorAll("[data-program-tab]")];
const programPanels = [...document.querySelectorAll("[data-program-panel]")];
let programStageMeter = null;

if (programTabs.length) {
  programStageMeter = document.createElement("div");
  programStageMeter.className = "program-stage-meter";
  programStageMeter.setAttribute("aria-hidden", "true");
  programStageMeter.innerHTML = `
    <span class="program-progress-wrap">
      <svg class="program-progress-svg" viewBox="0 0 100 8" preserveAspectRatio="none" focusable="false">
        <defs><linearGradient id="program-progress-gradient" x1="0" x2="1"><stop offset="0" stop-color="#16a9df"/><stop offset=".36" stop-color="#ee3342"/><stop offset=".7" stop-color="#159447"/><stop offset="1" stop-color="#f4cf58"/></linearGradient></defs>
        <path class="program-progress-base" d="M2 4H98" pathLength="100" vector-effect="non-scaling-stroke" />
        <path class="program-progress-value" d="M2 4H98" pathLength="100" vector-effect="non-scaling-stroke" />
      </svg>
      <i class="program-progress-dot" data-progress-dot="0" style="--dot-position:2%"></i>
      <i class="program-progress-dot" data-progress-dot="1" style="--dot-position:34%"></i>
      <i class="program-progress-dot" data-progress-dot="2" style="--dot-position:66%"></i>
      <i class="program-progress-dot" data-progress-dot="3" style="--dot-position:98%"></i>
    </span>
    <strong>01 / 04</strong>`;
  document.querySelector(".program-tabs")?.insertAdjacentElement("afterend", programStageMeter);
}

function activateProgramStage(stage, updateHash = true) {
  if (!programTabs.some((tab) => tab.dataset.programTab === stage)) return;
  programTabs.forEach((tab) => {
    const active = tab.dataset.programTab === stage;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  programPanels.forEach((panel) => {
    const active = panel.dataset.programPanel === stage;
    panel.classList.remove("is-active");
    panel.hidden = !active;
    if (active) requestAnimationFrame(() => {
      if (!panel.hidden) panel.classList.add("is-active");
    });
  });
  const activeIndex = programTabs.findIndex((tab) => tab.dataset.programTab === stage);
  if (programStageMeter && activeIndex >= 0) {
    const lineProgress = activeIndex / Math.max(programTabs.length - 1, 1);
    programStageMeter.style.setProperty("--stage-offset", String(100 - lineProgress * 100));
    programStageMeter.querySelectorAll("[data-progress-dot]").forEach((dot, index) => {
      dot.classList.toggle("is-complete", index <= activeIndex);
    });
    programStageMeter.querySelector("strong").textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(programTabs.length).padStart(2, "0")}`;
  }
  if (updateHash && window.history?.replaceState) window.history.replaceState(null, "", `#${stage}`);
}

programTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateProgramStage(tab.dataset.programTab));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (["ArrowRight", "ArrowDown"].includes(event.key)) nextIndex = (index + 1) % programTabs.length;
    if (["ArrowLeft", "ArrowUp"].includes(event.key)) nextIndex = (index - 1 + programTabs.length) % programTabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = programTabs.length - 1;
    const nextTab = programTabs[nextIndex];
    activateProgramStage(nextTab.dataset.programTab);
    nextTab.focus();
  });
});

if (programTabs.length) {
  const requestedStage = window.location.hash.slice(1);
  activateProgramStage(programTabs.some((tab) => tab.dataset.programTab === requestedStage) ? requestedStage : "connect", false);
}

const titleByLanguage = {
  az: {
    home: "Azərbaycan Tədqiqat Cəmiyyəti | ARS",
    about: "Haqqımızda | Azərbaycan Tədqiqat Cəmiyyəti",
    programs: "Proqramlar | Azərbaycan Tədqiqat Cəmiyyəti",
    workshop: "Tədqiqat Metodları Seminarı | Azərbaycan Tədqiqat Cəmiyyəti",
    people: "İnsanlar | Azərbaycan Tədqiqat Cəmiyyəti",
    executive: "İcra Şurası | Azərbaycan Tədqiqat Cəmiyyəti",
    advisory: "Elmi Məsləhət Şurası | Azərbaycan Tədqiqat Cəmiyyəti",
    contact: "Əlaqə | Azərbaycan Tədqiqat Cəmiyyəti",
    notFound: "Səhifə tapılmadı | Azərbaycan Tədqiqat Cəmiyyəti"
  },
  en: {
    home: "Azerbaijan Research Society | ARS",
    about: "About | Azerbaijan Research Society",
    programs: "Programs | Azerbaijan Research Society",
    workshop: "Research Methods Workshop | Azerbaijan Research Society",
    people: "People | Azerbaijan Research Society",
    executive: "Executive Board | Azerbaijan Research Society",
    advisory: "Scientific Advisory Board | Azerbaijan Research Society",
    contact: "Contact | Azerbaijan Research Society",
    notFound: "Page Not Found | Azerbaijan Research Society"
  }
};

const profileDialog = document.getElementById("profile-dialog");
const profileImage = document.getElementById("profile-image");
const profileName = document.getElementById("profile-name");
const profileRole = document.getElementById("profile-role");
const profileBio = document.getElementById("profile-bio");
const profileInterests = document.getElementById("profile-interests");
const profileLinks = document.getElementById("profile-links");
const profilePublications = document.getElementById("profile-publications");
const profilePublicationsSection = document.getElementById("profile-publications-section");
let currentProfile = null;

function translateContent(root = document) {
  const language = document.documentElement.lang === "en" ? "en" : "az";
  const dictionary = translations[language];
  root.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key]) element.textContent = dictionary[key];
  });
  root.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const key = element.dataset.i18nHtml;
    if (dictionary[key]) element.innerHTML = dictionary[key];
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    if (dictionary[key]) element.setAttribute("aria-label", dictionary[key]);
  });
  root.querySelectorAll('[data-az][data-en]').forEach(el => { el.textContent = el.dataset[language]; });
  root.querySelectorAll('[data-label-az]').forEach(el => el.setAttribute('aria-label', el.dataset[language === 'en' ? 'labelEn' : 'labelAz']));
  const body = document.body;
  if (body.dataset.titleAz) {
    document.title = body.dataset[language === 'en' ? 'titleEn' : 'titleAz'];
    const description = body.dataset[language === 'en' ? 'descriptionEn' : 'descriptionAz'];
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
  }
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
}
window.ARS_TRANSLATE = translateContent;

function setLanguage(language) {
  const dictionary = translations[language];
  document.documentElement.lang = language;
  const page = document.body.dataset.page || "home";
  document.title = titleByLanguage[language][page] || titleByLanguage[language].home;
  document.querySelectorAll(".affiliation-mark[data-affiliation-en]").forEach((mark) => {
    const label = language === "en" ? mark.dataset.affiliationEn : mark.dataset.affiliationAz;
    mark.title = label;
    mark.setAttribute("aria-label", label);
  });
  document.querySelectorAll(".lang-button").forEach((button) => {
    const selected = button.dataset.lang === language;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelector('meta[name="description"]')?.setAttribute("content", dictionary.metaDescription);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", dictionary.metaDescription);
  backToTop.setAttribute("aria-label", dictionary.backToTop);
  backToTop.title = dictionary.backToTop;
  if (menuButton && navigation) menuButton.setAttribute("aria-label", navigation.classList.contains("open") ? dictionary.menuClose : dictionary.menuOpen);
  if (currentProfile && profileDialog?.open) renderProfile(currentProfile);
  updateContactFormLanguage();
  updateFormValidationLanguage();
  updateWorkshopCountdown(language);
  updateWorkshopSessionStates(language);
  translateContent();
  document.dispatchEvent(new CustomEvent("ars:language", { detail: language }));
  try { localStorage.setItem("ars-language", language); } catch (error) { /* Storage may be unavailable in private browsing. */ }
}

function makeExternalLink(label, url) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = `${label} ↗`;
  return link;
}

function makeProfileLink(item, dictionary) {
  if (!item.url.startsWith("mailto:")) return makeExternalLink(dictionary[item.labelKey], item.url);
  const link = document.createElement("a");
  link.href = item.url;
  link.textContent = `${dictionary[item.labelKey]}: ${item.text || item.url.slice(7)}`;
  return link;
}

function renderProfile(profileId) {
  const data = profiles[profileId];
  if (!data || !profileDialog) return;
  const language = document.documentElement.lang in translations ? document.documentElement.lang : "az";
  const dictionary = translations[language];

  profileImage.src = '/' + data.image.replace(/^\//, '');
  profileImage.alt = data.name;
  profileName.textContent = data.name;
  document.dispatchEvent(new CustomEvent("ars:profile", { detail: profileId }));
  profileRole.textContent = dictionary[data.roleKey];

  profileBio.replaceChildren(...data.bio[language].map((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  }));

  profileInterests.replaceChildren(...data.interests[language].map((text) => {
    const tag = document.createElement("span");
    tag.textContent = text;
    return tag;
  }));

  const links = data.links || [];
  profileLinks.parentElement.hidden = links.length === 0;
  profileLinks.replaceChildren(...links.map((item) => makeProfileLink(item, dictionary)));

  const publications = (data.publications || []).filter(p => p.verification === "verified" && p.title);
  profilePublicationsSection.hidden = publications.length === 0;
  profilePublications.replaceChildren(...publications.map((publication) => {
    // Bibliographic fields are explicit: never infer a title from a DOI or citation.
    const title = publication.title || (language === "az" ? "Nəşr məlumatları təsdiq gözləyir" : "Publication details awaiting verification");
    const journal = publication.journal || "";

    const item = document.createElement("li");
    item.className = "publication-card";
    const heading = document.createElement("h4");
    heading.className = "publication-title";
    heading.textContent = title;
    const meta = document.createElement("p");
    meta.className = "publication-meta";
    meta.textContent = [publication.authors, publication.year].filter(Boolean).join(" · ");
    const badges = document.createElement("div");
    badges.className = "publication-badges";
    if (journal) {
      const journalBadge = document.createElement("span");
      journalBadge.className = "publication-badge";
      journalBadge.textContent = journal;
      badges.append(journalBadge);
    }
    if (publication.doi && !publication.suppressDoi) {
      const doiLink = makeExternalLink(publication.linkLabel || `DOI ${publication.doi}`, `https://doi.org/${publication.doi}`);
      doiLink.className = "publication-badge publication-badge-doi";
      badges.append(doiLink);
    }
    item.append(heading, meta, badges);
    if (publication.note) {
      const note = document.createElement("p");
      note.className = "publication-meta publication-note";
      note.textContent = publication.note[language];
      item.append(note);
    }
    return item;
  }));
}

let profileTrigger = null;
function openProfile(profileId) {
  if (!profileDialog || !profiles[profileId]) return;
  profileTrigger = document.activeElement;
  currentProfile = profileId;
  renderProfile(profileId);
  if (!profileDialog.open) profileDialog.showModal();
}

document.querySelectorAll(".person-card[data-profile]").forEach((card) => {
  card.addEventListener("click", () => openProfile(card.dataset.profile));
});

document.querySelectorAll("[data-open-profile]").forEach((button) => {
  button.hidden = false;
  button.addEventListener("click", () => openProfile(button.dataset.openProfile));
});

document.querySelector(".profile-close")?.addEventListener("click", () => profileDialog.close());
profileDialog?.addEventListener("click", (event) => {
  if (event.target === profileDialog) profileDialog.close();
});
profileDialog?.addEventListener("close", () => { currentProfile = null; profileTrigger?.focus(); });

document.querySelectorAll(".lang-button").forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.lang)));

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".site-nav");
menuButton?.addEventListener("click", () => {
  const open = navigation.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", translations[document.documentElement.lang][open ? "menuClose" : "menuOpen"]);
});
navigation?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  navigation.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
}));

const contactForm = document.getElementById("ars-contact-form");
const contactTopic = document.getElementById("contact-topic");
const contactStatus = document.getElementById("form-status");
const contactSubmitButton = contactForm?.querySelector('button[type="submit"]');
const contactSubmitLabel = contactSubmitButton?.querySelector("span");
const requiredContactFields = [...(contactForm?.querySelectorAll("[required]") || [])];
let validationFocusScheduled = false;

function validationMessageFor(field, dictionary) {
  if (field.type === "checkbox" && field.validity.valueMissing) return dictionary.formConsentRequired;
  if (field.validity.typeMismatch) return dictionary.formEmailInvalid;
  if (field.validity.tooShort || (field.tagName === "TEXTAREA" && field.value.length > 0 && field.value.trim().length < Number(field.minLength))) return dictionary.formMessageShort;
  return dictionary.formRequired;
}

function updateFieldValidity(field, announce = false) {
  const container = field.closest(".form-field, .form-consent");
  if (!container) return;
  const errorId = `error-${field.id || field.name}`;
  let error = container.querySelector(`#${CSS.escape(errorId)}`);
  if (!error) {
    error = document.createElement("span");
    error.className = "form-error";
    error.id = errorId;
    error.hidden = true;
    container.append(error);
    const describedBy = new Set((field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean));
    describedBy.add(errorId);
    field.setAttribute("aria-describedby", [...describedBy].join(" "));
  }

  const invalid = !field.validity.valid;
  container.classList.toggle("is-invalid", invalid);
  field.setAttribute("aria-invalid", String(invalid));
  error.hidden = !invalid;
  if (invalid) {
    const language = document.documentElement.lang in translations ? document.documentElement.lang : "az";
    error.textContent = validationMessageFor(field, translations[language]);
    if (announce && !reducedMotion) {
      container.classList.remove("is-shaking");
      void container.offsetWidth;
      container.classList.add("is-shaking");
      window.setTimeout(() => container.classList.remove("is-shaking"), 360);
    }
  } else {
    error.textContent = "";
  }
}

function updateFormValidationLanguage() {
  requiredContactFields.forEach((field) => {
    if (field.getAttribute("aria-invalid") === "true") updateFieldValidity(field);
  });
}

if (contactTopic) {
  const requestedTopic = new URLSearchParams(window.location.search).get("topic");
  if (requestedTopic && [...contactTopic.options].some((option) => option.value === requestedTopic)) {
    contactTopic.value = requestedTopic;
  }
}

function updateContactFormLanguage() {
  if (!contactForm || !contactSubmitButton || !contactSubmitLabel || !contactStatus) return;
  const language = document.documentElement.lang in translations ? document.documentElement.lang : "az";
  const dictionary = translations[language];
  contactSubmitLabel.textContent = contactSubmitButton.disabled ? dictionary.formSending : dictionary.formSubmit;
  if (contactStatus.dataset.state === "success") contactStatus.textContent = dictionary.formSuccess;
  if (contactStatus.dataset.state === "error") contactStatus.textContent = dictionary.formError;
  if (contactStatus.dataset.state === "validation") contactStatus.textContent = dictionary.formErrorsSummary;
}

function setContactStatus(state) {
  if (!contactStatus) return;
  contactStatus.dataset.state = state;
  contactStatus.className = `form-status${state ? ` ${state}` : ""}`;
  contactStatus.textContent = "";
  updateContactFormLanguage();
}

document.querySelectorAll("[data-form-topic]").forEach((link) => {
  link.addEventListener("click", () => {
    if (!contactTopic) return;
    contactTopic.value = link.dataset.formTopic;
    setContactStatus("");
  });
});

contactForm?.addEventListener("input", () => {
  if (contactStatus.dataset.state) setContactStatus("");
});

requiredContactFields.forEach((field) => {
  field.addEventListener("input", () => {
    if (field.getAttribute("aria-invalid") === "true") updateFieldValidity(field);
  });
  field.addEventListener("change", () => {
    if (field.getAttribute("aria-invalid") === "true") updateFieldValidity(field);
  });
});

contactForm?.addEventListener("invalid", (event) => {
  event.preventDefault();
  updateFieldValidity(event.target, true);
  setContactStatus("validation");
  if (validationFocusScheduled) return;
  validationFocusScheduled = true;
  window.setTimeout(() => {
    contactForm.querySelector(":invalid")?.focus();
    validationFocusScheduled = false;
  }, 0);
}, true);

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  contactSubmitButton.disabled = true;
  setContactStatus("");
  updateContactFormLanguage();

  const formData = new FormData(contactForm);
  const selectedTopic = contactTopic.options[contactTopic.selectedIndex]?.textContent || "General enquiry";
  const senderName = formData.get("name") || "Website visitor";
  formData.set("_subject", `ARS website — ${selectedTopic} — ${senderName}`);
  formData.set("language", document.documentElement.lang);

  try {
    const response = await fetch(contactForm.action, {
      method: "POST",
      body: formData,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`Form submission failed with status ${response.status}`);
    contactForm.reset();
    requiredContactFields.forEach((field) => updateFieldValidity(field));
    setContactStatus("success");
  } catch (error) {
    setContactStatus("error");
  } finally {
    contactSubmitButton.disabled = false;
    updateContactFormLanguage();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigation?.classList.contains("open")) {
    navigation.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", translations[document.documentElement.lang].menuOpen);
    menuButton.focus();
  }
});

const workshopEvents = [
  { titleKey: "foundationsTitle", dateKey: "sessionOneDate", start: new Date("2026-10-02T20:00:00+04:00"), end: new Date("2026-10-02T20:45:00+04:00") },
  { titleKey: "designTitle", dateKey: "sessionTwoDate", start: new Date("2026-10-09T20:00:00+04:00"), end: new Date("2026-10-09T20:40:00+04:00") },
  { titleKey: "publicationTitle", dateKey: "sessionThreeDate", start: new Date("2026-10-16T20:00:00+04:00"), end: new Date("2026-10-16T21:00:00+04:00") }
];
const workshopTabs = [...document.querySelectorAll(".workshop-session-tab")];
const workshopPanels = [...document.querySelectorAll("[data-session-panel]")];
const workshopProgress = document.querySelector(".session-progress span");
const workshopCountdown = document.querySelector("[data-workshop-countdown]");
const nextSessionTitle = document.getElementById("next-session-title");
const nextSessionDate = document.getElementById("next-session-date");
const nextSessionLocalTime = document.getElementById("next-session-local-time");
const workshopHomeCards = [...document.querySelectorAll("[data-workshop-home-session]")];
let selectedWorkshopSession = 0;

function formatWorkshopLocalTime(date, language) {
  const locale = language === "az" ? "az-AZ" : "en-GB";
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short"
    }).format(date);
  } catch (error) {
    return date.toLocaleString();
  }
}

function updateWorkshopSessionStates(language = document.documentElement.lang || "az", now = new Date()) {
  const dictionary = translations[language] || translations.az;
  const nextIndex = workshopEvents.findIndex((event) => now < event.end);
  const stateFor = (event, index) => {
    if (now >= event.end) return { key: "sessionCompleted", className: "is-completed" };
    if (now >= event.start) return { key: "sessionLive", className: "is-live" };
    if (index === nextIndex) return { key: "sessionNext", className: "is-next" };
    return { key: "sessionUpcoming", className: "is-upcoming" };
  };

  const applyState = (element, event, index, placement) => {
    if (!element || !event) return;
    const state = stateFor(event, index);
    element.classList.remove("is-completed", "is-live", "is-next", "is-upcoming");
    element.classList.add(state.className);
    let badge = element.querySelector(".session-status-badge");
    if (!badge) {
      badge = document.createElement("small");
      badge.className = "session-status-badge";
      placement.append(badge);
    }
    badge.textContent = dictionary[state.key];
  };

  workshopTabs.forEach((tab, index) => applyState(tab, workshopEvents[index], index, tab));
  workshopHomeCards.forEach((card) => {
    const index = Number(card.dataset.workshopHomeSession);
    applyState(card, workshopEvents[index], index, card.querySelector(".workshop-session-head") || card);
  });

  workshopPanels.forEach((panel, index) => {
    const time = panel.querySelector(".session-meta time");
    if (!time || !workshopEvents[index]) return;
    let local = panel.querySelector(".session-local-time");
    if (!local) {
      local = document.createElement("span");
      local.className = "session-local-time";
      time.insertAdjacentElement("afterend", local);
    }
    local.textContent = `${dictionary.localTimeLabel}: ${formatWorkshopLocalTime(workshopEvents[index].start, language)}`;
  });
}

function activateWorkshopSession(index, moveFocus = false) {
  if (!workshopTabs.length || !workshopPanels.length) return;
  selectedWorkshopSession = Math.max(0, Math.min(index, workshopTabs.length - 1));
  workshopTabs.forEach((tab, tabIndex) => {
    const active = tabIndex === selectedWorkshopSession;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && moveFocus) tab.focus();
  });
  workshopPanels.forEach((panel, panelIndex) => {
    const active = panelIndex === selectedWorkshopSession;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  if (workshopProgress) workshopProgress.style.width = `${((selectedWorkshopSession + 1) / workshopTabs.length) * 100}%`;
}

workshopTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => activateWorkshopSession(index));
  tab.addEventListener("keydown", (event) => {
    let target = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") target = (index + 1) % workshopTabs.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") target = (index - 1 + workshopTabs.length) % workshopTabs.length;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = workshopTabs.length - 1;
    if (target === null) return;
    event.preventDefault();
    activateWorkshopSession(target, true);
  });
});

function getCurrentWorkshopEvent(now = new Date()) {
  return workshopEvents.find((event) => now < event.end) || null;
}

function updateWorkshopCountdown(language = document.documentElement.lang || "az") {
  if (!workshopCountdown || !nextSessionTitle || !nextSessionDate) return;
  const dictionary = translations[language] || translations.az;
  const now = new Date();
  const event = getCurrentWorkshopEvent(now);
  const values = { days: 0, hours: 0, minutes: 0, seconds: 0 };

  if (!event) {
    nextSessionTitle.textContent = dictionary.countdownComplete;
    nextSessionDate.textContent = "";
    workshopCountdown.classList.add("is-complete");
    workshopCountdown.classList.remove("is-live");
    if (nextSessionLocalTime) nextSessionLocalTime.textContent = "";
  } else {
    workshopCountdown.classList.remove("is-complete");
    const live = now >= event.start;
    nextSessionTitle.textContent = live ? dictionary.countdownLive : dictionary[event.titleKey];
    nextSessionDate.textContent = dictionary[event.dateKey];
    nextSessionDate.dateTime = event.start.toISOString();
    if (nextSessionLocalTime) nextSessionLocalTime.textContent = `${dictionary.localTimeLabel}: ${formatWorkshopLocalTime(event.start, language)}`;
    workshopCountdown.classList.toggle("is-live", live);
    let remaining = Math.max(0, event.start.getTime() - now.getTime());
    values.days = Math.floor(remaining / 86400000);
    remaining %= 86400000;
    values.hours = Math.floor(remaining / 3600000);
    remaining %= 3600000;
    values.minutes = Math.floor(remaining / 60000);
    values.seconds = Math.floor((remaining % 60000) / 1000);
  }

  Object.entries(values).forEach(([unit, value]) => {
    const element = workshopCountdown.querySelector(`[data-countdown="${unit}"]`);
    if (element) element.textContent = String(value).padStart(2, "0");
  });
  updateWorkshopSessionStates(language, now);
}

if (workshopTabs.length) {
  const nextEvent = getCurrentWorkshopEvent();
  const nextIndex = nextEvent ? Math.max(0, workshopEvents.indexOf(nextEvent)) : workshopEvents.length - 1;
  activateWorkshopSession(nextIndex);
}
if (workshopCountdown) {
  updateWorkshopCountdown();
  window.setInterval(() => updateWorkshopCountdown(), 1000);
}

const statisticValues = [...document.querySelectorAll(".stats strong")];
function animateStatistic(element) {
  if (element.dataset.counted === "true") return;
  element.dataset.counted = "true";
  const original = element.textContent.trim();
  const target = Number.parseInt(original, 10);
  if (!Number.isFinite(target) || reducedMotion) return;
  const suffix = original.replace(/[\d]/g, "");
  const width = original.match(/^0\d/) ? original.match(/^\d+/)[0].length : 0;
  const startedAt = performance.now();
  const duration = 900;
  function count(now) {
    const phase = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - phase, 3);
    const value = Math.round(target * eased);
    element.textContent = `${width ? String(value).padStart(width, "0") : value}${suffix}`;
    if (phase < 1) requestAnimationFrame(count);
    else element.textContent = original;
  }
  requestAnimationFrame(count);
}

if (statisticValues.length && "IntersectionObserver" in window && !reducedMotion) {
  const statisticObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateStatistic(entry.target);
      statisticObserver.unobserve(entry.target);
    });
  }, { threshold: 0.7 });
  statisticValues.forEach((element) => statisticObserver.observe(element));
}

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 55}ms`);
});

// Scroll reveal. Content must never stay hidden: a ratio threshold can never be
// reached by blocks taller than the viewport (stacked board grids on phones), so
// reveal on the first visible pixel, skip the effect on narrow screens, and fall
// back to showing everything if the observer has not fired.
const revealElements = [...document.querySelectorAll(".reveal")];
const revealAll = () => revealElements.forEach((element) => element.classList.add("visible"));
const revealAnimated = "IntersectionObserver" in window
  && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  && !window.matchMedia("(max-width: 760px)").matches;
if (revealAnimated) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: "0px 0px -6% 0px" });
  revealElements.forEach((element) => observer.observe(element));
  const revealPassed = () => revealElements.forEach((element) => {
    if (element.getBoundingClientRect().top < window.innerHeight) element.classList.add("visible");
  });
  window.addEventListener("scroll", revealPassed, { passive: true });
  window.addEventListener("resize", revealPassed, { passive: true });
  window.setTimeout(revealPassed, 1200);
} else {
  revealAll();
}

const yearElement = document.getElementById("year");
if (yearElement) yearElement.textContent = new Date().getFullYear();
let savedLanguage = "az";
try { savedLanguage = localStorage.getItem("ars-language") || "az"; } catch (error) { /* Use Azerbaijani by default. */ }
setLanguage(translations[savedLanguage] ? savedLanguage : "az");
