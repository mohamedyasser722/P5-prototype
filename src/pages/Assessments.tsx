import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Activity, ArrowRight, Check, ChevronDown, Circle, ClipboardCheck, Clock3, FileText, FlaskConical, Layers, ListChecks, LoaderCircle, Play, Radio, ShieldCheck, Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../state';
import { coverageLabel, mandatory, policy, testCase } from '../domain/policy';
import { startRun } from '../domain/repository';
import { mandatoryPass, summarize } from '../domain/simulator';
import type { Assessment, TestExecution, TestId } from '../domain/types';
import { Action, Badge, Button, Empty, Notice, PageTitle, Panel, formatTime, usePending } from '../components/ui';
import { AssessmentTable, OutcomeBadge } from '../components/records';
import { agentPath, useCurrentAgent } from './Agents';

export function useAssessment() { return useOutletContext<Assessment>(); }

export function Assessments({ reports = false }: { reports?: boolean }) {
  const { state } = useStore();
  const [filter, setFilter] = useState('all');
  const items = state.assessments.filter((item) => reports ? item.status === 'complete' : filter === 'all' || item.status === filter);
  return <>
    <PageTitle title={reports ? 'Reports' : 'Assessments'} description={reports ? 'Review outcomes, findings, and evidence from completed assessments.' : 'Run and track technical governance checks for registered agents.'} actions={!reports && <Action tone="primary" to="/agents"><ClipboardCheck size={16} /> Choose an agent</Action>} />
    <Panel title={reports ? 'Assessment reports' : 'Assessment runs'} description={`${items.length} ${items.length === 1 ? 'record' : 'records'}`} action={!reports && <select aria-label="Filter assessment status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option><option value="running">Running</option><option value="complete">Completed</option></select>}>
      {items.length ? <AssessmentTable assessments={items} reports={reports} /> : <Empty icon={<FileText size={20} />} title={reports ? 'No reports yet' : 'No matching assessments'} description={reports ? 'Complete an assessment to generate its evidence report.' : 'Choose an agent or change the status filter.'} />}
    </Panel>
  </>;
}

export function ConfigureAssessment() {
  const agent = useCurrentAgent();
  const { state, perform } = useStore();
  const navigate = useNavigate();
  const [optional, setOptional] = useState<TestId[]>([]);
  const { busy, run } = usePending();
  const path = agentPath(agent);
  const active = state.assessments.find((item) => item.agentId === agent.id && item.status === 'running');
  const categories = [...new Set(mandatory.map((item) => item.category))];
  return <>
    <PageTitle title="Configure assessment" description={`Select scenarios for ${agent.name}.`} back={{ to: path, label: 'Back to agent' }} actions={<Badge tone="indigo" dot>Technical policy</Badge>} />
    {!agent.integration && <div className="space-below"><Notice tone="warning">Connect the agent before starting an assessment. <Link to={`${path}/connect`} className="inline-link">Open integration <ArrowRight size={14} /></Link></Notice></div>}
    <div className="detail-grid">
      <div className="stack">
        <Panel title={policy.name} description={`Version ${policy.version} · Six mandatory control categories`} action={<Layers size={19} className="muted" />}>
          <div className="category-list">{categories.map((category, index) => <div className="category-row" key={category}><span className="category-index">0{index + 1}</span><div><h3>{category}</h3>{mandatory.filter((item) => item.category === category).map((item) => <div className="scenario" key={item.id}><code>{item.id}</code><span>{item.name}</span></div>)}</div><Badge>Required</Badge></div>)}</div>
        </Panel>
        <Panel title="Additional scenarios" description="Optional probes add evidence to the report.">
          <div className="radio-list">{policy.tests.filter((item) => !item.mandatory).map((item) => <label className={`radio-card ${optional.includes(item.id) ? 'selected' : ''}`} key={item.id}><ListChecks size={18} /><span><strong>{item.name} <code className="small-code">{item.id}</code></strong><small>{item.scenario}</small></span><input type="checkbox" checked={optional.includes(item.id)} onChange={(event) => setOptional(event.target.checked ? [...optional, item.id] : optional.filter((id) => id !== item.id))} /></label>)}</div>
        </Panel>
      </div>
      <Panel title="Execution summary" description="Review the captured scope" className="side-panel" action={<FlaskConical size={18} className="muted" />}>
        <div className="panel-body compact stack">
          <dl className="summary-list"><div><dt>Configuration</dt><dd>v{agent.version}</dd></div><div><dt>Coverage</dt><dd>{coverageLabel(agent.integration?.coverage)}</dd></div><div><dt>Required checks</dt><dd>{mandatory.length}</dd></div><div><dt>Optional scenarios</dt><dd>{optional.length}</dd></div><div><dt>Environment</dt><dd>P5 simulated sandbox</dd></div></dl>
          {agent.integration?.coverage === 'llm' && <Notice tone="warning">Tool controls will be unverified with LLM-only coverage.</Notice>}
          <Notice>P5 evaluates its proposed technical controls in a simulation. Results do not establish legal compliance.</Notice>
          {active ? <Action tone="primary" to={`/assessments/${active.id}`}>Open active assessment <ArrowRight size={16} /></Action> : <Button tone="primary" busy={busy} disabled={!agent.integration} onClick={() => void run(async () => {
            const id = await perform((current, now) => { const started = startRun(current, agent.id, optional, now); return { state: started.state, value: started.assessment.id }; });
            navigate(`/assessments/${id}`);
          })}><Play size={16} /> Run assessment</Button>}
        </div>
      </Panel>
    </div>
  </>;
}

export function EvidenceBlock({ execution }: { execution: TestExecution }) {
  return <div className="evidence"><div><Terminal size={15} /> Simulated evidence <code>v{execution.version}</code></div><pre>{JSON.stringify(execution.evidence.payload, null, 2)}</pre></div>;
}

export function ResultCounts({ assessment }: { assessment: Assessment }) {
  const counts = summarize(assessment);
  return <div className="result-counts">{([
    ['Passed', counts.passed, 'green'], ['Failed', counts.failed, 'red'], ['Not verified', counts.unverified, 'orange'],
  ] as const).map(([label, value, tone]) => <div key={label}><span className={`count-dot count-${tone}`} /><span>{label}</span><strong>{value}</strong></div>)}</div>;
}

export function Execution() {
  const assessment = useAssessment();
  const running = assessment.status === 'running';
  const [now, setNow] = useState(Date.now);
  const currentId = running ? assessment.queue[assessment.cursor] : undefined;
  const currentProgress = currentId ? Math.min(.98, Math.max(0, (now - Date.parse(assessment.stepStartedAt)) / testCase(currentId).duration)) : 0;
  const percent = running ? Math.min(99, Math.round((assessment.cursor + currentProgress) / assessment.queue.length * 100)) : 100;
  const recent = assessment.queue.slice(0, assessment.cursor).map((id) => assessment.results[id]).filter((item): item is TestExecution => Boolean(item)).reverse();

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 85);
    return () => window.clearInterval(timer);
  }, [running]);

  return <>
    <PageTitle title={assessment.attempt > 1 ? 'Control retest' : 'Assessment execution'} description={`${assessment.snapshot.name} · ${assessment.id} · Configuration v${assessment.snapshot.version}`} back={{ to: '/assessments', label: 'Back to assessments' }} actions={<Badge tone="indigo" dot>Attempt {assessment.attempt}</Badge>} />
    <section className={`execution-banner ${running ? '' : 'execution-complete'}`}>
      <div className="execution-head"><span className="execution-icon">{running ? <Radio size={25} /> : <ShieldCheck size={25} />}</span><div><div className="execution-kicker">P5 SIMULATION ENGINE</div><h2>{running ? 'Running assessment' : 'Assessment complete'}</h2><p>{running ? `${assessment.cursor} of ${assessment.queue.length} checks completed` : mandatoryPass(assessment) ? 'All mandatory controls passed.' : 'Review the report to resolve outstanding controls.'}</p></div><strong>{percent}%</strong></div>
      <div className="progress-track" role="progressbar" aria-label="Assessment progress" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><motion.span animate={{ width: `${percent}%` }} transition={{ duration: .13, ease: 'linear' }} /></div>
      {!running && <div className="execution-summary"><ResultCounts assessment={assessment} /><Action tone="primary" to={`/reports/${assessment.id}`}>Open assessment report <ArrowRight size={16} /></Action></div>}
    </section>
    <div className="detail-grid execution-grid">
      <Panel title="Control execution" description={`${policy.name} · Version ${policy.version}`} action={<ListChecks size={19} className="muted" />}>
        <div className="execution-list">{assessment.testIds.map((id) => {
          const scenario = testCase(id);
          const index = assessment.queue.indexOf(id);
          const executing = currentId === id;
          const queued = running && index > assessment.cursor;
          const result = assessment.results[id];
          const visible = !executing && !queued && result;
          return <details key={id} className={`test-execution ${executing ? 'test-running' : ''}`}>
            <summary><span className="test-marker">{executing ? <LoaderCircle size={17} className="spin" /> : visible ? <Check size={16} /> : <Circle size={15} />}</span><span className="test-heading"><code>{id}</code><strong>{scenario.name}</strong></span>
              <span className="test-status">{visible ? <OutcomeBadge outcome={visible.outcome} /> : executing ? <Badge tone="indigo">Running</Badge> : <Badge>Queued</Badge>}</span><ChevronDown size={15} className="expand-icon" />
              {executing && <span className="test-progress" aria-hidden="true"><span style={{ width: `${currentProgress * 100}%` }} /></span>}
            </summary>
            <div className="test-details"><p>{scenario.scenario}</p><span className="duration"><Clock3 size={14} /> {(scenario.duration / 1000).toFixed(2)}s simulated duration</span>{visible && <><p>{visible.evidence.summary}</p><EvidenceBlock execution={visible} /></>}</div>
          </details>;
        })}</div>
      </Panel>
      <Panel title="Live activity" description="Events emitted by this execution" className="side-panel" action={<Activity size={18} className="muted" />}>
        <div className="run-feed">
          {currentId && <div className="feed-row feed-current"><span /><div><strong>{currentId} started</strong><small>{testCase(currentId).name}</small></div><time>{formatTime(assessment.stepStartedAt)}</time></div>}
          {recent.map((item) => <div className="feed-row" key={item.id}><span className={`feed-${item.outcome === 'PASS' ? 'green' : item.outcome === 'FAIL' ? 'red' : 'orange'}`} /><div><strong>{item.id} · {item.outcome}</strong><small>{item.evidence.summary}</small></div><time>{formatTime(item.finishedAt)}</time></div>)}
          <div className="feed-row"><span /><div><strong>{assessment.attempt > 1 ? 'Retest initialized' : 'Assessment initialized'}</strong><small>Configuration snapshot captured.</small></div><time>{formatTime(assessment.startedAt)}</time></div>
        </div>
      </Panel>
    </div>
  </>;
}
