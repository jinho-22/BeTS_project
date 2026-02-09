import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import api from '../lib/axios';

export default function DepartmentManagementPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formName, setFormName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // 부서 목록 조회
  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/users/departments');
      return data.data;
    },
  });

  // 각 부서 소속 사용자 수 가져오기
  const { data: users } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: { limit: 500 } });
      return data.data;
    },
  });

  const getUserCountByDept = (deptId) => {
    if (!users) return 0;
    return users.filter(u => u.dept_id === deptId).length;
  };

  // 부서 생성
  const createMutation = useMutation({
    mutationFn: async (deptData) => {
      const { data } = await api.post('/users/departments', deptData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      closeModal();
    },
  });

  // 부서 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, deptData }) => {
      const { data } = await api.put(`/users/departments/${id}`, deptData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      closeModal();
    },
  });

  // 부서 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/users/departments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setDeleteConfirm(null);
    },
    onError: (err) => {
      alert(err.response?.data?.message || '삭제에 실패했습니다.');
      setDeleteConfirm(null);
    },
  });

  const openCreateModal = () => {
    setEditingDept(null);
    setFormName('');
    setShowModal(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setFormName(dept.dept_name);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDept(null);
    setFormName('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingDept) {
      updateMutation.mutate({ id: editingDept.dept_id, deptData: { dept_name: formName.trim() } });
    } else {
      createMutation.mutate({ dept_name: formName.trim() });
    }
  };

  const handleDelete = (dept) => {
    setDeleteConfirm(dept);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.dept_id);
    }
  };

  return (
    <>
      <Header title="부서 관리" />
      <div className="mt-6 space-y-6">
        {/* 헤더 액션 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              총 <span className="font-semibold text-gray-800">{departments?.length ?? 0}</span>개 부서
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm
                       hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 부서 추가
          </button>
        </div>

        {/* 부서 목록 */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : departments?.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">부서명</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">소속 인원</th>
                  <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departments.map((dept) => {
                  const userCount = getUserCountByDept(dept.dept_id);
                  return (
                    <tr key={dept.dept_id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold">
                          {dept.dept_id}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            {dept.dept_name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{dept.dept_name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          userCount > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                        }`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {userCount}명
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(dept)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(dept)}
                            disabled={userCount > 0}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                              userCount > 0
                                ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                : 'text-red-600 bg-red-50 hover:bg-red-100'
                            }`}
                            title={userCount > 0 ? '소속 인원이 있어 삭제할 수 없습니다' : ''}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-1">등록된 부서가 없습니다</h3>
            <p className="text-sm text-gray-500 mb-4">새 부서를 추가하여 조직을 구성하세요.</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              첫 번째 부서 추가하기
            </button>
          </div>
        )}
      </div>

      {/* 생성/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingDept ? '부서 수정' : '새 부서 추가'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {editingDept ? '부서 명칭을 수정합니다.' : '새로운 부서를 생성합니다.'}
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  부서명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 기술지원팀"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  autoFocus
                  required
                  maxLength={30}
                />
                <p className="text-xs text-gray-400 mt-1.5">{formName.length}/30자</p>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim() || createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? '처리 중...'
                    : editingDept ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 py-5">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">부서 삭제</h3>
              <p className="text-sm text-gray-500 text-center">
                <span className="font-medium text-gray-800">'{deleteConfirm.dept_name}'</span> 부서를 삭제하시겠습니까?
                <br />이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors
                           disabled:opacity-50"
              >
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
