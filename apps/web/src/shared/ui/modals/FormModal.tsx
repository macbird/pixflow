import React from 'react';
import { Modal, type ModalSize } from './Modal';
import {
  formCancelButtonClass,
  formDangerSubmitButtonClass,
  formRootClass,
  formSubmitButtonClass,
} from '../forms/form-styles';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** When set, the save button submits the form with this id (preferred over onSave). */
  formId?: string;
  onSave?: () => void;
  isPending?: boolean;
  saveLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  size?: ModalSize;
  hideCancel?: boolean;
  saveDisabled?: boolean;
  saveTone?: 'primary' | 'danger';
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  formId,
  onSave,
  isPending = false,
  saveLabel = 'Salvar',
  pendingLabel = 'Salvando...',
  cancelLabel = 'Cancelar',
  size = 'md',
  hideCancel = false,
  saveDisabled = false,
  saveTone = 'primary',
}) => {
  const submitClass = saveTone === 'danger' ? formDangerSubmitButtonClass : formSubmitButtonClass;

  const footer = (
    <div className={`grid gap-3 ${hideCancel ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {!hideCancel ? (
        <button type="button" onClick={onClose} className={formCancelButtonClass} disabled={isPending}>
          {cancelLabel}
        </button>
      ) : null}
      <button
        type={formId ? 'submit' : 'button'}
        form={formId}
        onClick={formId ? undefined : onSave}
        disabled={isPending || saveDisabled}
        className={submitClass}
      >
        {isPending ? pendingLabel : saveLabel}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      footer={footer}
    >
      <div className={formRootClass}>{children}</div>
    </Modal>
  );
};
