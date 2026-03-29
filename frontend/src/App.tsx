import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ParticipantView } from './pages/ParticipantView';
import { HostDashboard } from './pages/HostDashboard';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <div className="w-full min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background ambient orbs */}
            <div className="fixed top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full mix-blend-screen filter blur-[200px] opacity-20 animate-pulse pointer-events-none" style={{ backgroundColor: 'var(--theme-accent1)' }}></div>
            <div className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full mix-blend-screen filter blur-[200px] opacity-15 pointer-events-none" style={{ backgroundColor: 'var(--theme-accent2)' }}></div>

            <Routes>
              <Route path="/" element={<ParticipantView />} />
              <Route path="/ripple-control-panel" element={<HostDashboard />} />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
