import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import Icon from '../common/Icons';
import logoImg from '../../assets/logo-beyond.png';

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
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const hasAdminAccess = isAdmin || isManager;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col">
      {/* 로고 */}
      <div className="flex items-center gap-3 h-16 px-5 border-b border-gray-800">
        <img src={logoImg} alt="Beyond Corp." className="h-9 w-auto" />
        <h1 className="text-lg font-bold tracking-tight">BeTS</h1>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">메인</p>
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon name={item.icon} size={18} />
            {item.name}
          </NavLink>
        ))}

        {hasAdminAccess && (
          <>
            <p className="px-3 pt-6 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              관리
            </p>
            {/* admin 전용 메뉴 (사용자/부서/제품 관리) */}
            {isAdmin && adminOnlyNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <Icon name={item.icon} size={18} />
                {item.name}
              </NavLink>
            ))}
            {/* admin + manager 공통 메뉴 (통계) */}
            {managerNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <Icon name={item.icon} size={18} />
                {item.name}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* 사용자 정보 */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm font-bold">
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
            onClick={logout}
            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Icon name="logout" size={14} />
            로그아웃
          </button>
        </div>
      </div>
    </aside>
  );
}
