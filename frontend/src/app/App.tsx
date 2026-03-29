import { RouterProvider } from 'react-router';
import { ThemeProvider } from 'next-themes';
import { router } from './routes';
import { AppProvider } from './context/AppContext';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppProvider>
        <RouterProvider router={router} />
        <SpeedInsights />
      </AppProvider>
      <Analytics />
    </ThemeProvider>
  );
}
