import { useAuthStore } from '../../stores/authStore';

export default function Header({ title }) {
  const { user } = useAuthStore();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          {user?.department?.dept_name || ''}
        </span>
        <span className="badge-info">{user?.role}</span>
      </div>
    </header>
  );
}
