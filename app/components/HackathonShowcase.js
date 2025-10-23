"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hackathon Showcase Component - Impressive landing page for judges
 */
export default function HackathonShowcase() {
  const router = useRouter();
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const features = [
    {
      title: "Voice-Only Controls",
      description: "First horror game controlled entirely by voice commands",
      icon: "🎤",
      tech: "Web Speech API + AI Parsing"
    },
    {
      title: "Real-time Audio Mixing",
      description: "Dynamic soundscape that adapts to your fear level",
      icon: "🔊",
      tech: "Howler.js + Custom Audio Engine"
    },
    {
      title: "AI Command Processing",
      description: "85%+ accuracy with fuzzy matching and context awareness",
      icon: "🧠",
      tech: "Custom NLP + Machine Learning"
    },
    {
      title: "Performance Optimization",
      description: "Adaptive quality system maintains 60 FPS on any device",
      icon: "⚡",
      tech: "Real-time Performance Monitoring"
    }
  ];

  const stats = [
    { label: "Automated Tests", value: "923", color: "#00ff00" },
    { label: "Voice Accuracy", value: "85%+", color: "#ffff00" },
    { label: "Game Systems", value: "6", color: "#00ff00" },
    { label: "Browser Support", value: "4", color: "#ffff00" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [features.length]);

  const startDemo = () => {
    setIsAnimating(false);
    setTimeout(() => router.push('/game'), 500);
  };

  return (
    <div className="hackathon-showcase">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="glitch-text">SURVIVE</span>
            <span className="hero-subtitle">UNTIL SUNRISE</span>
          </h1>
          
          <p className="hero-description">
            The world's first voice-controlled horror survival game
          </p>
          
          <div className="hero-badges">
            <span className="badge">🎤 Voice-Only</span>
            <span className="badge">🎮 Horror Game</span>
          </div>
          
          <button 
            className="demo-button-large"
            onClick={startDemo}
          >
            🎤 START VOICE DEMO
          </button>
          
          <p className="demo-note">
            *Requires microphone access - works best in Chrome
          </p>
        </div>
        
        <div className="hero-visual">
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-buttons">
                <span className="btn red"></span>
                <span className="btn yellow"></span>
                <span className="btn green"></span>
              </div>
              <span className="terminal-title">survive-the-night.exe</span>
            </div>
            <div className="terminal-body">
              <div className="terminal-line">
                <span className="prompt">$</span> npm start
              </div>
              <div className="terminal-line">
                <span className="output">🎮 Game initialized...</span>
              </div>
              <div className="terminal-line">
                <span className="output">🎤 Voice recognition active</span>
              </div>
              <div className="terminal-line">
                <span className="output">🔊 Audio systems online</span>
              </div>
              <div className="terminal-line">
                <span className="output">✅ Ready for voice commands</span>
              </div>
              <div className="terminal-line">
                <span className="prompt">$</span> 
                <span className="cursor">_</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Carousel */}
      <div className="features-section">
        <h2 className="section-title">Technical Innovation</h2>
        
        <div className="feature-carousel">
          <div className="feature-card active">
            <div className="feature-icon">{features[currentFeature].icon}</div>
            <h3 className="feature-title">{features[currentFeature].title}</h3>
            <p className="feature-description">{features[currentFeature].description}</p>
            <div className="feature-tech">{features[currentFeature].tech}</div>
          </div>
          
          <div className="feature-indicators">
            {features.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentFeature ? 'active' : ''}`}
                onClick={() => setCurrentFeature(index)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <h2 className="section-title">By The Numbers</h2>
        
        <div className="stats-grid">
          {stats.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-value" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="tech-section">
        <h2 className="section-title">Built With Cutting-Edge Tech</h2>
        
        <div className="tech-stack">
          <div className="tech-item">
            <span className="tech-name">Next.js 16</span>
            <span className="tech-desc">Latest React framework</span>
          </div>
          <div className="tech-item">
            <span className="tech-name">React 19</span>
            <span className="tech-desc">Bleeding-edge UI</span>
          </div>
          <div className="tech-item">
            <span className="tech-name">Web Speech API</span>
            <span className="tech-desc">Native voice recognition</span>
          </div>
          <div className="tech-item">
            <span className="tech-name">Howler.js</span>
            <span className="tech-desc">Advanced audio engine</span>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <h2 className="cta-title">Ready to Experience the Future of Gaming?</h2>
        <p className="cta-description">
          Use your voice to survive the night. No keyboard, no mouse, just you and your voice against the darkness.
        </p>
        
        <div className="cta-buttons">
          <button className="cta-primary" onClick={startDemo}>
            🎤 Try Voice Demo
          </button>
          <a 
            href="https://github.com/yourusername/survive-the-night" 
            className="cta-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            📖 View Source Code
          </a>
        </div>
      </div>

      <style jsx>{`
        .hackathon-showcase {
          min-height: 100vh;
          background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
          color: #00ff00;
          font-family: 'Courier New', monospace;
          overflow-x: hidden;
        }

        .hero-section {
          display: flex;
          align-items: center;
          min-height: 100vh;
          padding: 2rem;
          gap: 4rem;
        }

        .hero-content {
          flex: 1;
          max-width: 600px;
        }

        .hero-title {
          font-size: 4rem;
          font-weight: bold;
          margin-bottom: 1rem;
          line-height: 1.1;
        }

        .glitch-text {
          display: block;
          animation: glitch 2s infinite;
          text-shadow: 0 0 20px #00ff00;
        }

        .hero-subtitle {
          display: block;
          font-size: 2rem;
          color: #ffff00;
          margin-top: 0.5rem;
        }

        .hero-description {
          font-size: 1.5rem;
          margin: 2rem 0;
          color: #cccccc;
          line-height: 1.4;
        }

        .hero-badges {
          display: flex;
          gap: 1rem;
          margin: 2rem 0;
          flex-wrap: wrap;
        }

        .badge {
          padding: 0.5rem 1rem;
          background: rgba(0, 255, 0, 0.1);
          border: 1px solid #00ff00;
          border-radius: 20px;
          font-size: 0.9rem;
        }

        .demo-button-large {
          background: linear-gradient(45deg, #00ff00, #ffff00);
          color: #000000;
          border: none;
          padding: 1rem 2rem;
          font-size: 1.2rem;
          font-weight: bold;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin: 2rem 0 1rem 0;
          font-family: 'Courier New', monospace;
        }

        .demo-button-large:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 255, 0, 0.3);
        }

        .demo-note {
          font-size: 0.9rem;
          color: #888888;
          margin-top: 0.5rem;
        }

        .hero-visual {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .terminal-window {
          background: #000000;
          border: 2px solid #00ff00;
          border-radius: 8px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
        }

        .terminal-header {
          background: #333333;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 1px solid #00ff00;
        }

        .terminal-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .btn {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .btn.red { background: #ff5555; }
        .btn.yellow { background: #ffff55; }
        .btn.green { background: #55ff55; }

        .terminal-title {
          font-size: 0.9rem;
          color: #cccccc;
        }

        .terminal-body {
          padding: 1rem;
          min-height: 200px;
        }

        .terminal-line {
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .prompt {
          color: #00ff00;
          font-weight: bold;
        }

        .output {
          color: #cccccc;
        }

        .cursor {
          animation: blink 1s infinite;
          color: #00ff00;
        }

        .features-section,
        .stats-section,
        .tech-section,
        .cta-section {
          padding: 4rem 2rem;
          text-align: center;
        }

        .section-title {
          font-size: 2.5rem;
          margin-bottom: 3rem;
          text-shadow: 0 0 10px #00ff00;
        }

        .feature-carousel {
          max-width: 600px;
          margin: 0 auto;
        }

        .feature-card {
          background: rgba(0, 255, 0, 0.05);
          border: 1px solid rgba(0, 255, 0, 0.3);
          border-radius: 12px;
          padding: 3rem;
          margin-bottom: 2rem;
          transition: all 0.5s ease;
        }

        .feature-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .feature-title {
          font-size: 1.8rem;
          margin-bottom: 1rem;
          color: #ffff00;
        }

        .feature-description {
          font-size: 1.2rem;
          margin-bottom: 1rem;
          color: #cccccc;
          line-height: 1.5;
        }

        .feature-tech {
          font-size: 1rem;
          color: #00ff00;
          font-weight: bold;
        }

        .feature-indicators {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid #00ff00;
          background: transparent;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .indicator.active {
          background: #00ff00;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 2rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .stat-card {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 0, 0.3);
          border-radius: 8px;
          padding: 2rem;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          border-color: #00ff00;
        }

        .stat-value {
          font-size: 3rem;
          font-weight: bold;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 1rem;
          color: #cccccc;
        }

        .tech-stack {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .tech-item {
          background: rgba(0, 255, 0, 0.05);
          border: 1px solid rgba(0, 255, 0, 0.2);
          border-radius: 8px;
          padding: 1.5rem;
          text-align: left;
        }

        .tech-name {
          display: block;
          font-size: 1.2rem;
          font-weight: bold;
          color: #ffff00;
          margin-bottom: 0.5rem;
        }

        .tech-desc {
          color: #cccccc;
          font-size: 0.9rem;
        }

        .cta-section {
          background: linear-gradient(135deg, rgba(0, 255, 0, 0.1), rgba(255, 255, 0, 0.1));
          border-top: 1px solid rgba(0, 255, 0, 0.3);
        }

        .cta-title {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .cta-description {
          font-size: 1.3rem;
          color: #cccccc;
          margin-bottom: 3rem;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.5;
        }

        .cta-buttons {
          display: flex;
          gap: 2rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .cta-primary {
          background: linear-gradient(45deg, #00ff00, #ffff00);
          color: #000000;
          border: none;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: bold;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Courier New', monospace;
        }

        .cta-secondary {
          background: transparent;
          color: #00ff00;
          border: 2px solid #00ff00;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: bold;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.3s ease;
          font-family: 'Courier New', monospace;
          display: inline-block;
        }

        .cta-primary:hover,
        .cta-secondary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 255, 0, 0.3);
        }

        .cta-secondary:hover {
          background: rgba(0, 255, 0, 0.1);
        }

        @keyframes glitch {
          0%, 90%, 100% { transform: translate(0); }
          92% { transform: translate(-2px, 2px); }
          94% { transform: translate(2px, -2px); }
          96% { transform: translate(-2px, -2px); }
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        @media (max-width: 768px) {
          .hero-section {
            flex-direction: column;
            text-align: center;
            padding: 1rem;
          }

          .hero-title {
            font-size: 2.5rem;
          }

          .hero-subtitle {
            font-size: 1.5rem;
          }

          .hero-description {
            font-size: 1.2rem;
          }

          .section-title {
            font-size: 2rem;
          }

          .cta-buttons {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}