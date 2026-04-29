import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/layout/Header';
import Icon from '../components/common/Icons';
import api from '../lib/axios';
import { useAuthStore } from '../stores/authStore';

export default function WorkLogListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const deptId = user?.role !== 'admin' ? user?.dept_id : undefined;
  const [page, setPage] = useState(1);

  // URL 파라미터로부터 user_id 필터 여부 확인 (대시보드에서 진입 시)
  const urlUserId = searchParams.get('user_id');
  const isMyWorkFilter = urlUserId && String(urlUserId) === String(user?.user_id);

  const [filters, setFilters] = useState({
    work_type: '',
    status: searchParams.get('status') || '',
    product_type: '',
    keyword: '',
    start_date: '',
    end_date: '',
    is_recurrence: '',
  });

  // URL 파라미터 변경 시 필터 동기화 (브라우저 뒤로가기/앞으로가기 대응)
  useEffect(() => {
    const status = searchParams.get('status') || '';
    setFilters((prev) => (prev.status === status ? prev : { ...prev, status }));
    setPage(1);
  }, [searchParams]);

  // '내 작업만' 체크박스 토글
  const toggleMyWorkFilter = (checked) => {
    if (checked) {
      searchParams.set('user_id', String(user?.user_id));
    } else {
      searchParams.delete('user_id');
    }
    setSearchParams(searchParams, { replace: true });
    setPage(1);
  };

  // 제품 마스터 데이터
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data } = await api.get('/products');
      return data.data;
    },
  });

  // 제품명 고유 목록
  const productNames = [...new Set(productsData?.map(p => p.product_name) || [])];

  const { data, isLoading } = useQuery({
    queryKey: ['workLogs', page, filters, deptId, urlUserId],
    queryFn: async () => {
      const params = { page, limit: 10, ...filters };
      if (deptId) params.dept_id = deptId;
      if (urlUserId) params.user_id = urlUserId;
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });
      const { data } = await api.get('/work', { params });
      return data;
    },
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // 작업 유형이 장애지원이 아니면 재발여부 필터 초기화
      if (key === 'work_type' && value !== '장애지원') {
        next.is_recurrence = '';
      }
      return next;
    });
    // status 필터는 URL과 동기화
    if (key === 'status') {
      if (value) searchParams.set('status', value);
      else searchParams.delete('status');
      setSearchParams(searchParams, { replace: true });
    }
    setPage(1);
  };

  return (
    <>
      <Header title="작업 내역" />
      <div className="mt-6 space-y-4">
        {/* 상단 액션 바 (새 작업 등록) */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            총 <span className="font-semibold text-gray-800">{data?.pagination?.total ?? 0}</span>건
          </p>
          <Link
            to="/work/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 작업 등록
          </Link>
        </div>

        {/* 필터 바 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <label className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm cursor-pointer transition-colors select-none ${
              isMyWorkFilter ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}>
              <input
                type="checkbox"
                checked={isMyWorkFilter}
                onChange={(e) => toggleMyWorkFilter(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium whitespace-nowrap">내 작업만</span>
            </label>
            <input
              type="text"
              placeholder="키워드 검색..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full sm:w-48"
              value={filters.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
            />
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1 sm:flex-none"
              value={filters.work_type}
              onChange={(e) => handleFilterChange('work_type', e.target.value)}
            >
              <option value="">작업 유형 전체</option>
              <option value="정기점검">정기점검</option>
              <option value="장애지원">장애지원</option>
              <option value="기술지원">기술지원</option>
              <option value="프로젝트 지원">프로젝트 지원</option>
              <option value="기타">기타</option>
            </select>
            {/* 재발여부: 장애지원 선택 시에만 활성화, 공간은 항상 예약 */}
            <select
              className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1 sm:flex-none transition-opacity ${
                filters.work_type === '장애지원'
                  ? 'border-gray-300 bg-white text-gray-700'
                  : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
              value={filters.is_recurrence}
              onChange={(e) => handleFilterChange('is_recurrence', e.target.value)}
              disabled={filters.work_type !== '장애지원'}
              title={filters.work_type !== '장애지원' ? '작업 유형을 장애지원으로 선택하면 활성화됩니다' : ''}
            >
              <option value="">재발여부 전체</option>
              <option value="Y">재발</option>
              <option value="N">최초 발생</option>
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1 sm:flex-none"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">상태 전체</option>
              <option value="등록">등록</option>
              <option value="관리자확인">관리자확인</option>
              <option value="승인완료">승인완료</option>
            </select>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm flex-1 sm:flex-none"
              value={filters.product_type}
              onChange={(e) => handleFilterChange('product_type', e.target.value)}
            >
              <option value="">제품 전체</option>
              {productNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input type="date" value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none" />
              <span className="text-gray-400 text-sm">~</span>
              <input type="date" value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none" />
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          ) : data?.data?.length > 0 ? (
            <>
              {/* 모바일: 카드 레이아웃 */}
              <div className="md:hidden divide-y divide-gray-100">
                {data.data.map((log) => (
                  <div key={log.log_id}
                    className="p-3 sm:p-4 hover:bg-blue-50 cursor-pointer active:bg-blue-100 transition-colors"
                    onClick={() => navigate(`/work/${log.log_id}`)}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-sm line-clamp-1">{log.title || '-'}</p>
                      <StatusBadge status={log.status} />
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{log.project?.client?.client_name || '-'} / {log.project?.project_name || '-'}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                      <span>{new Date(log.work_start).toLocaleDateString('ko-KR')}</span>
                      <span className="text-gray-300">|</span>
                      <span>{log.work_type}{log.sub_work_type ? ` + ${log.sub_work_type}` : ''}{log.incident ? ' ⚠' : ''}</span>
                      <span className="text-gray-300">|</span>
                      <span>{log.product_type}</span>
                      <span className="text-gray-300">|</span>
                      <span>{log.user?.name || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 데스크톱: 테이블 레이아웃 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-500 w-12">No</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">제목</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">작업유형</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">제품</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">고객사</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">프로젝트</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">엔지니어</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.data.map((log) => (
                      <tr key={log.log_id}
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/work/${log.log_id}`)}>
                        <td className="py-3 px-4 text-gray-400">{log.log_id}</td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{log.title || '-'}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-gray-400 text-xs">{new Date(log.work_start).toLocaleDateString('ko-KR')}</span>
                            <StatusBadge status={log.status} />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {log.work_type}
                          {log.sub_work_type && <span className="text-gray-400 text-xs ml-1">+ {log.sub_work_type}</span>}
                          {log.incident && <Icon name="alert" size={12} className="ml-1 text-red-500 inline-block" />}
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs">
                          {log.product_type}<br />{log.product_version}
                        </td>
                        <td className="py-3 px-4 text-sm">{log.project?.client?.client_name || '-'}</td>
                        <td className="py-3 px-4 text-sm">{log.project?.project_name || '-'}</td>
                        <td className="py-3 px-4 text-sm">{log.user?.name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {data.pagination && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-3 sm:p-4 border-t border-gray-200 gap-2">
                  <span className="text-xs sm:text-sm text-gray-500">
                    총 {data.pagination.total}건 중 {(page - 1) * 10 + 1}-
                    {Math.min(page * 10, data.pagination.total)}건
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    <span className="flex items-center px-3 text-sm text-gray-600">
                      {page} / {data.pagination.totalPages || 1}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= data.pagination.totalPages}
                      className="bg-gray-200 text-gray-700 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg mb-2">등록된 작업 내역이 없습니다.</p>
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
