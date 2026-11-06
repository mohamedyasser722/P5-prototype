import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, ArrowUpRight, Award, Bot, Building2, CheckCircle2, ChevronRight, CircleAlert, ClipboardCheck, FileText, FlaskConical, LayoutGrid, Menu, Settings2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useStore } from '../state';
import { Brand, Button } from './ui';

const navigation = [
  { to: '/', label: 'Overview', icon: LayoutGrid },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/assessments', label: 'Assessments', icon: ClipboardCheck },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/certificates', label: 'Certificates', icon: Award },
  { to: '/activity', label: 'Activity Log', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings2 },
];

function Breadcrumbs() {
  const { pathname } = useLocation();
  const { state } = useStore();
  const [, area, id, child] = pathname.split('/');
  const nav = navigation.find((item) => item.to === `/${area}`);
  const agent = area === 'agents' ? state.agents.find((item) => item.id === id) : undefined;
  const labels: Record<string, string> = { new: 'Register agent', connect: 'Integration', configure: 'Configure assessment', safeguards: 'Safeguards', edit: 'Edit configuration' };
  return <div className="breadcrumbs">
    <span className="breadcrumb-root">Workspace</span><ChevronRight size={13} />
    {id && nav ? <Link to={nav.to}>{nav.label}</Link> : <span className="current-crumb">{nav?.label ?? (area ? 'Page unavailable' : 'Overview')}</span>}
    {id && <><ChevronRight size={13} />{child && agent ? <Link to={`/agents/${id}`}>{agent.name}</Link> : <span className="current-crumb">{agent?.name ?? labels[id] ?? id}</span>}</>}
    {child && <><ChevronRight size={13} /><span className="current-crumb">{labels[child] ?? child}</span></>}
  </div>;
}

export function Shell() {
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  const [menu, setMenu] = useState(false);
  const { toast, dismiss } = useStore();
  const closeMenu = () => {
    setMenu(false);
    document.getElementById('navigation-toggle')?.focus();
  };
  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    window.scrollTo(0, 0);
    setMenu(false);
    main.current?.focus({ preventScroll: true });
  }, [location.pathname]);
  useEffect(() => {
    if (!menu) return;
    const links = sidebar.current?.querySelectorAll<HTMLAnchorElement>('a[href]');
    const first = links?.[0];
    const last = links?.[links.length - 1];
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
      if (event.key === 'Tab' && event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (event.key === 'Tab' && !event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const mobile = window.matchMedia('(max-width: 740px)');
    const onResize = () => { if (!mobile.matches) setMenu(false); };
    window.addEventListener('keydown', onKey);
    mobile.addEventListener('change', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      mobile.removeEventListener('change', onResize);
    };
  }, [menu]);
  return <div className="app-shell">
    <a href="#main-content" className="skip-link" onClick={(event) => { event.preventDefault(); main.current?.focus(); }}>Skip to content</a>
    {menu && <button className="sidebar-scrim" aria-label="Close navigation" tabIndex={-1} onClick={closeMenu} />}
    <aside id="workspace-sidebar" ref={sidebar} className={`sidebar ${menu ? 'sidebar-open' : ''}`}>
      <Link to="/" className="brand-link" aria-label="P5 overview" onClick={() => setMenu(false)}><Brand /></Link>
      <div className="workspace-card"><span className="workspace-icon"><Building2 size={17} /></span><div><strong>Demo National Bank</strong><small>Demo workspace</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Workspace navigation">{navigation.slice(0, 5).map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setMenu(false)}><Icon size={17} strokeWidth={1.85} />{label}</NavLink>)}</nav>
      <div className="nav-label nav-secondary">ADMINISTRATION</div>
      <nav aria-label="Administration">{navigation.slice(5).map(({ to, icon: Icon, label }) => <NavLink key={to} to={to} onClick={() => setMenu(false)}><Icon size={17} strokeWidth={1.85} />{label}</NavLink>)}</nav>
      <div className="sidebar-bottom">
        <Link to="/settings" className="sandbox-card" onClick={() => setMenu(false)}><FlaskConical size={17} /><div><strong>Simulation mode</strong><small>Fictional data only</small></div><ArrowUpRight size={13} /></Link>
        <div className="profile"><span className="avatar">MH</span><div><strong>Maya Hassan</strong><small>Workspace admin</small></div></div>
      </div>
    </aside>
    <div className="app-area">
      <header className="topbar"><div className="topbar-left"><Button className="icon-button menu-toggle" tone="ghost" id="navigation-toggle" aria-label="Toggle navigation" aria-controls="workspace-sidebar" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X size={20} /> : <Menu size={20} />}</Button><Breadcrumbs /></div><span className="environment"><i /> Sandbox environment</span></header>
      <main className="main-content" id="main-content" tabIndex={-1} ref={main}><Outlet /></main>
    </div>
    <AnimatePresence>{toast && <motion.div role={toast.tone === 'error' ? 'alert' : 'status'} className={`toast toast-${toast.tone}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
      {toast.tone === 'success' ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}<span>{toast.message}</span><Button tone="ghost" className="icon-button" aria-label="Dismiss notification" onClick={dismiss}><X size={16} /></Button>
    </motion.div>}</AnimatePresence>
  </div>;
}
