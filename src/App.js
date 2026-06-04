import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import AppShell from './components/AppShell';
import Splash from './components/Splash';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import Feed from './pages/Feed';
import Create from './pages/Create';
import Profile from './pages/Profile';
import Compete from './pages/Compete';
import Journal from './pages/Journal';
import Support from './pages/Support';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import PostDetail from './pages/PostDetail';
import './App.css';

function Protected({ children }) {
  const { session, ready } = useAuth();
  if (!ready) return <Splash label="Signing you in…" />;
  if (!session) return <Navigate to="/" replace />;
  // user may be a fallback profile if Supabase fetch failed; we still render.
  return children;
}

function PublicOnly({ children }) {
  const { session, ready } = useAuth();
  if (!ready) return <Splash />;
  if (session) return <Navigate to="/home" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<Protected><AppShell /></Protected>}>
            <Route path="/home" element={<Feed />} />
            <Route path="/feed" element={<Navigate to="/home" replace />} />
            <Route path="/create" element={<Create />} />
            <Route path="/compete" element={<Compete />} />
            <Route path="/vote" element={<Navigate to="/compete" replace />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/support" element={<Support />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/post/:postId" element={<PostDetail />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
