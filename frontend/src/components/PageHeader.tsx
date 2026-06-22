import { Link } from 'react-router-dom';

interface Props {
  title: string;
  actionLabel?: string;
  actionTo?: string;
}

export default function PageHeader({ title, actionLabel, actionTo }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
