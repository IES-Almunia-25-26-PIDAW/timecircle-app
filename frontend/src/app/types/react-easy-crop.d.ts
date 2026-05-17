declare module 'react-easy-crop' {
  import * as React from 'react';
  const Cropper: React.ComponentType<any>;
  export default Cropper;
}

declare module 'react-easy-crop/types' {
  export type Area = { x: number; y: number; width: number; height: number };
}
