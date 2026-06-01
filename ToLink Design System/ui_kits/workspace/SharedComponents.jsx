/* SharedComponents.jsx — ToLink Design System base components */

/* ── Lucide Icon subset (inline SVG) ── */
function LIcon({ d, size = 18, strokeWidth = 2, className = '', style = {} }) {
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round',
    className, style
  }, Array.isArray(d) ? d.map((p, i) => React.createElement('path', { key: i, d: p })) : React.createElement('path', { d }));
}

const Icons = {
  Home: (p) => LIcon({ ...p, d: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'] }),
  Database: (p) => LIcon({ ...p, d: ['M4 6c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2z', 'M4 6v6c0 1.1 3.6 2 8 2s8-.9 8-2V6', 'M4 12v6c0 1.1 3.6 2 8 2s8-.9 8-2v-6'] }),
  MessageSquare: (p) => LIcon({ ...p, d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }),
  FolderOpen: (p) => LIcon({ ...p, d: ['M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2'] }),
  Cpu: (p) => LIcon({ ...p, d: ['M5 5h14v14H5z', 'M9 1v3', 'M15 1v3', 'M9 20v3', 'M15 20v3', 'M1 9h3', 'M1 15h3', 'M20 9h3', 'M20 15h3'] }),
  BarChart3: (p) => LIcon({ ...p, d: ['M18 20V10', 'M12 20V4', 'M6 20v-6'] }),
  ChevronLeft: (p) => LIcon({ ...p, d: 'M15 18l-6-6 6-6' }),
  ChevronRight: (p) => LIcon({ ...p, d: 'M9 18l6-6-6-6' }),
  Sun: (p) => LIcon({ ...p, d: ['M12 1v2', 'M12 21v2', 'M4.22 4.22l1.42 1.42', 'M18.36 18.36l1.42 1.42', 'M1 12h2', 'M21 12h2', 'M4.22 19.78l1.42-1.42', 'M18.36 5.64l1.42-1.42', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'] }),
  Moon: (p) => LIcon({ ...p, d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' }),
  User: (p) => LIcon({ ...p, d: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'] }),
  LogOut: (p) => LIcon({ ...p, d: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'] }),
  Settings: (p) => LIcon({ ...p, d: ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z'] }),
  Search: (p) => LIcon({ ...p, d: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M21 21l-4.35-4.35'] }),
  Plus: (p) => LIcon({ ...p, d: ['M12 5v14', 'M5 12h14'] }),
  X: (p) => LIcon({ ...p, d: ['M18 6L6 18', 'M6 6l12 12'] }),
  ArrowRight: (p) => LIcon({ ...p, d: ['M5 12h14', 'M12 5l7 7-7 7'] }),
  Send: (p) => LIcon({ ...p, d: ['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z'] }),
  Upload: (p) => LIcon({ ...p, d: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M17 8l-5-5-5 5', 'M12 3v12'] }),
  FileText: (p) => LIcon({ ...p, d: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8'] }),
  Sparkles: (p) => LIcon({ ...p, d: ['M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z', 'M20 3v4', 'M22 5h-4'] }),
  DatabaseZap: (p) => LIcon({ ...p, d: ['M4 6c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2z', 'M4 6v6c0 1.1 3.6 2 8 2s8-.9 8-2V6', 'M4 12v6c0 1.1 3.6 2 8 2', 'M13 18l3-5h-4l3-5'] }),
  MessageSquarePlus: (p) => LIcon({ ...p, d: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', 'M12 7v6', 'M9 10h6'] }),
  Trash2: (p) => LIcon({ ...p, d: ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'] }),
  Pencil: (p) => LIcon({ ...p, d: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z'] }),
  Wand2: (p) => LIcon({ ...p, d: ['M15 4V2', 'M15 16v-2', 'M8 9h2', 'M20 9h2', 'M17.8 11.8L19 13', 'M15 9h0', 'M17.8 6.2L19 5', 'M11 6.2L9.8 5', 'M11 11.8L9.8 13', 'M2 22l10-10'] }),
  RefreshCw: (p) => LIcon({ ...p, d: ['M21 2v6h-6', 'M3 12a9 9 0 0 1 15-6.7L21 8', 'M3 22v-6h6', 'M21 12a9 9 0 0 1-15 6.7L3 16'] }),
  ArrowUpDown: (p) => LIcon({ ...p, d: ['M7 15l5 5 5-5', 'M7 9l5-5 5 5'] }),
  Loader2: (p) => LIcon({ ...p, d: 'M21 12a9 9 0 1 1-6.219-8.56' }),
  AlertCircle: (p) => LIcon({ ...p, d: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M12 8v4', 'M12 16h.01'] }),
  MessagesSquare: (p) => LIcon({ ...p, d: ['M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z', 'M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1'] }),
  FileUp: (p) => LIcon({ ...p, d: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M12 18v-6', 'M9 15l3-3 3 3'] }),
};

Object.assign(window, { Icons, LIcon });

/* ── Theme Context ── */
const ThemeContext = React.createContext({ dark: false, toggle: () => {} });

function ThemeProvider({ children }) {
  const [dark, setDark] = React.useState(false);
  const toggle = React.useCallback(() => setDark(d => !d), []);
  return React.createElement(ThemeContext.Provider, { value: { dark, toggle } }, children);
}

function useTheme() { return React.useContext(ThemeContext); }

Object.assign(window, { ThemeContext, ThemeProvider, useTheme });

/* ── Route Context ── */
const RouteContext = React.createContext({ page: 'home', go: () => {} });

function RouteProvider({ children }) {
  const [page, setPage] = React.useState('home');
  const go = React.useCallback((p) => setPage(p), []);
  return React.createElement(RouteContext.Provider, { value: { page, go } }, children);
}

function useRoute() { return React.useContext(RouteContext); }

Object.assign(window, { RouteContext, RouteProvider, useRoute });

/* ── Utility: cn ── */
function cn(...args) {
  return args.filter(Boolean).join(' ');
}
window.cn = cn;

/* ── Shared style tokens (used in inline styles) ── */
const T = {
  light: {
    bg: '#F4F1ED', card: 'rgba(255,255,255,0.50)', cardSolid: '#FFFFFF',
    frosted: 'rgba(255,255,255,0.80)', inset: 'rgba(244,241,237,0.30)',
    text: '#1A1A1A', text70: 'rgba(26,26,26,0.70)', text50: 'rgba(26,26,26,0.50)',
    text40: 'rgba(26,26,26,0.40)', text30: 'rgba(26,26,26,0.30)', text20: 'rgba(26,26,26,0.20)',
    border: 'rgba(26,26,26,0.10)', borderMed: 'rgba(26,26,26,0.18)',
    primary: '#D4A373', primaryLight: 'rgba(212,163,115,0.10)', primaryMid: 'rgba(212,163,115,0.20)',
    primaryHover: 'rgba(212,163,115,0.05)',
    btnBg: '#7B6B5D', btnText: '#FFFFFF',
  },
  dark: {
    bg: '#1E1E1E', card: '#2D2D2D', cardSolid: '#2D2D2D',
    frosted: '#252526', inset: '#252526',
    text: '#CCCCCC', text70: '#E0E0E0', text50: '#858585',
    text40: '#6B6B6B', text30: '#5B5B5B', text20: '#4A4A4A',
    border: '#3C3C3C', borderMed: '#4A4A4A',
    primary: '#3B82F6', primaryLight: 'rgba(59,130,246,0.10)', primaryMid: 'rgba(59,130,246,0.20)',
    primaryHover: 'rgba(59,130,246,0.05)',
    btnBg: '#094771', btnText: '#FFFFFF',
  },
};

function useT() {
  const { dark } = useTheme();
  return dark ? T.dark : T.light;
}

Object.assign(window, { T, useT });
