import { i18n } from '../i18n';
import { routeToHash, type Route } from '../router/router';
import { createThemeSwitcher, type ThemeSwitcherHandle } from './ThemeSwitcher';
import { ICONS } from './Icons';

export interface NavbarHandle {
  element: HTMLElement;
  setActiveRoute: (route: Route) => void;
  destroy: () => void;
}

export function createNavbar(initialRoute: Route): NavbarHandle {
  let currentRoute: Route = initialRoute;
  let mobileMenuOpen = false;
  let desktopThemeSwitcher: ThemeSwitcherHandle | null = null;
  let mobileThemeSwitcher: ThemeSwitcherHandle | null = null;

  const header = document.createElement('header');
  header.className =
    'site-header sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md';

  const render = () => {
    desktopThemeSwitcher?.destroy();
    mobileThemeSwitcher?.destroy();
    header.innerHTML = '';

    const t = i18n.t();

    // Skip link (WCAG 2.4.1)
    const skipLink = document.createElement('a');
    skipLink.href = '#main-heading';
    skipLink.className = 'skip-link visually-hidden';
    skipLink.textContent = t.skipToContent;
    header.appendChild(skipLink);

    const inner = document.createElement('div');
    inner.className =
      'mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6';

    // Brand link
    const brandLink = document.createElement('a');
    brandLink.href = routeToHash({ page: 'home' });
    brandLink.className =
      'inline-flex items-center gap-2.5 rounded-xl pr-2 text-ink hover:opacity-90 transition-opacity';
    brandLink.innerHTML = `
      ${ICONS.logo}
      <span class="flex flex-col leading-tight">
        <span class="flex items-center gap-1.5">
          <span class="text-base font-bold tracking-tight">${t.appName}</span>
          <span class="rounded-full border border-equatorial-border/70 bg-equatorial-soft px-2 py-0.5 text-[10px] font-bold text-equatorial">ครูพี่นัท</span>
        </span>
        <span class="text-[11px] font-medium text-ink-muted">${t.subjectBadge}</span>
      </span>
    `;

    // Primary nav links
    const navItems: Array<{ route: Route; label: string; dotClass?: string }> = [
      { route: { page: 'home' }, label: t.nav.home },
      {
        route: { page: 'module', moduleId: 'horizon' },
        label: t.nav.horizon,
        dotClass: 'bg-horizon',
      },
      {
        route: { page: 'module', moduleId: 'equatorial' },
        label: t.nav.equatorial,
        dotClass: 'bg-equatorial',
      },
      {
        route: { page: 'module', moduleId: 'ecliptic' },
        label: t.nav.ecliptic,
        dotClass: 'bg-ecliptic',
      },
      {
        route: { page: 'module', moduleId: 'compare' },
        label: t.nav.compare,
      },
    ];

    const isRouteActive = (target: Route): boolean => {
      if (target.page === 'home') return currentRoute.page === 'home';
      return (
        currentRoute.page === 'module' &&
        currentRoute.moduleId === target.moduleId
      );
    };

    const desktopNav = document.createElement('nav');
    desktopNav.setAttribute('aria-label', t.nav.ariaLabel);
    desktopNav.className = 'hidden lg:block';

    const ul = document.createElement('ul');
    ul.className = 'flex flex-wrap items-center gap-1';

    for (const item of navItems) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = routeToHash(item.route);
      const active = isRouteActive(item.route);
      if (active) {
        a.setAttribute('aria-current', 'page');
      }
      a.className = active
        ? 'inline-flex items-center gap-1.5 rounded-xl bg-subtle px-3 py-2 text-xs font-bold text-ink ring-1 ring-line-strong'
        : 'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-ink-secondary hover:bg-subtle hover:text-ink transition-colors';

      const dot = item.dotClass
        ? `<span aria-hidden="true" class="h-2 w-2 rounded-full ${item.dotClass}"></span>`
        : '';
      a.innerHTML = `${dot}<span>${item.label}</span>`;
      li.appendChild(a);
      ul.appendChild(li);
    }

    desktopNav.appendChild(ul);

    // Right utility controls
    const utilities = document.createElement('div');
    utilities.className = 'flex items-center gap-2';

    desktopThemeSwitcher = createThemeSwitcher(true);
    desktopThemeSwitcher.element.classList.add('hidden', 'md:inline-flex');

    // Language toggle button (TH / EN)
    const langBtn = document.createElement('button');
    langBtn.type = 'button';
    langBtn.setAttribute('aria-label', t.lang.toggleLabel);
    langBtn.className =
      'inline-flex items-center justify-center rounded-xl border border-line bg-subtle px-3 py-2 text-xs font-bold font-mono text-ink hover:border-line-strong transition-colors';
    langBtn.textContent = t.lang.current;
    langBtn.addEventListener('click', () => {
      i18n.toggleLocale();
    });

    // Mobile menu toggle
    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className =
      'inline-flex lg:hidden items-center justify-center rounded-xl border border-line bg-subtle p-2 text-ink hover:border-line-strong';
    menuBtn.setAttribute('aria-expanded', String(mobileMenuOpen));
    menuBtn.setAttribute('aria-controls', 'mobile-nav-drawer');
    menuBtn.setAttribute(
      'aria-label',
      mobileMenuOpen ? t.nav.menuClose : t.nav.menuOpen
    );
    menuBtn.innerHTML = mobileMenuOpen
      ? ICONS.close('w-5 h-5')
      : ICONS.menu('w-5 h-5');
    menuBtn.addEventListener('click', () => {
      mobileMenuOpen = !mobileMenuOpen;
      render();
    });

    utilities.append(desktopThemeSwitcher.element, langBtn, menuBtn);
    inner.append(brandLink, desktopNav, utilities);
    header.appendChild(inner);

    // Mobile drawer
    if (mobileMenuOpen) {
      const drawer = document.createElement('div');
      drawer.id = 'mobile-nav-drawer';
      drawer.className =
        'border-t border-line bg-surface px-4 py-4 space-y-4 lg:hidden';

      const mobileNav = document.createElement('nav');
      mobileNav.setAttribute('aria-label', `${t.nav.ariaLabel} (Mobile)`);
      const mobileList = document.createElement('ul');
      mobileList.className = 'grid grid-cols-1 gap-1.5';

      for (const item of navItems) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = routeToHash(item.route);
        const active = isRouteActive(item.route);
        if (active) {
          a.setAttribute('aria-current', 'page');
        }
        a.className = active
          ? 'flex w-full items-center gap-2 rounded-xl bg-subtle px-4 py-3 text-sm font-bold text-ink ring-1 ring-line-strong'
          : 'flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-subtle hover:text-ink';

        const dot = item.dotClass
          ? `<span aria-hidden="true" class="h-2.5 w-2.5 rounded-full ${item.dotClass}"></span>`
          : '';
        a.innerHTML = `${dot}<span>${item.label}</span>`;
        a.addEventListener('click', () => {
          mobileMenuOpen = false;
          render();
        });
        li.appendChild(a);
        mobileList.appendChild(li);
      }

      mobileNav.appendChild(mobileList);
      drawer.appendChild(mobileNav);

      // Full 3-state theme switcher inside mobile menu
      const themeRow = document.createElement('div');
      themeRow.className = 'pt-2 border-t border-line flex flex-col gap-2';
      const themeLabel = document.createElement('span');
      themeLabel.className = 'text-xs font-semibold text-ink-muted';
      themeLabel.textContent = t.theme.groupLabel;

      mobileThemeSwitcher = createThemeSwitcher(false);
      mobileThemeSwitcher.element.classList.add('w-full', 'justify-between', 'flex-wrap');
      themeRow.append(themeLabel, mobileThemeSwitcher.element);
      drawer.appendChild(themeRow);

      header.appendChild(drawer);
    }
  };

  render();

  return {
    element: header,
    setActiveRoute: (route: Route) => {
      currentRoute = route;
      mobileMenuOpen = false;
      render();
    },
    destroy: () => {
      desktopThemeSwitcher?.destroy();
      mobileThemeSwitcher?.destroy();
    },
  };
}
