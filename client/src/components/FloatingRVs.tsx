import { useEffect, useState } from "react";
import rvIcon from "@assets/image_1767656588622.png";

interface FloatingRV {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

export function FloatingRVs() {
  const [rvs, setRvs] = useState<FloatingRV[]>([]);

  useEffect(() => {
    const generateRVs = () => {
      const newRvs: FloatingRV[] = [];
      for (let i = 0; i < 6; i++) {
        newRvs.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: 30 + Math.random() * 25,
          duration: 15 + Math.random() * 20,
          delay: Math.random() * -20,
          opacity: 0.08 + Math.random() * 0.1,
        });
      }
      setRvs(newRvs);
    };
    generateRVs();
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {rvs.map((rv) => (
        <div
          key={rv.id}
          className="absolute animate-float"
          style={{
            left: `${rv.x}%`,
            top: `${rv.y}%`,
            width: rv.size,
            height: rv.size,
            opacity: rv.opacity,
            animationDuration: `${rv.duration}s`,
            animationDelay: `${rv.delay}s`,
          }}
        >
          <img
            src={rvIcon}
            alt=""
            className="w-full h-full object-contain"
            style={{ filter: 'grayscale(100%) brightness(0.6)' }}
          />
        </div>
      ))}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(10px, -15px) rotate(2deg);
          }
          50% {
            transform: translate(-5px, -25px) rotate(-1deg);
          }
          75% {
            transform: translate(-15px, -10px) rotate(1deg);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}
