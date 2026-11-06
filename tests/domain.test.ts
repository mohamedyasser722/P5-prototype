import assert from 'node:assert/strict';
import test from 'node:test';
import { createAgent, seed, connectAgent, saveAgent, saveSafeguards, startRun, advanceRun, issueCertificate, reset, canIssue } from '../src/domain/repository';
import { demoAgent } from '../src/domain/policy';

function setup() {
  const now = new Date('2026-11-06T10:00:00Z').toISOString();
  const created = createAgent(seed(), demoAgent, now);
  return { ...created, now };
}

function finish(state: ReturnType<typeof seed>, run: string, now: string) {
  while (state.assessments.find((item) => item.id === run)?.status === 'running') {
    state = advanceRun(state, run, now);
  }
  return state;
}

test('LLM-only connection leaves tool execution unverified and blocks issuance', () => {
  const { state, agent, now } = setup();
  const connected = connectAgent(state, agent.id, 'llm', now);
  const started = startRun(connected, agent.id, [], now);
  const final = finish(started.state, started.assessment.id, now);
  const report = final.assessments[0];
  assert.equal(report.results['SEC-001']?.outcome, 'NOT VERIFIED');
  assert.equal(report.results['SEC-002']?.outcome, 'NOT VERIFIED');
  assert.equal(report.results['PRIV-001']?.outcome, 'FAIL');
  assert.equal(canIssue(final, report), false);
  assert.throws(() => issueCertificate(final, report.id, now));
});

test('targeted retest evaluates current safeguards and preserves evidence on unaffected checks', () => {
  const { state, agent, now } = setup();
  const connected = connectAgent(state, agent.id, 'instrumented', now);
  const initial = startRun(connected, agent.id, ['PRIV-002'], now);
  const failed = finish(initial.state, initial.assessment.id, now);
  const report = failed.assessments[0];
  assert.equal(report.results['SEC-002']?.outcome, 'FAIL');
  assert.equal(report.results['PRIV-001']?.outcome, 'FAIL');
  assert.equal(report.results['PRIV-002']?.outcome, 'FAIL');
  const active = failed.agents.find((item) => item.id === agent.id)!;
  const fixed = saveAgent(failed, agent.id, { safeguards: { ...active.safeguards, redact: true, restrict: true } }, now);
  const retest = startRun(fixed, agent.id, [], now, report.id);
  assert.deepEqual(retest.assessment.queue, ['SEC-002', 'PRIV-001', 'PRIV-002']);
  const passed = finish(retest.state, retest.assessment.id, now);
  const updated = passed.assessments[0];
  assert.equal(updated.results['OBS-001'], report.results['OBS-001']);
  assert.equal(updated.results['PRIV-001']?.outcome, 'PASS');
  assert.equal(updated.results['SEC-002']?.outcome, 'PASS');
  const issued = issueCertificate(passed, updated.id, now);
  assert.equal(issued.certificate.checks, 7);
  assert.equal(issued.certificate.coverage, 'instrumented');
  assert.equal(issueCertificate(issued.state, updated.id, now).certificate.id, issued.certificate.id);
  assert.equal(reset(issued.state).agents.some((item) => item.id === agent.id), false);
});

test('configuration or connection changes invalidate stale eligibility and retest dependencies', () => {
  const { state, agent, now } = setup();
  const fixed = saveAgent(state, agent.id, { safeguards: { audit: true, restrict: true, redact: true, anomalies: true, incidents: true } }, now);
  const initial = startRun(connectAgent(fixed, agent.id, 'instrumented', now), agent.id, [], now);
  const passed = finish(initial.state, initial.assessment.id, now);
  const report = passed.assessments[0];
  assert.equal(canIssue(passed, report), true);
  const edited = saveAgent(passed, agent.id, { tools: [{ name: 'export_customer_database' }] }, now);
  assert.equal(canIssue(edited, report), false);
  const retest = startRun(edited, agent.id, [], now, report.id);
  assert.ok(retest.assessment.queue.includes('SEC-002'));
  assert.ok(retest.assessment.queue.includes('SEC-001'));
  const after = finish(retest.state, retest.assessment.id, now);
  assert.equal(after.assessments[0].results['SEC-002']?.outcome, 'FAIL');
});

test('an in-flight run survives serialization and keeps its captured configuration', () => {
  const { state, agent, now } = setup();
  const connected = connectAgent(state, agent.id, 'instrumented', now);
  const started = startRun(connected, agent.id, [], now);
  assert.throws(() => startRun(started.state, agent.id, [], now));
  const paused = advanceRun(started.state, started.assessment.id, now);
  const active = paused.agents.find((item) => item.id === agent.id)!;
  const edited = saveAgent(paused, agent.id, { safeguards: { ...active.safeguards, redact: true } }, now);
  const resumed = finish(JSON.parse(JSON.stringify(edited)), started.assessment.id, now);
  assert.equal(resumed.assessments[0].results['PRIV-001']?.outcome, 'FAIL');
  assert.equal(canIssue(resumed, resumed.assessments[0]), false);
});

test('conflicting tool evidence identifies the actual restricted operation', () => {
  const { state, agent, now } = setup();
  const edited = saveAgent(state, agent.id, {
    tools: [{ name: 'get_account_balance' }, { name: 'transfer_money' }],
    safeguards: { ...agent.safeguards, restrict: true },
  }, now);
  const initial = startRun(connectAgent(edited, agent.id, 'instrumented', now), agent.id, [], now);
  const final = finish(initial.state, initial.assessment.id, now);
  const conflict = final.assessments[0].results['SEC-002'];
  assert.equal(conflict?.outcome, 'FAIL');
  assert.equal(conflict?.evidence.payload.operation, 'transfer_money');
  assert.equal(conflict?.finding?.remediation.destination, 'configuration');
});


test('safeguard patches merge across tabs and stale profile edits are rejected', () => {
  const { state, agent, now } = setup();
  const edited = saveSafeguards(state, agent.id, { restrict: true }, now);
  const merged = saveSafeguards(edited, agent.id, { redact: true }, now);
  const updated = merged.agents.find((item) => item.id === agent.id);
  assert.equal(updated?.safeguards.restrict, true);
  assert.equal(updated?.safeguards.redact, true);
  assert.throws(
    () => saveAgent(merged, agent.id, { owner: 'Another owner' }, now, { expectedVersion: agent.version }),
    /configuration changed/i,
  );
});
