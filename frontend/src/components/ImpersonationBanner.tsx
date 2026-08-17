import { useNavigate } from 'react-router-dom';
import { getUser, setToken, setUser, setImpersonating, isImpersonating } from '../api/index';
import { exitImpersonation } from '../api/users';

export default function ImpersonationBanner() {
  const navigate = useNavigate();
  if (!isImpersonating()) return null;

  const user = getUser();

  async function handleExit() {
    try {
      const res = await exitImpersonation();
      if (res) {
        setToken(res.token);
        setUser(res.user);
        setImpersonating(false);
        navigate('/admin/users');
      }
    } catch {
      // If this fails the JWT is probably already invalid — send them to login rather than
      // leaving them stuck impersonating with no way out.
      setImpersonating(false);
      navigate('/login');
    }
  }

  return (
    <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-between shrink-0">
      <span>Impersonating <strong>{user?.name}</strong> ({user?.email})</span>
      <button
        onClick={handleExit}
        className="px-3 py-1 bg-white text-amber-700 rounded-md text-xs font-medium hover:bg-amber-50 transition-colors"
      >
        Exit impersonation
      </button>
    </div>
  );
}
