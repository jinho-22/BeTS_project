import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import api from '../lib/axios';

const TABS = [
  { key: 'overview', label: '개요', icon: '📊' },
  { key: 'engineer', label: '엔지니어별', icon: '👨‍💻' },
  { key: 'department', label: '부서별', icon: '🏢' },
  { key: 'client', label: '고객사별', icon: '🏛️' },
  { key: 'incident', label: '장애 분석', icon: '🚨' },
];

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // 올해 1월 1일
    end_date: new Date().toISOString().split('T')[0],
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['statistics-detailed', dateRange],
    queryFn: async () => {
      const { data } = await api.get('/work/statistics/detailed', { params: dateRange });
      return data.data;
    },
  });

  const setQuickRange = (type) => {
    const now = new Date();
    let start;
    switch (type) {
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'half':
        start = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    setDateRange({
      start_date: start.toISOString().split('T')[0],
      end_date: now.toISOString().split('T')[0],
    });
  };

  return (
    <>
      <Header title="통계 분석" />
      <div className="mt-6 space-y-4">
        {/* 기간 필터 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-gray-700">기간:</label>
            <input type="date" value={dateRange.start_date}
              onChange={(e) => setDateRange(p => ({ ...p, start_date: e.target.value }))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-gray-400">~</span>
            <input type="date" value={dateRange.end_date}
              onChange={(e) => setDateRange(p => ({ ...p, end_date: e.target.value }))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-1 ml-2">
              {[
                { type: 'month', label: '이번 달' },
                { type: 'quarter', label: '이번 분기' },
                { type: 'half', label: '반기' },
                { type: 'year', label: '올해' },
              ].map(({ type, label }) => (
                <button key={type} onClick={() => setQuickRange(type)}
                  className="px-2.5 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 flex overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="text-center py-16 text-gray-500">
                <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p>통계 데이터를 불러오는 중...</p>
              </div>
            ) : stats ? (
              <>
                {activeTab === 'overview' && <OverviewTab stats={stats} />}
                {activeTab === 'engineer' && <EngineerTab data={stats.byEngineer} />}
                {activeTab === 'department' && <DepartmentTab data={stats.byDepartment} />}
                {activeTab === 'client' && <ClientTab data={stats.byClient} />}
                {activeTab === 'incident' && <IncidentTab data={stats.clientIncidents} />}
              </>
            ) : (
              <div className="text-center py-16 text-gray-400">데이터가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   개요 탭
   ═══════════════════════════════════════════════ */
function OverviewTab({ stats }) {
  const { overview, monthlyTrend } = stats;
  if (!overview) return null;

  const summaryCards = [
    { label: '전체 작업', value: overview.total, icon: '📋', color: 'blue' },
    { label: '정기점검', value: overview.type_regular, icon: '🔧', color: 'green' },
    { label: '장애지원', value: overview.type_incident, icon: '🚨', color: 'red' },
    { label: '기술지원', value: overview.type_tech, icon: '💡', color: 'purple' },
    { label: '기타', value: overview.type_etc, icon: '📌', color: 'gray' },
  ];

  const statusCards = [
    { label: '등록', value: overview.status_registered, color: 'bg-blue-500' },
    { label: '관리자확인', value: overview.status_checked, color: 'bg-yellow-500' },
    { label: '승인완료', value: overview.status_approved, color: 'bg-green-500' },
  ];

  const maxTrend = Math.max(...(monthlyTrend?.map(m => m.total) || [1]), 1);

  return (
    <div className="space-y-6">
      {/* 작업 유형별 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryCards.map(card => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 상태별 현황 */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">상태별 현황</h4>
          <div className="space-y-3">
            {statusCards.map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${item.color} shrink-0`}></span>
                <span className="text-sm text-gray-600 w-20">{item.label}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-5 overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all flex items-center justify-end pr-2`}
                    style={{ width: `${overview.total ? Math.max((item.value / overview.total * 100), item.value > 0 ? 12 : 0) : 0}%` }}>
                    {item.value > 0 && <span className="text-white text-xs font-bold">{item.value}</span>}
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-800 w-10 text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 작업유형 비율 */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">작업 유형 비율</h4>
          {overview.total > 0 ? (
            <div className="space-y-3">
              {[
                { label: '정기점검', value: overview.type_regular, color: 'bg-green-500' },
                { label: '장애지원', value: overview.type_incident, color: 'bg-red-500' },
                { label: '기술지원', value: overview.type_tech, color: 'bg-purple-500' },
                { label: '기타', value: overview.type_etc, color: 'bg-gray-400' },
              ].filter(i => i.value > 0).map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${item.color} shrink-0`}></span>
                  <span className="text-sm text-gray-600 w-16">{item.label}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-5 overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max((item.value / overview.total * 100), 12)}%` }}>
                      <span className="text-white text-xs font-bold">{Math.round(item.value / overview.total * 100)}%</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-10 text-right">{item.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
          )}
        </div>
      </div>

      {/* 월별 추이 (바 차트) */}
      {monthlyTrend && monthlyTrend.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">월별 작업 추이 (최근 6개월)</h4>
          <div className="flex items-end gap-2 h-48">
            {monthlyTrend.map(m => (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="w-full flex flex-col items-center justify-end flex-1">
                  <span className="text-xs font-bold text-gray-700 mb-1">{m.total}</span>
                  <div className="w-full flex flex-col gap-0.5" style={{ height: `${Math.max((m.total / maxTrend * 100), 4)}%` }}>
                    {m.regular_check > 0 && (
                      <div className="bg-green-500 rounded-t" style={{ flex: m.regular_check }} title={`정기점검: ${m.regular_check}`}></div>
                    )}
                    {m.incident_support > 0 && (
                      <div className="bg-red-500" style={{ flex: m.incident_support }} title={`장애지원: ${m.incident_support}`}></div>
                    )}
                    {m.tech_support > 0 && (
                      <div className="bg-purple-500" style={{ flex: m.tech_support }} title={`기술지원: ${m.tech_support}`}></div>
                    )}
                    {(m.total - m.regular_check - m.incident_support - m.tech_support) > 0 && (
                      <div className="bg-gray-400 rounded-b" style={{ flex: m.total - m.regular_check - m.incident_support - m.tech_support }}></div>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500 mt-2">{m.month.slice(5)}월</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 justify-center mt-4">
            <Legend color="bg-green-500" label="정기점검" />
            <Legend color="bg-red-500" label="장애지원" />
            <Legend color="bg-purple-500" label="기술지원" />
            <Legend color="bg-gray-400" label="기타" />
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   엔지니어별 탭
   ═══════════════════════════════════════════════ */
function EngineerTab({ data }) {
  if (!data || data.length === 0) return <EmptyState message="엔지니어 통계 데이터가 없습니다." />;

  const maxTotal = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="space-y-6">
      {/* 퍼포먼스 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.slice(0, 4).map((eng, idx) => (
          <div key={eng.user_id} className={`rounded-xl p-4 ${idx === 0 ? 'bg-gradient-to-br from-yellow-50 to-amber-100 border-2 border-amber-200' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅'}</span>
              <div>
                <p className="text-sm font-bold text-gray-800">{eng.user_name}</p>
                <p className="text-xs text-gray-500">{eng.dept_name || '-'}</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{eng.total}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
            <p className="text-xs text-gray-500 mt-1">{eng.total_hours}시간 투입</p>
          </div>
        ))}
      </div>

      {/* 상세 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">엔지니어</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">부서</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">전체</th>
              <th className="text-center py-3 px-3 font-semibold text-green-600">정기점검</th>
              <th className="text-center py-3 px-3 font-semibold text-red-600">장애지원</th>
              <th className="text-center py-3 px-3 font-semibold text-purple-600">기술지원</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-500">기타</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">투입시간</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 w-40">비율</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(eng => (
              <tr key={eng.user_id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-800">{eng.user_name}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{eng.dept_name || '-'}</td>
                <td className="py-3 px-3 text-center font-bold text-gray-900">{eng.total}</td>
                <td className="py-3 px-3 text-center"><CountBadge value={eng.regular_check} color="green" /></td>
                <td className="py-3 px-3 text-center"><CountBadge value={eng.incident_support} color="red" /></td>
                <td className="py-3 px-3 text-center"><CountBadge value={eng.tech_support} color="purple" /></td>
                <td className="py-3 px-3 text-center"><CountBadge value={eng.etc_work} color="gray" /></td>
                <td className="py-3 px-3 text-center text-gray-600">{eng.total_hours}h</td>
                <td className="py-3 px-4">
                  <StackedBar
                    values={[
                      { value: eng.regular_check, color: 'bg-green-500' },
                      { value: eng.incident_support, color: 'bg-red-500' },
                      { value: eng.tech_support, color: 'bg-purple-500' },
                      { value: eng.etc_work, color: 'bg-gray-400' },
                    ]}
                    total={eng.total}
                    maxTotal={maxTotal}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   부서별 탭
   ═══════════════════════════════════════════════ */
function DepartmentTab({ data }) {
  if (!data || data.length === 0) return <EmptyState message="부서 통계 데이터가 없습니다." />;

  const maxTotal = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="space-y-6">
      {/* 부서 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.map(dept => (
          <div key={dept.dept_id} className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-800">{dept.dept_name}</h4>
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">
                {dept.engineer_count}명
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center mb-3">
              <div>
                <p className="text-lg font-bold text-gray-900">{dept.total}</p>
                <p className="text-xs text-gray-500">전체</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{dept.regular_check}</p>
                <p className="text-xs text-gray-500">정기점검</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">{dept.incident_support}</p>
                <p className="text-xs text-gray-500">장애지원</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 flex justify-between">
              <span>기술지원 {dept.tech_support}건</span>
              <span>기타 {dept.etc_work}건</span>
              <span>{dept.total_hours}시간</span>
            </div>
            {/* 1인당 평균 */}
            {dept.engineer_count > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  1인 평균: <span className="font-bold text-gray-700">{Math.round(dept.total / dept.engineer_count * 10) / 10}건</span>
                  <span className="mx-1">·</span>
                  <span className="font-bold text-gray-700">{Math.round(dept.total_hours / dept.engineer_count * 10) / 10}시간</span>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 상세 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">부서</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">인원</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">전체</th>
              <th className="text-center py-3 px-3 font-semibold text-green-600">정기점검</th>
              <th className="text-center py-3 px-3 font-semibold text-red-600">장애지원</th>
              <th className="text-center py-3 px-3 font-semibold text-purple-600">기술지원</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-500">기타</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">투입시간</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">1인 평균</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 w-40">비율</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(dept => (
              <tr key={dept.dept_id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-800">{dept.dept_name}</td>
                <td className="py-3 px-3 text-center text-gray-500">{dept.engineer_count}명</td>
                <td className="py-3 px-3 text-center font-bold text-gray-900">{dept.total}</td>
                <td className="py-3 px-3 text-center"><CountBadge value={dept.regular_check} color="green" /></td>
                <td className="py-3 px-3 text-center"><CountBadge value={dept.incident_support} color="red" /></td>
                <td className="py-3 px-3 text-center"><CountBadge value={dept.tech_support} color="purple" /></td>
                <td className="py-3 px-3 text-center"><CountBadge value={dept.etc_work} color="gray" /></td>
                <td className="py-3 px-3 text-center text-gray-600">{dept.total_hours}h</td>
                <td className="py-3 px-3 text-center text-gray-600">
                  {dept.engineer_count > 0 ? Math.round(dept.total / dept.engineer_count * 10) / 10 : '-'}
                </td>
                <td className="py-3 px-4">
                  <StackedBar
                    values={[
                      { value: dept.regular_check, color: 'bg-green-500' },
                      { value: dept.incident_support, color: 'bg-red-500' },
                      { value: dept.tech_support, color: 'bg-purple-500' },
                      { value: dept.etc_work, color: 'bg-gray-400' },
                    ]}
                    total={dept.total}
                    maxTotal={maxTotal}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   고객사별 탭
   ═══════════════════════════════════════════════ */
function ClientTab({ data }) {
  if (!data || data.length === 0) return <EmptyState message="고객사 통계 데이터가 없습니다." />;

  const maxTotal = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="space-y-6">
      {/* 상위 고객사 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.slice(0, 4).map((client, idx) => (
          <div key={client.client_id} className={`rounded-xl p-4 ${idx === 0 ? 'bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-indigo-200' : 'bg-gray-50'}`}>
            <p className="text-sm font-bold text-gray-800 mb-1 truncate">{client.client_name}</p>
            <p className="text-2xl font-bold text-gray-900">{client.total}<span className="text-sm font-normal text-gray-400 ml-1">건</span></p>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span>점검 <strong className="text-green-600">{client.regular_check}</strong></span>
              <span>장애 <strong className="text-red-600">{client.incident_support}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* 상세 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">고객사</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">전체</th>
              <th className="text-center py-3 px-3 font-semibold text-green-600">정기점검</th>
              <th className="text-center py-3 px-3 font-semibold text-red-600">장애지원</th>
              <th className="text-center py-3 px-3 font-semibold text-purple-600">기술지원</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-500">기타</th>
              <th className="text-center py-3 px-3 font-semibold text-gray-600">투입시간</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600 w-40">비율</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(client => (
              <tr key={client.client_id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-800">{client.client_name}</td>
                <td className="py-3 px-3 text-center font-bold text-gray-900">{client.total}</td>
                <td className="py-3 px-3 text-center"><CountBadge value={client.regular_check} color="green" /></td>
                <td className="py-3 px-3 text-center"><CountBadge value={client.incident_support} color="red" /></td>
                <td className="py-3 px-3 text-center"><CountBadge value={client.tech_support} color="purple" /></td>
                <td className="py-3 px-3 text-center"><CountBadge value={client.etc_work} color="gray" /></td>
                <td className="py-3 px-3 text-center text-gray-600">{client.total_hours}h</td>
                <td className="py-3 px-4">
                  <StackedBar
                    values={[
                      { value: client.regular_check, color: 'bg-green-500' },
                      { value: client.incident_support, color: 'bg-red-500' },
                      { value: client.tech_support, color: 'bg-purple-500' },
                      { value: client.etc_work, color: 'bg-gray-400' },
                    ]}
                    total={client.total}
                    maxTotal={maxTotal}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   장애 분석 탭
   ═══════════════════════════════════════════════ */
function IncidentTab({ data }) {
  if (!data || data.length === 0) return <EmptyState message="장애 분석 데이터가 없습니다." />;

  // 전체 장애 통계 요약
  const allIncidents = data.flatMap(c => c.incidents);
  const totalIncidents = allIncidents.reduce((s, i) => s + i.count, 0);
  const totalRecurrence = allIncidents.reduce((s, i) => s + i.recurrence_count, 0);

  // 영향도별 집계
  const bySeverity = {};
  allIncidents.forEach(i => {
    if (!bySeverity[i.severity]) bySeverity[i.severity] = 0;
    bySeverity[i.severity] += i.count;
  });

  // 원인분류별 집계
  const byCause = {};
  allIncidents.forEach(i => {
    if (!byCause[i.cause_type]) byCause[i.cause_type] = 0;
    byCause[i.cause_type] += i.count;
  });
  const causeEntries = Object.entries(byCause).sort((a, b) => b[1] - a[1]);

  const severityColors = {
    'Critical': { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50' },
    'Major': { bg: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50' },
    'Minor': { bg: 'bg-yellow-500', text: 'text-yellow-700', light: 'bg-yellow-50' },
  };

  return (
    <div className="space-y-6">
      {/* 장애 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-xs text-red-600 font-medium">총 장애 건수</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{totalIncidents}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <p className="text-xs text-orange-600 font-medium">재발 장애</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{totalRecurrence}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">영향 고객사</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{data.length}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-600 font-medium">원인 유형</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{causeEntries.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 영향도별 현황 */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">영향도별 현황</h4>
          <div className="space-y-3">
            {['Critical', 'Major', 'Minor'].map(severity => {
              const count = bySeverity[severity] || 0;
              const sc = severityColors[severity];
              return (
                <div key={severity} className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${sc.light} ${sc.text} w-20 justify-center`}>
                    {severity}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-5 overflow-hidden">
                    <div className={`h-full ${sc.bg} rounded-full transition-all flex items-center justify-end pr-2`}
                      style={{ width: `${totalIncidents ? Math.max((count / totalIncidents * 100), count > 0 ? 12 : 0) : 0}%` }}>
                      {count > 0 && <span className="text-white text-xs font-bold">{count}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 원인분류별 현황 */}
        <div className="bg-gray-50 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">원인 분류별 현황</h4>
          <div className="space-y-2">
            {causeEntries.length > 0 ? causeEntries.map(([cause, count]) => {
              const causeColors = ['bg-blue-500', 'bg-indigo-500', 'bg-teal-500', 'bg-pink-500', 'bg-cyan-500', 'bg-lime-500'];
              const color = causeColors[causeEntries.findIndex(([c]) => c === cause) % causeColors.length];
              return (
                <div key={cause} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24 truncate" title={cause}>{cause}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`}
                      style={{ width: `${totalIncidents ? Math.max((count / totalIncidents * 100), 8) : 0}%` }}></div>
                  </div>
                  <span className="text-sm font-bold text-gray-800 w-8 text-right">{count}</span>
                </div>
              );
            }) : (
              <p className="text-sm text-gray-400 text-center py-4">데이터 없음</p>
            )}
          </div>
        </div>
      </div>

      {/* 고객사별 장애 상세 */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">고객사별 장애 상세</h4>
        <div className="space-y-3">
          {data.map(client => (
            <div key={client.client_id} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-bold text-gray-800">{client.client_name}</h5>
                <span className="text-sm text-red-600 font-medium">
                  {client.incidents.reduce((s, i) => s + i.count, 0)}건
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {client.incidents.map((inc, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        severityColors[inc.severity]?.light || 'bg-gray-100'
                      } ${severityColors[inc.severity]?.text || 'text-gray-600'}`}>
                        {inc.severity}
                      </span>
                      <span className="text-sm text-gray-700">{inc.cause_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800">{inc.count}건</span>
                      {inc.recurrence_count > 0 && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded font-medium">재발 {inc.recurrence_count}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   공통 컴포넌트
   ═══════════════════════════════════════════════ */
function SummaryCard({ label, value, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    red: 'bg-red-50 border-red-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
    gray: 'bg-gray-50 border-gray-200',
  };
  const textColor = {
    blue: 'text-blue-700', green: 'text-green-700', red: 'text-red-700',
    purple: 'text-purple-700', orange: 'text-orange-700', gray: 'text-gray-700',
  };

  return (
    <div className={`rounded-xl p-4 border ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${textColor[color]}`}>{value || 0}</p>
    </div>
  );
}

function CountBadge({ value, color }) {
  if (!value) return <span className="text-gray-300">-</span>;
  const colors = {
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
    gray: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 rounded-full text-xs font-bold ${colors[color]}`}>
      {value}
    </span>
  );
}

function StackedBar({ values, total, maxTotal }) {
  if (!total) return <div className="w-full bg-gray-100 rounded-full h-3"></div>;
  const widthPercent = (total / maxTotal) * 100;

  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div className="h-full flex" style={{ width: `${widthPercent}%` }}>
        {values.filter(v => v.value > 0).map((v, i) => (
          <div key={i} className={`h-full ${v.color}`}
            style={{ width: `${(v.value / total) * 100}%` }}
            title={`${v.value}건`}
          ></div>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-sm ${color}`}></span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg">📊</p>
      <p className="text-gray-500 mt-2">{message}</p>
      <p className="text-sm text-gray-400 mt-1">기간을 변경하거나 작업 로그를 등록해주세요.</p>
    </div>
  );
}
