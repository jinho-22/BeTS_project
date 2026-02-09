import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import api from '../lib/axios';
import { useAuthStore } from '../stores/authStore';

export default function ClientListPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientName, setClientName] = useState('');
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [error, setError] = useState('');

  // 고객사 목록 (프로젝트 포함)
  const { data, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data } = await api.get('/projects/clients', { params: { limit: 100 } });
      return data;
    },
  });

  // 개별 고객사 상세 (프로젝트 + 담당자까지 포함)
  const { data: clientDetail } = useQuery({
    queryKey: ['clientDetail', expandedClientId],
    queryFn: async () => {
      const { data } = await api.get(`/projects/clients/${expandedClientId}`);
      return data.data;
    },
    enabled: !!expandedClientId,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/projects/clients', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); closeModal(); },
    onError: (err) => setError(err.response?.data?.message || '생성 실패'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/projects/clients/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); closeModal(); },
    onError: (err) => setError(err.response?.data?.message || '수정 실패'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/clients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    onError: (err) => alert(err.response?.data?.message || '삭제 실패'),
  });

  const openCreateModal = () => {
    setEditingClient(null);
    setClientName('');
    setError('');
    setShowModal(true);
  };

  const openEditModal = (e, client) => {
    e.stopPropagation();
    setEditingClient(client);
    setClientName(client.client_name);
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClient(null);
    setClientName('');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.client_id, payload: { client_name: clientName } });
    } else {
      createMutation.mutate({ client_name: clientName });
    }
  };

  const handleDelete = (e, client) => {
    e.stopPropagation();
    if (window.confirm(`'${client.client_name}' 고객사를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(client.client_id);
    }
  };

  const toggleClientExpand = (clientId) => {
    setExpandedClientId(prev => prev === clientId ? null : clientId);
  };

  return (
    <>
      <Header title="고객사 관리" />
      <div className="mt-6">
        {isManager && (
          <div className="mb-4 flex justify-end">
            <button onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              + 고객사 등록
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          ) : data?.data?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 w-8"></th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500 w-12">No</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">고객사명</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">프로젝트 수</th>
                  {isManager && <th className="text-right py-3 px-4 font-medium text-gray-500 w-32">관리</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((client, idx) => {
                  const isExpanded = expandedClientId === client.client_id;
                  const projectCount = client.projects?.length || 0;
                  // 확장 시 상세 데이터 사용, 없으면 기본 데이터
                  const projects = (isExpanded && clientDetail?.projects) ? clientDetail.projects : (client.projects || []);
                  return (
                    <Fragment key={client.client_id}>
                      <tr
                        className="hover:bg-green-50/50 cursor-pointer transition-colors"
                        onClick={() => toggleClientExpand(client.client_id)}
                      >
                        <td className="py-3 px-4">
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                        <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{client.client_name}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${projectCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            {projectCount}개
                          </span>
                        </td>
                        {isManager && (
                          <td className="py-3 px-4 text-right">
                            <button onClick={(e) => openEditModal(e, client)}
                              className="text-blue-600 hover:text-blue-800 text-sm mr-3">수정</button>
                            {user?.role === 'admin' && (
                              <button onClick={(e) => handleDelete(e, client)}
                                className="text-red-600 hover:text-red-800 text-sm">삭제</button>
                            )}
                          </td>
                        )}
                      </tr>

                      {/* 확장 패널: 하위 프로젝트 목록 */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={isManager ? 5 : 4} className="p-0">
                            <div className="bg-green-50/30 border-t border-green-100 px-8 py-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                {client.client_name} 프로젝트 목록
                              </h4>
                              {projects.length > 0 ? (
                                <div className="space-y-3">
                                  {projects.map((project) => (
                                    <div key={project.project_id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <h5 className="font-semibold text-gray-900 text-sm">{project.project_name}</h5>
                                            {project.department?.dept_name && (
                                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                {project.department?.dept_name}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-500 mt-1">
                                            <span className="inline-flex items-center gap-1">
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                              </svg>
                                              {project.contract_period}
                                            </span>
                                          </p>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/projects');
                                          }}
                                          className="text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0"
                                        >
                                          상세 보기 →
                                        </button>
                                      </div>

                                      {/* 담당자 정보 */}
                                      {project.contacts && project.contacts.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                          <p className="text-xs font-medium text-gray-500 mb-2">담당자</p>
                                          <div className="flex flex-wrap gap-2">
                                            {project.contacts.map((contact) => (
                                              <div key={contact.contact_id} className="inline-flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
                                                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-[10px]">
                                                  {contact.name?.charAt(0)}
                                                </div>
                                                <span className="font-medium text-gray-700">{contact.name}</span>
                                                <span className="text-gray-400">|</span>
                                                <a href={`tel:${contact.phone}`} className="text-gray-500 hover:text-blue-600">{contact.phone}</a>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-gray-400 text-sm bg-white rounded-lg border border-dashed border-gray-200">
                                  등록된 프로젝트가 없습니다.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-500">등록된 고객사가 없습니다.</div>
          )}
        </div>
      </div>

      {/* 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingClient ? '고객사 수정' : '고객사 등록'}
            </h3>
            <form onSubmit={handleSubmit}>
              {error && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">고객사명 *</label>
                <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} required autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeModal}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors">취소</button>
                <button type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors">
                  {editingClient ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
