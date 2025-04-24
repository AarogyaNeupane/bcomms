import React from "react";

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
}

export function IPhoneFrame({ children, className }: PhoneFrameProps) {
  return (
    <div 
      className={`relative mx-auto h-[600px] max-h-[90vh] w-[320px] rounded-[40px] border-[14px] border-black bg-white shadow-xl dark:border-gray-800 ${className}`}
      style={{ aspectRatio: '9/19' }}
    >
      {/* Notch */}
      <div className="absolute left-1/2 top-0 h-6 w-36 -translate-x-1/2 rounded-b-xl bg-black dark:bg-gray-800"></div>
      
      {/* Side Button */}
      <div className="absolute -right-[14px] top-24 h-16 w-[2px] rounded-l-lg bg-gray-800 dark:bg-gray-600"></div>
      
      {/* Volume Buttons */}
      <div className="absolute -left-[14px] top-20 h-6 w-[2px] rounded-r-lg bg-gray-800 dark:bg-gray-600"></div>
      <div className="absolute -left-[14px] top-32 h-6 w-[2px] rounded-r-lg bg-gray-800 dark:bg-gray-600"></div>
      
      {/* Content */}
      <div className="h-full w-full overflow-hidden rounded-3xl bg-white dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
} 