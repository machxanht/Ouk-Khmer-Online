import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nguyencongthanhfbb.khmerouk',
  appName: 'Khmer Ouk',
  webDir: '.output/public',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'ouk-khmer-online.vercel.app',
      'project-by-khang.firebaseapp.com',
      'project-by-khang.web.app',
      '*.firebaseapp.com',
      '*.googleapis.com',
      '*.google.com',
      '*.facebook.com',
      '*.fbcdn.net',
    ],
  },
};

export default config;
