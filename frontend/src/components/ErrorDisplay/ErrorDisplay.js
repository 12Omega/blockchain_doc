import React, { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { getErrorMessage } from '../../utils/errorMessages';

const ErrorDisplay = ({ error, onRetry, onDismiss, showDetails = false }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!error) return null;

  const errorInfo = getErrorMessage(error);

  return (
    <Alert
      severity={errorInfo.severity}
      onClose={onDismiss}
      sx={{ mb: 2 }}
    >
      <AlertTitle>{errorInfo.title}</AlertTitle>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {errorInfo.message}
      </Typography>

      {errorInfo.actions && errorInfo.actions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            What you can do:
          </Typography>
          <List dense>
            {errorInfo.actions.map((action, index) => (
              <ListItem key={index} sx={{ py: 0 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <CheckCircleOutlineIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={action}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {errorInfo.retryable && onRetry && (
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={onRetry}
            variant="outlined"
          >
            Try Again
          </Button>
        )}

        {showDetails && (
          <Button
            size="small"
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide' : 'Show'} Details
          </Button>
        )}
      </Box>

      {showDetails && (
        <Collapse in={expanded}>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(
                {
                  message: error.message,
                  code: error.code,
                  status: error.response?.status,
                  data: error.response?.data,
                },
                null,
                2
              )}
            </Typography>
          </Box>
        </Collapse>
      )}
    </Alert>
  );
};

export default ErrorDisplay;
