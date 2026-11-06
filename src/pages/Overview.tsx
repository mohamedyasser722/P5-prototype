import { ArrowRight, Award, Bot, ChartNoAxesCombined, ClipboardCheck, FlaskConical, Plus, Workflow, ShieldCheck, Fingerprint, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../state';
import { canIssue } from '../domain/repository';
import { summarize } from '../domain/simulator';
import { Action, InlineLink, PageTitle, Panel } from '../components/ui';
import { ActivityItems, AgentTable } from '../components/records';

function HeroArt() {
  return <svg className="hero-art" viewBox="0 0 520 234" fill="none" aria-hidden="true">
    <defs>
      <pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".9" fill="#a29afb" opacity=".28" /></pattern>
      <radialGradient id="art-fade"><stop offset="25%" stopColor="white" /><stop offset="100%" stopColor="black" /></radialGradient>
      <mask id="art-mask"><rect width="520" height="234" fill="url(#art-fade)" /></mask>
      <linearGradient id="shield-fill" x1="340" y1="65" x2="390" y2="168" gradientUnits="userSpaceOnUse"><stop stopColor="#6553db" /><stop offset="1" stopColor="#201e45" /></linearGradient>
    </defs>
    <rect width="520" height="234" fill="url(#dots)" mask="url(#art-mask)" />
    <g stroke="#a699fe" strokeOpacity=".31">
      <ellipse cx="346" cy="118" rx="147" ry="74" transform="rotate(-22 346 118)" />
      <ellipse cx="346" cy="118" rx="114" ry="57" transform="rotate(28 346 118)" />
      <ellipse cx="346" cy="118" rx="142" ry="96" strokeDasharray="3 6" />
      <circle cx="346" cy="118" r="80" /><path d="M160 118h45m284 0h26M346 1v21m0 191v20M225 47l22 15m206 103 24 17" />
      <rect x="219" y="77" width="37" height="37" rx="9" fill="#252344" strokeOpacity=".8" />
      <rect x="449" y="135" width="37" height="37" rx="9" fill="#252344" strokeOpacity=".8" />
      <rect x="403" y="28" width="33" height="33" rx="8" fill="#252344" strokeOpacity=".8" />
    </g>
    <g stroke="#bfb7ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m237.5 87 8 4.5v8l-8 4.5-8-4.5v-8l8-4.5Zm-8 4.5 8 4.5 8-4.5m-8 4.5v8" />
      <path d="M462 149h11m-11 4h11m-11 4h7m-9-12h15a2 2 0 0 1 2 2v15h-19v-15a2 2 0 0 1 2-2Z" />
      <path d="m416 48 8-8m-7 2 2-2a4 4 0 0 1 6 6l-2 2m-1-1-2 2a4 4 0 0 1-6-6l2-2" />
    </g>
    <circle cx="346" cy="118" r="55" fill="#27244e" stroke="#7366db" strokeOpacity=".6" />
    <path d="M346 76c10 7 22 11 34 12v29c0 23-14 36-34 45-20-9-34-22-34-45V88c12-1 24-5 34-12Z" fill="url(#shield-fill)" stroke="#a99bff" strokeWidth="1.6" />
    <path d="m332 118 10 10 19-21" stroke="#eeeaff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <g fill="#a99bff"><circle cx="282" cy="170" r="3" /><circle cx="428" cy="79" r="3" /><circle cx="319" cy="35" r="2.5" /><circle cx="381" cy="202" r="2.5" /><circle cx="219" cy="148" r="2.5" /></g>
  </svg>;
}

export function Overview() {
  const { state } = useStore();
  const active = state.assessments.filter((item) => item.status === 'running').length;
  const completed = state.assessments.filter((item) => item.status === 'complete');
  const connected = state.agents.filter((item) => item.integration).length;
  const certified = new Set(state.certificates.map((item) => item.assessmentId));
  const eligible = completed.filter((item) => !certified.has(item.id) && canIssue(state, item)).length;
  const review = completed.filter((item) => !certified.has(item.id) && !canIssue(state, item)).length;
  const results = completed.map(summarize).reduce((a, b) => ({ passed: a.passed + b.passed, failed: a.failed + b.failed, unverified: a.unverified + b.unverified }), { passed: 0, failed: 0, unverified: 0 });
  const total = results.passed + results.failed + results.unverified;
  const metrics = [
    { label: 'Registered agents', value: state.agents.length, foot: `${connected} connected`, icon: Bot, tone: 'indigo', to: '/agents' },
    { label: 'Assessments', value: state.assessments.length, foot: `${active} active · ${completed.length} completed`, icon: ClipboardCheck, tone: 'blue', to: '/assessments' },
    { label: 'Control pass rate', value: total ? `${Math.round(results.passed / total * 100)}%` : '—', foot: `${results.passed} passed · ${results.failed} failed${results.unverified ? ` · ${results.unverified} unverified` : ''}`, icon: ChartNoAxesCombined, tone: 'green', to: '/reports' },
    { label: 'Certificates issued', value: state.certificates.length, foot: `${eligible} ready · ${review} pending review`, icon: Award, tone: 'orange', to: '/certificates' },
  ];
  return <>
    <PageTitle title="Workspace overview" description="Manage agent integrations, governance assessments, and technical assurance." actions={<Action to="/agents/new" tone="primary"><Plus size={17} /> Register new agent</Action>} />
    <section className="hero">
      <HeroArt />
      <div className="hero-copy"><div className="hero-label"><FlaskConical size={13} /> GUIDED DEMO</div><h2>From agent to assurance</h2>
        <p>Connect a banking agent, test its governance controls, and issue a simulated technical assurance certificate.</p>
        <div className="hero-actions"><Action to="/agents/new?demo=1" className="hero-button">Start guided demo <ArrowRight size={16} /></Action><span>5–8 minute walkthrough</span></div>
      </div>
    </section>
    <div className="metrics">{metrics.map(({ label, value, foot, icon: Icon, tone, to }) => <Link className="metric panel" to={to} key={label}>
      <div className="metric-top"><span className={`tile tile-${tone}`}><Icon size={18} /></span><ArrowRight className="metric-arrow" size={15} /></div>
      <div className="metric-value">{value}</div><div className="metric-label">{label}</div><div className="metric-foot">{foot}</div>
    </Link>)}</div>
    <div className="overview-grid">
      <Panel title="Registered agents" description="AI agents in your assurance workspace" action={<InlineLink to="/agents">View all agents</InlineLink>}><AgentTable agents={state.agents.slice(0, 4)} /></Panel>
      <Panel title="Recent activity" description="Latest workspace changes" action={<InlineLink to="/activity">View log</InlineLink>}><ActivityItems items={state.activity.slice(0, 4)} /></Panel>
    </div>
    <Panel className="workflow-panel" title="Assurance lifecycle" description="A repeatable path from registration to technical attestation." action={<Workflow size={19} className="muted" />}>
      <div className="workflow">{[{ icon: Bot, title: 'Register' }, { icon: Link2, title: 'Connect' }, { icon: ClipboardCheck, title: 'Assess' }, { icon: Fingerprint, title: 'Remediate' }, { icon: ShieldCheck, title: 'Certify' }].map(({ icon: Icon, title }, index) => <div key={title}><span className="tile tile-indigo"><Icon size={16} /></span><span><small>0{index + 1}</small>{title}</span>{index < 4 && <ArrowRight size={14} className="workflow-arrow" />}</div>)}</div>
    </Panel>
  </>;
}
