const LOCAL_ADMIN_PIN_HASH_KEY = 'vms_admin_pin_hash';
const ADMIN_SESSION_KEY = 'vms_admin_session';

const managedAdminPin = import.meta.env.VITE_ADMIN_PIN?.trim() ?? '';

const hashPin = async (pin: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const hasManagedAdminPin = () => managedAdminPin.length > 0;

export const hasConfiguredAdminPin = () =>
  hasManagedAdminPin() || Boolean(localStorage.getItem(LOCAL_ADMIN_PIN_HASH_KEY));

export const isAdminSessionActive = () => sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';

export const setAdminSessionActive = (isActive: boolean) => {
  if (isActive) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    return;
  }

  sessionStorage.removeItem(ADMIN_SESSION_KEY);
};

export const verifyAdminPin = async (pin: string) => {
  const normalizedPin = pin.trim();

  if (!normalizedPin) {
    return false;
  }

  if (hasManagedAdminPin()) {
    return normalizedPin === managedAdminPin;
  }

  const storedHash = localStorage.getItem(LOCAL_ADMIN_PIN_HASH_KEY);
  if (!storedHash) {
    return false;
  }

  return storedHash === await hashPin(normalizedPin);
};

export const setLocalAdminPin = async (pin: string) => {
  const normalizedPin = pin.trim();
  if (!normalizedPin) {
    return;
  }

  localStorage.setItem(LOCAL_ADMIN_PIN_HASH_KEY, await hashPin(normalizedPin));
};
