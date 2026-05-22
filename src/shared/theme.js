import { extendTheme } from '@chakra-ui/react';

// Dark mode by default — matches the pre-rewrite popup/options theme.
export const theme = extendTheme({
  config: {
    useSystemColorMode: false,
    initialColorMode: 'dark',
  },
});
