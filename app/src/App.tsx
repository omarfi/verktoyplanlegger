import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store';
import { HomeScreen } from './screens/HomeScreen';
import { ToolDetailScreen } from './screens/ToolDetailScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { CaptureScreen } from './screens/CaptureScreen';
import { KitLibraryScreen } from './screens/KitLibraryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { BottomNav } from './components/BottomNav';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
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

export default App;
