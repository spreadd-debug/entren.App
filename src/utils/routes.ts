/**
 * Mapping between legacy view IDs and URL paths.
 * Used to bridge onNavigate('viewId') calls with react-router navigation.
 */

const VIEW_TO_PATH: Record<string, string> = {
  'dashboard':      '/',
  'students':       '/students',
  'student-detail': '/students',   // append /:id at call site
  'payments':       '/payments',
  'defaulters':     '/defaulters',
  'settings':       '/settings',
  'plans':          '/plans',
  'automation':     '/automation',
  'calendar':       '/calendar',
  'workouts':       '/workouts',
  'shifts':         '/shifts',
  'new-student':    '/students/new',
  'planning':       '/planning',
  'student-portal': '/portal-preview',
  'register':       '/register',
};

const PATH_TO_VIEW: Record<string, string> = {
  '/':                'dashboard',
  '/students':        'students',
  '/clients':         'students',
  '/payments':        'payments',
  '/defaulters':      'defaulters',
  '/settings':        'settings',
  '/plans':           'plans',
  '/automation':      'automation',
  '/calendar':        'calendar',
  '/workouts':        'workouts',
  '/shifts':          'shifts',
  '/students/new':    'new-student',
  '/clients/new':     'new-student',
  '/planning':        'planning',
  '/portal-preview':  'student-portal',
  '/register':        'register',
};

/** Convert a legacy view ID to a URL path.
 *  When `pt` is true, students routes map to /clients instead of /students. */
export function viewToPath(view: string, params?: { studentId?: string; pt?: boolean }): string {
  const useClients = params?.pt;
  if (view === 'student-detail' && params?.studentId) {
    return useClients ? `/clients/${params.studentId}` : `/students/${params.studentId}`;
  }
  if (useClients && view === 'students') return '/clients';
  if (useClients && view === 'new-student') return '/clients/new';
  return VIEW_TO_PATH[view] ?? '/';
}

/** Convert a URL pathname to a legacy view ID */
export function pathToView(pathname: string): string {
  // Check exact match first
  if (PATH_TO_VIEW[pathname]) return PATH_TO_VIEW[pathname];
  // Check /students/:id or /clients/:id pattern
  if (/^\/students\/[^/]+$/.test(pathname) && pathname !== '/students/new') {
    return 'student-detail';
  }
  if (/^\/clients\/[^/]+$/.test(pathname) && pathname !== '/clients/new') {
    return 'student-detail';
  }
  return 'dashboard';
}
