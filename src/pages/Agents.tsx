import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { ArrowRight, Bot, Check, ChevronLeft, ClipboardCheck, Code2, Fingerprint, Link2, Pencil, Plus, Search, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../state';
import { bank, coverageLabel, demoAgent, safeguardOptions } from '../domain/policy';
import { createAgent, organizationName, saveAgent, saveSafeguards } from '../domain/repository';
import type { Agent, AgentInput, Risk, Safeguards } from '../domain/types';
import { Action, Badge, Button, Empty, InlineLink, Notice, PageTitle, Panel, usePending } from '../components/ui';
import { AgentTable, AssessmentTable, IntegrationBadge, RiskBadge } from '../components/records';

export function useCurrentAgent() { return useOutletContext<Agent>(); }
export const agentPath = (agent: Agent) => `/agents/${agent.id}`;

export function Agents() {
  const { state } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const agents = state.agents.filter((agent) => {
    const matches = [agent.name, agent.owner, agent.useCase, organizationName(state, agent.organizationId)].some((text) => text.toLowerCase().includes(query.trim().toLowerCase()));
    return matches && (filter === 'all' || Boolean(agent.integration) === (filter === 'connected'));
  });
  return <>
    <PageTitle title="Agents" description="Register existing AI agents and manage their technical assessment configuration." actions={<Action to="/agents/new" tone="primary"><Plus size={17} /> Register new agent</Action>} />
    <Panel title="Agent registry" description={`${state.agents.length} agents registered in this workspace`}>
      <div className="toolbar"><label className="search"><Search size={16} /><input aria-label="Search agents" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents…" /></label>
        <select aria-label="Filter integration status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All integrations</option><option value="connected">Connected</option><option value="disconnected">Not connected</option></select>
      </div>
      {agents.length ? <AgentTable agents={agents} /> : <Empty icon={<Bot size={20} />} title="No matching agents" description="Adjust your search or integration filter." />}
    </Panel>
  </>;
}

const steps = [
  { title: 'Agent profile', description: 'Identity and business purpose', icon: Bot },
  { title: 'Tools and scope', description: 'Access boundaries', icon: Code2 },
  { title: 'Review', description: 'Confirm registration', icon: ClipboardCheck },
];
const blank: AgentInput = { name: '', organization: bank.name, owner: '', description: '', useCase: '', risk: 'Moderate', framework: '', tools: [], restricted: [] };

function AgentForm({ guided = false, existing }: { guided?: boolean; existing?: Agent }) {
  const { state, perform } = useStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const report = state.assessments.find((item) => item.id === params.get('report') && item.agentId === existing?.id);
  const back = report ? { to: `/reports/${report.id}`, label: 'Back to report' } : existing ? { to: agentPath(existing), label: 'Back to agent' } : { to: '/agents', label: 'Back to agents' };
  const [step, setStep] = useState(0);
  const [expectedVersion] = useState(existing?.version);
  const [input, setInput] = useState<AgentInput>(() => existing ? { ...existing, organization: organizationName(state, existing.organizationId) } : guided ? demoAgent : blank);
  const [tools, setTools] = useState(input.tools.map((tool) => tool.name).join('\n'));
  const [restricted, setRestricted] = useState(input.restricted.join('\n'));
  const { busy, run } = usePending();
  const patch = <K extends keyof AgentInput,>(key: K, value: AgentInput[K]) => setInput((current) => ({ ...current, [key]: value }));
  const items = (text: string) => [...new Set(text.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean))];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!existing && step < 2) { setStep(step + 1); return; }
    void run(async () => {
      const profile = { ...input, name: input.name.trim(), owner: input.owner.trim(), description: input.description.trim(), useCase: input.useCase.trim(), tools: items(tools).map((name) => ({ name })), restricted: items(restricted) };
      if (existing) {
        const { organization, name, owner, description, useCase, risk, framework, tools, restricted } = profile;
        await perform((current, now) => ({ state: saveAgent(current, existing.id, { name, owner, description, useCase, risk, framework, tools, restricted }, now, { organization, expectedVersion }), value: null }), 'Agent configuration saved.');
        navigate(back.to);
      } else {
        const agent = await perform((current, now) => { const created = createAgent(current, profile, now); return { state: created.state, value: created.agent }; }, 'Agent registered.');
        navigate(`${agentPath(agent)}/connect`);
      }
    });
  };
  const field = (key: 'name' | 'organization' | 'owner' | 'useCase' | 'framework', label: string, placeholder: string, optional = false) =>
    <label className="field"><span>{label}{optional && <small>Optional</small>}</span><input required={!optional} pattern={optional ? undefined : '.*\\S.*'} maxLength={100} value={input[key]} onChange={(event) => patch(key, event.target.value)} placeholder={placeholder} /></label>;
  const profileFields = <div className="form-grid">
    {field('name', 'Agent name', 'e.g. Customer Support Agent')}{field('organization', 'Organization', bank.name)}
    {field('owner', 'Agent owner', 'e.g. Maya Hassan')}{field('useCase', 'Use case', 'e.g. Customer service')}
    <label className="field full"><span>Description and business purpose</span><textarea required maxLength={600} rows={3} placeholder="Describe the intended use and responsibilities." value={input.description} onChange={(event) => { event.target.setCustomValidity(event.target.value && !event.target.value.trim() ? 'Enter a business purpose.' : ''); patch('description', event.target.value); }} /></label>
    <label className="field"><span>Risk classification</span><select value={input.risk} onChange={(event) => patch('risk', event.target.value as Risk)}><option>Low</option><option>Moderate</option><option>High</option></select></label>
    {field('framework', 'Framework or provider', 'e.g. LangChain', true)}
  </div>;
  const scopeFields = <div className="form-grid">
    <label className="field"><span>Authorized tools</span><textarea className="mono" rows={6} maxLength={1500} value={tools} onChange={(event) => setTools(event.target.value)} placeholder={'get_account_balance\nget_transactions'} /><small>Enter one tool name per line.</small></label>
    <label className="field"><span>Restricted operations</span><textarea className="mono" rows={6} maxLength={1500} value={restricted} onChange={(event) => setRestricted(event.target.value)} placeholder={'export_customer_database\ntransfer_money'} /><small>Enter one operation per line.</small></label>
    <div className="full"><Notice>These declarations define the expected access boundaries. The assessment verifies simulated tool behavior separately.</Notice></div>
  </div>;
  return <>
    <PageTitle title={existing ? 'Edit agent configuration' : 'Register an existing agent'} description={existing ? existing.name : 'Declare the scope and ownership of an agent you want to assess.'} back={back} actions={guided && <Badge tone="indigo" dot>Guided demo</Badge>} />
    <div className={existing ? 'form-edit' : 'detail-grid registration'}>
      <Panel title={existing ? 'Agent profile and scope' : steps[step].title} description={existing ? 'Changes create a new configuration version.' : `Step ${step + 1} of ${steps.length} · ${steps[step].description}`}>
        <form onSubmit={submit}>
          <motion.div className="panel-body" key={step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>
            {guided && step === 0 && <div className="space-below"><Notice>Sample details are prefilled for a fictional banking agent. You can edit them before continuing.</Notice></div>}
            {(step === 0 || existing) && profileFields}
            {(step === 1 || existing) && <div className={existing ? 'space-above' : ''}>{scopeFields}</div>}
            {step === 2 && <><dl className="definition-grid">
              {Object.entries({ 'Agent name': input.name, Organization: input.organization, Owner: input.owner, 'Use case': input.useCase, 'Risk classification': input.risk, Framework: input.framework || 'Unspecified' }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl><div className="space-above"><strong>Business purpose</strong><p className="muted">{input.description}</p></div><div className="chip-group space-above">{items(tools).map((name) => <code className="chip" key={name}>{name}</code>)}{items(restricted).map((name) => <code className="chip chip-restricted" key={name}>{name}</code>)}</div></>}
          </motion.div>
          <div className="panel-footer form-footer">
            {step > 0 ? <Button onClick={() => setStep(step - 1)}><ChevronLeft size={16} /> Back</Button> : <Action tone="ghost" to={back.to}>Cancel</Action>}
            <Button type="submit" tone="primary" busy={busy}>{existing ? 'Save configuration' : step === 2 ? 'Register agent' : 'Continue'} <ArrowRight size={16} /></Button>
          </div>
        </form>
      </Panel>
      {!existing && <Panel title="Registration steps" className="side-panel"><ol className="step-list">{steps.map(({ title, description, icon: Icon }, index) => <li key={title} className={index === step ? 'current' : ''} aria-current={index === step ? 'step' : undefined}><span className="step-icon">{index < step ? <Check size={16} /> : <Icon size={16} />}</span><span><strong>{title}</strong><small>{description}</small></span></li>)}</ol></Panel>}
    </div>
  </>;
}

export function RegisterAgent() {
  const [params] = useSearchParams();
  const guided = params.get('demo') === '1';
  return <AgentForm key={String(guided)} guided={guided} />;
}

export function EditAgent() {
  const agent = useCurrentAgent();
  return <AgentForm existing={agent} key={agent.id} />;
}

export function AgentDetail() {
  const agent = useCurrentAgent();
  const { state } = useStore();
  const path = agentPath(agent);
  const assessments = state.assessments.filter((item) => item.agentId === agent.id);
  const active = assessments.find((item) => item.status === 'running');
  return <>
    <PageTitle title={agent.name} description={agent.description} back={{ to: '/agents', label: 'Back to agents' }} actions={<>
      <Action to={`${path}/edit`}><Pencil size={15} /> Edit configuration</Action>
      <Action tone="primary" to={active ? `/assessments/${active.id}` : agent.integration ? `${path}/configure` : `${path}/connect`}>{active ? 'View active run' : agent.integration ? 'Configure assessment' : 'Connect agent'} <ArrowRight size={16} /></Action>
    </>} />
    <div className="detail-grid space-below">
      <Panel title="Agent profile" description={organizationName(state, agent.organizationId)} action={<RiskBadge risk={agent.risk} />}>
        <div className="panel-body">
          <dl className="definition-grid"><div><dt>Owner</dt><dd>{agent.owner}</dd></div><div><dt>Use case</dt><dd>{agent.useCase}</dd></div><div><dt>Framework</dt><dd>{agent.framework || 'Unspecified'}</dd></div><div><dt>Configuration</dt><dd>Version {agent.version}</dd></div></dl>
          <div className="space-above"><strong>Authorized tools</strong><div className="chip-group">{agent.tools.length ? agent.tools.map(({ name }) => <code className="chip" key={name}>{name}</code>) : <span className="muted">None declared</span>}</div></div>
          <div className="space-above"><strong>Restricted operations</strong><div className="chip-group">{agent.restricted.length ? agent.restricted.map((name) => <code className="chip chip-restricted" key={name}>{name}</code>) : <span className="muted">None declared</span>}</div></div>
        </div>
      </Panel>
      <div className="stack">
        <Panel title="Integration" action={<Link2 className="muted" size={18} />}><div className="panel-body compact"><IntegrationBadge agent={agent} /><p className="muted">{coverageLabel(agent.integration?.coverage)}</p><InlineLink to={`${path}/connect`}>Manage integration</InlineLink></div></Panel>
        <Panel title="Agent safeguards" action={<ShieldCheck className="muted" size={18} />}><div className="panel-body compact"><p className="muted">{Object.values(agent.safeguards).filter(Boolean).length} of 5 safeguards enabled.</p><InlineLink to={`${path}/safeguards`}>Manage safeguards</InlineLink></div></Panel>
      </div>
    </div>
    <Panel title="Assessment history" description="Assessment runs and evidence for this agent.">{assessments.length ? <AssessmentTable assessments={assessments} /> : <Empty icon={<ClipboardCheck size={20} />} title="No assessments yet" description="Connect this agent to begin its first assessment." />}</Panel>
  </>;
}

export function Safeguards() {
  const agent = useCurrentAgent();
  const [params] = useSearchParams();
  const report = params.get('report');
  const back = report ? { to: `/reports/${report}`, label: 'Back to report' } : { to: agentPath(agent), label: 'Back to agent' };
  const [patch, setPatch] = useState<Partial<Safeguards>>({});
  const draft = { ...agent.safeguards, ...patch };
  const { perform } = useStore();
  const { busy, run } = usePending();
  const changed = safeguardOptions.some(({ key }) => draft[key] !== agent.safeguards[key]);
  return <>
    <PageTitle title="Agent safeguards" description={`${agent.name} · Configuration v${agent.version}`} back={back} />
    <div className="detail-grid">
      <Panel title="Technical safeguards" description="Configure the controls the simulator evaluates." action={<Fingerprint size={19} className="muted" />}>
        <div className="toggle-list">{safeguardOptions.map(({ key, label, description }) => <div className="toggle-row" key={key}>
          <div><strong id={`toggle-${key}`}>{label}</strong><p>{description}</p></div>
          <button className="switch" type="button" role="switch" aria-checked={draft[key]} aria-labelledby={`toggle-${key}`} disabled={busy} onClick={() => {
            const changes = { ...patch };
            const next = !draft[key];
            if (next === agent.safeguards[key]) delete changes[key];
            else changes[key] = next;
            setPatch(changes);
          }}><span /></button>
        </div>)}</div>
        <div className="panel-footer form-footer"><Link to={back.to} className="button button-ghost">{report ? 'Return to report' : 'Return to agent'}</Link><Button tone="primary" busy={busy} disabled={!changed} onClick={() => void run(async () => {
          await perform((state, now) => ({ state: saveSafeguards(state, agent.id, patch, now), value: null }), 'Safeguards saved. Retest to verify the updated controls.');
          setPatch({});
        })}>Save safeguards <Check size={16} /></Button></div>
      </Panel>
      <Panel className="side-panel" title="Verify your changes"><div className="panel-body compact"><Notice>Saving increments the configuration version. Run a retest to produce new evidence and update the report.</Notice></div></Panel>
    </div>
  </>;
}
