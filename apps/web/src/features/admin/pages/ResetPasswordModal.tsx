import React from 'react';
import { useForm } from 'react-hook-form';
import { tenantsApi } from '../api/admin.api';
import { showToast } from '../../../shared/utils/toast';
import { Modal } from '../../../shared/ui/modals/Modal';
import { Key, Copy, CheckCircle } from 'lucide-react';

interface ResetPasswordModalProps {
  userId: string | null;
  userName: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ userId, userName, onClose, onSuccess }) => {
  const [step, setStep] = React.useState<'form' | 'success'>('form');
  const [savedPassword, setSavedPassword] = React.useState('');
  
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      password: 'Mudar' + Math.floor(1000 + Math.random() * 9000) + '!',
    }
  });

  const onSubmit = async (data: any) => {
    if (!userId) return;

    try {
      await tenantsApi.resetPassword(userId, data.password);
      setSavedPassword(data.password);
      setStep('success');
      onSuccess();
    } catch (err) {
      showToast.error('Erro ao resetar senha');
    }
  };

  const handleCopy = () => {
    const text = `Olá ${userName}, sua senha no IPTV Manager foi resetada.\n\nAcesso: http://localhost:5173/login\nSenha Provisória: ${savedPassword}\n\n(Você deverá alterar esta senha no primeiro acesso).`;
    navigator.clipboard.writeText(text);
    showToast.success('Instruções copiadas!');
  };

  const handleClose = () => {
    setStep('form');
    setSavedPassword('');
    onClose();
  };

  return (
    <Modal 
      isOpen={!!userId} 
      onClose={handleClose} 
      title={step === 'form' ? 'Resetar Senha' : 'Senha Resetada'}
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-sm text-slate-600">
            Defina uma senha provisória para <strong>{userName}</strong>. 
            Ele será obrigado a trocá-la no primeiro acesso.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha Provisória</label>
            <div className="relative">
              <input
                {...register('password', { required: true, minLength: 6 })}
                className="w-full p-2.5 border border-slate-300 rounded-lg pr-10 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <Key className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? 'Processando...' : 'Confirmar Reset'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6 py-2">
          <div className="flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Sucesso!</h3>
            <p className="text-sm text-slate-600 mt-1">A senha de <strong>{userName}</strong> foi alterada.</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Senha Provisória</p>
            <div className="flex items-center justify-between">
              <code className="text-lg font-mono text-indigo-600 font-bold">{savedPassword}</code>
              <button 
                onClick={handleCopy}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                title="Copiar Senha"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-amber-50 p-3 rounded-md border border-amber-100">
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Importante:</strong> Copie as instruções abaixo para enviar ao usuário. Ele precisará trocar essa senha no primeiro acesso.
            </p>
          </div>

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center space-x-2 bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-colors font-semibold"
          >
            <Copy className="h-4 w-4" />
            <span>Copiar Instruções de Acesso</span>
          </button>
          
          <button
            onClick={handleClose}
            className="w-full text-slate-500 text-sm hover:text-slate-700 font-medium"
          >
            Fechar
          </button>
        </div>
      )}
    </Modal>
  );
};
