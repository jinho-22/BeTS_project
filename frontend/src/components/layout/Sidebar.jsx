import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import Icon from '../common/Icons';
import logoImg from '../../assets/logo-beyond.png';
import api from '../../lib/axios';

const navigation = [
  { name: '대시보드', href: '/', icon: 'dashboard' },
  { name: '작업 내역', href: '/work', icon: 'clipboard' },
  { name: '고객사', href: '/clients', icon: 'building' },
];

// admin 전용 메뉴
const adminOnlyNavigation = [
  { name: '사용자 관리', href: '/admin/users', icon: 'users' },
  { name: '부서 관리', href: '/admin/departments', icon: 'building' },
  { name: '제품 관리', href: '/admin/products', icon: 'package' },
];

// admin + manager 공통 메뉴
const managerNavigation = [
  { name: '통계', href: '/admin/statistics', icon: 'chart' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const hasAdminAccess = isAdmin || isManager;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const notiRef = useRef(null);
  const queryClient = useQueryClient();

  // 알림 카운트 (30초마다 갱신)
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => { const { data } = await api.get('/notifications/unread-count'); return data.data; },
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.count || 0;

  // 알림 목록
  const { data: notiList } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => { const { data } = await api.get('/notifications'); return data.data; },
    enabled: notiOpen,
  });

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handleClick = (e) => { if (notiRef.current && !notiRef.current.contains(e.target)) setNotiOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleReadAll = async () => {
    await api.patch('/notifications/read-all');
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const handleNotiClick = async (noti) => {
    if (!noti.is_read) {
      await api.patch(`/notifications/${noti.notification_id}/read`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
    setNotiOpen(false);
    navigate(`/work/${noti.log_id}`);
  };

  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // 모바일 메뉴 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
    }`;

  const sidebarContent = (
    <>
      {/* 로고 */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="Beyond Corp." className="h-9 w-auto" />
          <h1 className="text-lg font-bold tracking-tight">BeTS</h1>
        </div>
        {/* 모바일 닫기 버튼 */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1 text-gray-400 hover:text-white rounded-lg"
          aria-label="메뉴 닫기"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">메인</p>
        {navigation.map((item) => (
          <NavLink key={item.name} to={item.href} end={item.href === '/'} className={navLinkClass}>
            <Icon name={item.icon} size={18} />
            {item.name}
          </NavLink>
        ))}

        {hasAdminAccess && (
          <>
            <p className="px-3 pt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              관리
            </p>
            {isAdmin && adminOnlyNavigation.map((item) => (
              <NavLink key={item.name} to={item.href} className={navLinkClass}>
                <Icon name={item.icon} size={18} />
                {item.name}
              </NavLink>
            ))}
            {managerNavigation.map((item) => (
              <NavLink key={item.name} to={item.href} className={navLinkClass}>
                <Icon name={item.icon} size={18} />
                {item.name}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* 알림 + 사용자 정보 */}
      <div className="border-t border-gray-800 p-4 shrink-0">
        {/* 알림 벨 */}
        <div className="relative mb-3" ref={notiRef}>
          <button
            onClick={() => { setNotiOpen(!notiOpen); if (!notiOpen) queryClient.invalidateQueries({ queryKey: ['notifications'] }); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            알림
            {unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* 알림 드롭다운 */}
          {notiOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-80 overflow-y-auto z-50" style={{ minWidth: '280px' }}>
              <div className="sticky top-0 bg-white px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">알림</span>
                {unreadCount > 0 && (
                  <button onClick={handleReadAll} className="text-xs text-blue-600 hover:text-blue-800">전체 읽음</button>
                )}
              </div>
              {notiList && notiList.length > 0 ? notiList.map(noti => (
                <button
                  key={noti.notification_id}
                  onClick={() => handleNotiClick(noti)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!noti.is_read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1 shrink-0 w-2 h-2 rounded-full ${!noti.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-2">{noti.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {noti.sender?.name} · {new Date(noti.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </button>
              )) : (
                <div className="py-8 text-center text-sm text-gray-400">알림이 없습니다.</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
            {user?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-1">
          <NavLink
            to="/change-password"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Icon name="lock" size={14} />
            비밀번호 변경
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Icon name="logout" size={14} />
            로그아웃
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-gray-900 text-white rounded-lg shadow-lg"
        aria-label="메뉴 열기"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 모바일 사이드바 (슬라이드) */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* 데스크톱 사이드바 (고정) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
