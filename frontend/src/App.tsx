import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ParticipantView } from './pages/ParticipantView';
import { HostDashboard } from './pages/HostDashboard';
import { PresenterView } from './pages/PresenterView';
import { ThemeProvider } from './contexts/ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <div className="w-full min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
            <Routes>
              <Route path="/" element={<ParticipantView />} />
              <Route path="/m-8a7b6c" element={<HostDashboard />} />
              <Route path="/invite" element={<HostDashboard />} />
              <Route path="/presenter" element={<PresenterView />} />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
