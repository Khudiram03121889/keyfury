import React, { useState, useEffect } from 'react';
import { Server, Wifi, WifiOff, RefreshCw, Check, X, Globe, Smartphone, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  getGameServerUrl,
  setGameServerUrl,
  resetGameServerUrl,
  testGameServerConnection,
  DEFAULT_DEV_SERVER
} from '../../lib/colyseus';
import { Capacitor } from '@capacitor/core';

interface ServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerUpdated?: (newUrl: string) => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({
  isOpen,
  onClose,
  onServerUpdated
}) => {
  const [currentUrl, setCurrentUrl] = useState<string>(getGameServerUrl());
  const [inputUrl, setInputUrl] = useState<string>(getGameServerUrl());
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    error?: string;
  }>({ tested: false, success: false });

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isOpen) {
      const active = getGameServerUrl();
      setCurrentUrl(active);
      setInputUrl(active);
      setTestResult({ tested: false, success: false });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async (urlToTest?: string) => {
    const target = urlToTest || inputUrl;
    setTesting(true);
    setTestResult({ tested: false, success: false });

    const res = await testGameServerConnection(target);
    setTesting(false);
    setTestResult({
      tested: true,
      success: res.success,
      latencyMs: res.latencyMs,
      error: res.error
    });
  };

  const handleSave = () => {
    const updated = setGameServerUrl(inputUrl);
    setCurrentUrl(updated);
    if (onServerUpdated) onServerUpdated(updated);
    onClose();
  };

  const handleReset = () => {
    const reset = resetGameServerUrl();
    setInputUrl(reset);
    setCurrentUrl(reset);
    setTestResult({ tested: false, success: false });
    if (onServerUpdated) onServerUpdated(reset);
  };

  const applyPreset = (presetUrl: string) => {
    setInputUrl(presetUrl);
    setTestResult({ tested: false, success: false });
    handleTest(presetUrl);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15)',
          padding: '24px',
          color: '#f8fafc',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}
            >
              <Server size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                Game Server Settings
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Configure Colyseus matchmaking & combat backend
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Android / Native Callout */}
        {isNative && (
          <div
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              fontSize: '0.8rem',
              color: '#fde68a'
            }}
          >
            <Smartphone size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#fbbf24' }} />
            <div>
              <strong>Running inside Android APK:</strong>
              <div style={{ marginTop: '2px', color: '#cbd5e1' }}>
                <code>localhost</code> connects to the phone itself. To connect to your local PC server on Wi-Fi, enter your PC LAN IP (e.g. <code>ws://192.168.31.220:2567</code>) or Emulator IP (<code>ws://10.0.2.2:2567</code>).
              </div>
            </div>
          </div>
        )}

        {/* Input Form */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px' }}>
            WebSocket Server URL
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                setTestResult({ tested: false, success: false });
              }}
              placeholder="ws://192.168.1.100:2567 or wss://server.domain.com"
              style={{
                flex: 1,
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#f8fafc',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'monospace'
              }}
            />
            <button
              type="button"
              onClick={() => handleTest()}
              disabled={testing}
              style={{
                backgroundColor: testing ? '#334155' : 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '8px',
                padding: '0 16px',
                color: '#38bdf8',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: testing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={14} className={testing ? 'spin-animation' : ''} />
              {testing ? 'Testing...' : 'Test'}
            </button>
          </div>
        </div>

        {/* Test Result Feedback */}
        {testResult.tested && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: testResult.success ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${testResult.success ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
              color: testResult.success ? '#4ade80' : '#f87171'
            }}
          >
            {testResult.success ? (
              <>
                <Wifi size={16} color="#4ade80" />
                <span>
                  <strong>Connected successfully!</strong> (Latency: {testResult.latencyMs}ms)
                </span>
              </>
            ) : (
              <>
                <WifiOff size={16} color="#f87171" style={{ flexShrink: 0 }} />
                <span style={{ wordBreak: 'break-word' }}>
                  <strong>Connection failed:</strong> {testResult.error || 'Server unreachable at this address.'}
                </span>
              </>
            )}
          </div>
        )}

        {/* Presets */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Quick Presets
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={() => applyPreset('ws://192.168.31.220:2567')}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '8px',
                padding: '8px 10px',
                textAlign: 'left',
                color: '#e2e8f0',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 600, color: '#38bdf8' }}>Wi-Fi LAN IP</div>
              <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.7rem' }}>ws://192.168.31.220:2567</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('ws://10.0.2.2:2567')}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '8px',
                padding: '8px 10px',
                textAlign: 'left',
                color: '#e2e8f0',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 600, color: '#a78bfa' }}>Android Emulator</div>
              <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.7rem' }}>ws://10.0.2.2:2567</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('ws://localhost:2567')}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '8px',
                padding: '8px 10px',
                textAlign: 'left',
                color: '#e2e8f0',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 600, color: '#34d399' }}>PC Localhost</div>
              <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.7rem' }}>ws://localhost:2567</div>
            </button>

            <button
              type="button"
              onClick={handleReset}
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '8px',
                padding: '8px 10px',
                textAlign: 'left',
                color: '#e2e8f0',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <RotateCcw size={12} /> Default Env
              </div>
              <div style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.7rem' }}>{DEFAULT_DEV_SERVER}</div>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              color: '#94a3b8',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              border: 'none',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)'
            }}
          >
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
};
