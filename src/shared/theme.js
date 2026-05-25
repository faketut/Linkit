import { extendTheme } from '@chakra-ui/react';

// Modern dark theme with a LinkedIn-blue accent.
export const theme = extendTheme({
  config: {
    useSystemColorMode: false,
    initialColorMode: 'dark',
  },
  colors: {
    brand: {
      50: '#e8f1fb',
      100: '#c5dbf4',
      200: '#9cc1ec',
      300: '#6fa4e3',
      400: '#4a8cdb',
      500: '#0a66c2', // LinkedIn blue
      600: '#0a5aab',
      700: '#084c8f',
      800: '#063a6d',
      900: '#04274a',
    },
  },
  styles: {
    global: {
      'html, body, #root': {
        backgroundColor: '#0f1419',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: 'lg',
        fontWeight: 600,
      },
      defaultProps: {
        colorScheme: 'brand',
      },
    },
    Heading: {
      baseStyle: { letterSpacing: '-0.01em' },
    },
  },
});
