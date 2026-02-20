import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Icon from '../components/common/Icons';
import api from '../lib/axios';
import { useAuthStore } from '../stores/authStore';

export default function WorkLogListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const deptId = user?.role !== 'admin' ? user?.dept_id : undefined;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    work_type: '',
    status: '',
    product_type: '',
    keyword: '',
    start_date: '',
    end_date: '',
  });

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
    queryKey: ['workLogs', page, filters, deptId],
    queryFn: async () => {
      const params = { page, limit: 20, ...filters };
      if (deptId) params.dept_id = deptId;
      Object.keys(params).forEach((key) => {
        if (!params[key]) delete params[key];
      });
      const { data } = await api.get('/work', { params });
      return data;
    },
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <>
      <Header title="작업 내역" />
      <div className="mt-6 space-y-4">
        {/* 필터 & 액션 바 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="키워드 검색..."
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-48"
            value={filters.keyword}
            onChange={(e) => handleFilterChange('keyword', e.target.value)}
          />
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">상태 전체</option>
            <option value="등록">등록</option>
            <option value="관리자확인">관리자확인</option>
            <option value="승인완료">승인완료</option>
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={filters.product_type}
            onChange={(e) => handleFilterChange('product_type', e.target.value)}
          >
            <option value="">제품 전체</option>
            {productNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <input type="date" value={filters.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-gray-400 text-sm">~</span>
          <input type="date" value={filters.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="ml-auto">
            <Link to="/work/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors inline-block">
              + 새 작업 등록
            </Link>
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">로딩 중...</div>
          ) : data?.data?.length > 0 ? (
            <>
              <div className="overflow-x-auto">
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
                <div className="flex items-center justify-between p-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    총 {data.pagination.total}건 중 {(page - 1) * 20 + 1}-
                    {Math.min(page * 20, data.pagination.total)}건
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    <span className="flex items-center px-3 text-sm text-gray-600">
                      {page} / {data.pagination.totalPages || 1}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= data.pagination.totalPages}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
