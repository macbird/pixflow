import React from 'react';
import {
  PAYMENT_PROVIDER_LABELS,
  PAYMENT_PROVIDER_VALUES,
  WHATSAPP_PROVIDER_LABELS,
  WHATSAPP_PROVIDER_VALUES,
} from '@client-manager/shared';
import { SecretCredentialField } from './SecretCredentialField';

interface PaymentProviderFieldsProps {
  paymentProvider: string;
  paymentApiKey: string;
  paymentWebhookToken: string;
  onPaymentProviderChange: (v: string) => void;
  onPaymentApiKeyChange: (v: string) => void;
  onPaymentWebhookTokenChange: (v: string) => void;
  apiKeyConfigured?: boolean;
  webhookConfigured?: boolean;
}

export const PaymentProviderFields: React.FC<PaymentProviderFieldsProps> = ({
  paymentProvider,
  paymentApiKey,
  paymentWebhookToken,
  onPaymentProviderChange,
  onPaymentApiKeyChange,
  onPaymentWebhookTokenChange,
  apiKeyConfigured,
  webhookConfigured,
}) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-slate-700">Provider PIX</label>
      <select
        value={paymentProvider}
        onChange={(e) => onPaymentProviderChange(e.target.value)}
        className="mt-1 block w-full max-w-md rounded-md border border-slate-300 p-2 shadow-sm"
      >
        {PAYMENT_PROVIDER_VALUES.map((v) => (
          <option key={v} value={v}>
            {PAYMENT_PROVIDER_LABELS[v]}
          </option>
        ))}
      </select>
    </div>
    <SecretCredentialField
      id="platform-payment-api-key"
      label="API Key / Access Token"
      value={paymentApiKey}
      configured={Boolean(apiKeyConfigured)}
      onChange={onPaymentApiKeyChange}
      emptyPlaceholder="Cole o Access Token do sandbox"
    />
    <SecretCredentialField
      id="platform-payment-webhook"
      label="Token do webhook"
      value={paymentWebhookToken}
      configured={Boolean(webhookConfigured)}
      onChange={onPaymentWebhookTokenChange}
      emptyPlaceholder="Opcional"
    />
  </div>
);

interface WhatsAppProviderFieldsProps {
  whatsappProvider: string;
  whatsappInstanceUrl: string;
  whatsappApiKey: string;
  onProviderChange: (v: string) => void;
  onInstanceUrlChange: (v: string) => void;
  onApiKeyChange: (v: string) => void;
  apiKeyConfigured?: boolean;
}

export const WhatsAppProviderFields: React.FC<WhatsAppProviderFieldsProps> = ({
  whatsappProvider,
  whatsappInstanceUrl,
  whatsappApiKey,
  onProviderChange,
  onInstanceUrlChange,
  onApiKeyChange,
  apiKeyConfigured,
}) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium text-slate-700">Provider WhatsApp</label>
      <select
        value={whatsappProvider}
        onChange={(e) => onProviderChange(e.target.value)}
        className="mt-1 block w-full max-w-md rounded-md border border-slate-300 p-2 shadow-sm"
      >
        {WHATSAPP_PROVIDER_VALUES.map((v) => (
          <option key={v} value={v}>
            {WHATSAPP_PROVIDER_LABELS[v]}
          </option>
        ))}
      </select>
    </div>
    <div>
      <label className="block text-sm font-medium text-slate-700">URL da instância</label>
      <input
        type="url"
        value={whatsappInstanceUrl}
        onChange={(e) => onInstanceUrlChange(e.target.value)}
        placeholder="https://evolution.seudominio.com"
        className="mt-1 block w-full max-w-lg rounded-md border border-slate-300 p-2 shadow-sm"
      />
    </div>
    <SecretCredentialField
      id="whatsapp-api-key"
      label="API Key / Token"
      value={whatsappApiKey}
      configured={Boolean(apiKeyConfigured)}
      onChange={onApiKeyChange}
      emptyPlaceholder="Token da instância"
    />
  </div>
);
