import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav data-testid="navbar">
      <span data-testid="navbar-current-user">
        {user.displayName} ({user.role})
      </span>
      <button type="button" onClick={onLogout}>
        Logout
      </button>
    </nav>
  );
}
