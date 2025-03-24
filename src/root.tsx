import { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';

// from MUI's toolpad we only use Notifications
import { NotificationsProvider } from '@toolpad/core/useNotifications';
import { Provider as JotaiProvider } from 'jotai';

import ThemeProvider from '@/theme/Provider';
import { IPFSServiceWorkerProvider } from '@/components/IPFSServiceWorkerProvider';
import { CircularProgress, Box } from '@mui/material';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

function render(App: ComponentType) {
  root.render(
      <JotaiProvider>
        <ThemeProvider>
          <NotificationsProvider>
            <IPFSServiceWorkerProvider fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
              </Box>
            }>
              <App />
            </IPFSServiceWorkerProvider>
          </NotificationsProvider>
        </ThemeProvider>
      </JotaiProvider>,
  );
}

export default render;
