import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import DateTimePicker from '../components/common/DateTimePicker';
import api from '../lib/axios';

const WORK_TYPES = ['정기점검', '장애지원', '장애처리', '장애대응', '기술지원', '교육', '기타'];
const SUPPORT_TYPES = ['원격', '방문', '가이드', '전화', '기타'];
const INCIDENT_WORK_TYPES = ['장애지원', '장애처리', '장애대응'];

export default function WorkLogCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    project_id: '',
    contact_id: '',
    work_start: '',
    work_end: '',
    work_type: '',
    supprt_type: '',
    service_type: '',
    product_type: '',
    product_version: '',
    details: '',
  });

  const [incident, setIncident] = useState({
    action_type: '',
    start_time: '',
    end_time: '',
    severity: '',
    cause_type: '',
    is_recurrence: 'N',
  });

  const [error, setError] = useState('');
  const isIncidentType = INCIDENT_WORK_TYPES.includes(form.work_type);

  // 프로젝트 목록
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects', { params: { limit: 200 } });
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

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/work', payload);
      return data;
    },
    onSuccess: () => {
      // await 없이 비동기로 캐시 무효화 (blocking 방지)
      queryClient.invalidateQueries({ queryKey: ['workLogs'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      navigate('/work');
    },
    onError: (err) => {
      setError(err.response?.data?.message || '작업 로그 등록에 실패했습니다.');
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
    }
    // 서비스 유형 변경 시 제품명 초기화
    if (name === 'service_type') {
      setForm((prev) => ({ ...prev, product_type: '' }));
    }
  };

  const handleIncidentChange = (e) => {
    const { name, value } = e.target;
    setIncident((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      ...form,
      project_id: parseInt(form.project_id),
      contact_id: parseInt(form.contact_id),
    };

    if (isIncidentType) {
      payload.incident = incident;
    }

    createMutation.mutate(payload);
  };

  return (
    <>
      <Header title="작업 로그 등록" />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">요청자 *</label>
                <select name="contact_id" value={form.contact_id} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">선택하세요</option>
                  {contactsData?.map((c) => (
                    <option key={c.contact_id} value={c.contact_id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">지원 구분 *</label>
                <select name="supprt_type" value={form.supprt_type} onChange={handleChange} required
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
              <h3 className="text-lg font-semibold text-red-700 mb-4">🚨 장애 상세 정보</h3>
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

          {/* 버튼 */}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={createMutation.isPending}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {createMutation.isPending ? '등록 중...' : '작업 로그 등록'}
            </button>
            <button type="button" onClick={() => navigate('/work')}
              className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-300 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
