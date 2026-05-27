import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import DateTimePicker from '../components/common/DateTimePicker';
import Icon from '../components/common/Icons';
import api from '../lib/axios';
import { useAuthStore } from '../stores/authStore';

const WORK_TYPES = ['정기점검', '장애지원', '기술지원', '프로젝트 지원', '기타'];
const SUPPORT_TYPES = ['원격', '방문', '가이드', '전화', '기타'];
const INCIDENT_WORK_TYPES = ['장애지원'];

function toLocalDatetime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default function WorkLogEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const deptId = user?.role !== 'admin' ? user?.dept_id : undefined;

  const [form, setForm] = useState(null);
  const [products, setProducts] = useState([{ service_type: '', product_type: '', product_version: '' }]);
  const [extraEngineers, setExtraEngineers] = useState([]);
  const [includeAllDepts, setIncludeAllDepts] = useState(false);
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const addProduct = () => setProducts((prev) => [...prev, { service_type: '', product_type: '', product_version: '' }]);
  const removeProduct = (index) => setProducts((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  const updateProduct = (index, field, value) => {
    setProducts((prev) => prev.map((p, i) => {
      if (i !== index) return p;
      const next = { ...p, [field]: value };
      if (field === 'service_type') next.product_type = '';
      return next;
    }));
  };

  // 담당자 직접 입력 관련
  const [contactMode, setContactMode] = useState('select');
  const [newContact, setNewContact] = useState({ name: '', company: '', phone: '', email: '' });
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactModalDraft, setContactModalDraft] = useState({ name: '', company: '', phone: '', email: '' });

  const { data: logData } = useQuery({
    queryKey: ['workLog', id],
    queryFn: async () => {
      const { data } = await api.get(`/work/${id}`);
      return data.data;
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', deptId],
    queryFn: async () => {
      const params = { limit: 200 };
      if (deptId) params.dept_id = deptId;
      const { data } = await api.get('/projects', { params });
      return data.data;
    },
  });

  const { data: contactsData } = useQuery({
    queryKey: ['contacts', form?.project_id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${form.project_id}/contacts`);
      return data.data;
    },
    enabled: !!form?.project_id,
  });

  // 제품 마스터 데이터
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data.data;
    },
  });

  // 추가 엔지니어 후보 목록
  const authorId = logData?.user_id;
  const authorDeptId = logData?.user?.dept_id;
  const { data: engineersData } = useQuery({
    queryKey: ['engineers', authorId, authorDeptId, includeAllDepts],
    queryFn: async () => {
      const params = { exclude_user_id: authorId };
      if (!includeAllDepts && authorDeptId) params.dept_id = authorDeptId;
      const { data } = await api.get('/users/engineers', { params });
      return data.data;
    },
    enabled: !!authorId,
  });

  useEffect(() => {
    if (logData && !form) {
      setForm({
        title: logData.title || '',
        project_id: logData.project_id?.toString() || '',
        contact_id: logData.contact_id?.toString() || '',
        work_start: toLocalDatetime(logData.work_start),
        work_end: toLocalDatetime(logData.work_end),
        work_type: logData.work_type || '',
        sub_work_type: logData.sub_work_type ? logData.sub_work_type.split(',') : [],
        support_type: logData.support_type || '',
        details: logData.details || '',
      });
      // products: 신규 컬럼 사용, 없으면 레거시 단일 제품에서 1건 구성
      if (Array.isArray(logData.products) && logData.products.length > 0) {
        setProducts(logData.products.map((p) => ({
          service_type: p.service_type || '',
          product_type: p.product_type || '',
          product_version: p.product_version || '',
        })));
      } else if (logData.service_type && logData.product_type) {
        setProducts([{
          service_type: logData.service_type,
          product_type: logData.product_type,
          product_version: logData.product_version || '',
        }]);
      }

      // 추가 엔지니어: logData.engineers는 WorkLogEngineer 레코드 배열
      if (Array.isArray(logData.engineers)) {
        setExtraEngineers(logData.engineers.map((e) => String(e.user_id)));
      }
      if (logData.incident) {
        setIncident({
          action_type: logData.incident.action_type || '',
          start_time: toLocalDatetime(logData.incident.start_time),
          end_time: toLocalDatetime(logData.incident.end_time),
          severity: logData.incident.severity || '',
          cause_type: logData.incident.cause_type || '',
          is_recurrence: logData.incident.is_recurrence || 'N',
        });
      }
    }
  }, [logData]);

  if (!form) {
    return (
      <>
        <Header title="작업 내역 수정" />
        <div className="mt-6 text-center py-20 text-gray-500">로딩 중...</div>
      </>
    );
  }

  const isIncidentType = INCIDENT_WORK_TYPES.includes(form.work_type) || form.sub_work_type.some(t => INCIDENT_WORK_TYPES.includes(t));

  // 제품 유형별 그룹핑
  const productsByType = {};
  productsData?.forEach(p => {
    if (!productsByType[p.product_type]) productsByType[p.product_type] = [];
    productsByType[p.product_type].push(p);
  });
  const serviceTypes = Object.keys(productsByType);

  // 선택된 서비스 유형에 해당하는 제품명 목록
  const availableProducts = form.service_type ? (productsByType[form.service_type] || []) : [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'project_id') {
      setForm((prev) => ({ ...prev, contact_id: '' }));
      setNewContact({ name: '', phone: '', email: '' });
    }
    if (name === 'work_type') {
      setForm((prev) => ({ ...prev, sub_work_type: prev.sub_work_type.filter(t => t !== value) }));
    }
  };

  const handleIncidentChange = (e) => {
    const { name, value } = e.target;
    if (!incident) {
      setIncident({
        action_type: '', start_time: '', end_time: '',
        severity: '', cause_type: '', is_recurrence: 'N',
        [name]: value,
      });
    } else {
      setIncident((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleContactModeChange = (mode) => {
    setContactMode(mode);
    if (mode === 'select') {
      setNewContact({ name: '', company: '', phone: '', email: '' });
    } else {
      setForm((prev) => ({ ...prev, contact_id: '' }));
      setContactModalDraft(newContact);
      setShowContactModal(true);
    }
  };

  const openContactModal = () => {
    setContactModalDraft(newContact);
    setShowContactModal(true);
  };

  const closeContactModal = () => {
    setShowContactModal(false);
  };

  const saveContactModal = () => {
    if (!contactModalDraft.name.trim()) {
      return;
    }
    setNewContact(contactModalDraft);
    setShowContactModal(false);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const oversized = files.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversized.length > 0) {
      setError(`파일 크기가 10MB를 초과합니다: ${oversized.map((f) => f.name).join(', ')}`);
      return;
    }
    if (files.length > 5) {
      setError('한 번에 최대 5개 파일까지 업로드할 수 있습니다.');
      return;
    }

    setUploadingFiles(true);
    setError('');
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      await api.post(`/work/${id}/files`, formData);
      queryClient.invalidateQueries({ queryKey: ['workLog', id] });
      e.target.value = '';
    } catch (err) {
      setError(err.response?.data?.message || '파일 업로드에 실패했습니다.');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteFile = (fileId, fileName) => {
    if (window.confirm(`'${fileName}' 파일을 삭제하시겠습니까?`)) {
      api.delete(`/work/files/${fileId}`).then(() => {
        queryClient.invalidateQueries({ queryKey: ['workLog', id] });
      }).catch((err) => {
        setError(err.response?.data?.message || '파일 삭제에 실패했습니다.');
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let contactId = parseInt(form.contact_id);

      // 직접 입력 모드: 먼저 담당자를 생성
      if (contactMode === 'direct') {
        if (!newContact.name.trim()) {
          setError('담당자 이름을 입력해주세요.');
          setSubmitting(false);
          return;
        }
        if (!form.project_id) {
          setError('프로젝트를 먼저 선택해주세요.');
          setSubmitting(false);
          return;
        }

        const { data: contactRes } = await api.post('/projects/contacts', {
          project_id: parseInt(form.project_id),
          name: newContact.name.trim(),
          company: newContact.company?.trim() || '',
          email: newContact.email.trim() || '',
          phone: newContact.phone.trim() || '',
        });
        contactId = contactRes.data.contact_id;

        queryClient.invalidateQueries({ queryKey: ['contacts', form.project_id] });
      }

      // products 정리
      const cleanProducts = products
        .map((p) => ({
          service_type: p.service_type?.trim() || '',
          product_type: p.product_type?.trim() || '',
          product_version: p.product_version?.trim() || '',
        }))
        .filter((p) => p.service_type && p.product_type && p.product_version);
      if (cleanProducts.length === 0) {
        setError('최소 1개의 제품 정보를 입력해주세요.');
        setSubmitting(false);
        return;
      }

      const payload = {
        ...form,
        project_id: parseInt(form.project_id),
        contact_id: contactId,
        sub_work_type: form.sub_work_type.length > 0 ? form.sub_work_type : null,
        products: cleanProducts,
        engineers: extraEngineers.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id)),
      };

      if (isIncidentType && incident) {
        payload.incident = incident;
      }

      await api.put(`/work/${id}`, payload);
      queryClient.invalidateQueries({ queryKey: ['workLog', id] });
      queryClient.invalidateQueries({ queryKey: ['workLogs'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      navigate(`/work/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || '수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header title="작업 내역 수정" />
      <div className="mt-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">기본 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
                <input type="text" name="title" value={form.title} onChange={handleChange} required
                  placeholder="작업 내용을 간략히 요약하세요"
                  maxLength={200}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 *</label>
                <select name="project_id" value={form.project_id} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">선택하세요</option>
                  {projectsData?.map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.client?.client_name} - {p.project_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  요청자 *
                  <span className="ml-2 inline-flex rounded-md shadow-sm">
                    <button type="button" onClick={() => handleContactModeChange('select')}
                      className={`px-2 py-0.5 text-xs rounded-l-md border ${contactMode === 'select' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                      선택
                    </button>
                    <button type="button" onClick={() => handleContactModeChange('direct')}
                      className={`px-2 py-0.5 text-xs rounded-r-md border-t border-r border-b ${contactMode === 'direct' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                      직접입력
                    </button>
                  </span>
                </label>
                {contactMode === 'select' ? (
                  <select name="contact_id" value={form.contact_id} onChange={handleChange} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                    <option value="">선택하세요</option>
                    {contactsData?.map((c) => (
                      <option key={c.contact_id} value={c.contact_id}>
                        {c.name}{c.company ? ` [${c.company}]` : ''}{c.phone ? ` (${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={openContactModal}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {newContact.name ? (
                      <span className="text-gray-800 truncate">
                        {newContact.name}
                        {newContact.company && <span className="text-amber-600 text-xs ml-1">[{newContact.company}]</span>}
                        {newContact.phone && <span className="text-gray-400 text-xs ml-1">({newContact.phone})</span>}
                      </span>
                    ) : (
                      <span className="text-gray-400">담당자 정보 입력하기...</span>
                    )}
                    <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">작업 시작일시 *</label>
                <DateTimePicker
                  name="work_start"
                  value={form.work_start}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">작업 종료일시 *</label>
                <DateTimePicker
                  name="work_end"
                  value={form.work_end}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">작업 분류</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField label="작업 유형" name="work_type" value={form.work_type} options={WORK_TYPES} onChange={handleChange} disabled hint="작업 유형은 변경할 수 없습니다" />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">부 작업유형</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {WORK_TYPES.filter(t => t !== form.work_type).map((t) => (
                    <label key={t} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors whitespace-nowrap ${
                      form.sub_work_type.includes(t) ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}>
                      <input type="checkbox" className="sr-only" checked={form.sub_work_type.includes(t)}
                        onChange={(e) => {
                          setForm(prev => ({
                            ...prev,
                            sub_work_type: e.target.checked
                              ? [...prev.sub_work_type, t]
                              : prev.sub_work_type.filter(v => v !== t)
                          }));
                        }} />
                      {form.sub_work_type.includes(t) && <span className="text-blue-500">✓</span>}
                      {t}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">복합 작업 시 해당하는 유형을 모두 선택</p>
              </div>
              <SelectField label="지원 구분" name="support_type" value={form.support_type} options={SUPPORT_TYPES} onChange={handleChange} />
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">제품 정보 * <span className="text-xs text-gray-400 font-normal">(여러 제품 등록 가능)</span></label>
                  <button type="button" onClick={addProduct}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    제품 추가
                  </button>
                </div>
                <div className="space-y-2">
                  {products.map((product, idx) => {
                    const productList = product.service_type ? (productsByType[product.service_type] || []) : [];
                    return (
                      <div key={idx} className="flex flex-col sm:flex-row gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                        <select
                          value={product.service_type}
                          onChange={(e) => updateProduct(idx, 'service_type', e.target.value)}
                          required
                          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                        >
                          <option value="">서비스 유형</option>
                          {serviceTypes.length > 0
                            ? serviceTypes.map((t) => <option key={t} value={t}>{t}</option>)
                            : ['DB', 'WEB/WAS', 'OS', '네트워크', '보안', '클라우드', '기타'].map((t) => <option key={t} value={t}>{t}</option>)
                          }
                          {product.service_type && !serviceTypes.includes(product.service_type) && (
                            <option value={product.service_type}>{product.service_type}</option>
                          )}
                        </select>
                        <select
                          value={product.product_type}
                          onChange={(e) => updateProduct(idx, 'product_type', e.target.value)}
                          required
                          disabled={!product.service_type}
                          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white disabled:bg-gray-100"
                        >
                          <option value="">제품명</option>
                          {productList.map((p) => <option key={p.product_id} value={p.product_name}>{p.product_name}</option>)}
                          {product.product_type && !productList.some(p => p.product_name === product.product_type) && (
                            <option value={product.product_type}>{product.product_type}</option>
                          )}
                        </select>
                        <input
                          type="text"
                          value={product.product_version}
                          onChange={(e) => updateProduct(idx, 'product_version', e.target.value)}
                          placeholder="버전 (예: 19c, 7 FS07)"
                          required
                          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeProduct(idx)}
                          disabled={products.length <= 1}
                          className="shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                          title={products.length <= 1 ? '최소 1개의 제품이 필요합니다' : '제품 삭제'}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 참여 엔지니어 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-lg font-semibold text-gray-800">
                참여 엔지니어
                <span className="ml-2 text-xs text-gray-400 font-normal">(작성자 외 함께 작업한 엔지니어)</span>
              </h3>
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeAllDepts}
                  onChange={(e) => setIncludeAllDepts(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                다른 부서 포함
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">엔지니어 선택</label>
              <select
                multiple
                value={extraEngineers}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setExtraEngineers(opts);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[120px]"
              >
                {engineersData?.map((e) => (
                  <option key={e.user_id} value={e.user_id}>
                    {e.name} ({e.position}) - {e.department?.dept_name || '부서 없음'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Ctrl(또는 Cmd) 또는 Shift를 누른 채 클릭하여 여러 명 선택 가능 · 선택된 엔지니어의 작업 시간도 통계에 합산됩니다
              </p>
            </div>

            {extraEngineers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {extraEngineers.map((uid) => {
                  const eng = engineersData?.find((e) => String(e.user_id) === String(uid));
                  if (!eng) return null;
                  return (
                    <span key={uid} className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-sm">
                      {eng.name}
                      <button
                        type="button"
                        onClick={() => setExtraEngineers((prev) => prev.filter((id) => String(id) !== String(uid)))}
                        className="hover:bg-blue-100 rounded-full p-0.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {isIncidentType && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
              <h3 className="text-lg font-semibold text-red-700 mb-4">장애 상세 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">조치 유형 *</label>
                  <select name="action_type" value={incident?.action_type || ''} onChange={handleIncidentChange} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
                    <option value="">선택하세요</option>
                    <option value="임시">임시</option>
                    <option value="영구">영구</option>
                    <option value="가이드">가이드</option>
                    <option value="모니터링">모니터링</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">영향도 *</label>
                  <select name="severity" value={incident?.severity || ''} onChange={handleIncidentChange} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
                    <option value="">선택하세요</option>
                    <option value="Critical">Critical</option>
                    <option value="Major">Major</option>
                    <option value="Minor">Minor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">장애 발생일시 *</label>
                  <DateTimePicker
                    name="start_time"
                    value={incident?.start_time || ''}
                    onChange={handleIncidentChange}
                    required
                    accentColor="red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">장애 복구일시 *</label>
                  <DateTimePicker
                    name="end_time"
                    value={incident?.end_time || ''}
                    onChange={handleIncidentChange}
                    required
                    accentColor="red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">원인 분류 *</label>
                  <input type="text" name="cause_type" value={incident?.cause_type || ''} onChange={handleIncidentChange} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">재발 여부</label>
                  <select name="is_recurrence" value={incident?.is_recurrence || 'N'} onChange={handleIncidentChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
                    <option value="N">아니오</option>
                    <option value="Y">예</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">상세 내용</h3>
            <textarea name="details" value={form.details} onChange={handleChange} required rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y" />
          </div>

          {/* 첨부 파일 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">첨부 파일</h3>

            {/* 기존 파일 목록 */}
            {logData?.files && logData.files.length > 0 && (
              <ul className="space-y-2 mb-4">
                {logData.files.map((file) => (
                  <li key={file.file_id} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="flex items-center gap-2">
                      <Icon name="attach" size={14} className="text-gray-400 shrink-0" />
                      <span>{file.original_name}</span>
                      {file.file_size > 0 && (
                        <span className="text-xs text-gray-400">
                          ({file.file_size >= 1048576
                            ? (file.file_size / 1048576).toFixed(1) + ' MB'
                            : (file.file_size / 1024).toFixed(1) + ' KB'})
                        </span>
                      )}
                    </span>
                    <button type="button" onClick={() => handleDeleteFile(file.file_id, file.original_name)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium">
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* 파일 추가 업로드 */}
            <div className="space-y-2">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploadingFiles}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  disabled:opacity-50"
              />
              {uploadingFiles && (
                <p className="text-sm text-blue-600">파일 업로드 중...</p>
              )}
              <p className="text-xs text-gray-400">
                최대 5개, 파일당 10MB 이하 (PDF, 문서, 이미지, 압축파일 등)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {submitting ? '수정 중...' : '수정 완료'}
            </button>
            <button type="button" onClick={() => navigate(`/work/${id}`)}
              className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-300 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>

      {/* 담당자 직접 입력 모달 */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">담당자 정보 입력</h3>
              <p className="text-sm text-gray-500 mt-1">새로운 담당자 정보를 입력합니다.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contactModalDraft.name}
                  onChange={(e) => setContactModalDraft((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="홍길동"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">소속 회사</label>
                <input
                  type="text"
                  value={contactModalDraft.company || ''}
                  onChange={(e) => setContactModalDraft((prev) => ({ ...prev, company: e.target.value }))}
                  placeholder="요청자 소속 회사명 (선택)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={contactModalDraft.email}
                  onChange={(e) => setContactModalDraft((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="example@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                <input
                  type="text"
                  value={contactModalDraft.phone}
                  onChange={(e) => setContactModalDraft((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeContactModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveContactModal}
                disabled={!contactModalDraft.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SelectField({ label, name, value, options, onChange, disabled, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} *</label>
      <select name={name} value={value} onChange={onChange} required disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}>
        <option value="">선택하세요</option>
        {options.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
