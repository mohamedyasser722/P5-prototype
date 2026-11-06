export interface Organization { id: string; name: string }
export interface AgentTool { name: string }
export type Risk = 'Low' | 'Moderate' | 'High';
export type Coverage = 'llm' | 'instrumented';
export interface Integration { coverage: Coverage; connectedAt: string }
export interface Safeguards {
  audit: boolean;
  restrict: boolean;
  redact: boolean;
  anomalies: boolean;
  incidents: boolean;
}
export interface AgentInput {
  name: string;
  description: string;
  organization: string;
  owner: string;
  useCase: string;
  risk: Risk;
  framework: string;
  tools: AgentTool[];
  restricted: string[];
}
export interface Agent extends Omit<AgentInput, 'organization'> {
  id: string;
  organizationId: string;
  version: number;
  createdAt: string;
  integration: Integration | null;
  safeguards: Safeguards;
}
export type AgentChange = Partial<Omit<Agent, 'id' | 'createdAt' | 'version' | 'integration'>>;
export type TestId = 'AGT-001' | 'OBS-001' | 'SEC-001' | 'SEC-002' | 'PRIV-001' | 'DRIFT-001' | 'INC-001' | 'PRIV-002';
export type Outcome = 'PASS' | 'FAIL' | 'NOT VERIFIED';
export type Severity = 'High' | 'Medium' | 'Low';
export interface Evidence { summary: string; payload: Record<string, string | boolean | number | string[]> }
export interface Remediation { recommendation: string; destination: 'safeguards' | 'integration' | 'configuration' }
export interface Finding { severity: Severity; explanation: string; remediation: Remediation }
export interface TestExecution {
  id: TestId;
  outcome: Outcome;
  duration: number;
  finishedAt: string;
  version: number;
  fingerprint: string;
  evidence: Evidence;
  finding?: Finding;
}
export interface TestCase {
  id: TestId;
  name: string;
  category: string;
  scenario: string;
  severity: Severity;
  mandatory: boolean;
  duration: number;
}
export interface Policy { name: string; version: string; tests: TestCase[] }
export interface Assessment {
  id: string;
  agentId: string;
  snapshot: Agent;
  organization: string;
  testIds: TestId[];
  queue: TestId[];
  cursor: number;
  status: 'running' | 'complete';
  attempt: number;
  history: { attempt: number; results: Assessment['results']; finishedAt: string }[];
  results: Partial<Record<TestId, TestExecution>>;
  startedAt: string;
  stepStartedAt: string;
  finishedAt?: string;
}
export interface Certificate {
  id: string;
  assessmentId: string;
  agent: string;
  organization: string;
  version: number;
  assessedAt: string;
  issuedAt: string;
  expiresAt: string;
  checks: number;
  coverage: Coverage;
  policyName: string;
  policyVersion: string;
  environment: string;
}
export type ActivityKind = 'agent' | 'connection' | 'assessment' | 'finding' | 'certificate' | 'settings';
export interface ActivityEvent { id: string; kind: ActivityKind; title: string; detail: string; at: string; href?: string }
export interface State {
  resetVersion: number;
  organizations: Organization[];
  agents: Agent[];
  assessments: Assessment[];
  certificates: Certificate[];
  activity: ActivityEvent[];
  serial: number;
}
