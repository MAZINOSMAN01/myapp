// src/components/ProtectedRoute.tsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { currentUser, loading } = useAuth();

  // If we are still checking the auth state, don't render anything yet
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    // If no user is logged in, redirect them to the /login page
    return <Navigate to="/login" replace />;
  }

  // If a user is logged in, show the nested routes (our main app)
  return <Outlet />;
}