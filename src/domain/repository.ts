import { bank, defaultSafeguards, demoAgent, mandatory, policy } from './policy';
import { evaluate, mandatoryPass, retestQueue, summarize } from './simulator';
import type { ActivityKind, Agent, AgentChange, AgentInput, Assessment, Certificate, Coverage, Safeguards, State, TestId } from './types';

const environment = 'P5 simulated sandbox';

function record(state: State, kind: ActivityKind, title: string, detail: string, at: string, href?: string): State {
  return { ...state, serial: state.serial + 1, activity: [{ id: `evt-${state.serial}`, kind, title, detail, at, href }, ...state.activity] };
}

function replaceAgent(state: State, agent: Agent): State {
  return { ...state, agents: state.agents.map((item) => item.id === agent.id ? agent : item) };
}

function replaceAssessment(state: State, assessment: Assessment): State {
  return { ...state, assessments: state.assessments.map((item) => item.id === assessment.id ? assessment : item) };
}

export function getAgent(state: State, id: string) {
  const agent = state.agents.find((item) => item.id === id);
  if (!agent) throw new Error('Agent record could not be found.');
  return agent;
}

export function getAssessment(state: State, id: string) {
  const assessment = state.assessments.find((item) => item.id === id);
  if (!assessment) throw new Error('Assessment could not be found.');
  return assessment;
}

export function organizationName(state: State, id: string) {
  return state.organizations.find((organization) => organization.id === id)?.name ?? 'Unknown organization';
}

function resolveOrganization(state: State, name: string) {
  const existing = state.organizations.find((item) => item.name.toLowerCase() === name.trim().toLowerCase());
  const organization = existing ?? { id: `org-${state.serial}`, name: name.trim() };
  return { organization, organizations: existing ? state.organizations : [...state.organizations, organization] };
}

export function createAgent(state: State, input: AgentInput, now: string) {
  const { organization: name, ...profile } = input;
  if (![name, profile.name, profile.description, profile.owner, profile.useCase].every((value) => value.trim())) {
    throw new Error('Complete the required registration fields.');
  }
  const { organization, organizations } = resolveOrganization(state, name);
  const agent: Agent = { ...profile, id: `agt-${state.serial}`, organizationId: organization.id, version: 1, createdAt: now, integration: null, safeguards: { ...defaultSafeguards } };
  return { agent, state: record({ ...state, organizations, agents: [agent, ...state.agents] }, 'agent', 'Agent registered', agent.name, now, `/agents/${agent.id}`) };
}

export function saveAgent(state: State, id: string, change: AgentChange, now: string, options: { organization?: string; expectedVersion?: number } = {}) {
  const agent = getAgent(state, id);
  if (options.expectedVersion !== undefined && options.expectedVersion !== agent.version) {
    throw new Error('The configuration changed while this form was open. Reopen it to edit the current version.');
  }
  const resolved = options.organization ? resolveOrganization(state, options.organization) : null;
  const next = { ...agent, ...change, organizationId: resolved?.organization.id ?? agent.organizationId };
  if (JSON.stringify(next) === JSON.stringify(agent)) return state;
  return record(replaceAgent({ ...state, organizations: resolved?.organizations ?? state.organizations }, { ...next, version: agent.version + 1 }), change.safeguards ? 'finding' : 'agent', change.safeguards ? 'Safeguards updated' : 'Agent configuration updated', `${agent.name} · v${agent.version + 1}`, now, `/agents/${id}`);
}

export function saveSafeguards(state: State, id: string, patch: Partial<Safeguards>, now: string) {
  const agent = getAgent(state, id);
  return saveAgent(state, id, { safeguards: { ...agent.safeguards, ...patch } }, now);
}

export function connectAgent(state: State, id: string, coverage: Coverage, now: string) {
  const agent = getAgent(state, id);
  if (agent.integration?.coverage === coverage) return state;
  const next: Agent = { ...agent, version: agent.version + 1, integration: { coverage, connectedAt: now } };
  return record(replaceAgent(state, next), 'connection', 'Simulated integration connected', agent.name, now, `/agents/${id}/connect`);
}

export function startRun(state: State, agentId: string, optional: TestId[], now: string, retryId?: string) {
  const snapshot = getAgent(state, agentId);
  if (!snapshot.integration) throw new Error('Simulate an integration before running an assessment.');
  if (state.assessments.some((item) => item.agentId === agentId && item.status === 'running')) {
    throw new Error('An assessment is already running for this agent.');
  }
  const prior = retryId ? getAssessment(state, retryId) : undefined;
  if (prior && (prior.agentId !== agentId || prior.status !== 'complete' || state.certificates.some((item) => item.assessmentId === prior.id))) {
    throw new Error('This assessment cannot be retested.');
  }
  const testIds = prior?.testIds ?? policy.tests.filter((item) => item.mandatory || optional.includes(item.id)).map((item) => item.id);
  const queue = prior ? retestQueue(prior, snapshot) : testIds;
  if (!queue.length) throw new Error('The report has no failed, unverified or changed controls to retest.');
  const assessment: Assessment = {
    id: prior?.id ?? `P5-A${state.serial}`,
    agentId, snapshot, organization: organizationName(state, snapshot.organizationId), testIds, queue, cursor: 0, status: 'running',
    results: { ...prior?.results },
    history: prior ? [...prior.history, { attempt: prior.attempt, results: prior.results, finishedAt: prior.finishedAt! }] : [],
    attempt: (prior?.attempt ?? 0) + 1, startedAt: now, stepStartedAt: now,
  };
  const next = prior ? replaceAssessment(state, assessment) : { ...state, assessments: [assessment, ...state.assessments] };
  return { assessment, state: record(next, 'assessment', prior ? 'Control retest started' : 'Assessment started', snapshot.name, now, `/assessments/${assessment.id}`) };
}

export function advanceRun(state: State, id: string, now: string) {
  const assessment = getAssessment(state, id);
  if (assessment.status !== 'running') return state;
  const testId = assessment.queue[assessment.cursor];
  const execution = evaluate(testId, assessment.snapshot, now);
  const cursor = assessment.cursor + 1;
  const finished = cursor === assessment.queue.length;
  const next: Assessment = {
    ...assessment, cursor, results: { ...assessment.results, [testId]: execution }, stepStartedAt: now,
    status: finished ? 'complete' : 'running', finishedAt: finished ? now : undefined,
  };
  const updated = replaceAssessment(state, next);
  if (!finished) return updated;
  const counts = summarize(next);
  return record(updated, 'assessment', next.attempt > 1 ? 'Control retest completed' : 'Assessment completed',
    `${next.snapshot.name} · ${counts.passed} passed, ${counts.failed} failed, ${counts.unverified} unverified`, now, `/reports/${id}`);
}

export function canIssue(state: State, assessment: Assessment) {
  const agent = state.agents.find((item) => item.id === assessment.agentId);
  return Boolean(agent?.integration?.coverage === 'instrumented' && agent.version === assessment.snapshot.version && mandatoryPass(assessment));
}

export function issueCertificate(state: State, id: string, now: string) {
  const existing = state.certificates.find((item) => item.assessmentId === id);
  if (existing) return { state, certificate: existing };
  const assessment = getAssessment(state, id);
  if (!canIssue(state, assessment)) throw new Error('All mandatory controls must pass on the current configuration.');
  const expires = new Date(now);
  expires.setUTCDate(expires.getUTCDate() + 365);
  const certificate: Certificate = {
    id: `P5-TA-${new Date(now).getUTCFullYear()}-${String(state.serial).padStart(4, '0')}`, assessmentId: id,
    agent: assessment.snapshot.name, organization: assessment.organization, version: assessment.snapshot.version,
    assessedAt: assessment.finishedAt!, issuedAt: now, expiresAt: expires.toISOString(), checks: mandatory.length,
    coverage: 'instrumented', policyName: policy.name, policyVersion: policy.version, environment,
  };
  return { certificate, state: record({ ...state, certificates: [certificate, ...state.certificates] }, 'certificate', 'Technical assurance certificate issued', certificate.agent, now, `/certificates/${certificate.id}`) };
}

export function seed(): State {
  const fixtures = [
    { name: 'KYC Review Assistant', owner: 'Nadia Farouk', useCase: 'Customer onboarding', risk: 'High' },
    { name: 'Fraud Triage Agent', owner: 'Omar Salem', useCase: 'Risk operations', risk: 'High' },
    { name: 'Treasury Research Copilot', owner: 'Leila Amin', useCase: 'Internal research', risk: 'Moderate' },
  ] as const;
  const time = (day: number, hour = 9) => `2026-11-0${day}T${String(hour).padStart(2, '0')}:00:00.000Z`;
  let state: State = { resetVersion: 0, organizations: [bank], agents: [], assessments: [], certificates: [], activity: [], serial: 101 };
  for (const [index, fixture] of fixtures.entries()) {
    const created = createAgent(state, { ...demoAgent, ...fixture, description: `Assist the ${fixture.useCase.toLowerCase()} team with synthetic bank records.` }, time(index + 2));
    state = created.state;
    if (index === 2) continue;
    state = connectAgent(state, created.agent.id, 'instrumented', time(index + 2, 10));
    state = saveAgent(state, created.agent.id, { safeguards: { ...defaultSafeguards, restrict: true, redact: index === 0 } }, time(index + 2, 11));
    const run = startRun(state, created.agent.id, [], time(index + 4, 10));
    state = run.state;
    for (const item of mandatory) {
      const last = getAssessment(state, run.assessment.id).stepStartedAt;
      state = advanceRun(state, run.assessment.id, new Date(Date.parse(last) + item.duration).toISOString());
    }
    if (index === 0) state = issueCertificate(state, run.assessment.id, time(4, 11)).state;
  }
  return { ...state, activity: state.activity.sort((a, b) => b.at.localeCompare(a.at)) };
}

export function reset(state: State): State {
  return { ...seed(), resetVersion: (state.resetVersion ?? 0) + 1 };
}
