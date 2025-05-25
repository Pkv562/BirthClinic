// components/ui/VisuallyHidden.tsx
import React from 'react';

const VisuallyHidden = ({ children }: { children: React.ReactNode }) => {
  return (
    <span style={{
      position: 'absolute',
      width: '1px',
      height: '1px',
      margin: '-1px',
      padding: '0',
      border: '0',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      wordWrap: 'normal'
    }}>
      {children}
    </span>
  );
};

export default VisuallyHidden;