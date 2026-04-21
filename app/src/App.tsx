import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, AppProvider, useAuth } from './store';
import { HomeScreen } from './screens/HomeScreen';
import { ToolDetailScreen } from './screens/ToolDetailScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { CaptureScreen } from './screens/CaptureScreen';
import { KitLibraryScreen } from './screens/KitLibraryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { BottomNav } from './components/BottomNav';

function LoginScreen() {
  const { signIn, authError, loading } = useAuth();
  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Verktøyplanlegger</h1>
        <p>Logg inn for å administrere verktøyene dine.</p>
        <button className="btn-primary" onClick={signIn} disabled={loading}>
          Logg inn med Google
        </button>
        {authError && <p className="login-error">{authError}</p>}
      </div>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="login-screen">
        <p>Laster...</p>
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <AppProvider>
      <BrowserRouter basename="/verktoyplanlegger">
        <div className="app-content">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/tool/:id" element={<ToolDetailScreen />} />
            <Route path="/capture/:toolId/:mode" element={<CaptureScreen />} />
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/kits" element={<KitLibraryScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </div>
        <BottomNav />
      </BrowserRouter>
    </AppProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App;
