import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { usersApi } from '@/api/users';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  open: boolean;
  userId: string;
  userName: string;
  onClose: () => void;
}

export default function ChangePasswordDialog({ open, userId, userName, onClose }: Props) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => usersApi.changePassword(userId, newPassword),
    onSuccess: () => {
      onClose();
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? t('common.error'));
    },
  });

  function handleSubmit() {
    setError('');
    if (newPassword.length < 6) {
      setError(t('settings.users.passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('settings.users.passwordMismatch'));
      return;
    }
    mutation.mutate();
  }

  function handleClose() {
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`${t('settings.users.changePassword')} — ${userName}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>
        )}
        <div className="space-y-1.5">
          <Label>{t('settings.users.fields.newPassword')}</Label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('settings.users.fields.confirmPassword')}</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
      </div>
    </Modal>
  );
}
