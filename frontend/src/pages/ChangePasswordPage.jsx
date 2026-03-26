import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import { useAuthStore } from '../stores/authStore';
import api from '../lib/axios';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearMustChangePassword, mustChangePassword } = useAuthStore();

  // 강제 변경 모드: 로그인에서 넘어온 경우 또는 store에 플래그가 있는 경우
  const isForced = location.state?.forced || mustChangePassword;

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword !== form.confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (form.newPassword.length < 6) {
      setError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError('현재 비밀번호와 다른 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });

      // 강제 변경 플래그 해제
      clearMustChangePassword();

      if (isForced) {
        setSuccess('비밀번호가 변경되었습니다. 대시보드로 이동합니다.');
        setTimeout(() => navigate('/', { replace: true }), 1500);
      } else {
        setSuccess('비밀번호가 성공적으로 변경되었습니다.');
        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header title="비밀번호 변경" />
      <div className="mt-6 max-w-md">
        {isForced && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-semibold text-amber-800">🔒 비밀번호 변경 필요</p>
            <p className="text-sm text-amber-700 mt-1">
              최초 로그인 시 보안을 위해 비밀번호를 변경해야 합니다.
              변경 전까지 다른 기능을 사용할 수 없습니다.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호 *</label>
              <input
                type="password"
                name="currentPassword"
                value={form.currentPassword}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder={isForced ? "관리자가 부여한 초기 비밀번호" : "현재 비밀번호를 입력하세요"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 *</label>
              <input
                type="password"
                name="newPassword"
                value={form.newPassword}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="새 비밀번호 (최소 6자)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인 *</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="새 비밀번호를 다시 입력하세요"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
            {!isForced && (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
