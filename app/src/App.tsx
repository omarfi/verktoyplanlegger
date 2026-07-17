import { lazy, Suspense } from 'react';
import { AuthProvider, AppProvider } from './store';
import { useAuth } from './context';
import { ToolListScreen } from './screens/ToolListScreen';

// Kun for utvikling: ?preview rendrer appen med eksempeldata uten innlogging.
// Grenen er død kode i produksjon og fjernes av bundleren.
const PreviewApp = import.meta.env.DEV ? lazy(() => import('./preview')) : null;

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
      <ToolListScreen />
    </AppProvider>
  );
}

function App() {
  if (PreviewApp && new URLSearchParams(window.location.search).has('preview')) {
    return (
      <Suspense fallback={null}>
        <PreviewApp />
      </Suspense>
    );
  }

  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App;
