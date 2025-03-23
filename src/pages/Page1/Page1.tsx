
import { Box } from '@mui/material';



export default function FeedPage() {
  const currentUserAddress = typeof window !== 'undefined' ? localStorage.getItem('walletAddress') : null;



  return (
      <Box sx={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }} >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {currentUserAddress && (
            <div style={{ borderRadius: '8px', padding: '16px', boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }}>
              
            </div>
          )}

        </div>
      </Box>
  );
}
