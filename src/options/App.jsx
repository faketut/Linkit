import { useEffect } from 'react';
import { useAtom } from 'jotai';
import {
  Box,
  Button,
  ChakraProvider,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  VStack,
  useToast,
} from '@chakra-ui/react';

import { theme } from '../shared/theme.js';
import { LINKIT_SESSION_CAP_MAX, LINKIT_SESSION_CAP_MIN } from '../shared/constants.js';
import { loadSessionCap, saveSessionCap, sessionCapAtom } from '../shared/atoms.js';

export default function App() {
  const [sessionCap, setSessionCap] = useAtom(sessionCapAtom);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    loadSessionCap().then((cap) => {
      if (!cancelled) setSessionCap(cap);
    });
    return () => {
      cancelled = true;
    };
  }, [setSessionCap]);

  const onSave = async () => {
    await saveSessionCap(sessionCap);
    toast({
      position: 'top',
      title: 'Options saved!',
      status: 'success',
      duration: 2000,
      isClosable: true,
    });
  };

  return (
    <ChakraProvider theme={theme}>
      <Box
        backgroundColor="gray.700"
        padding="5"
        borderRadius="md"
        marginY="5"
        marginX="auto"
        maxWidth="480px"
      >
        <VStack spacing={4} align="stretch">
          <Box>
            <Heading as="h1" size="md">
              Linkit Options
            </Heading>
          </Box>
          <Box>
            <FormControl>
              <FormLabel>Maximum auto-connections per session</FormLabel>
              <NumberInput
                value={sessionCap}
                onChange={(v) => setSessionCap(v)}
                min={LINKIT_SESSION_CAP_MIN}
                max={LINKIT_SESSION_CAP_MAX}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormHelperText>
                Automatically stops connecting after reaching this value.
              </FormHelperText>
            </FormControl>
          </Box>
          <Box>
            <Button colorScheme="blue" onClick={onSave}>
              Save Options
            </Button>
          </Box>
        </VStack>
      </Box>
    </ChakraProvider>
  );
}
