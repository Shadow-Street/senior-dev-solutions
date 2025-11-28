import React from 'react';

export default function VIPMessageEffects({ message, vipFeatures, children }) {
  if (!vipFeatures?.message_effects || vipFeatures.message_effects.length === 0) {
    return <>{children}</>;
  }

  const effects = vipFeatures.message_effects || [];

  const getEffectStyles = () => {
    const styles = {};
    
    if (effects.includes('glow')) {
      return {
        className: 'vip-glow-effect',
        style: {
          animation: 'glow 2s ease-in-out infinite',
          textShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
        }
      };
    }
    
    if (effects.includes('rainbow')) {
      return {
        className: 'vip-rainbow-effect',
        style: {
          background: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
          backgroundSize: '200% 200%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'rainbow 3s ease infinite'
        }
      };
    }
    
    if (effects.includes('sparkle')) {
      return {
        className: 'vip-sparkle-effect',
        style: {
          position: 'relative'
        }
      };
    }
    
    if (effects.includes('fire')) {
      return {
        className: 'vip-fire-effect',
        style: {
          color: '#ff6b35',
          textShadow: '0 0 5px #ff6b35, 0 0 10px #ff6b35'
        }
      };
    }
    
    if (effects.includes('ice')) {
      return {
        className: 'vip-ice-effect',
        style: {
          color: '#00d4ff',
          textShadow: '0 0 5px #00d4ff, 0 0 10px #00d4ff'
        }
      };
    }
    
    if (effects.includes('shadow')) {
      return {
        className: 'vip-shadow-effect',
        style: {
          textShadow: '3px 3px 6px rgba(0, 0, 0, 0.5)'
        }
      };
    }

    return {};
  };

  const effectStyles = getEffectStyles();

  return (
    <>
      <style>{`
        @keyframes glow {
          0%, 100% { text-shadow: 0 0 10px rgba(139, 92, 246, 0.5); }
          50% { text-shadow: 0 0 20px rgba(139, 92, 246, 0.8), 0 0 30px rgba(139, 92, 246, 0.6); }
        }
        
        @keyframes rainbow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .vip-sparkle-effect::before {
          content: '✨';
          position: absolute;
          left: -20px;
          animation: sparkle 1.5s ease-in-out infinite;
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      
      <div className={effectStyles.className} style={effectStyles.style}>
        {children}
      </div>
    </>
  );
}