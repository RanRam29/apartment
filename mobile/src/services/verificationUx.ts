type MaybeUser = { isVerified?: boolean } | null | undefined;
type MaybeAuthError = {
  response?: {
    status?: number;
    data?: {
      code?: string;
      verificationRequired?: boolean;
      resendAvailable?: boolean;
      email?: string;
    };
  };
} | null | undefined;

export function shouldPromptEmailVerification(user: MaybeUser): boolean {
  return Boolean(user) && user?.isVerified === false;
}

export function getVerificationPromptEmail(error: MaybeAuthError): string | null {
  const status = error?.response?.status;
  const data = error?.response?.data;
  if (status !== 403) return null;
  if (data?.code !== 'EMAIL_NOT_VERIFIED') return null;
  if (!data?.verificationRequired) return null;
  return data?.email || null;
}
