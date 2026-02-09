import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import api from '../lib/axios';
import { useAuthStore } from '../stores/authStore';

export default function ProjectListPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [error, setError] = useState('');

  const [projectForm, setProjectForm] = useState({ client_id: '', dept_id: '', project_name: '', contract_period: '' });
  const [contactForm, setContactForm] = useState({ project_id: '', name: '', email: '', phone: '' });

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects', { params: { limit: 200 } });
      return data.data; // 배열만 반환 (다른 페이지와 동일한 형식)
    },
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clientsList'],
    queryFn: async () => {
      const { data } = await api.get('/projects/clients', { params: { limit: 200 } });
      return data.data;
    },
  });

  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/users/departments');
      return data.data;
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (payload) => api.post('/projects', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); closeProjectModal(); },
    onError: (err) => setError(err.response?.data?.message || '생성 실패'),
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/projects/${id}`, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); closeProjectModal(); },
    onError: (err) => setError(err.response?.data?.message || '수정 실패'),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    onError: (err) => alert(err.response?.data?.message || '삭제 실패'),
  });

  const createContactMutation = useMutation({
    mutationFn: (payload) => api.post('/projects/contacts', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); closeContactModal(); },
    onError: (err) => setError(err.response?.data?.message || '등록 실패'),
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/contacts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    onError: (err) => alert(err.response?.data?.message || '삭제 실패'),
  });

  const openCreateProjectModal = () => {
    setEditingProject(null);
    setProjectForm({ client_id: '', dept_id: '', project_name: '', contract_period: '' });
    setError('');
    setShowProjectModal(true);
  };

  const openEditProjectModal = (e, project) => {
    e.stopPropagation();
    setEditingProject(project);
    setProjectForm({
      client_id: project.client_id?.toString(),
      dept_id: project.dept_id?.toString(),
      project_name: project.project_name,
      contract_period: project.contract_period,
    });
    setError('');
    setShowProjectModal(true);
  };

  const closeProjectModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
    setError('');
  };

  const openContactModal = (e, project) => {
    e.stopPropagation();
    setSelectedProject(project);
    setContactForm({ project_id: project.project_id.toString(), name: '', email: '', phone: '' });
    setError('');
    setShowContactModal(true);
  };

  const closeContactModal = () => {
    setShowContactModal(false);
    setSelectedProject(null);
    setError('');
  };

  const handleProjectSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...projectForm,
      client_id: parseInt(projectForm.client_id),
      dept_id: parseInt(projectForm.dept_id),
    };
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.project_id, payload });
    } else {
      createProjectMutation.mutate(payload);
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    createContactMutation.mutate({
      ...contactForm,
      project_id: parseInt(contactForm.project_id),
    });
  };

  const toggleProjectExpand = (projectId) => {
    setExpandedProjectId(prev => prev === projectId ? null : projectId);
  };

  return (
    <>
      <Header title="프로젝트 관리" />
      <div className="mt-6">
        {isManager && (
          <div className="mb-4 flex justify-end">
            <button onClick={openCreateProjectModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              + 프로젝트 등록
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          ) : projects?.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-medium text-gray-500 w-8"></th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">프로젝트명</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">고객사</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">담당부서</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">계약기간</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">담당자 수</th>
                  {isManager && <th className="text-right py-3 px-4 font-medium text-gray-500 w-48">관리</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((project) => {
                  const isExpanded = expandedProjectId === project.project_id;
                  const contacts = project.contacts || [];
                  return (
                    <Fragment key={project.project_id}>
                      <tr
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                        onClick={() => toggleProjectExpand(project.project_id)}
                      >
                        <td className="py-3 px-4">
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">{project.project_name}</td>
                        <td className="py-3 px-4">{project.client?.client_name || '-'}</td>
                        <td className="py-3 px-4">{project.department?.dept_name || '-'}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{project.contract_period}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${contacts.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {contacts.length}명
                          </span>
                        </td>
                        {isManager && (
                          <td className="py-3 px-4 text-right">
                            <button onClick={(e) => openContactModal(e, project)}
                              className="text-green-600 hover:text-green-800 text-sm mr-3">+ 담당자</button>
                            <button onClick={(e) => openEditProjectModal(e, project)}
                              className="text-blue-600 hover:text-blue-800 text-sm mr-3">수정</button>
                            {user?.role === 'admin' && (
                              <button onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`'${project.project_name}' 프로젝트를 삭제하시겠습니까?`))
                                  deleteProjectMutation.mutate(project.project_id);
                              }}
                                className="text-red-600 hover:text-red-800 text-sm">삭제</button>
                            )}
                          </td>
                        )}
                      </tr>

                      {/* 확장 패널: 담당자 상세 정보 */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={isManager ? 7 : 6} className="p-0">
                            <div className="bg-blue-50/30 border-t border-blue-100 px-8 py-4">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                담당자 연락처 정보
                              </h4>
                              {contacts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {contacts.map((contact) => (
                                    <div key={contact.contact_id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                            {contact.name?.charAt(0)}
                                          </div>
                                          <div>
                                            <p className="font-semibold text-gray-900 text-sm">{contact.name}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">담당자</p>
                                          </div>
                                        </div>
                                        {isManager && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (window.confirm(`담당자 '${contact.name}'을(를) 삭제하시겠습니까?`))
                                                deleteContactMutation.mutate(contact.contact_id);
                                            }}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                            title="담당자 삭제"
                                          >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                      <div className="mt-3 space-y-1.5">
                                        <div className="flex items-center gap-2 text-sm">
                                          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                          </svg>
                                          <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline truncate">{contact.email}</a>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                          </svg>
                                          <a href={`tel:${contact.phone}`} className="text-gray-700 hover:text-blue-600">{contact.phone}</a>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-4 text-gray-400 text-sm bg-white rounded-lg border border-dashed border-gray-200">
                                  등록된 담당자가 없습니다.
                                  {isManager && (
                                    <button
                                      onClick={(e) => openContactModal(e, project)}
                                      className="ml-2 text-blue-600 hover:underline"
                                    >
                                      담당자 추가
                                    </button>
                                  )}
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
            <div className="text-center py-12 text-gray-500">등록된 프로젝트가 없습니다.</div>
          )}
        </div>
      </div>

      {/* 프로젝트 생성/수정 모달 */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingProject ? '프로젝트 수정' : '프로젝트 등록'}
            </h3>
            <form onSubmit={handleProjectSubmit} className="space-y-4">
              {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">고객사 *</label>
                <select value={projectForm.client_id} onChange={(e) => setProjectForm(p => ({ ...p, client_id: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">선택하세요</option>
                  {clientsData?.map((c) => (
                    <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">담당 부서 *</label>
                <select value={projectForm.dept_id} onChange={(e) => setProjectForm(p => ({ ...p, dept_id: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">선택하세요</option>
                  {deptsData?.map((d) => (
                    <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트명 *</label>
                <input type="text" value={projectForm.project_name}
                  onChange={(e) => setProjectForm(p => ({ ...p, project_name: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">계약 기간 *</label>
                <input type="text" value={projectForm.contract_period}
                  onChange={(e) => setProjectForm(p => ({ ...p, contract_period: e.target.value }))} required
                  placeholder="예: 2026.01.01 ~ 2026.12.31"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeProjectModal}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300">취소</button>
                <button type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
                  {editingProject ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 담당자 추가 모달 */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-1">담당자 추가</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedProject?.project_name}</p>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성명 *</label>
                <input type="text" value={contactForm.name}
                  onChange={(e) => setContactForm(p => ({ ...p, name: e.target.value }))} required autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일 *</label>
                <input type="email" value={contactForm.email}
                  onChange={(e) => setContactForm(p => ({ ...p, email: e.target.value }))} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처 *</label>
                <input type="text" value={contactForm.phone}
                  onChange={(e) => setContactForm(p => ({ ...p, phone: e.target.value }))} required
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeContactModal}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300">취소</button>
                <button type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">등록</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

