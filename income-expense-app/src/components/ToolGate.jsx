import { Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { canAccessTool } from '../lib/permissions';
import AccessRestricted from './AccessRestricted';

export default function ToolGate({ tool }) {
  const user = useAuthStore((state) => state.user);

  if (!canAccessTool(user, tool)) {
    return (
      <AccessRestricted
        title={`${tool.label} access required`}
        message={
          <>
            Your account does not have permission to open this tool. Ask an administrator to grant{' '}
            <strong>{tool.label}</strong> access from the existing Admin → Users page.
          </>
        }
      />
    );
  }

  return <Outlet />;
}
