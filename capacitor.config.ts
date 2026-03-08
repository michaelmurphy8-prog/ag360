import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ag360.farm',
  appName: 'AG360',
  webDir: 'out',
  server: {
    url: 'https://ag360.farm/mobile',
    cleartext: false,
  },
};

export default config;