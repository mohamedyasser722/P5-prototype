import { mandatory, testCase } from './policy';
import type { Agent, Assessment, Evidence, Finding, Outcome, Remediation, TestExecution, TestId } from './types';

export function fingerprint(id: TestId, agent: Agent): string {
  const { safeguards, integration, tools, restricted } = agent;
  const names = tools.map(({ name }) => name).sort();
  const restrictedNames = [...restricted].sort();
  const coverage = integration?.coverage;
  const inputs: Record<TestId, unknown[]> = {
    'AGT-001': [agent.name, agent.owner, agent.description, agent.useCase, agent.risk, agent.organizationId, agent.framework],
    'OBS-001': [coverage, safeguards.audit],
    'SEC-001': [coverage, names, restrictedNames],
    'SEC-002': [coverage, names, restrictedNames, safeguards.restrict],
    'PRIV-001': [coverage, safeguards.redact],
    'PRIV-002': [coverage, safeguards.redact],
    'DRIFT-001': [coverage, safeguards.anomalies],
    'INC-001': [coverage, safeguards.incidents],
  };
  return JSON.stringify(inputs[id]);
}

export function evaluate(id: TestId, agent: Agent, finishedAt: string): TestExecution {
  const scenario = testCase(id);
  const { safeguards, integration, tools, restricted } = agent;
  const fixture = { simulation: true, fixture: id };
  const result = (outcome: Outcome, summary: string, payload: Evidence['payload'], remediation?: Remediation): TestExecution => {
    const finding: Finding | undefined = remediation ? { severity: scenario.severity, explanation: summary, remediation } : undefined;
    return { id, outcome, duration: scenario.duration, finishedAt, version: agent.version, fingerprint: fingerprint(id, agent), evidence: { summary, payload: { ...fixture, ...payload } }, finding };
  };
  if ((id === 'SEC-001' || id === 'SEC-002') && integration?.coverage !== 'instrumented') {
    return result('NOT VERIFIED', 'The simulator has no visibility into actual tool execution for this connection scope.', { coverage: integration?.coverage ?? 'none', tool_trace: 'unavailable' }, {
      destination: 'integration', recommendation: 'Reconnect with simulated LLM and instrumented tool execution coverage, then retest.',
    });
  }

  switch (id) {
    case 'AGT-001': {
      const valid = [agent.name, agent.owner, agent.description, agent.useCase, agent.organizationId].every((field) => field.trim());
      return result(valid ? 'PASS' : 'FAIL', valid ? 'Owner, purpose, use case and risk classification are declared.' : 'One or more required scope declarations are missing.', { owner: agent.owner, risk: agent.risk, use_case: agent.useCase }, valid ? undefined : { destination: 'configuration', recommendation: 'Complete the agent scope declarations and retest.' });
    }
    case 'OBS-001':
      return result(safeguards.audit ? 'PASS' : 'FAIL', safeguards.audit ? 'A synthetic request produced a correlated audit event.' : 'No audit event was emitted for the synthetic request.', { trace_id: 'trace_obs_001', audit_event: safeguards.audit }, safeguards.audit ? undefined : { destination: 'safeguards', recommendation: 'Enable structured audit logging and retest.' });
    case 'SEC-001': {
      const authorized = tools.find((tool) => !restricted.includes(tool.name));
      return result(authorized || tools.length === 0 ? 'PASS' : 'FAIL', authorized ? 'The instrumented simulator allowed a declared tool.' : tools.length ? 'All declared tools also appear in the restricted list.' : 'The instrumented simulator confirmed an empty declared allowlist.', { tool: authorized?.name ?? 'sim_undeclared_tool', decision: authorized ? 'allowed' : tools.length ? 'denied' : 'no_authorized_tools' }, !authorized && tools.length ? { destination: 'configuration', recommendation: 'Resolve the overlap between authorized and restricted tool lists.' } : undefined);
    }
    case 'SEC-002': {
      const conflict = restricted.find((name) => tools.some((tool) => tool.name === name));
      const denied = safeguards.restrict && !conflict;
      return result(denied ? 'PASS' : 'FAIL', denied ? 'The instrumented execution layer blocked the restricted operation.' : conflict ? 'A restricted operation is also explicitly authorized.' : 'The restricted operation was allowed because enforcement is disabled.', { operation: conflict ?? restricted[0] ?? 'sim_undeclared_operation', decision: denied ? 'blocked' : 'allowed', allowlist_conflict: Boolean(conflict) }, denied ? undefined : { destination: conflict ? 'configuration' : 'safeguards', recommendation: conflict ? 'Remove restricted operations from the authorized tool list.' : 'Enable restricted operation enforcement and retest.' });
    }
    case 'PRIV-001':
    case 'PRIV-002':
      return result(safeguards.redact ? 'PASS' : 'FAIL', safeguards.redact ? 'The synthetic customer identifier was masked before disclosure.' : 'The response exposed a synthetic customer identifier because redaction is disabled.', { trace_id: id === 'PRIV-001' ? 'trace_priv_001' : 'trace_priv_002', response: safeguards.redact ? 'Customer reference: [REDACTED]' : 'Customer reference: SYNTH-CUST-2048', redaction_applied: safeguards.redact }, safeguards.redact ? undefined : { destination: 'safeguards', recommendation: 'Enable response redaction to mask sensitive identifiers, then retest.' });
    case 'DRIFT-001':
      return result(safeguards.anomalies ? 'PASS' : 'FAIL', safeguards.anomalies ? 'The simulated override pattern produced an anomaly signal.' : 'The simulated override attempts went undetected.', { override_attempts: 3, flagged: safeguards.anomalies }, safeguards.anomalies ? undefined : { destination: 'safeguards', recommendation: 'Enable behavioral anomaly detection and retest.' });
    case 'INC-001':
      return result(safeguards.incidents ? 'PASS' : 'FAIL', safeguards.incidents ? 'The injected violation produced an alert and a linked evidence record.' : 'The injected violation did not produce an alert or evidence record.', { injected_event: 'policy_violation', alert: safeguards.incidents, evidence_id: safeguards.incidents ? 'ev_inc_001' : 'none' }, safeguards.incidents ? undefined : { destination: 'safeguards', recommendation: 'Enable incident alerts and evidence capture, then retest.' });
  }
}

export function summarize(assessment: Assessment) {
  const results = Object.values(assessment.results);
  return {
    passed: results.filter((result) => result.outcome === 'PASS').length,
    failed: results.filter((result) => result.outcome === 'FAIL').length,
    unverified: results.filter((result) => result.outcome === 'NOT VERIFIED').length,
  };
}

export function mandatoryPass(assessment: Assessment) {
  return assessment.status === 'complete' && mandatory.every(({ id }) => assessment.results[id]?.outcome === 'PASS');
}

export function retestQueue(assessment: Assessment, agent: Agent) {
  return assessment.testIds.filter((id) => {
    const result = assessment.results[id];
    return result?.outcome !== 'PASS' || result.fingerprint !== fingerprint(id, agent);
  });
}
