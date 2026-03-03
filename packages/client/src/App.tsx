import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './hooks/useSocket.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import PlayerJoin from './pages/PlayerJoin.js';
import PlayerGame from './pages/PlayerGame.js';
import HostCreate from './pages/HostCreate.js';
import HostLobby from './pages/HostLobby.js';
import HostGame from './pages/HostGame.js';
import SignInPage from './pages/SignInPage.js';
import './styles.css';

export default function App() {
  return (
    <SocketProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PlayerJoin />} />
          <Route path="/play" element={<PlayerGame />} />
          <Route path="/sign-in/*" element={<SignInPage />} />

          {/* Protected host routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/host" element={<HostCreate />} />
            <Route path="/host/lobby" element={<HostLobby />} />
            <Route path="/host/game" element={<HostGame />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
