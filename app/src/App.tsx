import { lazy, Suspense } from 'react';
import { AuthProvider, AppProvider } from './store';
import { useAuth } from './context';
import { ToolListScreen } from './screens/ToolListScreen';

// Kun for utvikling: ?preview rendrer appen med eksempeldata uten innlogging.
// Grenen er død kode i produksjon og fjernes av bundleren.
const PreviewApp = import.meta.env.DEV ? lazy(() => import('./preview')) : null;

function PublicApp() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="login-screen">
        <p>Laster...</p>
      </div>
    );
  }

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
      <PublicApp />
    </AuthProvider>
  );
}

export default App;
