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
  'workouts':       '/workouts',
  'shifts':         '/shifts',
  'new-student':    '/students/new',
  'student-portal': '/portal-preview',
  'register':       '/register',
};

const PATH_TO_VIEW: Record<string, string> = {
  '/':                'dashboard',
  '/students':        'students',
  '/payments':        'payments',
  '/defaulters':      'defaulters',
  '/settings':        'settings',
  '/plans':           'plans',
  '/automation':      'automation',
  '/workouts':        'workouts',
  '/shifts':          'shifts',
  '/students/new':    'new-student',
  '/portal-preview':  'student-portal',
  '/register':        'register',
};

/** Convert a legacy view ID to a URL path */
export function viewToPath(view: string, params?: { studentId?: string }): string {
  if (view === 'student-detail' && params?.studentId) {
    return `/students/${params.studentId}`;
  }
  return VIEW_TO_PATH[view] ?? '/';
}

/** Convert a URL pathname to a legacy view ID */
export function pathToView(pathname: string): string {
  // Check exact match first
  if (PATH_TO_VIEW[pathname]) return PATH_TO_VIEW[pathname];
  // Check /students/:id pattern
  if (/^\/students\/[^/]+$/.test(pathname) && pathname !== '/students/new') {
    return 'student-detail';
  }
  return 'dashboard';
}
