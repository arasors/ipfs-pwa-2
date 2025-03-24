import { useState, useMemo } from 'react';
import { 
  Typography, 
  Box, 
  Divider, 
  IconButton, 
  List,
  ListItem,
  ListItemText,
  Drawer,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
  Badge,
  Chip,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Button
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CloseIcon from '@mui/icons-material/Close';
import ErrorIcon from '@mui/icons-material/Error';
import MessageIcon from '@mui/icons-material/Message';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

import { useEventLog, LogEntryType, LogEntry, TopicInfo } from '../store/eventLogStore';

// Sidebar genişliği
const SIDEBAR_WIDTH = 300;

interface EventLogSidebarProps {
  open: boolean;
  onClose: () => void;
  width?: number;
}

function EventLogSidebar({ open, onClose, width = SIDEBAR_WIDTH }: EventLogSidebarProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState<LogEntryType | 'all' | 'topics'>('all');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // Zustand store'dan event log verilerini al
  const {
    entries,
    topics,
    activeTopics,
    maxEntries,
    autoClean,
    clearLogs,
    getLogsByType,
    getTopicInfo,
    setActiveTopics,
    setMaxEntries,
    setAutoClean
  } = useEventLog();
  
  // Filtrelenmiş logları al
  const filteredLogs = useMemo(() => {
    if (activeTab === 'all') {
      // Seçili topic yoksa, tüm logları göster
      if (activeTopics.length === 0) return entries;
      
      // Seçili topic varsa, sadece o topic ile ilgili logları göster
      return entries.filter(entry => 
        entry.data?.topicId && activeTopics.includes(entry.data.topicId)
      );
    } else if (activeTab === 'topics') {
      // Topics tab'ı seçildiğinde log gösterme
      return [];
    } else {
      // Belirli bir log tipine göre filtrele
      const typeEntries = getLogsByType(activeTab);
      
      // Seçili topic yoksa, tüm logları göster
      if (activeTopics.length === 0) return typeEntries;
      
      // Seçili topic varsa, sadece o topic ile ilgili logları göster
      return typeEntries.filter(entry => 
        entry.data?.topicId && activeTopics.includes(entry.data.topicId)
      );
    }
  }, [entries, activeTab, activeTopics, getLogsByType]);
  
  // Tab değişimini işle
  const handleTabChange = (_event: React.SyntheticEvent, newValue: LogEntryType | 'all' | 'topics') => {
    setActiveTab(newValue);
  };
  
  // Topic seçimini işle
  const handleTopicSelect = (topicId: string) => {
    // Topic zaten aktifse, deaktif et
    if (activeTopics.includes(topicId)) {
      setActiveTopics(activeTopics.filter(id => id !== topicId));
    } else {
      // Topic aktif değilse, aktif et
      setActiveTopics([...activeTopics, topicId]);
    }
  };
  
  // Tüm topic'leri seç/kaldır
  const handleToggleAllTopics = () => {
    if (activeTopics.length === Object.keys(topics).length) {
      // Tüm topic'ler seçiliyse, hiçbirini seçme
      setActiveTopics([]);
    } else {
      // Tüm topic'leri seç
      setActiveTopics(Object.keys(topics));
    }
  };
  
  // Log girişini formatla
  const formatLogEntry = (entry: LogEntry) => {
    // Zaman formatını oluştur
    const time = new Date(entry.timestamp).toLocaleTimeString();
    
    // Mesaj tipine göre icon ve renk belirle
    let icon;
    let color;
    
    switch (entry.type) {
      case 'subscription':
        icon = entry.data?.isSubscribed ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />;
        color = entry.data?.isSubscribed ? theme.palette.success.main : theme.palette.text.secondary;
        break;
      case 'message':
        icon = <MessageIcon fontSize="small" />;
        color = theme.palette.info.main;
        break;
      case 'connection':
        const isConnected = entry.data?.status === 'connected';
        icon = isConnected ? <NotificationsIcon fontSize="small" /> : <NotificationsIcon fontSize="small" />;
        color = isConnected ? theme.palette.success.main : theme.palette.warning.main;
        break;
      case 'error':
        icon = <ErrorIcon fontSize="small" />;
        color = theme.palette.error.main;
        break;
      default:
        icon = <NotificationsIcon fontSize="small" />;
        color = theme.palette.text.primary;
    }
    
    return (
      <ListItem 
        key={entry.id} 
        sx={{ 
          borderLeft: `3px solid ${color}`,
          mb: 0.5,
          bgcolor: 'background.paper',
          borderRadius: '4px'
        }}
        dense
      >
        <Box sx={{ mr: 1, color }}>{icon}</Box>
        <ListItemText 
          primary={
            <Typography variant="body2">
              {entry.message}
            </Typography>
          }
          secondary={
            <Typography variant="caption" color="text.secondary">
              {time}
            </Typography>
          }
        />
      </ListItem>
    );
  };
  
  // Topic'i formatla
  const formatTopic = (topicId: string, topicInfo: TopicInfo) => {
    const isActive = activeTopics.includes(topicId);
    const participantCount = topicInfo.participants ? topicInfo.participants.size : 0;
    
    return (
      <ListItem 
        key={topicId} 
        sx={{ 
          borderLeft: `3px solid ${isActive ? theme.palette.primary.main : theme.palette.divider}`,
          mb: 0.5,
          bgcolor: 'background.paper',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
        dense
        onClick={() => handleTopicSelect(topicId)}
      >
        <ListItemText 
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight={isActive ? 'bold' : 'normal'}>
                {topicInfo.name || topicId.substring(0, 8)}
              </Typography>
              
              <Box>
                {topicInfo.isPublic && (
                  <Chip 
                    label="Public" 
                    size="small" 
                    color="success" 
                    variant="outlined"
                    sx={{ mr: 0.5, height: '18px', fontSize: '0.6rem' }}
                  />
                )}
                <Chip 
                  label={topicInfo.messageCount} 
                  size="small" 
                  color={isActive ? "primary" : "default"} 
                  variant={isActive ? "filled" : "outlined"}
                  sx={{ height: '18px', fontSize: '0.6rem' }}
                />
              </Box>
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {new Date(topicInfo.subscribedAt).toLocaleTimeString()}
              </Typography>
              
              <Tooltip title={`${participantCount} participants`}>
                <Chip 
                  label={`${participantCount} 👤`}
                  size="small" 
                  variant="outlined"
                  sx={{ height: '16px', fontSize: '0.6rem' }}
                />
              </Tooltip>
            </Box>
          }
        />
      </ListItem>
    );
  };
  
  // Ayarlar paneli
  const renderSettings = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Settings</Typography>
      
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Max Log Entries</InputLabel>
        <Select
          value={maxEntries}
          label="Max Log Entries"
          onChange={(e) => setMaxEntries(Number(e.target.value))}
        >
          <MenuItem value={50}>50 entries</MenuItem>
          <MenuItem value={100}>100 entries</MenuItem>
          <MenuItem value={200}>200 entries</MenuItem>
          <MenuItem value={500}>500 entries</MenuItem>
          <MenuItem value={1000}>1000 entries</MenuItem>
        </Select>
      </FormControl>
      
      <FormControlLabel
        control={
          <Switch
            checked={autoClean}
            onChange={(e) => setAutoClean(e.target.checked)}
          />
        }
        label="Auto clean old logs"
      />
      
      <Box sx={{ mt: 4 }}>
        <Tooltip title="Clear all logs">
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={clearLogs}
            fullWidth
          >
            Clear All Logs
          </Button>
        </Tooltip>
      </Box>
    </Box>
  );
  
  // Sidebar içeriği
  const renderSidebarContent = () => (
    <Box sx={{ 
      width: isMobile ? '100%' : width, 
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{ 
        p: 2, 
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">Event Log</Typography>
        
        <Box>
          <Tooltip title="Settings">
            <IconButton size="small" onClick={() => setShowSettings(!showSettings)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Clear logs">
            <IconButton size="small" onClick={clearLogs} sx={{ ml: 1 }}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          
          {isMobile && (
            <IconButton size="small" onClick={onClose} sx={{ ml: 1 }}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>
      
      {showSettings ? (
        renderSettings()
      ) : (
        <>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}
          >
            <Tab 
              label={
                <Badge badgeContent={entries.length} color="primary" max={99}>
                  <Box sx={{ px: 1 }}>All</Box>
                </Badge>
              } 
              value="all" 
            />
            <Tab 
              label={
                <Badge badgeContent={getLogsByType('message').length} color="info" max={99}>
                  <Box sx={{ px: 1 }}>Messages</Box>
                </Badge>
              } 
              value="message" 
            />
            <Tab 
              label={
                <Badge badgeContent={getLogsByType('subscription').length} color="success" max={99}>
                  <Box sx={{ px: 1 }}>Subs</Box>
                </Badge>
              } 
              value="subscription" 
            />
            <Tab 
              label={
                <Badge badgeContent={getLogsByType('connection').length} color="warning" max={99}>
                  <Box sx={{ px: 1 }}>Conn</Box>
                </Badge>
              } 
              value="connection" 
            />
            <Tab 
              label={
                <Badge badgeContent={getLogsByType('error').length} color="error" max={99}>
                  <Box sx={{ px: 1 }}>Errors</Box>
                </Badge>
              } 
              value="error" 
            />
            <Tab 
              label={
                <Badge badgeContent={Object.keys(topics).length} color="secondary" max={99}>
                  <Box sx={{ px: 1 }}>Topics</Box>
                </Badge>
              } 
              value="topics" 
            />
          </Tabs>
          
          {activeTab === 'topics' ? (
            <Box sx={{ p: 1 }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 1,
                p: 1,
                pb: 10
              }}>
                <Typography variant="body2">
                  Topics ({Object.keys(topics).length})
                </Typography>
                
                <Tooltip title={activeTopics.length === Object.keys(topics).length ? "Deselect all" : "Select all"}>
                  <IconButton 
                    size="small" 
                    onClick={handleToggleAllTopics}
                  >
                    <FilterAltIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <List sx={{ p: 0, overflowY: 'auto', flex: 1 }}>
                {Object.entries(topics).map(([topicId, topicInfo]) => (
                  formatTopic(topicId, topicInfo)
                ))}
              </List>
            </Box>
          ) : (
            <Box sx={{ p: 1, overflowY: 'auto', flex: 1 }}>
              {activeTopics.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {activeTopics.map(topicId => {
                    const topic = getTopicInfo(topicId);
                    return (
                      <Tooltip key={topicId} title={`Click to remove filter: ${topicId}`}>
                        <Chip
                          size="small"
                          label={topic?.name || topicId.substring(0, 8)}
                          color="primary"
                          onDelete={() => handleTopicSelect(topicId)}
                          sx={{ height: '24px' }}
                        />
                      </Tooltip>
                    );
                  })}
                  
                  {activeTopics.length > 0 && (
                    <Tooltip title="Clear all filters">
                      <Chip
                        size="small"
                        label="Clear filters"
                        color="default"
                        onClick={() => setActiveTopics([])}
                        sx={{ height: '24px' }}
                      />
                    </Tooltip>
                  )}
                </Box>
              )}
              
              <List sx={{ p: 0 }}>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(entry => formatLogEntry(entry))
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    height: '100px'
                  }}>
                    <Typography variant="body2" color="text.secondary">
                      No logs to display
                    </Typography>
                  </Box>
                )}
              </List>
            </Box>
          )}
        </>
      )}
    </Box>
  );

  // Responsive görünüm
  return isMobile ? (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ 
        zIndex: theme.zIndex.appBar - 1,
        '& .MuiDrawer-paper': {
          width: '100%',
          maxWidth: '100%'
        }
      }}
    >
      {renderSidebarContent()}
    </Drawer>
  ) : (
    <Box
      sx={{
        width: open ? width : 0,
        flexShrink: 0,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        height: '100%',
        overflow: 'hidden',
        borderLeft: open ? `1px solid ${theme.palette.divider}` : 'none'
      }}
    >
      {open && renderSidebarContent()}
    </Box>
  );
}

export default EventLogSidebar; 