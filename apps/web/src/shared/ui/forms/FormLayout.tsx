import React from 'react';
import { formRootClass } from './form-styles';
import { pageCanvasClass, surfaceCardClass } from '../layout/surface-styles';

interface FormLayoutProps {
  title: string;
  children: React.ReactNode;
}

export const FormLayout: React.FC<FormLayoutProps> = ({ title, children }) => (
  <div className={`mx-auto max-w-2xl px-4 py-8 md:px-0 ${formRootClass} ${pageCanvasClass} min-h-full`}>
    <h1 className="mb-8 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
    <div className={`${surfaceCardClass} p-6 md:p-8`}>{children}</div>
  </div>
);
