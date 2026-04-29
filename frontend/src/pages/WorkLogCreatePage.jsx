import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import DateTimePicker from '../components/common/DateTimePicker';
import Icon from '../components/common/Icons';
import api from '../lib/axios';
import { useAuthStore } from '../stores/authStore';

const WORK_TYPES = ['정기점검', '장애지원', '기술지원', '프로젝트 지원', '기타'];
const SUPPORT_TYPES = ['원격', '방문', '가이드', '전화', '기타'];
const INCIDENT_WORK_TYPES = ['장애지원'];

export default function WorkLogCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const deptId = user?.role !== 'admin' ? user?.dept_id : undefined;

  const [form, setForm] = useState({
    title: '',
    project_id: '',
    contact_id: '',
    work_start: '',
    work_end: '',
    work_type: '',
    sub_work_type: [],
    support_type: '',
    service_type: '',
    product_type: '',
    product_version: '',
    details: '',
  });

  // 담당자 직접 입력 관련
  const [contactMode, setContactMode] = useState('select'); // 'select' | 'direct'
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' });
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactModalDraft, setContactModalDraft] = useState({ name: '', phone: '', email: '' });

  const [incident, setIncident] = useState({
    action_type: '',
    start_time: '',
    end_time: '',
    severity: '',
    cause_type: '',
    is_recurrence: 'N',
  });

  const [selectedFiles, setSelectedFiles] = useState([]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isIncidentType = INCIDENT_WORK_TYPES.includes(form.work_type) || form.sub_work_type.some(t => INCIDENT_WORK_TYPES.includes(t));

  // 프로젝트 목록 (부서 필터 적용)
  const { data: projectsData } = useQuery({
    queryKey: ['projects', deptId],
    queryFn: async () => {
      const params = { limit: 200 };
      if (deptId) params.dept_id = deptId;
      const { data } = await api.get('/projects', { params });
      return data.data;
    },
  });

  // 선택된 프로젝트의 담당자 목록
  const { data: contactsData } = useQuery({
    queryKey: ['contacts', form.project_id],
    queryFn: async () => {
      const { data } = await api.get(`/projects/${form.project_id}/contacts`);
      return data.data;
    },
    enabled: !!form.project_id,
  });

  // 제품 마스터 데이터
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data.data;
    },
  });

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
    // 프로젝트 변경 시 담당자 초기화
    if (name === 'project_id') {
      setForm((prev) => ({ ...prev, contact_id: '' }));
      setNewContact({ name: '', phone: '', email: '' });
    }
    // 서비스 유형 변경 시 제품명 초기화
    if (name === 'service_type') {
      setForm((prev) => ({ ...prev, product_type: '' }));
    }
    // 주 작업유형 변경 시 부 작업유형에서 중복 제거
    if (name === 'work_type') {
      setForm((prev) => ({ ...prev, sub_work_type: prev.sub_work_type.filter(t => t !== value) }));
    }
  };

  const handleIncidentChange = (e) => {
    const { name, value } = e.target;
    setIncident((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactModeChange = (mode) => {
    setContactMode(mode);
    if (mode === 'select') {
      setNewContact({ name: '', phone: '', email: '' });
    } else {
      setForm((prev) => ({ ...prev, contact_id: '' }));
      // 직접입력 모드로 전환 시 모달 열기
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

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length === 0) return;

    const oversized = newFiles.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversized.length > 0) {
      setError(`파일 크기가 10MB를 초과합니다: ${oversized.map((f) => f.name).join(', ')}`);
      e.target.value = '';
      return;
    }

    const merged = [...selectedFiles, ...newFiles];
    if (merged.length > 5) {
      setError('파일은 최대 5개까지 첨부할 수 있습니다.');
      e.target.value = '';
      return;
    }
    setSelectedFiles(merged);
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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
          email: newContact.email.trim() || '',
          phone: newContact.phone.trim() || '',
        });
        contactId = contactRes.data.contact_id;

        // 담당자 목록 캐시 갱신
        queryClient.invalidateQueries({ queryKey: ['contacts', form.project_id] });
      }

      const payload = {
        ...form,
        project_id: parseInt(form.project_id),
        contact_id: contactId,
        sub_work_type: form.sub_work_type.length > 0 ? form.sub_work_type : null,
      };

      if (isIncidentType) {
        payload.incident = incident;
      }

      const { data: createRes } = await api.post('/work', payload);
      const createdLogId = createRes.data.log_id;

      // 파일이 선택되어 있으면 업로드
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append('files', file));
        await api.post(`/work/${createdLogId}/files`, formData);
      }

      queryClient.invalidateQueries({ queryKey: ['workLogs'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      navigate(`/work/${createdLogId}`);
    } catch (err) {
      setError(err.response?.data?.message || '작업 내역 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header title="작업 내역 등록" />
      <div className="mt-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 기본 정보 */}
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
                        {c.name} {c.phone ? `(${c.phone})` : ''}
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

          {/* 작업 분류 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">작업 분류</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">작업 유형 *</label>
                <select name="work_type" value={form.work_type} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">선택하세요</option>
                  {WORK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">지원 구분 *</label>
                <select name="support_type" value={form.support_type} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">선택하세요</option>
                  {SUPPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품 유형 *</label>
                <select name="service_type" value={form.service_type} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">선택하세요</option>
                  {serviceTypes.length > 0
                    ? serviceTypes.map((t) => <option key={t} value={t}>{t}</option>)
                    : ['DB', 'WEB/WAS', 'OS', '네트워크', '보안', '클라우드', '기타'].map((t) => <option key={t} value={t}>{t}</option>)
                  }
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품명 *</label>
                <select name="product_type" value={form.product_type} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">선택하세요</option>
                  {availableProducts.length > 0
                    ? availableProducts.map((p) => (
                        <option key={p.product_id} value={p.product_name}>{p.product_name}</option>
                      ))
                    : form.service_type
                      ? <option value="" disabled>해당 유형에 등록된 제품이 없습니다</option>
                      : null
                  }
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">제품 버전 *</label>
                <input type="text" name="product_version" value={form.product_version} onChange={handleChange} required
                  placeholder="예: Oracle 19c, Tibero 7 FS07"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
          </div>

          {/* 장애 상세 (장애 관련 작업 유형일 때만 표시) */}
          {isIncidentType && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
              <h3 className="text-lg font-semibold text-red-700 mb-4">장애 상세 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">조치 유형 *</label>
                  <select name="action_type" value={incident.action_type} onChange={handleIncidentChange} required
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
                  <select name="severity" value={incident.severity} onChange={handleIncidentChange} required
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
                    value={incident.start_time}
                    onChange={handleIncidentChange}
                    required
                    accentColor="red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">장애 복구일시 *</label>
                  <DateTimePicker
                    name="end_time"
                    value={incident.end_time}
                    onChange={handleIncidentChange}
                    required
                    accentColor="red"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">원인 분류 *</label>
                  <input type="text" name="cause_type" value={incident.cause_type} onChange={handleIncidentChange} required
                    placeholder="OS, DB, 앱, 네트워크 등"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">재발 여부</label>
                  <select name="is_recurrence" value={incident.is_recurrence} onChange={handleIncidentChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm">
                    <option value="N">아니오</option>
                    <option value="Y">예</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 상세 내용 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">상세 내용</h3>
            <textarea name="details" value={form.details} onChange={handleChange} required rows={8}
              placeholder="작업 내용을 상세히 기술하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y" />
          </div>

          {/* 첨부 파일 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">첨부 파일</h3>
            <div className="space-y-3">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-400">
                최대 5개, 파일당 10MB 이하 (PDF, 문서, 이미지, 압축파일 등)
              </p>
              {selectedFiles.length > 0 && (
                <ul className="space-y-1">
                  {selectedFiles.map((file, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                      <span className="flex items-center gap-2">
                        <Icon name="attach" size={14} className="text-gray-400 shrink-0" />
                        <span>{file.name}</span>
                        <span className="text-xs text-gray-400">
                          ({file.size >= 1048576
                            ? (file.size / 1048576).toFixed(1) + ' MB'
                            : (file.size / 1024).toFixed(1) + ' KB'})
                        </span>
                      </span>
                      <button type="button" onClick={() => handleRemoveFile(idx)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium">
                        삭제
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {submitting ? '등록 중...' : '작업 내역 등록'}
            </button>
            <button type="button" onClick={() => navigate('/work')}
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
