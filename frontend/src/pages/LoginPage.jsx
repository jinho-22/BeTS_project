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
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const [setupComplete, setSetupComplete] = useState(null);

  const { login, isAuthenticated, _hasHydrated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  // 초기 설정 여부 확인
  useEffect(() => {
    api.get('/setup/status').then(({ data }) => {
      if (!data.data.initialized) {
        navigate('/setup', { replace: true });
      } else {
        setSetupComplete(true);
      }
    }).catch(() => {
      setSetupComplete(true); // API 에러 시 로그인 화면 표시
    });
  }, [navigate]);

  // 이미 인증된 사용자는 대시보드로 자동 리다이렉트
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [_hasHydrated, isAuthenticated, navigate, from]);

  // 잠금 카운트다운 타이머
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // 초기 설정 완료 안내
  const showSetupMessage = location.state?.setupComplete;
  const isLockedOut = lockoutSeconds > 0;
  const lockoutMinutes = Math.floor(lockoutSeconds / 60);
  const lockoutSecs = lockoutSeconds % 60;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.data.user, data.data.mustChangePassword);
      if (data.data.mustChangePassword) {
        navigate('/change-password', { replace: true, state: { forced: true } });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 429 && data?.retryAfterSeconds) {
        setLockoutSeconds(data.retryAfterSeconds);
      }
      setError(data?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (setupComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-gray-500 text-sm">로딩 중...</div>
      </div>
    );
  }

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
            {showSetupMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                초기 설정이 완료되었습니다. 생성한 관리자 계정으로 로그인해주세요.
              </div>
            )}
            {error && (
              <div className={`p-3 border rounded-lg text-sm ${isLockedOut ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <p>{error}</p>
                {isLockedOut && (
                  <p className="mt-1 font-semibold">
                    재시도 가능 시간: {lockoutMinutes}분 {String(lockoutSecs).padStart(2, '0')}초
                  </p>
                )}
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
              disabled={loading || isLockedOut}
              className="btn-primary w-full py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : isLockedOut ? `잠금됨 (${lockoutMinutes}:${String(lockoutSecs).padStart(2, '0')})` : '로그인'}
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
