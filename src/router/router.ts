import type { ModuleId } from '../data/modules';

export type Route =
  | { page: 'home' }
  | { page: 'module'; moduleId: ModuleId };

const VALID_MODULES = new Set<ModuleId>([
  'horizon',
  'equatorial',
  'ecliptic',
  'compare',
]);

export function parseHash(hash: string): Route {
  const cleaned = hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (VALID_MODULES.has(cleaned as ModuleId)) {
    return { page: 'module', moduleId: cleaned as ModuleId };
  }
  return { page: 'home' };
}

export function routeToHash(route: Route): string {
  if (route.page === 'home') {
    return '#/';
  }
  return `#/${route.moduleId}`;
}

export function navigateTo(route: Route): void {
  const targetHash = routeToHash(route);
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }
}

export function subscribeRoute(onChange: (route: Route) => void): () => void {
  const handleHashChange = () => {
    onChange(parseHash(window.location.hash));
  };
  window.addEventListener('hashchange', handleHashChange);
  return () => {
    window.removeEventListener('hashchange', handleHashChange);
  };
}
