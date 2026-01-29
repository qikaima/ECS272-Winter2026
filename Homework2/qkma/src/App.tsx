import Example from './components/Example'
import Chart2 from './components/Chart2'
import Chart3 from './components/Chart3'
import Notes from './components/Notes'
import { NotesWithReducer, CountProvider } from './components/NotesWithReducer';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { grey } from '@mui/material/colors';

// Adjust the color theme for material ui
const theme = createTheme({
  palette: {
    primary:{
      main: grey[700],
    },
    secondary:{
      main: grey[700],
    }
  },
})

// For how Grid works, refer to https://mui.com/material-ui/react-grid/

function Layout() {
  return (
    <Box
      id="main-container"
      sx={{
        height: '100vh',  
        width: '100%',
        overflowY: 'auto',  
        padding: 1,
        boxSizing: 'border-box'
      }}
    >
      {/* Chart1 */}
      <Box sx={{ height: '60vh', width: '100%', mb: 2 }}>
        <Example />
      </Box>

      {/* Chart2 */}
      <Box sx={{ height: '60vh', width: '100%', mb: 2 }}>
        <Chart2 />
      </Box>

      {/* Chart3 */}
      <Box sx={{ height: '60vh', width: '100%', mb: 2 }}>
        <Chart3 />
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Layout />
    </ThemeProvider>
  )
}

export default App
