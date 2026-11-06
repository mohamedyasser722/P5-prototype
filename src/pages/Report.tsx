import { useState } from 'react';
import { ArrowRight, Award, ChevronDown, CircleAlert, FileCheck2, Fingerprint, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../state';
import { coverageLabel, mandatory, policy, testCase } from '../domain/policy';
import { canIssue, issueCertificate, startRun } from '../domain/repository';
import { mandatoryPass, retestQueue } from '../domain/simulator';
import type { TestId } from '../domain/types';
import { Action, Badge, Button, formatDate, Notice, PageTitle, Panel, usePending } from '../components/ui';
import { OutcomeBadge } from '../components/records';
import { EvidenceBlock, ResultCounts, useAssessment } from './Assessments';

export function Report() {
  const assessment = useAssessment();
  const { state, perform } = useStore();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<TestId[]>([]);
  const { busy, run } = usePending();
  const agent = state.agents.find((item) => item.id === assessment.agentId);
  const certificate = state.certificates.find((item) => item.assessmentId === assessment.id);
  const eligible = canIssue(state, assessment);
  const passed = mandatoryPass(assessment);
  const stale = agent?.version !== assessment.snapshot.version;
  const queue = agent ? retestQueue(assessment, agent) : [];
  const concurrent = state.assessments.find((item) => item.agentId === assessment.agentId && item.status === 'running');

  if (assessment.status === 'running') return <><PageTitle title="Assessment in progress" description="The report becomes available when the current attempt completes." back={{ to: '/reports', label: 'Back to reports' }} /><Action tone="primary" to={`/assessments/${assessment.id}`}>View execution <ArrowRight size={16} /></Action></>;

  return <>
    <PageTitle title="Assessment report" description={`${assessment.snapshot.name} · ${assessment.id}`} back={{ to: '/reports', label: 'Back to reports' }} actions={<Action to={`/assessments/${assessment.id}`}>View execution <ArrowRight size={16} /></Action>} />
    <div className={`report-banner ${passed ? 'report-pass' : 'report-review'}`}>
      <span className={`tile tile-${passed ? 'green' : 'orange'}`}>{passed ? <ShieldCheck size={24} /> : <CircleAlert size={24} />}</span>
      <div><div className="eyebrow">ASSESSMENT OUTCOME</div><h2>{passed ? 'Technical controls verified' : 'Remediation required'}</h2><p>{passed ? 'All mandatory checks passed for the captured configuration.' : 'Resolve failed or unverified controls and run a targeted retest.'}</p></div>
      <ResultCounts assessment={assessment} />
    </div>
    <div className="detail-grid space-above">
      <div className="stack">
        {stale && !certificate && <Notice tone="warning">The agent is now on configuration v{agent?.version}. Retest changed controls before issuing a certificate.</Notice>}
        <Panel title="Control findings and evidence" description="Expand each control to inspect the finding, recommendation, and trace." action={<Fingerprint size={19} className="muted" />}>
          <div className="finding-list">{assessment.testIds.map((id) => {
            const execution = assessment.results[id];
            if (!execution) return null;
            const scenario = testCase(id);
            const finding = execution.finding;
            const open = expanded.includes(id);
            const destination = finding?.remediation.destination;
            const fixLink = `/agents/${assessment.agentId}/${destination === 'integration' ? 'connect' : destination === 'configuration' ? 'edit' : 'safeguards'}?report=${assessment.id}`;
            return <div className="finding" key={id}>
              <button type="button" className="finding-trigger" aria-expanded={open} aria-controls={`finding-${id}`} onClick={() => setExpanded(open ? expanded.filter((item) => item !== id) : [...expanded, id])}>
                <span className="test-heading"><code>{id}</code><strong>{scenario.name}</strong></span><OutcomeBadge outcome={execution.outcome} /><span className="finding-label">{finding ? 'View finding' : 'Evidence'}</span><ChevronDown className={open ? 'expand-icon expanded' : 'expand-icon'} size={16} />
              </button>
              {open && <div className="finding-detail" id={`finding-${id}`}>
                <div className="finding-meta"><Badge tone={finding?.severity === 'High' ? 'red' : 'neutral'}>{finding ? `${finding.severity} severity` : 'Control verified'}</Badge><Badge>{scenario.mandatory ? 'Mandatory' : 'Optional'}</Badge></div>
                <p>{execution.evidence.summary}</p>
                {finding && <div className="recommendation"><strong>Recommended action</strong><p>{finding.remediation.recommendation}</p><Action to={fixLink}>{destination === 'integration' ? 'Open integration' : destination === 'configuration' ? 'Edit configuration' : 'Open safeguards'} <ArrowRight size={15} /></Action></div>}
                <EvidenceBlock execution={execution} />
              </div>}
            </div>;
          })}</div>
        </Panel>
        {assessment.history.length > 0 && <Panel title="Attempt history" description="Earlier results are preserved for comparison.">
          <div className="history-list">{assessment.history.map((entry) => <details key={entry.attempt}><summary><strong>Attempt {entry.attempt}</strong><span>{formatDate(entry.finishedAt)}</span><ChevronDown size={15} /></summary><div className="history-results">{Object.values(entry.results).map((execution) => <div key={execution.id}><code>{execution.id}</code><OutcomeBadge outcome={execution.outcome} /><span>{execution.evidence.summary}</span></div>)}</div></details>)}</div>
        </Panel>}
      </div>
      <div className="stack">
        <Panel title="Assessment scope" action={<FileCheck2 size={18} className="muted" />}>
          <div className="panel-body compact"><dl className="summary-list"><div><dt>Assessment date</dt><dd>{formatDate(assessment.finishedAt!)}</dd></div><div><dt>Organization</dt><dd>{assessment.organization}</dd></div><div><dt>Configuration</dt><dd>v{assessment.snapshot.version}</dd></div><div><dt>Policy</dt><dd>{policy.name} v{policy.version}</dd></div><div><dt>Coverage</dt><dd>{coverageLabel(assessment.snapshot.integration?.coverage)}</dd></div><div><dt>Attempts</dt><dd>{assessment.attempt}</dd></div></dl></div>
        </Panel>
        <Panel title="Next steps" action={<Award size={19} className="muted" />}>
          <div className="panel-body compact stack">
            {!certificate && queue.length > 0 && !concurrent && <Button busy={busy} onClick={() => void run(async () => {
              await perform((current, now) => ({ state: startRun(current, assessment.agentId, [], now, assessment.id).state, value: null }));
              navigate(`/assessments/${assessment.id}`);
            })}><RotateCcw size={15} /> {passed && stale ? 'Retest changed controls' : 'Retest Failed Controls'}</Button>}
            {!certificate && concurrent && <Action to={`/assessments/${concurrent.id}`}>Open active assessment <ArrowRight size={15} /></Action>}
            {!certificate && stale && queue.length === 0 && !concurrent && <Action to={`/agents/${assessment.agentId}/configure`}>Configure a new assessment <ArrowRight size={15} /></Action>}
            {certificate ? <Action tone="primary" to={`/certificates/${certificate.id}`}>View certificate <ArrowRight size={15} /></Action> : <Button tone="primary" busy={busy} disabled={!eligible} onClick={() => void run(async () => {
              const issued = await perform((current, now) => { const result = issueCertificate(current, assessment.id, now); return { state: result.state, value: result.certificate }; }, 'Technical assurance certificate issued.');
              navigate(`/certificates/${issued.id}`);
            })}>{eligible ? <Award size={16} /> : <LockKeyhole size={16} />} Issue certificate</Button>}
            <p className="helper-text">{certificate ? 'Issued for this assessment’s verified scope.' : `Issuance requires all ${mandatory.length} mandatory checks to pass on the current configuration with tool execution coverage.`}</p>
            <Link className="back-link" to={`/agents/${assessment.agentId}`}>View assessed agent <ArrowRight size={14} /></Link>
          </div>
        </Panel>
      </div>
    </div>
  </>;
}
