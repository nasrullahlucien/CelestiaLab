import { MODULES, type ModuleDefinition } from '../data/modules';
import { i18n } from '../i18n';
import { routeToHash } from '../router/router';
import { createSkyScene, type SkySceneHandle } from '../components/SkyScene';
import { ICONS } from '../components/Icons';

export interface PageHandle {
  element: HTMLElement;
  dispose: () => void;
}

function getModuleVisuals(mod: ModuleDefinition): {
  badgeClass: string;
  accentBarClass: string;
  icon: string;
  colorText: string;
} {
  const sys = i18n.t().systems;
  switch (mod.accent) {
    case 'horizon':
      return {
        badgeClass: 'bg-horizon-soft text-horizon border-horizon-border',
        accentBarClass: 'bg-horizon',
        icon: ICONS.horizon('w-5 h-5'),
        colorText: sys.horizon.colorLabel,
      };
    case 'equatorial':
      return {
        badgeClass: 'bg-equatorial-soft text-equatorial border-equatorial-border',
        accentBarClass: 'bg-equatorial',
        icon: ICONS.equatorial('w-5 h-5'),
        colorText: sys.equatorial.colorLabel,
      };
    case 'ecliptic':
      return {
        badgeClass: 'bg-ecliptic-soft text-ecliptic border-ecliptic-border',
        accentBarClass: 'bg-ecliptic',
        icon: ICONS.ecliptic('w-5 h-5'),
        colorText: sys.ecliptic.colorLabel,
      };
    case 'multi':
    default:
      return {
        badgeClass: 'bg-subtle text-ink border-line-strong',
        accentBarClass: 'bg-gradient-to-r from-horizon via-equatorial to-ecliptic',
        icon: ICONS.compare('w-5 h-5'),
        colorText: sys.compare.colorLabel,
      };
  }
}

export function createHomePage(): PageHandle {
  const t = i18n.t();
  const container = document.createElement('div');
  container.className = 'mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:py-12';

  // =========================================================================
  // Hero Section
  // =========================================================================
  const hero = document.createElement('section');
  hero.className = 'grid grid-cols-1 items-center gap-8 lg:grid-cols-12';

  const heroCopy = document.createElement('div');
  heroCopy.className = 'space-y-5 lg:col-span-6';
  heroCopy.innerHTML = `
    <p class="inline-flex items-center gap-2 rounded-full border border-equatorial-border bg-equatorial-soft px-3.5 py-1 text-xs font-semibold text-equatorial">
      ${ICONS.globe('w-4 h-4')}
      <span>${t.subjectBadge}</span>
    </p>
    <h1 id="main-heading" tabindex="-1" class="text-3xl font-bold tracking-tight text-ink sm:text-4xl lg:text-[2.65rem] lg:leading-[1.2]">
      ${t.home.heroTitle}
    </h1>
    <p class="text-base leading-relaxed text-ink-secondary sm:text-lg">
      ${t.home.heroSubtitle}
    </p>
    <div class="flex flex-wrap items-center gap-3 pt-1">
      <a href="${routeToHash({ page: 'module', moduleId: 'horizon' })}"
         class="inline-flex items-center gap-2 rounded-xl bg-equatorial px-5 py-3 text-sm font-semibold text-equatorial-contrast shadow-sm hover:opacity-95 transition-opacity">
        <span>${t.home.ctaStart}</span>
        ${ICONS.arrowRight('w-4 h-4')}
      </a>
      <a href="${routeToHash({ page: 'module', moduleId: 'compare' })}"
         class="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-5 py-3 text-sm font-semibold text-ink hover:bg-subtle transition-colors">
        ${ICONS.compare('w-4 h-4')}
        <span>${t.home.ctaCompare}</span>
      </a>
    </div>
  `;

  const heroSceneWrap = document.createElement('div');
  heroSceneWrap.className = 'lg:col-span-6';
  const heroScene: SkySceneHandle = createSkyScene({
    mode: 'hero',
    showControlsBar: false,
    showLayerToggles: false,
    initialParams: { latitude: 13.8, eclipticLon: 55 },
  });
  heroSceneWrap.appendChild(heroScene.element);

  hero.append(heroCopy, heroSceneWrap);
  container.appendChild(hero);

  // =========================================================================
  // 4 Module Cards
  // =========================================================================
  const modulesSection = document.createElement('section');
  modulesSection.className = 'space-y-6';

  const modHeader = document.createElement('div');
  modHeader.className = 'space-y-2 max-w-3xl';
  modHeader.innerHTML = `
    <h2 class="text-2xl font-bold text-ink">${t.home.modulesHeading}</h2>
    <p class="text-sm sm:text-base text-ink-secondary leading-relaxed">${t.home.modulesIntro}</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-1 gap-5 md:grid-cols-2';

  for (const mod of MODULES) {
    const visuals = getModuleVisuals(mod);
    const card = document.createElement('article');
    card.className =
      'group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition-all hover:border-line-strong hover:shadow-md';

    const topBar = document.createElement('div');
    topBar.className = `h-1.5 w-full ${visuals.accentBarClass}`;
    topBar.setAttribute('aria-hidden', 'true');

    const body = document.createElement('div');
    body.className = 'flex flex-1 flex-col justify-between gap-5 p-5 sm:p-6';

    const topContent = document.createElement('div');
    topContent.className = 'space-y-3';

    const badgeRow = document.createElement('div');
    badgeRow.className = 'flex flex-wrap items-center justify-between gap-2';
    badgeRow.innerHTML = `
      <span class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${visuals.badgeClass}">
        ${visuals.icon}
        <span>โมดูลที่ ${mod.order} • ${visuals.colorText}</span>
      </span>
      <span class="text-xs font-medium text-ink-muted tabular-nums">
        ${mod.quiz.length} ${t.home.questionsCount}
      </span>
    `;
    if (i18n.getLocale() === 'en') {
      badgeRow.firstElementChild!.lastElementChild!.textContent = `Module ${mod.order} • ${visuals.colorText}`;
    }

    const title = document.createElement('h3');
    title.className = 'text-lg sm:text-xl font-bold text-ink';
    title.textContent = i18n.pick(mod.title);

    const summary = document.createElement('p');
    summary.className = 'text-sm leading-relaxed text-ink-secondary';
    summary.textContent = i18n.pick(mod.summary);

    topContent.append(badgeRow, title, summary);

    const actionLink = document.createElement('a');
    actionLink.href = routeToHash({ page: 'module', moduleId: mod.id });
    actionLink.className =
      'inline-flex items-center justify-between gap-2 rounded-xl border border-line bg-subtle px-4 py-2.5 text-sm font-semibold text-ink group-hover:border-line-strong group-hover:bg-elevated transition-colors';
    actionLink.innerHTML = `<span>${t.home.openModule}: ${i18n.pick(mod.shortTitle)}</span>${ICONS.arrowRight('w-4 h-4 shrink-0')}`;

    body.append(topContent, actionLink);
    card.append(topBar, body);
    grid.appendChild(card);
  }

  modulesSection.append(modHeader, grid);
  container.appendChild(modulesSection);

  // =========================================================================
  // Semantic Comparison Table (accessible & horizontally scrollable on 320px)
  // =========================================================================
  const summarySection = document.createElement('section');
  summarySection.className = 'space-y-4';

  const summaryHeading = document.createElement('h2');
  summaryHeading.className = 'text-2xl font-bold text-ink';
  summaryHeading.textContent = t.home.summaryHeading;

  const tableRegion = document.createElement('div');
  tableRegion.className =
    'overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm';
  tableRegion.tabIndex = 0;
  tableRegion.setAttribute('role', 'region');
  tableRegion.setAttribute('aria-label', t.home.summaryHeading);

  const sys = t.systems;
  const ths = t.home.tableHeaders;

  tableRegion.innerHTML = `
    <table class="w-full min-w-[36rem] border-collapse text-left text-sm">
      <caption class="sr-only">${t.home.summaryCaption}</caption>
      <thead class="border-b border-line bg-subtle text-xs font-semibold uppercase tracking-wide text-ink-secondary">
        <tr>
          <th scope="col" class="px-5 py-3.5">${ths.system}</th>
          <th scope="col" class="px-5 py-3.5">${ths.plane}</th>
          <th scope="col" class="px-5 py-3.5">${ths.coordinates}</th>
          <th scope="col" class="px-5 py-3.5">${ths.reference}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-line text-ink">
        <tr>
          <th scope="row" class="px-5 py-4 font-semibold whitespace-nowrap">
            <span class="inline-flex items-center gap-2 rounded-full border border-horizon-border bg-horizon-soft px-3 py-1 text-xs font-semibold text-horizon">
              ${ICONS.horizon('w-4 h-4')}
              <span>${sys.horizon.name}</span>
            </span>
          </th>
          <td class="px-5 py-4 text-ink-secondary">${sys.horizon.plane}</td>
          <td class="px-5 py-4 font-medium">${sys.horizon.coordinates}</td>
          <td class="px-5 py-4 text-ink-secondary">${sys.horizon.reference}</td>
        </tr>
        <tr>
          <th scope="row" class="px-5 py-4 font-semibold whitespace-nowrap">
            <span class="inline-flex items-center gap-2 rounded-full border border-equatorial-border bg-equatorial-soft px-3 py-1 text-xs font-semibold text-equatorial">
              ${ICONS.equatorial('w-4 h-4')}
              <span>${sys.equatorial.name}</span>
            </span>
          </th>
          <td class="px-5 py-4 text-ink-secondary">${sys.equatorial.plane}</td>
          <td class="px-5 py-4 font-medium">${sys.equatorial.coordinates}</td>
          <td class="px-5 py-4 text-ink-secondary">${sys.equatorial.reference}</td>
        </tr>
        <tr>
          <th scope="row" class="px-5 py-4 font-semibold whitespace-nowrap">
            <span class="inline-flex items-center gap-2 rounded-full border border-ecliptic-border bg-ecliptic-soft px-3 py-1 text-xs font-semibold text-ecliptic">
              ${ICONS.ecliptic('w-4 h-4')}
              <span>${sys.ecliptic.name}</span>
            </span>
          </th>
          <td class="px-5 py-4 text-ink-secondary">${sys.ecliptic.plane}</td>
          <td class="px-5 py-4 font-medium">${sys.ecliptic.coordinates}</td>
          <td class="px-5 py-4 text-ink-secondary">${sys.ecliptic.reference}</td>
        </tr>
      </tbody>
    </table>
  `;

  summarySection.append(summaryHeading, tableRegion);
  container.appendChild(summarySection);

  return {
    element: container,
    dispose: () => {
      heroScene.dispose();
    },
  };
}
