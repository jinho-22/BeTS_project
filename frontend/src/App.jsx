import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/common/ErrorBoundary';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorkLogListPage from './pages/WorkLogListPage';
import WorkLogCreatePage from './pages/WorkLogCreatePage';
import WorkLogDetailPage from './pages/WorkLogDetailPage';
import WorkLogEditPage from './pages/WorkLogEditPage';
import ClientListPage from './pages/ClientListPage';
import UserManagementPage from './pages/UserManagementPage';
import DepartmentManagementPage from './pages/DepartmentManagementPage';
import ProductManagementPage from './pages/ProductManagementPage';
import StatisticsPage from './pages/StatisticsPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import SetupPage from './pages/SetupPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 0,
      refetchOnMount: 'always',
      throwOnError: false, // 쿼리 에러가 렌더링 크래시를 유발하지 않도록
    },
    mutations: {
      throwOnError: false, // 뮤테이션 에러도 크래시 방지
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* 공개 라우트 */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/setup" element={<SetupPage />} />

            {/* 인증 필요 라우트 */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              {/* 대시보드 */}
              <Route path="/" element={<DashboardPage />} />

              {/* 작업 내역 */}
              <Route path="/work" element={<WorkLogListPage />} />
              <Route path="/work/new" element={<WorkLogCreatePage />} />
              <Route path="/work/:id" element={<WorkLogDetailPage />} />
              <Route path="/work/:id/edit" element={<WorkLogEditPage />} />

              {/* 고객사 (프로젝트 통합) */}
              <Route path="/clients" element={<ClientListPage />} />

              {/* 비밀번호 변경 */}
              <Route path="/change-password" element={<ChangePasswordPage />} />

              {/* 관리자(admin) 전용 */}
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/departments"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <DepartmentManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <ProductManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/statistics"
                element={
                  <ProtectedRoute roles={['admin', 'manager']}>
                    <StatisticsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
