import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import Icon from '../components/common/Icons';
import api from '../lib/axios';
import { useAuthStore } from '../stores/authStore';

export default function WorkLogDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: log, isLoading } = useQuery({
    queryKey: ['workLog', id],
    queryFn: async () => {
      const { data } = await api.get(`/work/${id}`);
      return data.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const { data } = await api.patch(`/work/${id}/status`, { status: newStatus });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workLog', id] });
      queryClient.invalidateQueries({ queryKey: ['workLogs'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/work/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workLogs'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      navigate('/work');
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId) => {
      await api.delete(`/work/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workLog', id] });
    },
  });

  const handleDownload = async (fileId, originalName) => {
    try {
      const response = await api.get(`/work/files/${fileId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('파일 다운로드에 실패했습니다.');
    }
  };

  const handleDeleteFile = (fileId, fileName) => {
    if (window.confirm(`'${fileName}' 파일을 삭제하시겠습니까?`)) {
      deleteFileMutation.mutate(fileId);
    }
  };

  const handleStatusChange = (newStatus) => {
    if (window.confirm(`상태를 '${newStatus}'(으)로 변경하시겠습니까?`)) {
      statusMutation.mutate(newStatus);
    }
  };

  const handleDelete = () => {
    if (window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      deleteMutation.mutate();
    }
  };

  const isManager = user?.role === 'admin' || user?.role === 'manager';
  const isOwner = user?.user_id === log?.user_id;

  if (isLoading) {
    return (
      <>
        <Header title="작업 내역 상세" />
        <div className="mt-6 text-center py-20 text-gray-500">로딩 중...</div>
      </>
    );
  }

  if (!log) {
    return (
      <>
        <Header title="작업 내역 상세" />
        <div className="mt-6 text-center py-20 text-gray-500">작업 내역을 찾을 수 없습니다.</div>
      </>
    );
  }

  return (
    <>
      <Header title="작업 내역 상세" />
      <div className="mt-6 max-w-4xl space-y-6">
        {/* 제목 영역 */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <StatusBadge status={log.status} />
            <span className="text-sm text-gray-500">#{log.log_id}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{log.title || '(제목 없음)'}</h2>
        </div>

        {/* 상단 액션 바 */}
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            {/* 상태 변경 버튼 (관리자/매니저) */}
            {isManager && log.status === '등록' && (
              <button onClick={() => handleStatusChange('관리자확인')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
                관리자 확인
              </button>
            )}
            {isManager && log.status === '관리자확인' && (
              <>
                <button onClick={() => handleStatusChange('승인완료')}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                  승인 완료
                </button>
                <button onClick={() => handleStatusChange('등록')}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors">
                  반려
                </button>
              </>
            )}
            {/* 수정/삭제 (본인 작성 + 등록 상태) */}
            {(isOwner || isManager) && log.status === '등록' && (
              <>
                <Link to={`/work/${id}/edit`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  수정
                </Link>
                <button onClick={handleDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
                  삭제
                </button>
              </>
            )}
            <button onClick={() => navigate('/work')}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
              목록
            </button>
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">기본 정보</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InfoItem label="담당 엔지니어" value={`${log.user?.name} (${log.user?.position || ''})`} />
            <InfoItem label="부서" value={log.user?.department?.dept_name} />
            <InfoItem label="프로젝트" value={log.project?.project_name} />
            <InfoItem label="고객사" value={log.project?.client?.client_name} />
            <InfoItem label="요청자" value={log.contact ? `${log.contact.name} (${log.contact.phone})` : '-'} />
            <InfoItem label="작업 기간" value={`${formatDate(log.work_start)} ~ ${formatDate(log.work_end)}`} />
          </dl>
        </div>

        {/* 작업 분류 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">작업 분류</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InfoItem label="작업 유형" value={log.work_type} />
            <InfoItem label="지원 구분" value={log.supprt_type} />
            <InfoItem label="서비스 유형" value={log.service_type} />
            <InfoItem label="제품" value={`${log.product_type} ${log.product_version}`} />
          </dl>
        </div>

        {/* 장애 상세 */}
        {log.incident && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
              <Icon name="alert" size={18} className="text-red-600" />
              장애 상세
            </h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <InfoItem label="영향도" value={<SeverityBadge severity={log.incident.severity} />} />
              <InfoItem label="조치 유형" value={log.incident.action_type} />
              <InfoItem label="장애 발생" value={formatDate(log.incident.start_time)} />
              <InfoItem label="장애 복구" value={formatDate(log.incident.end_time)} />
              <InfoItem label="원인 분류" value={log.incident.cause_type} />
              <InfoItem label="재발 여부" value={log.incident.is_recurrence === 'Y' ? '예' : '아니오'} />
            </dl>
          </div>
        )}

        {/* 상세 내용 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">상세 작업 내용</h3>
          <div className="prose max-w-none text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
            {log.details}
          </div>
        </div>

        {/* 첨부 파일 */}
        {log.files && log.files.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">첨부 파일</h3>
            <ul className="space-y-2">
              {log.files.map((file) => (
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
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDownload(file.file_id, file.original_name)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                      다운로드
                    </button>
                    {(isOwner || isManager) && log.status === '등록' && (
                      <button onClick={() => handleDeleteFile(file.file_id, file.original_name)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium">
                        삭제
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 메타 정보 */}
        <div className="text-xs text-gray-400 flex gap-4">
          <span>등록일: {formatDate(log.created_at)}</span>
          <span>수정일: {formatDate(log.updated_at)}</span>
        </div>
      </div>
    </>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 mb-0.5">{label}</dt>
      <dd className="text-sm text-gray-900">{value || '-'}</dd>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    '등록': 'bg-blue-100 text-blue-800',
    '관리자확인': 'bg-yellow-100 text-yellow-800',
    '승인완료': 'bg-green-100 text-green-800',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }) {
  const styles = {
    'Critical': 'bg-red-100 text-red-800',
    'Major': 'bg-orange-100 text-orange-800',
    'Minor': 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[severity] || 'bg-gray-100 text-gray-800'}`}>
      {severity}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}
