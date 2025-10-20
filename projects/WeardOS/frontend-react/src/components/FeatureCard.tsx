import React from 'react';

interface Feature {
  id: number;
  title: string;
  description: string;
  icon: string;
}

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ feature, index }) => {
  return (
    <div className="f">
      <div className="img">
        <svg className="art-sm" viewBox="0 0 600 220" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`feature-g${index + 1}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={index === 0 ? "#21d4fd" : index === 1 ? "#b721ff" : "#00ff88"}/>
              <stop offset="100%" stopColor={index === 0 ? "#b721ff" : index === 1 ? "#21d4fd" : "#00d4ff"}/>
            </linearGradient>
            <filter id={`feature-blur${index + 1}`}>
              <feGaussianBlur stdDeviation={12 - index * 2}/>
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="transparent"/>
          <ellipse 
            cx={index === 2 ? "300" : "200"} 
            cy="110" 
            rx={index === 2 ? "150" : "120"} 
            ry={index === 2 ? "80" : "60"} 
            fill={index === 0 ? "#21d4fd" : index === 1 ? "#b721ff" : "#00ff88"} 
            opacity=".4" 
            filter={`url(#feature-blur${index + 1})`}
          >
            <animate attributeName="opacity" values=".4;.6;.4" dur={`${8 + index}s`} repeatCount="indefinite"/>
          </ellipse>
          {index !== 2 && (
            <ellipse 
              cx="400" 
              cy="110" 
              rx="120" 
              ry="60" 
              fill={index === 0 ? "#b721ff" : "#21d4fd"} 
              opacity=".3" 
              filter={`url(#feature-blur${index + 1})`}
            >
              <animate attributeName="opacity" values=".3;.5;.3" dur={`${6 + index * 3}s`} repeatCount="indefinite"/>
            </ellipse>
          )}
        </svg>
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </div>
  );
};

export default FeatureCard;