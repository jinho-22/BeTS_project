import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Icon from '../components/common/Icons';
import logoImg from '../assets/logo-beyond.png';
import api from '../lib/axios';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, _hasHydrated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  // 이미 인증된 사용자는 대시보드로 자동 리다이렉트
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [_hasHydrated, isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { user, accessToken, refreshToken } = data.data;
      login(user, accessToken, refreshToken);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src={logoImg} alt="Beyond Corp." className="h-20 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">BeTS</h1>
          <p className="mt-2 text-gray-600">사내 엔지니어 작업 관리 시스템</p>
        </div>

        {/* 로그인 폼 */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="name@company.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          © 2026 비욘드데이터(주). All rights reserved.
        </p>
      </div>
    </div>
  );
}
