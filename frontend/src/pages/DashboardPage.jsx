import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Icon from '../components/common/Icons';
import api from '../lib/axios';
import { useAuthStore } from '../stores/authStore';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // 내 작업 전체 건수
  const { data: totalData } = useQuery({
    queryKey: ['workLogs', 'myTotal', user?.user_id],
    queryFn: async () => {
      const { data } = await api.get('/work', { params: { user_id: user?.user_id, limit: 1 } });
      return data;
    },
    enabled: !!user?.user_id,
  });

  // 상태별 건수 (등록)
  const { data: registeredData } = useQuery({
    queryKey: ['workLogs', 'myStatus', user?.user_id, '등록'],
    queryFn: async () => {
      const { data } = await api.get('/work', { params: { user_id: user?.user_id, status: '등록', limit: 1 } });
      return data;
    },
    enabled: !!user?.user_id,
  });

  // 상태별 건수 (관리자확인)
  const { data: checkedData } = useQuery({
    queryKey: ['workLogs', 'myStatus', user?.user_id, '관리자확인'],
    queryFn: async () => {
      const { data } = await api.get('/work', { params: { user_id: user?.user_id, status: '관리자확인', limit: 1 } });
      return data;
    },
    enabled: !!user?.user_id,
  });

  // 상태별 건수 (승인완료)
  const { data: approvedData } = useQuery({
    queryKey: ['workLogs', 'myStatus', user?.user_id, '승인완료'],
    queryFn: async () => {
      const { data } = await api.get('/work', { params: { user_id: user?.user_id, status: '승인완료', limit: 1 } });
      return data;
    },
    enabled: !!user?.user_id,
  });

  // 최근 내 작업 내역 (10건)
  const { data: workLogs, isLoading } = useQuery({
    queryKey: ['workLogs', 'myRecent', user?.user_id],
    queryFn: async () => {
      const { data } = await api.get('/work', { params: { user_id: user?.user_id, limit: 10 } });
      return data;
    },
    enabled: !!user?.user_id,
  });

  return (
    <>
      <Header title="대시보드" />
      <div className="mt-6 space-y-6">
        {/* 환영 메시지 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
          <h3 className="text-lg font-semibold">안녕하세요, {user?.name}님</h3>
          <p className="mt-1 text-blue-100">오늘의 작업 현황을 확인하세요.</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="전체 작업"
            value={totalData?.pagination?.total ?? '-'}
            icon="clipboard"
            color="blue"
            onClick={() => navigate(`/work?user_id=${user?.user_id}`)}
          />
          <StatCard
            title="등록"
            value={registeredData?.pagination?.total ?? '-'}
            icon="memo"
            color="yellow"
            onClick={() => navigate(`/work?user_id=${user?.user_id}&status=${encodeURIComponent('등록')}`)}
          />
          <StatCard
            title="관리자확인"
            value={checkedData?.pagination?.total ?? '-'}
            icon="eye"
            color="purple"
            onClick={() => navigate(`/work?user_id=${user?.user_id}&status=${encodeURIComponent('관리자확인')}`)}
          />
          <StatCard
            title="승인완료"
            value={approvedData?.pagination?.total ?? '-'}
            icon="check"
            color="green"
            onClick={() => navigate(`/work?user_id=${user?.user_id}&status=${encodeURIComponent('승인완료')}`)}
          />
        </div>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Link to="/work/new" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors shrink-0">
                <Icon name="memo" size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">새 작업 등록</p>
                <p className="text-xs text-gray-500">작업 내역을 기록합니다</p>
              </div>
            </div>
          </Link>
          <Link to="/clients" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors shrink-0">
                <Icon name="building" size={20} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">고객사/프로젝트 관리</p>
                <p className="text-xs text-gray-500">고객사 및 프로젝트 관리</p>
              </div>
            </div>
          </Link>
          <Link to="/work" className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors shrink-0">
                <Icon name="clipboard" size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">작업 내역 조회</p>
                <p className="text-xs text-gray-500">등록된 작업 내역을 검색합니다</p>
              </div>
            </div>
          </Link>
        </div>

        {/* 최근 작업 내역 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800">최근 작업 내역</h3>
            <Link to="/work" className="text-sm text-blue-600 hover:text-blue-800">전체 보기 →</Link>
          </div>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : workLogs?.data?.length > 0 ? (
            <>
              {/* 모바일: 카드 레이아웃 */}
              <div className="sm:hidden space-y-3">
                {workLogs.data.map((log) => (
                  <div key={log.log_id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer active:bg-gray-100"
                    onClick={() => navigate(`/work/${log.log_id}`)}>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="font-medium text-sm text-gray-800 line-clamp-1">{log.project?.project_name || '-'}</p>
                      <StatusBadge status={log.status} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{new Date(log.work_start).toLocaleDateString('ko-KR')}</span>
                      <span className="text-gray-300">|</span>
                      <span>{log.work_type}</span>
                      <span className="text-gray-300">|</span>
                      <span>{log.product_type}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* 데스크톱: 테이블 레이아웃 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">날짜</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">프로젝트</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">작업유형</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">제품</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">상태</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {workLogs.data.map((log) => (
                      <tr key={log.log_id} className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/work/${log.log_id}`)}>
                        <td className="py-3 px-4">
                          {new Date(log.work_start).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="py-3 px-4">{log.project?.project_name || '-'}</td>
                        <td className="py-3 px-4">{log.work_type}</td>
                        <td className="py-3 px-4">{log.product_type}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={log.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">등록된 작업 내역이 없습니다.</p>
              <Link to="/work/new" className="text-blue-600 hover:underline text-sm">
                첫 번째 작업을 등록해 보세요 →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, icon, color, onClick }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  };

  const baseClass = 'bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 flex items-center gap-3 sm:gap-4';
  const clickableClass = onClick
    ? ' cursor-pointer hover:border-blue-300 hover:shadow-md transition-all text-left w-full'
    : '';

  const content = (
    <>
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClasses[color]}`}>
        <Icon name={icon} size={20} className="sm:hidden" />
        <Icon name={icon} size={24} className="hidden sm:block" />
      </div>
      <div>
        <p className="text-xs sm:text-sm text-gray-500">{title}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={baseClass + clickableClass}>
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}

function StatusBadge({ status }) {
  const styles = {
    '등록': 'bg-blue-100 text-blue-800',
    '관리자확인': 'bg-yellow-100 text-yellow-800',
    '승인완료': 'bg-green-100 text-green-800',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
