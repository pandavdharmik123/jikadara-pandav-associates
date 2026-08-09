import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { hasPageAccess, getInitialUserRoute } from '../utils/pagePermissions';
import { isTokenExpired } from '../utils/tokenUtils';

const ProtectedRoute = ({ allowedRoles, pageKey }) => {
  const { isAuthenticated, token, user, logout } = useAuthStore();

  if (!isAuthenticated || !token || isTokenExpired(token)) {
    if (isAuthenticated) {
      logout();
    }
    return <Navigate to="/login" replace />;
  }

  // Check role restrictions if defined
  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    const redirectRoute = getInitialUserRoute(user);
    return <Navigate to={redirectRoute} replace />;
  }

  // Check page permission restrictions if defined
  if (pageKey && !hasPageAccess(user, pageKey)) {
    const redirectRoute = getInitialUserRoute(user);
    return <Navigate to={redirectRoute} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
