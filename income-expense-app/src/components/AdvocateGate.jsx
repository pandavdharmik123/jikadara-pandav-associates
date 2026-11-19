import useAuthStore from '../store/authStore';
import AccessRestricted from './AccessRestricted';
import { canAccessAdvocatePage } from '../features/Advocate/advocateCatalog';

/**
 * Route-level permission check for the Advocate Management screens. Mirrors
 * the website's ProtectedRoute `pageKey` behaviour, with the mobile office hub
 * allowing ADMIN accounts into every module.
 */
export default function AdvocateGate({ pageKey, adminOnly = false, title, children }) {
  const user = useAuthStore((state) => state.user);

  const allowed = adminOnly
    ? user?.role === 'ADMIN'
    : canAccessAdvocatePage(user, pageKey);

  if (!allowed) {
    return (
      <AccessRestricted
        title={`${title || 'Office'} access required`}
        message={
          <>
            Your account does not have permission to open <strong>{title || 'this module'}</strong>.
            Ask an administrator to grant it from the existing Admin → Users page.
          </>
        }
      />
    );
  }

  return children;
}
