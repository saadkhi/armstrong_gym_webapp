import React from 'react';
import logoImg from '../assets/images/logo.jpg';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  showText = true,
  size = 'md',
}) => {
  const sizeMap = {
    sm: { container: 'h-10', img: 'h-10 w-auto' },
    md: { container: 'h-14', img: 'h-14 w-auto' },
    lg: { container: 'h-20', img: 'h-20 w-auto' },
    xl: { container: 'h-32', img: 'h-32 w-auto' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center select-none ${currentSize.container} ${className}`}>
      <img
        src={logoImg}
        alt="Armstrong Gym and Fitness Logo"
        className={`${currentSize.img} object-contain rounded-xl shadow-lg border border-white/10`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

