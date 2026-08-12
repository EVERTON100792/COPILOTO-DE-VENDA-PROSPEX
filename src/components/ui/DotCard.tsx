import React, { HTMLAttributes } from 'react';

export interface DotCardProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function DotCard({ children, className = '', ...props }: DotCardProps) {
  return (
    <div className={`dot-card-wrapper ${className}`} {...props}>
      {/* Background glow overlay */}
      <div className="dot-card-bg" />

      {/* Inner corner crosshairs / grid lines to match the image style */}
      <div className="dot-card-line-h top" />
      <div className="dot-card-line-h bottom" />
      <div className="dot-card-line-v left" />
      <div className="dot-card-line-v right" />

      {/* The moving glowing dot */}
      <div className="dot-card-tracer">
        <div className="dot-card-dot" />
      </div>

      {/* Content Container */}
      <div className="dot-card-content">
        {children}
      </div>
    </div>
  );
}

export default DotCard;
