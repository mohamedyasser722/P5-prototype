import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, ChevronLeft, ChevronRight, CircleCheck, Code2, Link2, LoaderCircle, MousePointer2, Network, Pause, Play, Plug, Radio, RotateCcw, Terminal, Workflow } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Action, Badge, Button, CopyButton, Modal, Notice, PageTitle, Panel, formatDate, usePending } from '../components/ui';
import { IntegrationBadge } from '../components/records';
import { coverageLabel, gatewayUrl } from '../domain/policy';
import { connectAgent } from '../domain/repository';
import type { Coverage } from '../domain/types';
import { useStore } from '../state';
import { agentPath, useCurrentAgent } from './Agents';

type Language = 'python' | 'javascript';

function example(language: Language, integrated: boolean) {
  if (language === 'python') {
    return ['llm = ChatOpenAI(', '    model="example-model",', `    api_key=${integrated ? 'P5_GATEWAY_KEY,' : 'PROVIDER_API_KEY'}`, ...(integrated ? [`    base_url="${gatewayUrl}"`] : []), ')'];
  }
  return ['const llm = new ChatOpenAI({', '  model: "example-model",', `  apiKey: process.env.${integrated ? 'P5_GATEWAY_KEY,' : 'PROVIDER_API_KEY'}`, ...(integrated ? [`  configuration: { baseURL: "${gatewayUrl}" }`] : []), '});'];
}

function tokenize(line: string) {
  return line.split(/("[^"]*"|\b(?:ChatOpenAI|const|new|P5_GATEWAY_KEY|PROVIDER_API_KEY)\b)/g).map((token, index) =>
    <span key={index} className={token.startsWith('"') ? 'syntax-string' : /^(ChatOpenAI|const|new|P5_GATEWAY_KEY|PROVIDER_API_KEY)$/.test(token) ? 'syntax-keyword' : undefined}>{token}</span>);
}

function Editor({ language, integrated, highlight = false }: { language: Language; integrated: boolean; highlight?: boolean }) {
  const lines = example(language, integrated);
  return <div className="editor">
    <div className="editor-bar"><div className="editor-lights"><i /><i /><i /></div><span><Code2 size={14} /> agent_config.{language === 'python' ? 'py' : 'js'}</span><CopyButton value={lines.join('\n')} label="Copy code snippet" /></div>
    <div className="editor-body"><p className="editor-comment">{language === 'python' ? '#' : '//'} {integrated ? 'Route supported LLM traffic through P5' : 'Existing provider configuration'}</p>
      {lines.map((line, index) => <motion.div key={index} className={`code-line ${highlight && integrated && (index === 2 || index === 3) ? 'code-highlight' : ''}`} initial={highlight && integrated && index === 3 ? { opacity: 0, x: -6 } : false} animate={{ opacity: 1, x: 0 }}>
        <span className="line-number" aria-hidden="true">{index + 1}</span><code>{tokenize(line)}</code>
      </motion.div>)}
    </div>
  </div>;
}

const scenes = [
  { name: 'Existing agent', detail: 'Start with the agent’s existing provider configuration.', duration: 3500 },
  { name: 'P5 Gateway', detail: 'Copy the example gateway endpoint from the P5 workspace.', duration: 3500 },
  { name: 'Code integration', detail: 'Use a gateway credential placeholder and set the LLM base URL.', duration: 4900 },
  { name: 'Connection test', detail: 'Watch a simulated compatibility check and handshake.', duration: 5200 },
  { name: 'Return to P5', detail: 'Run the simulated connection test on your registered agent.', duration: 0 },
];
const handshake = ['Validating configuration', 'Checking gateway compatibility', 'Simulating connection handshake', 'Registering integration', 'Connection successful'];

function Walkthrough({ onClose, initialLanguage }: { onClose: () => void; initialLanguage: Language }) {
  const [language, setLanguage] = useState(initialLanguage);
  const [scene, setScene] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const reduced = useReducedMotion();
  const [playing, setPlaying] = useState(!reduced);
  const complete = scene === scenes.length - 1;
  const current = scenes[scene];
  const select = (index: number) => { setScene(index); setElapsed(0); };
  useEffect(() => {
    if (!playing || complete) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 100), 100);
    return () => window.clearInterval(timer);
  }, [playing, complete, scene]);
  useEffect(() => {
    if (playing && !complete && elapsed >= current.duration) { setScene(scene + 1); setElapsed(0); }
  }, [playing, complete, elapsed, scene, current.duration]);
  const changed = scene >= 2 && (scene !== 2 || elapsed >= 450 || !playing);
  const logCount = scene > 3 ? handshake.length : scene === 3 ? Math.min(handshake.length, 1 + Math.floor(elapsed / 820)) : 0;

  return <Modal title="How integration works" label="Close walkthrough" onClose={onClose} className="walkthrough-modal">
    <div className="tour-intro"><div><div className="eyebrow">INTERACTIVE WALKTHROUGH</div><h3>{current.name}</h3><p>{current.detail}</p></div><LanguageSwitch value={language} onChange={setLanguage} /></div>
    <div className="workstation">
      <div className={`workstation-main ${scene === 1 ? 'workstation-dim' : ''}`}>
        <Editor language={language} integrated={changed} highlight={scene === 2} />
        <div className="mini-terminal"><div className="mini-terminal-title"><Terminal size={14} /> Connection output</div>
          <div className="mini-terminal-body">{logCount ? handshake.slice(0, logCount).map((line, index) => <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={line}><span>{index === 4 ? '✓' : '›'}</span> {line}</motion.div>) : <span className="terminal-muted">$ Waiting for connection test…</span>}</div>
        </div>
      </div>
      <div className={`gateway-window ${scene === 1 ? 'gateway-focus' : ''}`}>
        <div className="gateway-top"><span className="tile tile-indigo"><Network size={18} /></span><div><strong>P5 Gateway</strong><small>Developer settings</small></div></div>
        <div className="gateway-caption">GATEWAY ENDPOINT</div>
        <div className="mini-endpoint"><code>{gatewayUrl}</code><CopyButton value={gatewayUrl} label="Copy gateway URL in walkthrough" /></div>
        <div className="gateway-caption">CREDENTIAL PLACEHOLDER</div><code className="mini-secret">P5_GATEWAY_KEY</code>
        <AnimatePresence>{scene === 1 && <motion.div className="sim-cursor" initial={{ x: 28, y: 20, opacity: 0 }} animate={{ x: 0, y: 0, opacity: 1 }} exit={{ opacity: 0 }}><MousePointer2 size={19} fill="#c2b7ff" /></motion.div>}</AnimatePresence>
        <div className="gateway-state">{complete ? <Badge tone="green" dot>Handshake successful</Badge> : scene === 1 ? <Badge tone="indigo" dot>{elapsed > 900 || !playing ? 'Endpoint copied' : 'Selecting endpoint'}</Badge> : <Badge dot>Sandbox preview</Badge>}</div>
      </div>
    </div>
    <div className="tour-steps" aria-label="Walkthrough scenes">{scenes.map(({ name }, index) => <button key={name} type="button" aria-current={scene === index ? 'step' : undefined} className={index <= scene ? 'lit' : ''} onClick={() => { setPlaying(false); select(index); }}><span /><small>{index + 1}. {name}</small></button>)}</div>
    <div className="tour-controls"><div><Button tone="ghost" className="icon-button" aria-label="Previous scene" disabled={!scene} onClick={() => { setPlaying(false); select(scene - 1); }}><ChevronLeft size={19} /></Button>
      <Button className="icon-button" aria-label={complete ? 'Replay' : playing ? 'Pause' : 'Play'} onClick={() => { if (complete) { select(0); setPlaying(true); } else setPlaying(!playing); }}>{complete ? <RotateCcw size={17} /> : playing ? <Pause size={17} /> : <Play size={16} />}</Button>
      <Button tone="ghost" className="icon-button" aria-label="Next scene" disabled={complete} onClick={() => { setPlaying(false); select(scene + 1); }}><ChevronRight size={19} /></Button>
      <Button tone="ghost" className="icon-button replay-button" aria-label="Restart walkthrough" onClick={() => { select(0); setPlaying(!reduced); }}><RotateCcw size={16} /></Button></div>
      {complete ? <Button tone="primary" onClick={onClose}>Return to integration <ArrowRight size={16} /></Button> : <span className="muted">Scene {scene + 1} of {scenes.length}</span>}
    </div>
  </Modal>;
}

function LanguageSwitch({ value, onChange }: { value: Language; onChange: (language: Language) => void }) {
  return <div className="segmented" aria-label="Code example language">{(['python', 'javascript'] as const).map((language) => <button key={language} type="button" aria-pressed={value === language} onClick={() => onChange(language)}>{language === 'python' ? 'Python' : 'JavaScript'}</button>)}</div>;
}

export function Integration() {
  const agent = useCurrentAgent();
  const path = agentPath(agent);
  const [params] = useSearchParams();
  const report = params.get('report');
  const { perform } = useStore();
  const { busy, run } = usePending();
  const [tour, setTour] = useState(false);
  const [language, setLanguage] = useState<Language>('python');
  const [coverage, setCoverage] = useState<Coverage>(agent.integration?.coverage ?? 'instrumented');
  const connected = agent.integration?.coverage === coverage;
  return <>
    <PageTitle title="Connect your agent" description={`Configure a simulated integration for ${agent.name}.`} back={report ? { to: `/reports/${report}`, label: 'Back to report' } : { to: path, label: 'Back to agent' }} actions={<IntegrationBadge agent={agent} />} />
    <div className="integration-hero">
      <span className="tile tile-indigo"><Workflow size={22} /></span>
      <div><div className="eyebrow">DEVELOPER WALKTHROUGH</div><h2>See the connection take shape</h2><p>Follow an existing agent from provider configuration to its simulated P5 handshake.</p></div>
      <Button onClick={() => setTour(true)}><Play size={16} /> See How Integration Works</Button>
    </div>
    <div className="detail-grid space-above">
      <div className="stack">
        <Panel title="1. Configure the gateway" description="Use the following example values in your LLM client." action={<Plug size={19} className="muted" />}>
          <div className="panel-body">
            <div className="endpoint-grid"><div><span>Gateway URL</span><div className="endpoint"><code>{gatewayUrl}</code><CopyButton value={gatewayUrl} label="Copy gateway URL" /></div></div><div><span>Credential placeholder</span><div className="endpoint"><code>P5_GATEWAY_KEY</code><CopyButton value="P5_GATEWAY_KEY" label="Copy credential placeholder" /></div></div></div>
            <div className="editor-actions"><strong>Integration example</strong><LanguageSwitch value={language} onChange={setLanguage} /></div>
            <Editor language={language} integrated />
            <div className="space-above"><Notice>Setting the base URL routes supported LLM traffic only. Tool-call enforcement requires a compatible MCP gateway or an instrumented execution layer.</Notice></div>
          </div>
        </Panel>
        <Panel title="2. Select simulated coverage" description="Coverage determines which controls can produce verified evidence.">
          <div className="radio-list">{([
            { value: 'instrumented', title: 'LLM + tool execution', detail: 'Simulate an instrumented tool layer and test tool authorization and enforcement.', icon: Network },
            { value: 'llm', title: 'LLM traffic only', detail: 'Simulate the LLM gateway. Tool execution controls will be marked not verified.', icon: Radio },
          ] as const).map(({ value, title, detail, icon: Icon }) => <label key={value} className={`radio-card ${coverage === value ? 'selected' : ''}`}><Icon size={19} /><span><strong>{title}</strong><small>{detail}</small></span><input type="radio" name="coverage" value={value} checked={coverage === value} disabled={busy} onChange={() => setCoverage(value)} /></label>)}</div>
        </Panel>
      </div>
      <Panel title="Connection status" description="Prototype sandbox" className="side-panel" action={<Link2 size={18} className="muted" />}>
        <div className="panel-body compact stack">
          <div className={`connection-state ${connected ? 'connected' : ''}`}>{busy ? <LoaderCircle size={24} className="spin" /> : connected ? <CircleCheck size={24} /> : <Plug size={24} />}<strong>{busy ? 'Simulating handshake…' : connected ? 'Integration connected' : 'Ready to test'}</strong><p>{connected && agent.integration ? `${coverageLabel(coverage)} · ${formatDate(agent.integration.connectedAt)}` : 'Run a local compatibility check for the selected coverage.'}</p></div>
          <Notice>Simulation only. The example endpoint and credential are placeholders. P5 sends no requests to external systems.</Notice>
          {connected ? <Action tone="primary" to={report ? `/reports/${report}` : `${path}/configure`}>{report ? 'Return to report' : 'Configure assessment'} <ArrowRight size={16} /></Action> :
            <Button tone="primary" busy={busy} onClick={() => void run(async () => {
              await perform((state, now) => ({ state: connectAgent(state, agent.id, coverage, now), value: null }), 'Simulated connection successful.', 1050);
            })}>{busy ? 'Testing connection' : 'Simulate Connection Test'} {!busy && <Check size={16} />}</Button>}
        </div>
      </Panel>
    </div>
    {tour && <Walkthrough onClose={() => setTour(false)} initialLanguage={language} />}
  </>;
}
