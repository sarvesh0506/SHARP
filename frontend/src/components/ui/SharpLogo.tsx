import React from 'react';
import sharpLogo from '../../assets/sharp-logo.jpg';

export type SharpLogoVariant = 'navbar' | 'sidebar' | 'loading' | 'auth' | 'register';

interface SharpLogoProps {
  variant?: SharpLogoVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<SharpLogoVariant, string> = {
  navbar: 'h-10 sm:h-12 w-auto max-w-[180px] sm:max-w-[220px]',
  sidebar: 'h-9 w-auto max-w-[155px]',
  loading: 'h-16 w-auto max-w-[240px]',
  auth: 'w-full max-w-[380px] h-auto',
  register: 'w-full max-w-[280px] sm:max-w-[300px] h-auto',
};

export const SharpLogo: React.FC<SharpLogoProps> = ({ variant = 'navbar', className = '' }) => {
  return (
    <img
      src={sharpLogo}
      alt="SHARP"
      className={`object-contain block select-none mix-blend-lighten ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
};
