// src/components/common/ClaudeDebugger.jsx
import React, { useState, useEffect } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Alert,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  TextField,
  CircularProgress
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';

const ClaudeDebugger = () => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [errors, setErrors] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking');
  const [suggestion, setSuggestion] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // จับ console.log และ console.error
  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      setLogs(prev => [...prev, { type: 'log', message: args.join(' '), time: new Date().toISOString() }]);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      setErrors(prev => [...prev, { type: 'error', message: args.join(' '), time: new Date().toISOString() }]);
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      setLogs(prev => [...prev, { type: 'warn', message: args.join(' '), time: new Date().toISOString() }]);
      originalWarn.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  // วิเคราะห์ปัญหา
  const analyzeProblem = () => {
    setAnalyzing(true);
    
    setTimeout(() => {
      let suggestions = [];

      // เช็ค API errors
      const apiErrors = errors.filter(e => 
        e.message.includes('API') || 
        e.message.includes('fetch') ||
        e.message.includes('404') ||
        e.message.includes('401')
      );

      if (apiErrors.length > 0) {
        suggestions.push({
          title: '🔑 API Key Problem Detected',
          problem: 'พบปัญหาเกี่ยวกับ API',
          solutions: [
            '1. ตรวจสอบว่าใส่ API key ใน stockAPI.js แล้ว',
            '2. ตรวจสอบว่า API key ถูกต้อง (ไม่มี space หรืออักขระพิเศษ)',
            '3. ลองสมัคร API key ใหม่ที่:',
            '   - Alpha Vantage: https://www.alphavantage.co/support/#api-key',
            '   - FMP: https://financialmodelingprep.com/developer/docs',
            '4. Restart dev server: Ctrl+C แล้ว npm run dev ใหม่'
          ]
        });
      }

      // เช็ค CORS errors
      const corsErrors = errors.filter(e => 
        e.message.includes('CORS') || 
        e.message.includes('blocked')
      );

      if (corsErrors.length > 0) {
        suggestions.push({
          title: '🌐 CORS Problem Detected',
          problem: 'เบราว์เซอร์บล็อกการเข้าถึง API',
          solutions: [
            '1. ปัญหานี้เกิดจากความปลอดภัยของเบราว์เซอร์',
            '2. ใช้ proxy หรือ backend middleware',
            '3. ลอง refresh หน้าเว็บใหม่',
            '4. เปลี่ยนไปใช้ Yahoo Finance API แทน (ไม่มี CORS)'
          ]
        });
      }

      // เช็ค Network errors
      const networkErrors = errors.filter(e => 
        e.message.includes('network') || 
        e.message.includes('timeout') ||
        e.message.includes('Failed to fetch')
      );

      if (networkErrors.length > 0) {
        suggestions.push({
          title: '📡 Network Problem Detected',
          problem: 'ปัญหาการเชื่อมต่ออินเทอร์เน็ต',
          solutions: [
            '1. ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
            '2. ลอง refresh หน้าเว็บ',
            '3. เช็คว่าไฟร์วอลล์ไม่ได้บล็อก',
            '4. ลองใช้ Mobile data แทน WiFi (หรือตรงกันข้าม)'
          ]
        });
      }

      // เช็ค React errors
      const reactErrors = errors.filter(e => 
        e.message.includes('React') || 
        e.message.includes('component') ||
        e.message.includes('undefined')
      );

      if (reactErrors.length > 0) {
        suggestions.push({
          title: '⚛️ React Problem Detected',
          problem: 'พบปัญหาใน React component',
          solutions: [
            '1. เช็ค Console เพื่อดู error message ละเอียด',
            '2. ตรวจสอบว่า import component ครบ',
            '3. ตรวจสอบว่าไฟล์อยู่ในตำแหน่งที่ถูกต้อง',
            '4. ลอง clear cache: rm -rf node_modules && npm install'
          ]
        });
      }

      // ถ้าไม่มี error
      if (errors.length === 0) {
        suggestions.push({
          title: '✅ Everything Looks Good!',
          problem: 'ไม่พบปัญหาในขณะนี้',
          solutions: [
            '✨ แอพทำงานได้ปกติ',
            '📊 ลองค้นหาหุ้น: AAPL, MSFT, GOOGL',
            '💡 สำหรับหุ้นไทยใช้: PTT.BK, CPALL.BK',
            '🚀 ถ้าต้องการเพิ่มฟีเจอร์ ให้ถามผม (Claude) ได้เลย!'
          ]
        });
      }

      setSuggestion(suggestions);
      setAnalyzing(false);
    }, 1000);
  };

  // Copy log to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard! 📋');
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    setErrors([]);
    setSuggestion('');
  };

  // Generate prompt for Claude
  const generateClaudePrompt = () => {
    const errorSummary = errors.slice(-5).map(e => e.message).join('\n');
    const logSummary = logs.slice(-10).map(l => l.message).join('\n');
    
    const prompt = `ฉันมีปัญหากับแอพ Stock Analysis:

📋 Recent Errors:
${errorSummary || 'ไม่มี error'}

📝 Recent Logs:
${logSummary || 'ไม่มี log'}

🔧 Environment:
- React + Vite
- Material-UI
- APIs: Alpha Vantage, FMP

ช่วยวิเคราะห์ปัญหาและแนะนำวิธีแก้ให้หน่อย`;

    return prompt;
  };

  return (
    <>
      {/* Floating Button */}
      <Tooltip title="Claude Debug Assistant 🤖">
        <Fab
          color="primary"
          aria-label="claude-debug"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
            }
          }}
        >
          <SmartToyIcon />
        </Fab>
      </Tooltip>

      {/* Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <SmartToyIcon color="primary" />
            <Typography variant="h6">Claude Debug Assistant</Typography>
            <Chip 
              label={errors.length > 0 ? `${errors.length} Errors` : 'No Errors'}
              color={errors.length > 0 ? 'error' : 'success'}
              size="small"
            />
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {/* Analyze Button */}
          <Box mb={2}>
            <Button
              variant="contained"
              startIcon={analyzing ? <CircularProgress size={20} /> : <BugReportIcon />}
              onClick={analyzeProblem}
              disabled={analyzing}
              fullWidth
              size="large"
            >
              {analyzing ? 'Analyzing...' : '🔍 Analyze Problems'}
            </Button>
          </Box>

          {/* Suggestions */}
          {suggestion && suggestion.length > 0 && (
            <Box mb={3}>
              {suggestion.map((sug, idx) => (
                <Alert 
                  key={idx} 
                  severity={errors.length > 0 ? 'warning' : 'success'}
                  sx={{ mb: 2 }}
                >
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {sug.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {sug.problem}
                  </Typography>
                  <Box mt={1}>
                    {sug.solutions.map((sol, i) => (
                      <Typography key={i} variant="body2" sx={{ mt: 0.5 }}>
                        {sol}
                      </Typography>
                    ))}
                  </Box>
                </Alert>
              ))}
            </Box>
          )}

          {/* Errors Section */}
          {errors.length > 0 && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" fontWeight="bold">
                  ❌ Errors ({errors.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {errors.slice(-10).reverse().map((err, idx) => (
                    <Box 
                      key={idx} 
                      sx={{ 
                        p: 1, 
                        mb: 1, 
                        bgcolor: 'error.light', 
                        borderRadius: 1,
                        position: 'relative'
                      }}
                    >
                      <Typography variant="caption" color="error.dark">
                        {new Date(err.time).toLocaleTimeString()}
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                        {err.message}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(err.message)}
                        sx={{ position: 'absolute', top: 4, right: 4 }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Logs Section */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1" fontWeight="bold">
                📝 Logs ({logs.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                {logs.slice(-20).reverse().map((log, idx) => (
                  <Box 
                    key={idx} 
                    sx={{ 
                      p: 1, 
                      mb: 1, 
                      bgcolor: log.type === 'warn' ? 'warning.light' : 'grey.100',
                      borderRadius: 1 
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {new Date(log.time).toLocaleTimeString()}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                      {log.message}
                    </Typography>
                  </Box>
                ))}
                {logs.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No logs yet. Logs will appear here when you use the app.
                  </Typography>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Ask Claude */}
          <Box mt={3}>
            <Alert severity="info">
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                💬 Need More Help? Ask Claude!
              </Typography>
              <Typography variant="body2" paragraph>
                Copy this prompt and paste it to Claude (or ChatGPT):
              </Typography>
              <TextField
                multiline
                rows={6}
                fullWidth
                value={generateClaudePrompt()}
                InputProps={{
                  readOnly: true,
                  sx: { fontFamily: 'monospace', fontSize: '0.85rem' }
                }}
              />
              <Button
                startIcon={<ContentCopyIcon />}
                onClick={() => copyToClipboard(generateClaudePrompt())}
                sx={{ mt: 1 }}
                size="small"
              >
                Copy Prompt
              </Button>
            </Alert>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button startIcon={<RefreshIcon />} onClick={clearLogs}>
            Clear All
          </Button>
          <Button onClick={() => setOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ClaudeDebugger;
