'use server';

/**
 * Placeholder server actions for the legacy subdomain dashboard.
 *
 * TODO: Replace with real implementations when the admin tooling is rebuilt.
 */

interface ActionState {
  error?: string;
  success?: string;
  subdomain?: string;
  icon?: string;
}

export async function createSubdomainAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  return {
    error: 'Subdomain creation is temporarily disabled while we migrate to the new onboarding flow.',
  };
}

export async function deleteSubdomainAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  return {
    error: 'Subdomain deletion is temporarily disabled while we migrate to the new onboarding flow.',
  };
}
