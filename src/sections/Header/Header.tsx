import GitHubIcon from '@mui/icons-material/GitHub';
import ThemeIcon from '@mui/icons-material/InvertColors';
import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Button, Divider, IconButton, Stack, Toolbar, Tooltip } from '@mui/material';

import { useNotifications } from '@toolpad/core/useNotifications';

import { repository, title } from '@/config';
import { useHotKeysDialog } from '@/sections/HotKeys/hooks';
import { useSidebar } from '@/sections/Sidebar/hooks';
import { useThemeMode } from '@/theme';

import { HotKeysButton } from './styled';
import { getRandomJoke } from './utils';

function Header() {
  const { themeMode, toggle: toggleThemeMode } = useThemeMode();
  const { open: openSidebar } = useSidebar();
  const { open: openHotKeysDialog } = useHotKeysDialog();
  const notifications = useNotifications();

  function showNotification() {
    
  }

  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      data-pw={`theme-${themeMode}`}
      enableColorOnDark
      sx={{
        backgroundColor: 'transparent',
        boxShadow: 'none',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flex={1}>
          <Stack direction="row" gap={1} alignItems="center">
            <IconButton
              size="large"
              edge="start"
              color="info"
              aria-label="menu"
              onClick={openSidebar}
            >
              <MenuIcon />
            </IconButton>
            <Button onClick={showNotification} color="info">
              {title}
            </Button>
          </Stack>
          <Stack direction="row" alignItems="center">
            <Divider orientation="vertical" flexItem />
            <Tooltip title="Switch theme" arrow>
              <IconButton
                color="info"
                edge="end"
                size="large"
                onClick={toggleThemeMode}
                data-pw="theme-toggle"
              >
                <ThemeIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

export default Header;
