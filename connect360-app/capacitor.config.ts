import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ag360.connect360',
  appName: 'Connect360',
  webDir: 'www',
  server: {
    url: 'https://ag360.farm/auth',
    cleartext: false,
  },
  ios: {
    scheme: 'Connect360',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#0D1520',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0D1520',
    },
  },
};

export default config;
