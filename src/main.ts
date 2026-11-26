import './styles/main.css';
import { themeManager } from './theme/themeManager';
import { i18n } from './i18n';
import { getModuleById } from './data/modules';
import { parseHash, subscribeRoute, type Route } from './router/router';
import { createNavbar, type NavbarHandle } from './components/Navbar';
import { createHomePage, type PageHandle } from './pages/HomePage';
import { createModulePage } from './pages/ModulePage';

// Ensure theme manager initializes immediately
void themeManager.getState();

const appRoot = document.getElementById('app');
if (!appRoot) {
  throw new Error('Root element #app not found');
}

const shell = document.createElement('div');
shell.className = 'flex min-h-[100dvh] flex-col bg-canvas text-ink';

let currentRoute: Route = parseHash(window.location.hash);
let navbar: NavbarHandle | null = null;
let currentPage: PageHandle | null = null;

const mainEl = document.createElement('main');
mainEl.className = 'flex-1';

const footerEl = document.createElement('footer');
footerEl.className =
  'border-t border-line bg-surface/80 py-6 text-center text-xs text-ink-muted';

const updateDocumentTitle = (route: Route) => {
  const t = i18n.t();
  if (route.page === 'home') {
    document.title = `${t.appName} | ${t.appTagline}`;
    return;
  }
  const mod = getModuleById(route.moduleId);
  if (mod) {
    document.title = `${i18n.pick(mod.title)} | ${t.appName}`;
  }
};

const renderFooter = () => {
  const f = i18n.t().footer;
  footerEl.innerHTML = `
    <div class="mx-auto max-w-7xl px-4 sm:px-6 space-y-1">
      <p class="font-semibold text-ink-secondary">${f.credit}</p>
      <p>${f.note}</p>
    </div>
  `;
};

const renderRoute = (route: Route, resetScroll = true) => {
  currentRoute = route;
  currentPage?.dispose();
  currentPage = null;
  mainEl.innerHTML = '';

  if (route.page === 'module') {
    const mod = getModuleById(route.moduleId);
    if (mod) {
      currentPage = createModulePage(mod);
    }
  }
  if (!currentPage) {
    currentPage = createHomePage();
  }

  mainEl.appendChild(currentPage.element);
  navbar?.setActiveRoute(route);
  updateDocumentTitle(route);

  if (resetScroll) {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
};

const mountShell = () => {
  navbar?.destroy();
  shell.innerHTML = '';

  navbar = createNavbar(currentRoute);
  renderFooter();

  shell.append(navbar.element, mainEl, footerEl);
  appRoot.innerHTML = '';
  appRoot.appendChild(shell);
  renderRoute(currentRoute, false);
};

mountShell();

subscribeRoute((nextRoute) => {
  renderRoute(nextRoute, true);
});

i18n.subscribe(() => {
  mountShell();
});
