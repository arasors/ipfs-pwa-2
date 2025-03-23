import { useState, useEffect, useRef } from 'react';
import { 
  Typography, 
  Box, 
  TextField, 
  Button, 
  List, 
  Divider, 
  Grid, 
  IconButton, 
  CircularProgress,
  Chip,
  Drawer,
  useTheme,
  useMediaQuery
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import ForumIcon from '@mui/icons-material/Forum';
import CloseIcon from '@mui/icons-material/Close';
import { useIPFS } from '../../components/IPFSProvider';
import { IPFSMessage, storeMessage, retrieveMessage } from '../../utils/ipfs';
import { v4 as uuidv4 } from 'uuid';

// Sidebar width
const SIDEBAR_WIDTH = 300;

interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    timestamp: number;
  };
}

function Page2() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [message, setMessage] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const messageEndRef = useRef<null | HTMLDivElement>(null);
  const { ipfs, isReady, jsonHelper } = useIPFS();
  const [messageIds, setMessageIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<IPFSMessage[]>([]);
  
  // Get the current wallet address as our ID
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null;
  
  // Scroll to bottom of messages
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Initialize IPFS and load messages
  useEffect(() => {
    if (isReady && ipfs) {
      console.log('IPFS is ready in chat component');
      // When IPFS is ready, set connected to true
      setConnected(true);
      
      // Check if we have saved message IDs in localStorage
      const savedIds = localStorage.getItem('ipfs_message_ids');
      if (savedIds) {
        const ids = JSON.parse(savedIds);
        setMessageIds(ids);
        
        // Load the messages
        loadMessages(ids);
      }
      
      // Load chats from localStorage
      const savedChats = localStorage.getItem('ipfs_chats');
      if (savedChats) {
        setChats(JSON.parse(savedChats));
      }
    }
  }, [isReady, ipfs]);
  
  // Load messages from IPFS by their CIDs
  const loadMessages = async (ids: string[]) => {
    if (!ids.length) return;
    
    setIsLoading(true);
    
    try {
      const loadedMessages = await Promise.all(
        ids.map(async (cid) => {
          try {
            return await retrieveMessage(cid);
          } catch (err) {
            console.error(`Failed to load message with CID ${cid}:`, err);
            return null;
          }
        })
      );
      
      // Filter out nulls and sort by timestamp
      const validMessages = loadedMessages
        .filter((msg): msg is IPFSMessage => msg !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(validMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to a recipient
  const handleConnect = () => {
    if (!recipientId) return;
    
    // Create a new chat with the recipient
    const newChat: Chat = {
      id: uuidv4(),
      participants: [currentUserId || 'unknown', recipientId],
    };
    
    // Update chats
    const updatedChats = [...chats, newChat];
    setChats(updatedChats);
    localStorage.setItem('ipfs_chats', JSON.stringify(updatedChats));
    
    // Set as current chat
    setCurrentChat(newChat);
    setConnected(true);
    
    // Close mobile sidebar if open
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  };

  // Send a message
  const handleSendMessage = async () => {
    if (!message.trim() || !currentChat || !isReady) return;
    
    setIsLoading(true);
    
    try {
      // Create message object
      const ipfsMessage: IPFSMessage = {
        id: uuidv4(),
        from: currentUserId || 'unknown',
        to: recipientId,
        content: message,
        timestamp: Date.now()
      };
      
      // Store the message in IPFS
      const cid = await storeMessage(ipfsMessage);
      
      // Update messages
      setMessages(prev => [...prev, ipfsMessage]);
      
      // Save CID to our list
      const updatedIds = [...messageIds, cid];
      setMessageIds(updatedIds);
      
      // Save to localStorage for persistence
      localStorage.setItem('ipfs_message_ids', JSON.stringify(updatedIds));
      
      // Update current chat with last message
      if (currentChat) {
        const updatedChat = {
          ...currentChat,
          lastMessage: {
            content: message,
            timestamp: Date.now()
          }
        };
        
        // Update chats list
        const updatedChats = chats.map(chat => 
          chat.id === currentChat.id ? updatedChat : chat
        );
        setChats(updatedChats);
        setCurrentChat(updatedChat);
        
        // Save to localStorage
        localStorage.setItem('ipfs_chats', JSON.stringify(updatedChats));
      }
      
      // Clear the input
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Copy ID to clipboard
  const copyIdToClipboard = () => {
    if (!currentUserId) return;
    
    navigator.clipboard.writeText(currentUserId);
    alert('Copied your ID to clipboard!');
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };
  
  // Helper to truncate long addresses
  const truncateAddress = (address: string) => {
    if (!address) return '';
    
    if (address.length <= 16) return address;
    
    const start = address.substring(0, 8);
    const end = address.substring(address.length - 8);
    
    return `${start}...${end}`;
  };
  
  // Get recipient address from chat
  const getRecipientAddress = (chat: Chat) => {
    if (!chat || !chat.participants) return '';
    const recipient = chat.participants.find(p => p !== currentUserId);
    return truncateAddress(recipient || '');
  };
  
  // Format message time
  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Format last message time
  const formatLastMessageTime = (timestamp: number) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // If the message is from today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If the message is from this week
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      const options: Intl.DateTimeFormatOptions = { weekday: 'short' };
      return date.toLocaleDateString(undefined, options);
    }
    
    // Otherwise show the date
    return date.toLocaleDateString();
  };
  
  // Get current messages for the selected chat
  const getCurrentMessages = () => {
    if (!currentChat) return [];
    
    return messages.filter(msg => {
      const participants = [msg.from, msg.to];
      return participants.includes(currentUserId || '') && 
             participants.includes(recipientId);
    });
  };
  
  // Sort chats by last message time
  const sortedChats = [...chats].sort((a, b) => {
    const aTime = a.lastMessage?.timestamp || 0;
    const bTime = b.lastMessage?.timestamp || 0;
    return bTime - aTime; // newest first
  });
  
  // Render the sidebar
  const renderSidebar = () => (
    <Box sx={{ 
      width: isMobile ? '100%' : SIDEBAR_WIDTH, 
      height: '100%',
      borderRight: `1px solid ${theme.palette.divider}`,
      overflowY: 'auto',
      bgcolor: 'background.paper'
    }}>
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6">Chat</Typography>
        {isMobile && (
          <IconButton 
            sx={{ position: 'absolute', right: 8, top: 8 }}
            onClick={() => setMobileSidebarOpen(false)}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      
      <Box sx={{ p: 2 }}>
        <Button 
          variant="outlined" 
          color="primary" 
          fullWidth 
          sx={{ mb: 2 }}
          onClick={copyIdToClipboard}
          startIcon={<FileCopyIcon />}
        >
          Copy My ID
        </Button>
        
        <Box sx={{ display: 'flex', mb: 2 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Enter recipient ID"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            sx={{ mr: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleConnect}
            disabled={!recipientId || isLoading}
          >
            Chat
          </Button>
        </Box>
      </Box>
      
      <Divider />
      
      <List sx={{ p: 0 }}>
        {sortedChats.map(chat => {
          const isSelected = currentChat?.id === chat.id;
          
          return (
            <Box 
              key={chat.id}
              sx={{ 
                borderBottom: `1px solid ${theme.palette.divider}`,
                bgcolor: isSelected ? 'action.selected' : 'inherit',
                '&:hover': { bgcolor: 'action.hover' }
              }}
            >
              <Button
                fullWidth
                onClick={() => {
                  setCurrentChat(chat);
                  // If we have a recipient in the chat, set it
                  const recipient = chat.participants.find(p => p !== currentUserId);
                  if (recipient) setRecipientId(recipient);
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                sx={{ 
                  py: 2, 
                  px: 2, 
                  justifyContent: 'flex-start', 
                  textAlign: 'left', 
                  borderRadius: 0,
                  color: 'text.primary'
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="subtitle2" noWrap sx={{ flex: 1 }}>
                      {getRecipientAddress(chat)}
                    </Typography>
                    {chat.lastMessage && (
                      <Typography variant="caption" color="text.secondary">
                        {formatLastMessageTime(chat.lastMessage.timestamp)}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {chat.lastMessage?.content || 'No messages yet'}
                  </Typography>
                </Box>
              </Button>
            </Box>
          );
        })}
      </List>
    </Box>
  );
  
  // Loading state
  if (isLoading && !currentChat) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // The current messages to display
  const currentMessages = getCurrentMessages();
  
  return (
    <Box sx={{ 
      display: 'flex', 
      height: 'calc(100vh - 64px)',
      flexDirection: 'row',
      overflow: 'hidden'
    }}>
      {/* Mobile sidebar as drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          sx={{ zIndex: theme.zIndex.appBar - 1 }}
        >
          {renderSidebar()}
        </Drawer>
      )}
      
      {/* Desktop sidebar */}
      {!isMobile && renderSidebar()}
      
      {/* Main chat area */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column', 
        flex: 1,
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Chat header */}
        <Box sx={{ 
          p: 2, 
          borderBottom: `1px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center'
        }}>
          {isMobile && (
            <IconButton sx={{ mr: 1 }} onClick={() => setMobileSidebarOpen(true)}>
              <ForumIcon />
            </IconButton>
          )}
          
          <Typography variant="h6">
            {currentChat ? getRecipientAddress(currentChat) : 'No Chat Selected'}
          </Typography>
          
          {!connected && (
            <Chip 
              label="Not Connected" 
              size="small" 
              color="error" 
              sx={{ ml: 2 }} 
            />
          )}
          
          {isSyncing && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              <CircularProgress size={16} sx={{ mr: 1 }} />
              <Typography variant="caption">Syncing</Typography>
            </Box>
          )}
        </Box>
        
        {/* Messages area */}
        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {(!connected || !currentChat) ? (
            <Box sx={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center',
              color: 'text.secondary'
            }}>
              <ForumIcon sx={{ fontSize: 64, mb: 2, opacity: 0.6 }} />
              <Typography variant="h6">
                {!connected ? 'Not Connected to IPFS' : 'Select or Start a Chat'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', maxWidth: 400 }}>
                {!connected 
                  ? 'Waiting for IPFS connection...' 
                  : 'Enter a recipient ID and click "Chat" to start a conversation'}
              </Typography>
            </Box>
          ) : (
            <>
              {currentMessages.length === 0 ? (
                <Box sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center',
                  color: 'text.secondary'
                }}>
                  <Typography variant="body1">No messages yet</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Send a message to start the conversation
                  </Typography>
                </Box>
              ) : (
                currentMessages.map((msg, index) => {
                  const isCurrentUser = msg.from === currentUserId;
                  
                  return (
                    <Box
                      key={msg.id || index}
                      sx={{
                        display: 'flex',
                        justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                        mb: 2
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '75%',
                          minWidth: '100px',
                          bgcolor: isCurrentUser ? 'primary.main' : 'background.paper',
                          color: isCurrentUser ? 'primary.contrastText' : 'text.primary',
                          borderRadius: 2,
                          p: 2,
                          boxShadow: 1
                        }}
                      >
                        <Typography variant="body1">{msg.content}</Typography>
                        <Typography 
                          variant="caption" 
                          display="block" 
                          sx={{ 
                            mt: 1, 
                            textAlign: 'right',
                            opacity: 0.7
                          }}
                        >
                          {formatMessageTime(msg.timestamp)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
              <div ref={messageEndRef} />
            </>
          )}
        </Box>
        
        {/* Message input area */}
        <Box sx={{ 
          p: 2, 
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper'
        }}>
          <Grid container spacing={2}>
            <Grid item xs>
              <TextField
                fullWidth
                placeholder="Type a message"
                variant="outlined"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={!connected || !currentChat}
                multiline
                maxRows={4}
              />
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                disabled={!message.trim() || !connected || !currentChat || isLoading}
                onClick={handleSendMessage}
                sx={{ height: '100%' }}
              >
                {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}

export default Page2;
