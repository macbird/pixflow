import React from 'react';
import { formRootClass } from './form-styles';

interface FormLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const FormLayout: React.FC<FormLayoutProps> = ({ title, children }) => (
  <div className={`max-w-2xl mx-auto py-8 px-4 md:px-0 ${formRootClass}`}>
    <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-8">{title}</h1>
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm ring-1 ring-slate-900/5 md:p-8">
      {children}
    </div>
  </div>
);
