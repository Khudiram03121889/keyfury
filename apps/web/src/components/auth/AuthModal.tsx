import React, { useState } from 'react';
import { X, Mail, Lock, User, LogIn, UserPlus, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, signInWithOAuth, GuestProfile } from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestSession: GuestProfile | null;
  onAuthSuccess?: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  guestSession,
  onAuthSuccess,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(guestSession?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        setSuccess('Access granted! Authenticated successfully.');
      } else {
        await signUpWithEmail(email, password, displayName);
        setSuccess('Account registered successfully! Welcome to KeyFury.');
      }

      setTimeout(() => {
        if (onAuthSuccess) onAuthSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Authentication request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithOAuth('google');
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in with Google.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(5, 7, 13, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel modal-dialog-content"
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px',
          position: 'relative',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 0 40px rgba(56, 189, 248, 0.2), inset 0 0 20px rgba(56, 189, 248, 0.05)',
          animation: 'pulse 6s infinite alternate'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/logo.jpg"
              alt="KeyFury Logo"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '14px',
                objectFit: 'cover',
                border: '1.5px solid rgba(56, 189, 248, 0.5)',
                boxShadow: '0 0 20px rgba(56, 189, 248, 0.4), 0 0 35px rgba(249, 115, 22, 0.2)'
              }}
            />
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '999px',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            <ShieldCheck size={14} /> Cyberpunk Auth Matrix
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
            {mode === 'login' ? 'LOGIN PROTOCOL' : 'NEW RECRUIT REGISTRATION'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
            {mode === 'login'
              ? 'Enter credentials to access your esports profile.'
              : 'Create your permanent warrior profile & save rankings.'}
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '16px',
          gap: '4px',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: mode === 'login' ? '#38bdf8' : 'transparent',
              color: mode === 'login' ? '#090d16' : '#94a3b8'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: mode === 'register' ? '#38bdf8' : 'transparent',
              color: mode === 'register' ? '#090d16' : '#94a3b8'
            }}
          >
            Register
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '6px' }}>
          {/* Feedback Alerts */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#f43f5e',
              padding: '10px 12px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: 'rgba(52, 211, 153, 0.15)',
              border: '1px solid rgba(52, 211, 153, 0.4)',
              color: '#34d399',
              padding: '10px 12px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                  DISPLAY NAME / GAMERTAG
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. CyberNinja"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '10px',
                      padding: '10px 14px 10px 42px',
                      color: '#f8fafc',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                EMAIL ADDRESS
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="email"
                  required
                  placeholder="warrior@keyfury.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '10px 14px 10px 42px',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '10px',
                    padding: '10px 14px 10px 42px',
                    color: '#f8fafc',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px',
                fontSize: '0.95rem',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="spin" /> Processing...
                </>
              ) : mode === 'login' ? (
                <>
                  <LogIn size={18} /> Sign In
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Create Account
                </>
              )}
            </button>
          </form>

          {/* OAuth Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '20px 0 14px 0'
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '1px' }}>
              OR CONNECT WITH
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
          </div>

          {/* Google Only */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px 20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: '#f8fafc',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)'; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
