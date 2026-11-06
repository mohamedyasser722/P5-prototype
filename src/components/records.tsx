import { Activity, ArrowRight, Award, Bot, ClipboardCheck, FileText, Fingerprint, Link2, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ActivityEvent, Agent, Assessment, Outcome } from '../domain/types';
import { mandatoryPass } from '../domain/simulator';
import { Badge, formatDate } from './ui';

export function IntegrationBadge({ agent }: { agent: Agent }) {
  return <Badge tone={agent.integration ? 'green' : 'neutral'} dot>{agent.integration ? 'Connected' : 'Not connected'}</Badge>;
}

export function RiskBadge({ risk }: { risk: Agent['risk'] }) {
  return <Badge tone={risk === 'High' ? 'orange' : risk === 'Moderate' ? 'indigo' : 'neutral'}>{risk}</Badge>;
}

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return <Badge tone={outcome === 'PASS' ? 'green' : outcome === 'FAIL' ? 'red' : 'orange'} dot>{outcome}</Badge>;
}

export function AssessmentBadge({ assessment }: { assessment: Assessment }) {
  return assessment.status === 'running' ? <Badge tone="indigo" dot>Running</Badge> : mandatoryPass(assessment) ? <Badge tone="green" dot>Verified</Badge> : <Badge tone="orange" dot>Needs review</Badge>;
}

export const activityIcons = { agent: Bot, connection: Link2, assessment: ClipboardCheck, finding: Fingerprint, certificate: Award, settings: Settings2 };

export function ActivityItems({ items, full = false }: { items: ActivityEvent[]; full?: boolean }) {
  return <ul className={`activity-list ${full ? 'activity-full' : ''}`}>{items.map((item) => {
    const Icon = activityIcons[item.kind] ?? Activity;
    return <li key={item.id}><span className={`event-icon event-${item.kind}`}><Icon size={16} /></span><div>
      {item.href ? <Link to={item.href}>{item.title}</Link> : <strong>{item.title}</strong>}
      <p>{item.detail}</p>
    </div><time dateTime={item.at}>{formatDate(item.at).replace(/ \d{4}$/, '')}</time></li>;
  })}</ul>;
}

export function AssessmentTable({ assessments, reports = false }: { assessments: Assessment[]; reports?: boolean }) {
  return <div className="table-scroll"><table><thead><tr><th>Assessment</th><th>Agent</th><th>Configuration</th><th>Status</th><th>Date</th><th><span className="sr-only">Open</span></th></tr></thead>
    <tbody>{assessments.map((item) => <tr key={item.id}>
      <td><Link className="record-link" to={item.status === 'running' ? `/assessments/${item.id}` : `/reports/${item.id}`}><span className="table-icon">{reports ? <FileText size={16} /> : <ClipboardCheck size={16} />}</span><span>{item.id}<small>Attempt {item.attempt}</small></span></Link></td>
      <td>{item.snapshot.name}</td><td>v{item.snapshot.version}</td><td><AssessmentBadge assessment={item} /></td><td>{formatDate(item.finishedAt ?? item.startedAt)}</td>
      <td><Link className="inline-link" to={item.status === 'running' ? `/assessments/${item.id}` : `/reports/${item.id}`}>{item.status === 'running' ? 'View run' : 'View report'}</Link></td>
    </tr>)}</tbody></table></div>;
}

export function AgentTable({ agents }: { agents: Agent[] }) {
  return <div className="table-scroll"><table><thead><tr><th>Agent name</th><th>Risk</th><th>Integration</th><th><span className="sr-only">View agent</span></th></tr></thead><tbody>
    {agents.map((agent) => <tr key={agent.id}><td><Link className="record-link" to={`/agents/${agent.id}`}><span className="table-icon"><Bot size={17} /></span><span>{agent.name}<small>{agent.useCase}</small></span></Link></td><td><RiskBadge risk={agent.risk} /></td><td><IntegrationBadge agent={agent} /></td><td><Link to={`/agents/${agent.id}`} aria-label={`View ${agent.name}`} className="row-arrow"><ArrowRight size={16} /></Link></td></tr>)}
  </tbody></table></div>;
}
