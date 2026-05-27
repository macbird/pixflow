import React from 'react';

export const CardList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {children}
  </div>
);

export const EntityCard: React.FC<{ 
  title: string, 
  subtitle?: string, 
  footer?: React.ReactNode,
  status?: string,
  onClick?: () => void 
}> = ({ title, subtitle, footer, status, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
  >
    <div className="px-4 py-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
        {status && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {status}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
    {footer && (
      <div className="bg-gray-50 px-4 py-4 sm:px-6">
        {footer}
      </div>
    )}
  </div>
);
