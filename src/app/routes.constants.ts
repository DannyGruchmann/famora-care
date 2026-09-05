export const ROUTES = {
  login: '/',
  register: '/registrieren',
  forgotPassword: '/passwort-vergessen',
  resetPassword: '/passwort-neu',
  landing: '/willkommen',
  onboarding: '/start',
  /** Junction without a view of its own: leads to the most recently created folder. */
  dashboard: '/uebersicht',
  folder: '/ordner/:folderId',
  /** The register on paper. Printed, it works without a login — which is the whole point. */
  emergencySheet: '/ordner/:folderId/notfallmappe',
  /** Full screen, and outside the folder: one tree belongs to the account, not to one folder. */
  tree: '/stammbaum/:treeId',
  imprint: '/impressum',
  privacy: '/datenschutz',
} as const;

/** Query parameter the onboarding uses to overwrite an existing folder. */
export const FOLDER_PARAM = 'ordner';

/** Route parameter of the folder route — the `:folderId` segment above. */
export const FOLDER_ID_PARAM = 'folderId';

/** Route parameter of the tree route — the `:treeId` segment above. */
export const TREE_ID_PARAM = 'treeId';

/**
 * Query parameter carrying the page a guard intercepted someone on, so signing in continues to
 * where they wanted to go. React kept this in the router's location state; Angular guards return
 * a UrlTree, which carries query params but no state — and a query param survives a reload.
 */
export const REDIRECT_PARAM = 'weiter';

/** Fills the :folderId slot of a route, so the paths above stay the only place holding one. */
function withFolderId(route: string, folderId: string): string {
  return route.replace(`:${FOLDER_ID_PARAM}`, folderId);
}

export function folderPath(folderId: string): string {
  return withFolderId(ROUTES.folder, folderId);
}

export function emergencySheetPath(folderId: string): string {
  return withFolderId(ROUTES.emergencySheet, folderId);
}

export function treePath(treeId: string): string {
  return ROUTES.tree.replace(`:${TREE_ID_PARAM}`, treeId);
}
