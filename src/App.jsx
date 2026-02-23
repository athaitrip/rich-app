import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Container } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';

import StockListPage from './pages/StockListPage';
import StockDetailPage from './pages/StockDetailPage';
import ClaudeDebugger from './components/common/ClaudeDebugger';
import ValuationPage from './pages/ValuationPage';

// สร้าง theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
    success: {
      main: '#4caf50',
    },
    error: {
      main: '#f44336',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* เพิ่ม future flags */}
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          
          {/* App Bar */}
          <AppBar position="sticky">
            <Toolbar>
              <ShowChartIcon sx={{ mr: 2 }} />
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Stock Analysis App
              </Typography>
            </Toolbar>
          </AppBar>

          {/* Main Content */}
          <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
            <Routes>
              <Route path="/" element={<StockListPage />} />
              <Route path="/stock/:symbol" element={<StockDetailPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            <Route path="/valuation" element={<ValuationPage />} />
            </Routes>
          </Box>

          {/* Footer */}
          <Box 
            component="footer" 
            sx={{ 
              py: 3, 
              px: 2, 
              mt: 'auto',
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider'
            }}
          >
            <Container maxWidth="lg">
              <Typography variant="body2" color="text.secondary" align="center">
                Stock Analysis App © 2026 - เครื่องมือวิเคราะห์หุ้นเบื้องต้น
              </Typography>
              <Typography variant="caption" color="text.secondary" align="center" display="block" mt={1}>
                ⚠️ ข้อมูลในแอพนี้เป็นเพียงข้อมูลอ้างอิงเท่านั้น ไม่ใช่คำแนะนำการลงทุน
              </Typography>
            </Container>
          </Box>

          {/* Claude Debug Button */}
          <ClaudeDebugger />
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;