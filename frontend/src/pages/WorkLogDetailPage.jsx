import { useState } from 'react';
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
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const { data: log, isLoading } = useQuery({
    queryKey: ['workLog', id],
    queryFn: async () => {
      const { data } = await api.get(`/work/${id}`);
      return data.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ status, comment }) => {
      const { data } = await api.patch(`/work/${id}/status`, { status, comment });
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
      statusMutation.mutate({ status: newStatus });
    }
  };

  const handleReject = () => {
    if (!rejectComment.trim()) return;
    statusMutation.mutate({ status: '등록', comment: rejectComment.trim() }, {
      onSuccess: () => {
        setRejectModal(false);
        setRejectComment('');
      },
    });
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
                <button onClick={() => setRejectModal(true)}
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
            <InfoItem label="요청자" value={log.contact ? `${log.contact.name}${log.contact.company ? ` [${log.contact.company}]` : ''}${log.contact.phone ? ` (${log.contact.phone})` : ''}` : '-'} />
            <InfoItem label="작업 기간" value={`${formatDate(log.work_start)} ~ ${formatDate(log.work_end)}`} />
          </dl>
        </div>

        {/* 작업 분류 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">작업 분류</h3>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <InfoItem label="작업 유형" value={log.sub_work_type ? `${log.work_type} + ${log.sub_work_type.split(',').join(', ')}` : log.work_type} />
            <InfoItem label="지원 구분" value={log.support_type} />
          </dl>

          {/* 제품 리스트 (다중 제품 지원) */}
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">제품 정보 ({(log.products || []).length || 1}건)</p>
            <div className="space-y-2">
              {Array.isArray(log.products) && log.products.length > 0 ? (
                log.products.map((p, idx) => (
                  <div key={p.id || idx} className="flex items-center gap-2 flex-wrap p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                      {p.service_type}
                    </span>
                    <span className="font-medium text-gray-900">{p.product_type}</span>
                    <span className="text-gray-500">{p.product_version}</span>
                  </div>
                ))
              ) : (
                /* 레거시: products 배열이 없으면 단일 컬럼 사용 */
                <div className="flex items-center gap-2 flex-wrap p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                  {log.service_type && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                      {log.service_type}
                    </span>
                  )}
                  <span className="font-medium text-gray-900">{log.product_type}</span>
                  <span className="text-gray-500">{log.product_version}</span>
                </div>
              )}
            </div>
          </div>
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

        {/* 상태 변경 이력 (본인 + 관리자/매니저만 표시) */}
        {(isOwner || isManager) && log.comments && log.comments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">상태 변경 이력</h3>
            <div className="space-y-3">
              {log.comments
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((c) => (
                <div key={c.comment_id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                      c.action_type === '반려' ? 'bg-yellow-500' :
                      c.action_type === '승인완료' ? 'bg-green-500' : 'bg-purple-500'
                    }`}>
                      {c.action_type === '반려' ? '반' : c.action_type === '승인완료' ? '승' : '확'}
                    </div>
                    <div className="w-px flex-1 bg-gray-200 mt-1" />
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <ActionBadge type={c.action_type} />
                      <span className="text-sm font-medium text-gray-700">{c.author?.name || '알 수 없음'}</span>
                      <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                    </div>
                    {c.comment && (
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mt-1">{c.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 메타 정보 */}
        <div className="text-xs text-gray-400 flex gap-4">
          <span>등록일: {formatDate(log.created_at)}</span>
          <span>수정일: {formatDate(log.updated_at)}</span>
        </div>
      </div>

      {/* 반려 모달 */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-md p-5 sm:p-6 sm:mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">반려 사유 입력</h3>
            <p className="text-sm text-gray-500 mb-4">작성자에게 전달될 반려 사유를 입력하세요.</p>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="반려 사유를 입력하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
              rows={4}
              autoFocus
              maxLength={1000}
            />
            <p className="text-xs text-gray-400 mt-1 mb-4">{rejectComment.length}/1000자</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setRejectModal(false); setRejectComment(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">
                취소
              </button>
              <button onClick={handleReject}
                disabled={!rejectComment.trim() || statusMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {statusMutation.isPending ? '처리 중...' : '반려'}
              </button>
            </div>
          </div>
        </div>
      )}
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

function ActionBadge({ type }) {
  const styles = {
    '반려': 'bg-yellow-100 text-yellow-800',
    '승인완료': 'bg-green-100 text-green-800',
    '관리자확인': 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
      {type}
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
