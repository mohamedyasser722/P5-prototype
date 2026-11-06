import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import '@fontsource-variable/inter';
import './styles.css';
import { StoreProvider } from './StoreProvider';
import { useStore } from './state';
import { Shell } from './components/Shell';
import { Overview } from './pages/Overview';
import { AgentDetail, Agents, EditAgent, RegisterAgent, Safeguards } from './pages/Agents';
import { Integration } from './pages/Integration';
import { Assessments, ConfigureAssessment, Execution } from './pages/Assessments';
import { Report } from './pages/Report';
import { ActivityLog, CertificatePreview, Certificates, Settings, Unavailable } from './pages/Workspace';

function AgentRoute() {
  const { id } = useParams();
  const { state } = useStore();
  const agent = state.agents.find((item) => item.id === id);
  return agent ? <Outlet key={id} context={agent} /> : <Unavailable area="agents" />;
}

function AssessmentRoute({ reports = false }: { reports?: boolean }) {
  const { id } = useParams();
  const { state } = useStore();
  const assessment = state.assessments.find((item) => item.id === id);
  return assessment ? <Outlet key={id} context={assessment} /> : <Unavailable area={reports ? 'reports' : 'assessments'} />;
}

const root = createRoot(document.getElementById('root')!);
import.meta.hot?.dispose(() => root.unmount());

root.render(
  <StrictMode><MotionConfig reducedMotion="user"><HashRouter><StoreProvider>
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="agents" element={<Agents />} />
        <Route path="agents/new" element={<RegisterAgent />} />
        <Route path="agents/:id" element={<AgentRoute />}>
          <Route index element={<AgentDetail />} />
          <Route path="edit" element={<EditAgent />} />
          <Route path="connect" element={<Integration />} />
          <Route path="configure" element={<ConfigureAssessment />} />
          <Route path="safeguards" element={<Safeguards />} />
        </Route>
        <Route path="assessments" element={<Assessments />} />
        <Route path="assessments/:id" element={<AssessmentRoute />}><Route index element={<Execution />} /></Route>
        <Route path="reports" element={<Assessments reports />} />
        <Route path="reports/:id" element={<AssessmentRoute reports />}><Route index element={<Report />} /></Route>
        <Route path="certificates" element={<Certificates />} />
        <Route path="certificates/:id" element={<CertificatePreview />} />
        <Route path="activity" element={<ActivityLog />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Unavailable />} />
      </Route>
    </Routes>
  </StoreProvider></HashRouter></MotionConfig></StrictMode>,
);
