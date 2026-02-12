import React, { useState } from 'react';
import Example from './components/Example';
import Chart2 from './components/Chart2';
import Chart3 from './components/Chart3';
import Box from '@mui/material/Box';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { grey } from '@mui/material/colors';

const theme = createTheme({
  palette: {
    primary: { main: grey[700] },
    secondary: { main: grey[700] },
  },
});

function Layout() {
  const [selectedSupergenre, setSelectedSupergenre] = useState<string | null>(null);

  return (
    <Box
      id="main-container"
      sx={{
        height: '100vh',
        width: '100%',
        overflowY: 'auto',
        padding: 1,
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ display: 'flex', height: '60%', gap: 1, mb: 1 }}>
        {/* barchart*/}
        <Box sx={{ flex: 1, bgcolor: 'white', borderRadius: 1, boxShadow: 1 }}>
          <Example
            selectedSupergenre={selectedSupergenre}
            onSelectSupergenre={setSelectedSupergenre}
          />
        </Box>

        {/* heatmap */}
        <Box sx={{ flex: 1, bgcolor: 'white', borderRadius: 1, boxShadow: 1 }}>
          <Chart2 selectedSupergenre={selectedSupergenre} />
        </Box>
      </Box>

      {/* Sankey */}
      <Box sx={{ flex: 1, height: '40%', bgcolor: 'white', borderRadius: 1, boxShadow: 1, minHeight: 0 }}>
        <Chart3 />
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  );
}