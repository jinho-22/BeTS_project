import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import api from '../lib/axios';
import { useAuthStore } from '../stores/authStore';

export default function ClientListPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const deptId = user?.role !== 'admin' ? user?.dept_id : undefined;

  // 고객사 관련 상태
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientName, setClientName] = useState('');
  const [expandedClientId, setExpandedClientId] = useState(null);
  const [error, setError] = useState('');

  // 프로젝트 관련 상태
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectClientId, setProjectClientId] = useState(null);
  const [projectForm, setProjectForm] = useState({ project_name: '', dept_id: '', contract_start: '', contract_end: '', acs_contract_time: '' });

  // 담당자 관련 상태
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '' });

  // 프로젝트 내 담당자 펼치기
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  // ── 쿼리 ──────────────────────────────

  const { data, isLoading } = useQuery({
    queryKey: ['clients', deptId],
    queryFn: async () => {
      const params = { limit: 100 };
      if (deptId) params.dept_id = deptId;
      const { data } = await api.get('/projects/clients', { params });
      return data;
    },
  });

  const { data: clientDetail } = useQuery({
    queryKey: ['clientDetail', expandedClientId],
    queryFn: async () => {
      const { data } = await api.get(`/projects/clients/${expandedClientId}`);
      return data.data;
    },
    enabled: !!expandedClientId,
  });

  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await api.get('/users/departments');
      return data.data;
    },
  });

  // ── 고객사 뮤테이션 ──────────────────

  const createClientMutation = useMutation({
    mutationFn: (payload) => api.post('/projects/clients', payload),
    onSuccess: () => { invalidateAll(); closeModal(); },
    onError: (err) => setError(err.response?.data?.message || '생성 실패'),
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/projects/clients/${id}`, payload),
    onSuccess: () => { invalidateAll(); closeModal(); },
    onError: (err) => setError(err.response?.data?.message || '수정 실패'),
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/clients/${id}`),
    onSuccess: () => invalidateAll(),
    onError: (err) => alert(err.response?.data?.message || '삭제 실패'),
  });

  // ── 프로젝트 뮤테이션 ────────────────

  const createProjectMutation = useMutation({
    mutationFn: (payload) => api.post('/projects', payload),
    onSuccess: () => { invalidateAll(); closeProjectModal(); },
    onError: (err) => setError(err.response?.data?.message || '생성 실패'),
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, payload }) => api.put(`/projects/${id}`, payload),
    onSuccess: () => { invalidateAll(); closeProjectModal(); },
    onError: (err) => setError(err.response?.data?.message || '수정 실패'),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => invalidateAll(),
    onError: (err) => alert(err.response?.data?.message || '삭제 실패'),
  });

  // ── 담당자 뮤테이션 ──────────────────

  const createContactMutation = useMutation({
    mutationFn: (payload) => api.post('/projects/contacts', payload),
    onSuccess: () => { invalidateAll(); closeContactModal(); },
    onError: (err) => setError(err.response?.data?.message || '등록 실패'),
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/contacts/${id}`),
    onSuccess: () => invalidateAll(),
    onError: (err) => alert(err.response?.data?.message || '삭제 실패'),
  });

  // ── 공통 캐시 무효화 ─────────────────

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['clientDetail'] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  // ── 고객사 모달 핸들러 ───────────────

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
      updateClientMutation.mutate({ id: editingClient.client_id, payload: { client_name: clientName } });
    } else {
      createClientMutation.mutate({ client_name: clientName });
    }
  };

  const handleDelete = (e, client) => {
    e.stopPropagation();
    if (window.confirm(`'${client.client_name}' 고객사를 삭제하시겠습니까?`)) {
      deleteClientMutation.mutate(client.client_id);
    }
  };

  // ── 프로젝트 모달 핸들러 ─────────────

  const openCreateProjectModal = (e, clientId) => {
    e.stopPropagation();
    setEditingProject(null);
    setProjectClientId(clientId);
    setProjectForm({ project_name: '', dept_id: user?.dept_id?.toString() || '', contract_start: '', contract_end: '', acs_contract_time: '' });
    setError('');
    setShowProjectModal(true);
  };

  const openEditProjectModal = (e, project) => {
    e.stopPropagation();
    setEditingProject(project);
    setProjectClientId(project.client_id);
    setProjectForm({
      project_name: project.project_name,
      dept_id: project.dept_id?.toString(),
      contract_start: project.contract_start || '',
      contract_end: project.contract_end || '',
      acs_contract_time: project.acs_contract_time != null ? project.acs_contract_time.toString() : '',
    });
    setError('');
    setShowProjectModal(true);
  };

  const closeProjectModal = () => {
    setShowProjectModal(false);
    setEditingProject(null);
    setProjectClientId(null);
    setError('');
  };

  const handleProjectSubmit = (e) => {
    e.preventDefault();
    const payload = {
      client_id: projectClientId,
      dept_id: parseInt(projectForm.dept_id),
      project_name: projectForm.project_name,
      contract_start: projectForm.contract_start,
      contract_end: projectForm.contract_end,
      acs_contract_time: projectForm.acs_contract_time !== '' ? parseFloat(projectForm.acs_contract_time) : null,
    };
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.project_id, payload });
    } else {
      createProjectMutation.mutate(payload);
    }
  };

  // ── 담당자 모달 핸들러 ───────────────

  const openContactModal = (e, project) => {
    e.stopPropagation();
    setSelectedProject(project);
    setContactForm({ name: '', email: '', phone: '' });
    setError('');
    setShowContactModal(true);
  };

  const closeContactModal = () => {
    setShowContactModal(false);
    setSelectedProject(null);
    setError('');
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    createContactMutation.mutate({
      project_id: selectedProject.project_id,
      ...contactForm,
    });
  };

  // ── 토글 핸들러 ──────────────────────

  const toggleClientExpand = (clientId) => {
    setExpandedClientId(prev => {
      if (prev !== clientId) setExpandedProjectId(null);
      return prev === clientId ? null : clientId;
    });
  };

  const toggleProjectExpand = (e, projectId) => {
    e.stopPropagation();
    setExpandedProjectId(prev => prev === projectId ? null : projectId);
  };

  // ── 프로젝트 목록 렌더링 헬퍼 (모바일/데스크톱 공용) ──
  const renderProjectsList = (projects, client) => {
    if (projects.length === 0) {
      return (
        <div className="text-center py-6 text-gray-400 text-xs sm:text-sm bg-white rounded-lg border border-dashed border-gray-200">
          등록된 프로젝트가 없습니다.
          {isManager && (
            <button onClick={(e) => openCreateProjectModal(e, client.client_id)}
              className="ml-2 text-blue-600 hover:underline">프로젝트 추가</button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {projects.map((project) => {
          const isProjectExpanded = expandedProjectId === project.project_id;
          const contacts = project.contacts || [];
          return (
            <div key={project.project_id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              {/* 프로젝트 헤더 */}
              <div
                className="p-3 sm:p-4 cursor-pointer"
                onClick={(e) => toggleProjectExpand(e, project.project_id)}
              >
                <div className="flex items-start gap-2">
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 mt-1 ${isProjectExpanded ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    {/* 프로젝트명 + 칩 */}
                    <div className="flex items-center flex-wrap gap-1.5">
                      <h5 className="font-semibold text-gray-900 text-sm break-all">{project.project_name}</h5>
                      {project.department?.dept_name && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 whitespace-nowrap">
                          {project.department.dept_name}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${contacts.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        담당자 {contacts.length}명
                      </span>
                    </div>
                    {/* 계약 정보 */}
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-1.5">
                      <span className="inline-flex items-center gap-1 break-all">
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {project.contract_start && project.contract_end
                          ? `${project.contract_start} ~ ${project.contract_end}`
                          : project.contract_period || '-'}
                      </span>
                      {project.acs_contract_time != null && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                          ACS {project.acs_contract_time}h
                        </span>
                      )}
                    </div>
                    {/* 액션 버튼 (모바일/데스크톱 모두 본문 아래로) */}
                    {isManager && (
                      <div className="flex items-center flex-wrap gap-3 mt-2">
                        <button
                          onClick={(e) => openContactModal(e, project)}
                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                        >+ 담당자</button>
                        <button
                          onClick={(e) => openEditProjectModal(e, project)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >수정</button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`'${project.project_name}' 프로젝트를 삭제하시겠습니까?`))
                                deleteProjectMutation.mutate(project.project_id);
                            }}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >삭제</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 프로젝트 확장: 담당자 목록 */}
              {isProjectExpanded && (
                <div className="border-t border-gray-100 px-3 sm:px-4 py-3 bg-blue-50/30">
                  <h6 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    담당자 정보
                  </h6>
                  {contacts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {contacts.map((contact) => (
                        <div key={contact.contact_id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                                {contact.name?.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 text-sm truncate">{contact.name}</p>
                                <div className="flex flex-col gap-0.5 mt-0.5">
                                  {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="text-xs text-blue-600 hover:underline truncate">{contact.email}</a>
                                  )}
                                  {contact.phone && (
                                    <a href={`tel:${contact.phone}`} className="text-xs text-gray-500 hover:text-blue-600 truncate">{contact.phone}</a>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isManager && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`담당자 '${contact.name}'을(를) 삭제하시겠습니까?`))
                                    deleteContactMutation.mutate(contact.contact_id);
                                }}
                                className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                                title="담당자 삭제"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-gray-400 text-xs bg-white rounded-lg border border-dashed border-gray-200">
                      등록된 담당자가 없습니다.
                      {isManager && (
                        <button onClick={(e) => openContactModal(e, project)}
                          className="ml-2 text-blue-600 hover:underline">담당자 추가</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── 렌더링 ───────────────────────────

  return (
    <>
      <Header title="고객사 관리" />
      <div className="mt-6">
        {isManager && (
          <div className="mb-4 flex justify-stretch sm:justify-end">
            <button onClick={openCreateModal}
              className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              + 고객사 등록
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          ) : data?.data?.length > 0 ? (
            <>
              {/* 모바일: 카드 레이아웃 */}
              <div className="md:hidden divide-y divide-gray-100">
                {data.data.map((client, idx) => {
                  const isExpanded = expandedClientId === client.client_id;
                  const projectCount = client.projects?.length || 0;
                  const projects = (isExpanded && clientDetail?.projects) ? clientDetail.projects : (client.projects || []);
                  return (
                    <Fragment key={client.client_id}>
                      <div
                        className="px-3 py-3 hover:bg-green-50/50 cursor-pointer transition-colors"
                        onClick={() => toggleClientExpand(client.client_id)}
                      >
                        <div className="flex items-center gap-2">
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-xs text-gray-400 shrink-0">{idx + 1}</span>
                          <span className="font-medium text-gray-900 text-sm flex-1 min-w-0 truncate">{client.client_name}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${projectCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                            {projectCount}개
                          </span>
                        </div>
                        {isManager && (
                          <div className="flex items-center gap-3 mt-2 ml-6">
                            <button onClick={(e) => openEditModal(e, client)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium">수정</button>
                            {user?.role === 'admin' && (
                              <button onClick={(e) => handleDelete(e, client)}
                                className="text-red-600 hover:text-red-800 text-xs font-medium">삭제</button>
                            )}
                          </div>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="bg-green-50/30 border-t border-green-100 px-3 py-3">
                          <div className="flex items-center justify-between mb-3 gap-2">
                            <h4 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 min-w-0">
                              <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                              <span className="truncate">프로젝트 목록</span>
                            </h4>
                            {isManager && (
                              <button
                                onClick={(e) => openCreateProjectModal(e, client.client_id)}
                                className="bg-green-600 text-white px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors shrink-0 whitespace-nowrap"
                              >
                                + 프로젝트
                              </button>
                            )}
                          </div>
                          {renderProjectsList(projects, client)}
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>

              {/* 데스크톱: 테이블 레이아웃 */}
              <table className="hidden md:table w-full text-sm">
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

                      {/* 확장 패널: 프로젝트 목록 + CRUD */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={isManager ? 5 : 4} className="p-0">
                            <div className="bg-green-50/30 border-t border-green-100 px-3 sm:px-8 py-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                  </svg>
                                  {client.client_name} 프로젝트 목록
                                </h4>
                                {isManager && (
                                  <button
                                    onClick={(e) => openCreateProjectModal(e, client.client_id)}
                                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                                  >
                                    + 프로젝트 등록
                                  </button>
                                )}
                              </div>

                              {renderProjectsList(projects, client)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">등록된 고객사가 없습니다.</div>
          )}
        </div>
      </div>

      {/* 고객사 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
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

      {/* 프로젝트 등록/수정 모달 */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingProject ? '프로젝트 수정' : '프로젝트 등록'}
            </h3>
            <form onSubmit={handleProjectSubmit} className="space-y-4">
              {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">계약 시작일 *</label>
                  <input type="date" value={projectForm.contract_start}
                    onChange={(e) => setProjectForm(p => ({ ...p, contract_start: e.target.value }))} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">계약 종료일 *</label>
                  <input type="date" value={projectForm.contract_end}
                    onChange={(e) => setProjectForm(p => ({ ...p, contract_end: e.target.value }))} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ACS 계약 시간 (시간)</label>
                <input type="number" step="0.1" min="0" value={projectForm.acs_contract_time}
                  onChange={(e) => setProjectForm(p => ({ ...p, acs_contract_time: e.target.value }))}
                  placeholder="미입력 시 ACS 미적용"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                <p className="text-xs text-gray-400 mt-1">ACS 계약이 있는 프로젝트만 입력하세요</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
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
