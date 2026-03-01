import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.dc8528808d134e6b95c8cce4660ffa8d',
  appName: 'Tabedaar.com',
  webDir: 'dist',
  server: {
    url: 'https://dc852880-8d13-4e6b-95c8-cce4660ffa8d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
