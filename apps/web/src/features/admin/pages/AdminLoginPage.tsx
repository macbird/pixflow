import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { adminAuthApi } from '../api/admin.api';
import { showToast } from '../../../shared/utils/toast';

export const AdminLoginPage: React.FC = () => {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data: any) => {
    try {
      const { token } = await adminAuthApi.login(data);
      localStorage.setItem('adminToken', token);
      navigate('/admin/dashboard');
    } catch (err) {
      showToast.error('Credenciais inválidas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-slate-900">Admin Login</h1>
        <input {...register('email')} placeholder="E-mail" className="w-full p-2 border border-slate-300 rounded mb-4" />
        <input {...register('password')} type="password" placeholder="Senha" className="w-full p-2 border border-slate-300 rounded mb-6" />
        <button disabled={isSubmitting} className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};
