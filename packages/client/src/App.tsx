import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './hooks/useSocket.js';
import DashboardLayout from './components/DashboardLayout.js';
import PlayerJoin from './pages/PlayerJoin.js';
import PlayerGame from './pages/PlayerGame.js';
import Dashboard from './pages/Dashboard.js';
import GamesList from './pages/GamesList.js';
import GameCreate from './pages/GameCreate.js';
import GameDetail from './pages/GameDetail.js';
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

          {/* Protected host routes — wrapped in DashboardLayout */}
          <Route element={<DashboardLayout />}>
            <Route path="/host" element={<Dashboard />} />
            <Route path="/host/games" element={<GamesList />} />
            <Route path="/host/games/new" element={<GameCreate />} />
            <Route path="/host/games/:code" element={<GameDetail />} />
            <Route path="/host/games/:code/lobby" element={<HostLobby />} />
            <Route path="/host/games/:code/live" element={<HostGame />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}
