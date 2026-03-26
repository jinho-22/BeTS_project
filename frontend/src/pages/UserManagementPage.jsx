import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import api from '../lib/axios';

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const [userForm, setUserForm] = useState({
    email: '', name: '', password: '', dept_id: '', position: '', role: 'engineer',
  });
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: { limit: 200 } });
      return data;
    },
  });

  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/users/departments');
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/users', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError: (err) => setError(err.response?.data?.message || '생성 실패'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/users/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError: (err) => setError(err.response?.data?.message || '수정 실패'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.patch(`/users/${id}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const activateMutation = useMutation({
    mutationFn: (id) => api.patch(`/users/${id}/activate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({ email: '', name: '', password: '', dept_id: '', position: '', role: 'engineer' });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setUserForm({
      email: u.email, name: u.name, password: '',
      dept_id: u.dept_id?.toString(), position: u.position, role: u.role,
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...userForm, dept_id: parseInt(userForm.dept_id) };
    if (editingUser) {
      if (!payload.password) delete payload.password;
      delete payload.email; // 이메일 변경 불가
      updateMutation.mutate({ id: editingUser.user_id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleToggleActive = (u) => {
    const action = u.is_active ? '비활성화(퇴사 처리)' : '활성화';
    if (window.confirm(`'${u.name}' 사용자를 ${action}하시겠습니까?`)) {
      if (u.is_active) {
        deactivateMutation.mutate(u.user_id);
      } else {
        activateMutation.mutate(u.user_id);
      }
    }
  };

  const roleLabel = { admin: '관리자', manager: '매니저', engineer: '엔지니어' };

  const filteredUsers = (data?.data || []).filter((u) => {
    if (search) {
      const q = search.toLowerCase();
      if (!u.name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
    }
    if (filterDept && u.dept_id?.toString() !== filterDept) return false;
    if (filterRole && u.role !== filterRole) return false;
    if (filterActive === 'active' && !u.is_active) return false;
    if (filterActive === 'inactive' && u.is_active) return false;
    return true;
  });

  return (
    <>
      <Header title="사용자 관리" />
      <div className="mt-6 space-y-4">
        {/* 필터 & 액션 바 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <input
              type="text"
              placeholder="이름 또는 이메일 검색..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full sm:w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1 sm:flex-none"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
            >
              <option value="">부서 전체</option>
              {deptsData?.map((d) => (
                <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
              ))}
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1 sm:flex-none"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">권한 전체</option>
              <option value="admin">관리자</option>
              <option value="manager">매니저</option>
              <option value="engineer">엔지니어</option>
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1 sm:flex-none"
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
            >
              <option value="">상태 전체</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
            <div className="w-full sm:w-auto sm:ml-auto">
              <button onClick={openCreateModal}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors w-full sm:w-auto">
                + 사용자 등록
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          ) : filteredUsers.length > 0 ? (
            <>
              {/* 모바일: 카드 레이아웃 */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredUsers.map((u) => (
                  <div key={u.user_id} className={`p-4 ${!u.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {u.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.is_active ? '활성' : '비활성'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3">
                      <span>{u.department?.dept_name || '-'}</span>
                      <span className="text-gray-300">|</span>
                      <span>{u.position}</span>
                      <span className="text-gray-300">|</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {roleLabel[u.role]}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => openEditModal(u)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium">수정</button>
                      <button onClick={() => handleToggleActive(u)}
                        className={`text-xs font-medium ${u.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>
                        {u.is_active ? '비활성화' : '활성화'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* 데스크톱: 테이블 레이아웃 */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">이름</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">이메일</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">부서</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">직급</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">권한</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">상태</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 w-40">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.user_id} className={`hover:bg-gray-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                      <td className="py-3 px-4 font-medium">{u.name}</td>
                      <td className="py-3 px-4 text-gray-500">{u.email}</td>
                      <td className="py-3 px-4">{u.department?.dept_name || '-'}</td>
                      <td className="py-3 px-4">{u.position}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          u.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {roleLabel[u.role]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {u.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => openEditModal(u)}
                          className="text-blue-600 hover:text-blue-800 text-sm mr-3">수정</button>
                        <button onClick={() => handleToggleActive(u)}
                          className={`text-sm ${u.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>
                          {u.is_active ? '비활성화' : '활성화'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {(search || filterDept || filterRole || filterActive)
                ? '검색 조건에 맞는 사용자가 없습니다.'
                : '등록된 사용자가 없습니다.'}
            </div>
          )}
        </div>
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto sm:mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? '사용자 수정' : '사용자 등록'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                  <input type="email" value={userForm.email}
                    onChange={(e) => setUserForm(p => ({ ...p, email: e.target.value }))}
                    required={!editingUser} disabled={!!editingUser}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                  <input type="text" value={userForm.name}
                    onChange={(e) => setUserForm(p => ({ ...p, name: e.target.value }))} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호 {editingUser ? '(변경 시만 입력)' : '*'}
                  </label>
                  <input type="password" value={userForm.password}
                    onChange={(e) => setUserForm(p => ({ ...p, password: e.target.value }))}
                    required={!editingUser}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">부서 *</label>
                  <select value={userForm.dept_id}
                    onChange={(e) => setUserForm(p => ({ ...p, dept_id: e.target.value }))} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">선택하세요</option>
                    {deptsData?.map((d) => (
                      <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">직급 *</label>
                  <select value={userForm.position}
                    onChange={(e) => setUserForm(p => ({ ...p, position: e.target.value }))} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">선택하세요</option>
                    {['사원','전임','선임','책임','수석','이사','상무','전무','부대표','대표이사','기타'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">권한 *</label>
                  <select value={userForm.role}
                    onChange={(e) => setUserForm(p => ({ ...p, role: e.target.value }))} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="engineer">엔지니어</option>
                    <option value="manager">매니저</option>
                    <option value="admin">관리자</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300">취소</button>
                <button type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                  {editingUser ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
