import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

/** Game screens need a signed-in player with a profile; anyone else goes back to the sign-in screen. */
function RequireAuth({ children }: { children: ReactNode }) {
    const { status } = useAuth();
    if (status === 'loading') return null;
    if (status !== 'ready') return <Navigate to="/" replace />;
    return <>{children}</>;
}

export default RequireAuth;
