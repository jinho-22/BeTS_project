import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import Icon from '../components/common/Icons';
import api from '../lib/axios';

const TABS = [
  { key: 'project', label: '프로젝트별', icon: 'folder' },
  { key: 'engineer', label: '엔지니어별', icon: 'developer' },
  { key: 'department', label: '부서별', icon: 'building' },
];

const WORK_TYPES = [
  { key: 'regular_check', hoursKey: 'regular_check_hours', label: '정기점검', color: 'bg-green-500', text: 'text-green-700', light: 'bg-green-50', hex: '#22c55e' },
  { key: 'incident_support', hoursKey: 'incident_support_hours', label: '장애지원', color: 'bg-red-500', text: 'text-red-700', light: 'bg-red-50', hex: '#ef4444' },
  { key: 'tech_support', hoursKey: 'tech_support_hours', label: '기술지원', color: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', hex: '#a855f7' },
  { key: 'project_support', hoursKey: 'project_support_hours', label: '프로젝트 지원', color: 'bg-orange-500', text: 'text-orange-700', light: 'bg-orange-50', hex: '#f97316' },
  { key: 'etc_work', hoursKey: 'etc_work_hours', label: '기타', color: 'bg-gray-400', text: 'text-gray-600', light: 'bg-gray-50', hex: '#9ca3af' },
];

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState('project');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
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
        {/* 기간 필터 + 검색 */}
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
            <div className="ml-auto">
              <div className="relative">
                <Icon name="search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="검색..."
                  className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                />
              </div>
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
                <Icon name={tab.icon} size={16} />
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
                {activeTab === 'project' && <ProjectTab data={stats.byProject} searchQuery={searchQuery} />}
                {activeTab === 'engineer' && <EngineerTab data={stats.byEngineer} searchQuery={searchQuery} />}
                {activeTab === 'department' && <DepartmentTab data={stats.byDepartment} searchQuery={searchQuery} />}
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
   TAB 1. 프로젝트별 통계 (계약 준수 관점)
   ═══════════════════════════════════════════════ */
function ProjectTab({ data, searchQuery }) {
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(p =>
      p.project_name?.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  if (!data || data.length === 0) return <EmptyState message="프로젝트 통계 데이터가 없습니다." />;

  return (
    <div className="space-y-6">
      {/* 프로젝트 카드 리스트 */}
      <div className="space-y-2">
        {filtered.map(proj => {
          const isOpen = expandedId === proj.project_id;
          const hasAcs = proj.acs_contract_time != null;

          return (
            <div key={proj.project_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* 카드 헤더 */}
              <div
                className="cursor-pointer hover:bg-gray-50 transition-colors px-5 py-4"
                onClick={() => setExpandedId(isOpen ? null : proj.project_id)}
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm truncate">{proj.project_name}</span>
                      <span className="text-xs text-gray-400 shrink-0">{proj.client_name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 드릴다운 테이블 + ACS 정보 */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50/50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-100/80">
                          <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500">작업 유형</th>
                          <th className="py-2.5 px-3 text-center text-xs font-semibold text-gray-500">건수</th>
                          <th className="py-2.5 px-3 text-center text-xs font-semibold text-gray-500">투입시간</th>
                          <th className="py-2.5 px-3 text-center text-xs font-semibold text-gray-500">비율</th>
                          <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 w-32"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {WORK_TYPES.map(wt => {
                          const count = proj[wt.key] || 0;
                          const hours = Math.max(0, proj[wt.hoursKey] || 0);
                          if (count === 0 && hours === 0) return null;
                          const pct = proj.total_hours > 0 ? Math.round((hours / proj.total_hours) * 100) : 0;
                          return (
                            <tr key={wt.key} className="hover:bg-white/60 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${wt.color} shrink-0`}></span>
                                  <span className={`font-medium ${wt.text}`}>{wt.label}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center text-gray-700">{count}건</td>
                              <td className="py-2.5 px-3 text-center font-bold text-gray-900">{hours}h</td>
                              <td className="py-2.5 px-3 text-center text-gray-500">{pct}%</td>
                              <td className="py-2.5 px-4">
                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                  <div className={`h-full ${wt.color} rounded-full`} style={{ width: `${pct}%` }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100/80 border-t border-gray-200 font-bold">
                          <td className="py-2.5 px-4 text-gray-700">합계</td>
                          <td className="py-2.5 px-3 text-center text-gray-700">{proj.total}건</td>
                          <td className="py-2.5 px-3 text-center text-blue-700">{proj.total_hours}h</td>
                          <td className="py-2.5 px-3 text-center text-gray-500">100%</td>
                          <td className="py-2.5 px-4"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {/* ACS 계약 정보 */}
                  {hasAcs && (() => {
                    const usagePct = proj.acs_usage_percent || 0;
                    const gaugeColor = usagePct > 100 ? 'bg-red-500' : usagePct > 80 ? 'bg-yellow-500' : 'bg-blue-500';
                    return (
                      <div className="px-5 py-3 border-t border-gray-200 bg-blue-50/50">
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">ACS</span>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">계약:</span>
                            <span className="font-bold text-gray-800">{proj.acs_contract_time}h</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">투입:</span>
                            <span className="font-bold text-blue-700">{proj.acs_used_time}h</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">잔여:</span>
                            <span className={`font-bold ${proj.acs_remaining_time < 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {proj.acs_remaining_time}h
                            </span>
                          </div>
                          <div className="flex-1 max-w-48">
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${gaugeColor}`}
                                style={{ width: `${Math.min(usagePct, 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className={`text-xs font-bold ${usagePct > 100 ? 'text-red-600' : 'text-gray-500'}`}>
                            {usagePct}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && searchQuery && (
        <div className="text-center py-8 text-gray-400 text-sm">검색 결과가 없습니다.</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 2. 엔지니어별 통계 (퍼포먼스 관점)
   ═══════════════════════════════════════════════ */
function EngineerTab({ data, searchQuery }) {
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const sorted = [...data].sort((a, b) => (b.total_hours || 0) - (a.total_hours || 0));
    if (!searchQuery.trim()) return sorted;
    const q = searchQuery.toLowerCase();
    return sorted.filter(e => e.user_name?.toLowerCase().includes(q));
  }, [data, searchQuery]);

  // 자동 첫 번째 선택
  useEffect(() => {
    if (filtered.length > 0 && (!selectedId || !filtered.find(e => e.user_id === selectedId))) {
      setSelectedId(filtered[0].user_id);
    }
  }, [filtered, selectedId]);

  if (!data || data.length === 0) return <EmptyState message="엔지니어 통계 데이터가 없습니다." />;

  const selected = filtered.find(e => e.user_id === selectedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* 좌측 엔지니어 리스트 */}
      <div className="lg:col-span-2">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">엔지니어 목록</h4>
        <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
          {filtered.map((eng, idx) => (
            <div
              key={eng.user_id}
              onClick={() => setSelectedId(eng.user_id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                selectedId === eng.user_id
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50 border border-transparent'
              }`}
            >
              <span className="text-xs text-gray-400 w-5 text-right font-mono">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${selectedId === eng.user_id ? 'text-blue-900' : 'text-gray-800'}`}>
                  {eng.user_name}
                </p>
                <p className="text-xs text-gray-400">{eng.dept_name || '-'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-blue-600">{eng.total_hours}h</p>
                <p className="text-xs text-gray-400">{eng.total}건</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && searchQuery && (
            <p className="text-center py-4 text-gray-400 text-sm">검색 결과가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 우측 상세 패널 */}
      <div className="lg:col-span-3">
        {selected ? (
          <div className="space-y-6">
            {/* 선택된 엔지니어 헤더 */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{selected.user_name}</h4>
                  <p className="text-sm text-gray-500">{selected.dept_name || '-'} {selected.position ? `/ ${selected.position}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{selected.total_hours}<span className="text-sm font-normal ml-1">h</span></p>
                  <p className="text-xs text-gray-500">{selected.total}건</p>
                </div>
              </div>
            </div>

            {/* 도넛 차트 */}
            <DonutChart data={selected} />

            {/* 데이터 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500">작업 유형</th>
                    <th className="py-2.5 px-3 text-center text-xs font-semibold text-gray-500">건수</th>
                    <th className="py-2.5 px-3 text-center text-xs font-semibold text-gray-500">투입시간</th>
                    <th className="py-2.5 px-3 text-center text-xs font-semibold text-gray-500">비율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {WORK_TYPES.map(wt => {
                    const count = selected[wt.key] || 0;
                    const hours = Math.max(0, selected[wt.hoursKey] || 0);
                    if (count === 0 && hours === 0) return null;
                    const pct = selected.total_hours > 0 ? Math.round((hours / selected.total_hours) * 100) : 0;
                    return (
                      <tr key={wt.key} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${wt.color} shrink-0`}></span>
                            <span className={`font-medium ${wt.text}`}>{wt.label}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center text-gray-700">{count}건</td>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-900">{hours}h</td>
                        <td className="py-2.5 px-3 text-center text-gray-500">{pct}%</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-gray-50 border-t border-gray-200 font-bold">
                    <td className="py-2.5 px-4 text-gray-700">합계</td>
                    <td className="py-2.5 px-3 text-center text-gray-700">{selected.total}건</td>
                    <td className="py-2.5 px-3 text-center text-blue-700">{selected.total_hours}h</td>
                    <td className="py-2.5 px-3 text-center text-gray-500">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p>엔지니어를 선택해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SVG 도넛 차트
   ═══════════════════════════════════════════════ */
function DonutChart({ data }) {
  const size = 180;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const segments = WORK_TYPES
    .map(wt => ({
      ...wt,
      hours: Math.max(0, data[wt.hoursKey] || 0),
    }))
    .filter(s => s.hours > 0);

  const totalHours = segments.reduce((s, seg) => s + seg.hours, 0);
  if (totalHours === 0) {
    return (
      <div className="flex justify-center py-6">
        <div className="text-center text-gray-400 text-sm">작업 시간 데이터가 없습니다.</div>
      </div>
    );
  }

  let accumulated = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* 배경 원 */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
          {/* 세그먼트 */}
          {segments.map(seg => {
            const pct = seg.hours / totalHours;
            const dashLen = circumference * pct;
            const offset = circumference - accumulated;
            accumulated += dashLen;
            return (
              <circle
                key={seg.key}
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke={seg.hex}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{totalHours}</span>
          <span className="text-xs text-gray-500">시간</span>
        </div>
      </div>
      {/* 범례 */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {segments.map(seg => (
          <div key={seg.key} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${seg.color}`}></span>
            <span className="text-xs text-gray-600">{seg.label}</span>
            <span className="text-xs font-bold text-gray-800">{seg.hours}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 3. 부서별 통계 (조직 관리 관점)
   ═══════════════════════════════════════════════ */
function DepartmentTab({ data, searchQuery }) {
  const [sortKey, setSortKey] = useState('total_hours');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = data.filter(d => d.dept_name?.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [data, searchQuery, sortKey, sortDir]);

  if (!data || data.length === 0) return <EmptyState message="부서별 통계 데이터가 없습니다." />;

  const maxHours = Math.max(...filtered.map(d => d.total_hours || 0), 1);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortHeader = ({ label, field, className = '' }) => (
    <th className={`py-2.5 px-2 font-semibold cursor-pointer hover:bg-gray-100 select-none transition-colors text-xs ${className}`}
      onClick={() => handleSort(field)}>
      <div className="flex items-center justify-center gap-1">
        {label}
        {sortKey === field && (
          <span className="text-blue-500 text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* 스택 바 차트 */}
      <div className="bg-gray-50 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">부서별 투입시간 비교</h4>
        <div className="flex items-end gap-3 h-52">
          {filtered.map(dept => (
            <div key={dept.dept_id} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
              <span className="text-xs font-bold text-gray-700 mb-1">{dept.total_hours}h</span>
              <div className="w-full flex flex-col gap-0" style={{ height: `${Math.max((dept.total_hours / maxHours * 100), 3)}%` }}>
                {WORK_TYPES.map(wt => {
                  const hours = Math.max(0, dept[wt.hoursKey] || 0);
                  if (hours <= 0) return null;
                  return (
                    <div
                      key={wt.key}
                      className={`${wt.color} first:rounded-t last:rounded-b`}
                      style={{ flex: hours }}
                      title={`${wt.label}: ${hours}h`}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-gray-500 mt-2 truncate w-full text-center" title={dept.dept_name}>
                {dept.dept_name}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 justify-center mt-4">
          {WORK_TYPES.map(wt => (
            <Legend key={wt.key} color={wt.color} label={wt.label} />
          ))}
        </div>
      </div>

      {/* 집계 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <SortHeader label="부서" field="dept_name" className="text-left px-4 text-gray-600" />
              <SortHeader label="인원" field="engineer_count" className="text-center text-gray-600" />
              {WORK_TYPES.map(wt => (
                <th key={wt.key} className="py-2.5 px-1 text-center">
                  <div className="text-xs font-semibold" style={{ color: wt.hex }}>{wt.label}</div>
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    <span className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600" onClick={() => { setSortKey(wt.key); setSortDir('desc'); }}>건</span>
                    <span className="text-[10px] text-gray-300">/</span>
                    <span className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600" onClick={() => { setSortKey(wt.hoursKey); setSortDir('desc'); }}>h</span>
                  </div>
                </th>
              ))}
              <SortHeader label="합계" field="total_hours" className="text-center text-blue-600" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(dept => (
              <tr key={dept.dept_id} className="hover:bg-gray-50 transition-colors">
                <td className="py-2.5 px-4 font-medium text-gray-800">{dept.dept_name}</td>
                <td className="py-2.5 px-2 text-center text-gray-500">{dept.engineer_count}명</td>
                {WORK_TYPES.map(wt => {
                  const count = dept[wt.key] || 0;
                  const hours = Math.max(0, dept[wt.hoursKey] || 0);
                  return (
                    <td key={wt.key} className="py-2.5 px-1 text-center text-xs">
                      {count > 0 || hours > 0 ? (
                        <span className="text-gray-700">{count}<span className="text-gray-300 mx-0.5">/</span><span className="font-bold">{hours}h</span></span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="py-2.5 px-2 text-center">
                  <span className="text-gray-700">{dept.total}건</span>
                  <span className="text-gray-300 mx-1">/</span>
                  <span className="font-bold text-blue-700">{dept.total_hours}h</span>
                </td>
              </tr>
            ))}
            {/* 합계 행 */}
            <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
              <td className="py-2.5 px-4 text-gray-800">합계 ({filtered.length}개 부서)</td>
              <td className="py-2.5 px-2 text-center text-gray-700">{filtered.reduce((s, d) => s + (d.engineer_count || 0), 0)}명</td>
              {WORK_TYPES.map(wt => (
                <td key={wt.key} className="py-2.5 px-1 text-center text-xs">
                  <span className="text-gray-700">{filtered.reduce((s, d) => s + (d[wt.key] || 0), 0)}</span>
                  <span className="text-gray-300 mx-0.5">/</span>
                  <span className="font-bold">{Math.round(filtered.reduce((s, d) => s + Math.max(0, d[wt.hoursKey] || 0), 0) * 10) / 10}h</span>
                </td>
              ))}
              <td className="py-2.5 px-2 text-center">
                <span className="text-gray-700">{filtered.reduce((s, d) => s + (d.total || 0), 0)}건</span>
                <span className="text-gray-300 mx-1">/</span>
                <span className="font-bold text-blue-700">{Math.round(filtered.reduce((s, d) => s + (d.total_hours || 0), 0) * 10) / 10}h</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && searchQuery && (
        <div className="text-center py-8 text-gray-400 text-sm">검색 결과가 없습니다.</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   공통 컴포넌트
   ═══════════════════════════════════════════════ */
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
      <Icon name="stats" size={24} className="text-gray-400 mx-auto" />
      <p className="text-gray-500 mt-2">{message}</p>
      <p className="text-sm text-gray-400 mt-1">기간을 변경하거나 작업 내역을 등록해주세요.</p>
    </div>
  );
}
