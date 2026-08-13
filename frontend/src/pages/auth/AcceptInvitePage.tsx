import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getInvitationByToken, acceptInvitation } from '../../api/invitations';
import { setToken, setUser } from '../../api/index';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordValid = hasMinLength && hasLetter && hasNumber;
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const strengthScore = [hasMinLength, hasLetter, hasNumber, password.length >= 12].filter(Boolean).length;
  const strengthLabel = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore];
  const strengthColor = ['bg-red-400', 'bg-red-400', 'bg-amber-400', 'bg-lime-500', 'bg-green-500'][strengthScore];

  useEffect(() => {
    if (!token) return;
    getInvitationByToken(token)
      .then((data) => { if (data) setEmail(data.email); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);

    if (!passwordValid) {
      setError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await acceptInvitation(token, name, password);
      if (data) { setToken(data.token); setUser(data.user); navigate('/'); }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Accept invitation</h1>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}

        {!loading && error && !email && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}

        {!loading && email && (
          <>
            <p className="text-sm text-gray-500 mb-6">Setting up account for <strong>{email}</strong></p>

            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strengthColor} transition-all`}
                        style={{ width: `${(strengthScore / 4) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{strengthLabel}</p>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-400">At least 8 characters, with a letter and a number.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !passwordValid || !passwordsMatch}
                className="w-full bg-indigo-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Setting up…' : 'Set password & sign in'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
