import { lazy, Suspense } from 'react';
import { AuthProvider, AppProvider } from './store';
import { useAuth } from './context';
import { ToolListScreen } from './screens/ToolListScreen';
import { ToolGlyph } from './components/ToolImage';

// Kun for utvikling: ?preview rendrer appen med eksempeldata uten innlogging.
// Grenen er død kode i produksjon og fjernes av bundleren.
const PreviewApp = import.meta.env.DEV ? lazy(() => import('./preview')) : null;

function LoginScreen() {
  const { signIn, authError, signingIn } = useAuth();
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-mark" aria-hidden="true"><ToolGlyph size={34} /></div>
        <h1>Verktøyplanlegger</h1>
        <p>Den delte verktøy- og handlelisten for Omar og Ilyas. Se hva dere har, hvor det er og hva som skal kjøpes.</p>
        <div className="login-people" aria-label="Delt av Omar og Ilyas"><span className="login-avatar omar">OM</span><span className="login-avatar ilyas">IL</span></div>
        <button className="google-button" onClick={signIn} disabled={signingIn}>
          <span className="google-g" aria-hidden="true">G</span>
          <span><strong>Fortsett med Google</strong><small>Kun Omar og Ilyas har tilgang</small></span>
          {signingIn && <i className="spinner" aria-label="Logger inn" />}
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
