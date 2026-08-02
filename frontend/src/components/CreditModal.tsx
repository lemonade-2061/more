    // src/components/CreditModal.tsx
    import React from 'react';

    interface CreditModalProps {
    isOpen: boolean;
    onClose: () => void;
    }

    export default function CreditModal({ isOpen, onClose }: CreditModalProps) {
    if (!isOpen) return null;

    return (
        <div
        style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
        }}
        onClick={onClose}
        >
        <div
            style={{
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '16px',
            maxWidth: '320px',
            width: '80%',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()} // モーダル内クリックで閉じないようにする
        >
            <h3 style={{ marginTop: 0, fontSize: '18px', color: '#333' }}>クレジット</h3>
            
            <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#555', margin: '16px 0' }}>
            <p style={{ margin: '4px 0', fontWeight: 'bold' }}>音声提供</p>
            <p style={{ margin: '2px 0' }}>VOICEVOX:ずんだもん</p>
            <p style={{ margin: '2px 0' }}>VOICEVOX:四国めたん</p>
            <p style={{ margin: '2px 0' }}>VOICEVOX:春日部つむぎ</p>
            </div>

            <button
            type="button"
            onClick={onClose}
            style={{
                backgroundColor: '#ff6b00',
                color: '#fff',
                border: 'none',
                borderRadius: '20px',
                padding: '8px 24px',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '8px',
            }}
            >
            閉じる
            </button>
        </div>
        </div>
    );
    }