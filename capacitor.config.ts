import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.dc8528808d134e6b95c8cce4660ffa8d',
  appName: 'Tabedaar.com',
  webDir: 'dist',
  backgroundColor: '#0B1A3D',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0B1A3D'
  },
  android: {
    backgroundColor: '#0B1A3D'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0B1A3DFF',
      androidScaleType: 'CENTER_CROP',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false
    }
  }
};

export default config;
