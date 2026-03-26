import { useAuthStore } from '../../stores/authStore';

export default function Header({ title }) {
  const { user } = useAuthStore();

  return (
    <header className="h-auto min-h-[3.5rem] bg-white border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 sm:px-6 lg:px-8 gap-2 sm:gap-4">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="text-xs sm:text-sm text-gray-500">
          {user?.department?.dept_name || ''}
        </span>
        <span className="badge-info text-xs">{user?.role}</span>
      </div>
    </header>
  );
}
