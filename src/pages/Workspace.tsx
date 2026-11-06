import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowRight, Award, Database, FlaskConical, Printer, RotateCcw, ShieldCheck } from 'lucide-react';
import { useStore } from '../state';
import { certificateNotice, coverageLabel } from '../domain/policy';
import { canIssue, reset } from '../domain/repository';
import { Action, Badge, Brand, Button, Empty, formatDate, Modal, Notice, PageTitle, Panel, usePending } from '../components/ui';
import { ActivityItems } from '../components/records';
import type { ActivityKind } from '../domain/types';

export function Certificates() {
  const { state } = useStore();
  const pending = state.assessments.filter((item) => canIssue(state, item) && !state.certificates.some((cert) => cert.assessmentId === item.id));
  return <>
    <PageTitle title="Certificates" description="Preview and print simulated technical assurance attestations for verified agents." />
    <div className="space-below"><Notice>{certificateNotice}</Notice></div>
    {pending.length > 0 && <Panel title="Ready for issuance" className="space-below"><div className="certificate-list">{pending.map((item) => <div key={item.id}><span className="tile tile-indigo"><ShieldCheck size={18} /></span><div><strong>{item.snapshot.name}</strong><small>{item.id} · Configuration v{item.snapshot.version}</small></div><Action to={`/reports/${item.id}`}>Open report <ArrowRight size={15} /></Action></div>)}</div></Panel>}
    <Panel title="Issued certificates" description={`${state.certificates.length} prototype attestations`}>
      {state.certificates.length ? <div className="table-scroll"><table><thead><tr><th>Certificate</th><th>Agent</th><th>Issued</th><th>Proposed expiration</th><th><span className="sr-only">Preview</span></th></tr></thead><tbody>{state.certificates.map((item) => <tr key={item.id}>
        <td><Link to={`/certificates/${item.id}`} className="record-link"><span className="table-icon"><Award size={17} /></span><span>{item.id}<small>{item.organization}</small></span></Link></td>
        <td>{item.agent}</td><td>{formatDate(item.issuedAt)}</td><td>{formatDate(item.expiresAt)}</td><td><Action to={`/certificates/${item.id}`}>Preview <ArrowRight size={15} /></Action></td>
      </tr>)}</tbody></table></div> : <Empty icon={<Award size={20} />} title="No issued certificates" description="Pass every mandatory control to unlock issuance." action={<Action to="/reports">Review reports <ArrowRight size={15} /></Action>} />}
    </Panel>
  </>;
}

export function CertificatePreview() {
  const { id } = useParams();
  const { state } = useStore();
  const certificate = state.certificates.find((item) => item.id === id);
  if (!certificate) return <Unavailable area="certificates" />;
  return <>
    <div className="print-hide"><PageTitle title="Certificate preview" description="Use your browser’s print dialog to save a PDF copy." back={{ to: '/certificates', label: 'Back to certificates' }} actions={<Button tone="primary" onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</Button>} /></div>
    <article className="certificate">
      <header><Brand /><Badge tone="indigo">PROTOTYPE ATTESTATION</Badge></header>
      <div className="certificate-main"><div className="certificate-seal"><ShieldCheck size={33} strokeWidth={1.5} /></div><div className="eyebrow">P5 TECHNICAL ASSURANCE PROGRAM</div><h1>Technical Assurance Certificate</h1><p>Issued to <strong>{certificate.organization}</strong> for</p><h2>{certificate.agent}</h2><Badge tone="green" dot>Mandatory technical controls verified</Badge></div>
      <dl className="certificate-meta">
        {Object.entries({
          'Certificate identifier': certificate.id, 'Assessment policy': `${certificate.policyName} v${certificate.policyVersion}`,
          'Assessment date': formatDate(certificate.assessedAt), 'Proposed expiration': formatDate(certificate.expiresAt),
          'Passed mandatory checks': `${certificate.checks} of ${certificate.checks}`, 'Verified integration coverage': coverageLabel(certificate.coverage),
          'Assessment environment': certificate.environment, 'Assessed configuration': `Version ${certificate.version}`,
        }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <footer><strong>Scope and limitations</strong><p>This attestation covers the recorded agent configuration, selected policy, and synthetic scenarios in the P5 sandbox. It does not establish production behavior or legal compliance.</p><p className="certificate-notice">{certificateNotice}</p></footer>
    </article>
    <div className="certificate-links print-hide"><Action to={`/reports/${certificate.assessmentId}`}>Open source assessment <ArrowRight size={15} /></Action></div>
  </>;
}

export function ActivityLog() {
  const { state } = useStore();
  const [filter, setFilter] = useState<ActivityKind | 'all'>('all');
  const items = state.activity.filter((item) => filter === 'all' || item.kind === filter);
  return <>
    <PageTitle title="Activity log" description="Review the workspace history for agent configuration, assessment, and issuance events." />
    <Panel title="Workspace events" description={`${items.length} recorded events`} action={<select aria-label="Filter event type" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="all">All events</option><option value="agent">Agent</option><option value="connection">Integration</option><option value="assessment">Assessment</option><option value="finding">Safeguards</option><option value="certificate">Certificate</option></select>}>
      {items.length ? <ActivityItems items={items} full /> : <Empty icon={<Activity size={20} />} title="No matching events" description="Choose a different event type." />}
    </Panel>
  </>;
}

export function Settings() {
  const { perform } = useStore();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const { busy, run } = usePending();
  return <>
    <PageTitle title="Workspace settings" description="Review the sandbox environment and reset the demonstration." />
    <div className="detail-grid">
      <div className="stack">
        <Panel title="Simulation environment" description="Demo National Bank workspace" action={<FlaskConical size={18} className="muted" />}><div className="panel-body stack compact">
          <Notice>All agents, tests, traces and attestations use fictional data. Integration, enforcement, and governance findings are simulated in the browser.</Notice>
          <dl className="summary-list"><div><dt>Storage</dt><dd>Local browser storage</dd></div><div><dt>External connections</dt><dd>None</dd></div><div><dt>Environment</dt><dd>P5 simulated sandbox</dd></div></dl>
        </div></Panel>
        <Panel title="Reset demonstration" description="Restore the original fictional bank records." action={<Database size={18} className="muted" />}><div className="panel-body compact stack"><p className="muted">Reset removes agents you created, new assessments and certificates, and changes to the seeded workspace in this browser.</p><div><Button tone="danger" onClick={() => setConfirm(true)}><RotateCcw size={16} /> Reset Demo</Button></div></div></Panel>
      </div>
      <Panel title="Demo sequence" className="side-panel"><div className="panel-body compact stack"><p className="muted">Register the sample agent, connect it, assess its controls, remediate findings, and issue a certificate.</p><Action to="/agents/new?demo=1">Start guided demo <ArrowRight size={15} /></Action></div></Panel>
    </div>
    {confirm && <Modal title="Reset demonstration?" onClose={() => { if (!busy) setConfirm(false); }}><div className="panel-body"><p>Your local demo changes will be replaced with the original fictional bank workspace.</p></div><div className="panel-footer form-footer"><Button disabled={busy} onClick={() => setConfirm(false)}>Cancel</Button><Button tone="danger" busy={busy} onClick={() => void run(async () => {
      await perform((state) => ({ state: reset(state), value: null }), 'Demo reset to its original workspace.');
      navigate('/');
    })}>Reset demo data</Button></div></Modal>}
  </>;
}

export function Unavailable({ area = 'overview' }: { area?: string }) {
  return <><PageTitle title="Page unavailable" description="This workspace record could not be found." /><Action to={area === 'overview' ? '/' : `/${area}`}>Back to {area} <ArrowRight size={15} /></Action></>;
}
