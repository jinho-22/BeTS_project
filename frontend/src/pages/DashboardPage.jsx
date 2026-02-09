import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import api from '../lib/axios';
import { useAuthStore } from '../stores/authStore';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  const { data: workLogs, isLoading } = useQuery({
    queryKey: ['workLogs', 'recent'],
    queryFn: async () => {
      const { data } = await api.get('/work', { params: { limit: 10 } });
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['statistics', 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/work/statistics');
      return data.data;
    },
    enabled: isManager, // admin/manager만 통계 API 호출
    retry: false,       // 권한 에러 시 재시도 방지
  });

  // 상태별 건수 계산
  const getStatusCount = (status) => {
    if (!stats?.byStatus) return '-';
    const found = stats.byStatus.find((s) => s.status === status);
    return found ? Number(found.count) || 0 : 0;
  };

  return (
    <>
      <Header title="대시보드" />
      <div className="mt-6 space-y-6">
        {/* 환영 메시지 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
          <h3 className="text-lg font-semibold">안녕하세요, {user?.name}님 👋</h3>
          <p className="mt-1 text-blue-100">오늘의 작업 현황을 확인하세요.</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="전체 작업"
            value={stats?.totalCount ?? workLogs?.pagination?.total ?? '-'}
            icon="📋" color="blue"
          />
          <StatCard title="등록" value={getStatusCount('등록')} icon="📝" color="yellow" />
          <StatCard title="관리자확인" value={getStatusCount('관리자확인')} icon="👀" color="purple" />
          <StatCard title="승인완료" value={getStatusCount('승인완료')} icon="✅" color="green" />
        </div>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/work/new" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-lg group-hover:bg-blue-200 transition-colors">📝</div>
              <div>
                <p className="font-medium text-gray-800">새 작업 등록</p>
                <p className="text-xs text-gray-500">작업 내역을 기록합니다</p>
              </div>
            </div>
          </Link>
          <Link to="/projects" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-lg group-hover:bg-green-200 transition-colors">📁</div>
              <div>
                <p className="font-medium text-gray-800">프로젝트 관리</p>
                <p className="text-xs text-gray-500">프로젝트 및 담당자 관리</p>
              </div>
            </div>
          </Link>
          <Link to="/work" className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-lg group-hover:bg-purple-200 transition-colors">📋</div>
              <div>
                <p className="font-medium text-gray-800">작업 내역 조회</p>
                <p className="text-xs text-gray-500">등록된 작업 내역을 검색합니다</p>
              </div>
            </div>
          </Link>
        </div>

        {/* 최근 작업 로그 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">최근 작업 내역</h3>
            <Link to="/work" className="text-sm text-blue-600 hover:text-blue-800">전체 보기 →</Link>
          </div>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : workLogs?.data?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">날짜</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">엔지니어</th>
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
                      <td className="py-3 px-4">{log.user?.name || '-'}</td>
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

function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
