import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import AppLayout from './components/layout/AppLayout';
import { Spinner } from './components/ui/Misc';
import { BASE } from './api/client';
import { LogoMark } from './components/layout/Logo';
import Login from './pages/Login';
import Overview from './pages/Overview';

const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Domains = lazy(() => import('./pages/Domains'));
const Servers = lazy(() => import('./pages/Servers'));
const Monitoring = lazy(() => import('./pages/Monitoring'));
const MonitorDetail = lazy(() => import('./pages/MonitorDetail'));
const Vault = lazy(() => import('./pages/Vault'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Snippets = lazy(() => import('./pages/Snippets'));
const Activity = lazy(() => import('./pages/Activity'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Splash() {
  return <div className="splash"><LogoMark size={44} /></div>;
}

function Protected({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function GuestOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Splash />;
  return user ? <Navigate to="/" replace /> : children;
}

const page = (el) => <Suspense fallback={<Spinner />}>{el}</Suspense>;

export default function App() {
  return (
    <BrowserRouter basename={BASE || '/'}>
      <AuthProvider>
        <UIProvider>
          <Routes>
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route element={<Protected><AppLayout /></Protected>}>
              <Route index element={<Overview />} />
              <Route path="projects" element={page(<Projects />)} />
              <Route path="projects/:id" element={page(<ProjectDetail />)} />
              <Route path="tasks" element={page(<Tasks />)} />
              <Route path="domains" element={page(<Domains />)} />
              <Route path="servers" element={page(<Servers />)} />
              <Route path="monitoring" element={page(<Monitoring />)} />
              <Route path="monitoring/:id" element={page(<MonitorDetail />)} />
              <Route path="vault" element={page(<Vault />)} />
              <Route path="expenses" element={page(<Expenses />)} />
              <Route path="snippets" element={page(<Snippets />)} />
              <Route path="activity" element={page(<Activity />)} />
              <Route path="settings" element={page(<Settings />)} />
              <Route path="*" element={page(<NotFound />)} />
            </Route>
          </Routes>
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
