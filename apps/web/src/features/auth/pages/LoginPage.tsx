import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '@iptv-manager/shared';
import { authApi } from '../api/auth.api';
import { useNavigate, Link } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      const response = await authApi.login(data.email, data.password);
      localStorage.setItem('token', response.token);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Entrar na sua conta
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                {...register('email')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                {...register('password')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:bg-indigo-400"
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link to="/register" className="text-sm text-indigo-600 hover:text-indigo-500">
              Não tenho conta → Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
