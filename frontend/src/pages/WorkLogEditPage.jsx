import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import DateTimePicker from '../components/common/DateTimePicker';
import api from '../lib/axios';

const WORK_TYPES = ['정기점검', '장애지원', '장애처리', '장애대응', '기술지원', '교육', '기타'];
const SUPPORT_TYPES = ['원격', '방문', '가이드', '전화', '기타'];
const INCIDENT_WORK_TYPES = ['장애지원', '장애처리', '장애대응'];

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

  const [form, setForm] = useState(null);
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState('');

  const { data: logData } = useQuery({
    queryKey: ['workLog', id],
    queryFn: async () => {
      const { data } = await api.get(`/work/${id}`);
      return data.data;
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get('/projects', { params: { limit: 200 } });
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

  useEffect(() => {
    if (logData && !form) {
      setForm({
        project_id: logData.project_id?.toString() || '',
        contact_id: logData.contact_id?.toString() || '',
        work_start: toLocalDatetime(logData.work_start),
        work_end: toLocalDatetime(logData.work_end),
        work_type: logData.work_type || '',
        supprt_type: logData.supprt_type || '',
        service_type: logData.service_type || '',
        product_type: logData.product_type || '',
        product_version: logData.product_version || '',
        details: logData.details || '',
      });
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

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.put(`/work/${id}`, payload);
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workLog', id] });
      await queryClient.invalidateQueries({ queryKey: ['workLogs'] });
      await queryClient.invalidateQueries({ queryKey: ['statistics'] });
      navigate(`/work/${id}`);
    },
    onError: (err) => {
      setError(err.response?.data?.message || '수정에 실패했습니다.');
    },
  });

  if (!form) {
    return (
      <>
        <Header title="작업 로그 수정" />
        <div className="mt-6 text-center py-20 text-gray-500">로딩 중...</div>
      </>
    );
  }

  const isIncidentType = INCIDENT_WORK_TYPES.includes(form.work_type);

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
    }
    if (name === 'service_type') {
      setForm((prev) => ({ ...prev, product_type: '' }));
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      ...form,
      project_id: parseInt(form.project_id),
      contact_id: parseInt(form.contact_id),
    };

    if (isIncidentType && incident) {
      payload.incident = incident;
    }

    updateMutation.mutate(payload);
  };

  return (
    <>
      <Header title="작업 로그 수정" />
      <div className="mt-6 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

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

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">작업 분류</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField label="작업 유형" name="work_type" value={form.work_type} options={WORK_TYPES} onChange={handleChange} />
              <SelectField label="지원 구분" name="supprt_type" value={form.supprt_type} options={SUPPORT_TYPES} onChange={handleChange} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품 유형 *</label>
                <select name="service_type" value={form.service_type} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">선택하세요</option>
                  {serviceTypes.length > 0
                    ? serviceTypes.map((t) => <option key={t} value={t}>{t}</option>)
                    : ['DB', 'WEB/WAS', 'OS', '네트워크', '보안', '클라우드', '기타'].map((t) => <option key={t} value={t}>{t}</option>)
                  }
                  {/* 기존 값이 목록에 없을 경우 유지 */}
                  {form.service_type && !serviceTypes.includes(form.service_type) && (
                    <option value={form.service_type}>{form.service_type}</option>
                  )}
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
                    : null
                  }
                  {/* 기존 값이 목록에 없을 경우 유지 */}
                  {form.product_type && !availableProducts.some(p => p.product_name === form.product_type) && (
                    <option value={form.product_type}>{form.product_type}</option>
                  )}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">제품 버전 *</label>
                <input type="text" name="product_version" value={form.product_version} onChange={handleChange} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
          </div>

          {isIncidentType && (
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
              <h3 className="text-lg font-semibold text-red-700 mb-4">🚨 장애 상세 정보</h3>
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

          <div className="flex items-center gap-3">
            <button type="submit" disabled={updateMutation.isPending}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {updateMutation.isPending ? '수정 중...' : '수정 완료'}
            </button>
            <button type="button" onClick={() => navigate(`/work/${id}`)}
              className="bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-300 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function SelectField({ label, name, value, options, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label} *</label>
      <select name={name} value={value} onChange={onChange} required
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
        <option value="">선택하세요</option>
        {options.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  );
}
