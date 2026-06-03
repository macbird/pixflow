import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { surfaceCardClass } from './surface-styles';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  href?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-indigo-600',
  iconBg = 'bg-indigo-100',
  href,
}) => {
  const content = (
    <div className={`${surfaceCardClass} h-full w-full min-w-0 p-3 transition-shadow hover:shadow-md lg:p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs lg:text-sm font-medium text-slate-600 line-clamp-2 leading-tight">
            {title}
          </p>
          <p className="text-lg lg:text-xl font-bold text-slate-900 mt-1 truncate">{value}</p>
          {subtitle && (
            <p className="text-[10px] lg:text-xs text-slate-500 mt-0.5 line-clamp-1">{subtitle}</p>
          )}
        </div>
        <div className={`${iconBg} p-2 lg:p-2.5 rounded-lg shrink-0`}>
          <Icon className={`h-4 w-4 lg:h-5 lg:w-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full w-full min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
};
