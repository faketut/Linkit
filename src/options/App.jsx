import { useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import {
  Badge,
  Box,
  Button,
  ChakraProvider,
  Container,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  Icon,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { MdShield, MdSpeed, MdTune } from 'react-icons/md';

import { theme } from '../shared/theme.js';
import {
  LINKIT_DAILY_CAP,
  LINKIT_SESSION_CAP_MAX,
  LINKIT_SESSION_CAP_MIN,
} from '../shared/constants.js';
import { loadSessionCap, saveSessionCap, sessionCapAtom } from '../shared/atoms.js';

function StatCard({ icon, label, value, hint }) {
  return (
    <Box
      flex="1"
      bg="whiteAlpha.100"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="xl"
      p={4}
    >
      <HStack spacing={2} color="brand.300">
        <Icon as={icon} boxSize={4} />
        <Text fontSize="xs" textTransform="uppercase" letterSpacing="wider">
          {label}
        </Text>
      </HStack>
      <Text fontSize="2xl" fontWeight="bold" mt={1}>
        {value}
      </Text>
      {hint ? (
        <Text fontSize="xs" color="gray.400" mt={1}>
          {hint}
        </Text>
      ) : null}
    </Box>
  );
}

export default function App() {
  const [sessionCap, setSessionCap] = useAtom(sessionCapAtom);
  const [initialCap, setInitialCap] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    loadSessionCap().then((cap) => {
      if (!cancelled) {
        setSessionCap(cap);
        setInitialCap(cap);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [setSessionCap]);

  const dirty = initialCap !== null && Number(sessionCap) !== Number(initialCap);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSessionCap(sessionCap);
      setInitialCap(Number(sessionCap));
      toast({
        position: 'top',
        title: 'Options saved',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" bg="#0f1419" color="white" py={10}>
        <Container maxW="640px">
          {/* Header */}
          <Flex
            align="center"
            justify="space-between"
            bgGradient="linear(to-r, brand.700, brand.500)"
            borderRadius="2xl"
            px={6}
            py={5}
            mb={6}
            boxShadow="lg"
          >
            <VStack align="start" spacing={0}>
              <Heading as="h1" size="lg" color="white">
                Linkit Settings
              </Heading>
              <Text fontSize="sm" color="whiteAlpha.800">
                Tune the auto-connect limits to stay safe.
              </Text>
            </VStack>
            <Badge colorScheme="green" variant="subtle" borderRadius="full" px={3} py={1}>
              v{chrome?.runtime?.getManifest?.()?.version ?? ''}
            </Badge>
          </Flex>

          {/* Stat cards */}
          <Stack direction={{ base: 'column', sm: 'row' }} spacing={4} mb={6}>
            <StatCard
              icon={MdSpeed}
              label="Session cap"
              value={sessionCap}
              hint="Per popup session"
            />
            <StatCard
              icon={MdShield}
              label="Daily cap"
              value={LINKIT_DAILY_CAP}
              hint="Hard-coded safety limit"
            />
          </Stack>

          {/* Settings card */}
          <Box
            bg="whiteAlpha.50"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderRadius="2xl"
            p={6}
          >
            <HStack mb={4} color="brand.300">
              <Icon as={MdTune} boxSize={5} />
              <Heading size="sm" color="white">
                Auto-connect limits
              </Heading>
            </HStack>

            <FormControl>
              <FormLabel htmlFor="cap-input" mb={3}>
                Maximum auto-connections per session
              </FormLabel>

              <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align="center">
                <NumberInput
                  id="cap-input"
                  value={sessionCap}
                  onChange={(v) => setSessionCap(v)}
                  min={LINKIT_SESSION_CAP_MIN}
                  max={LINKIT_SESSION_CAP_MAX}
                  width={{ base: 'full', md: '140px' }}
                >
                  <NumberInputField borderRadius="lg" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>

                <Slider
                  flex="1"
                  value={Number(sessionCap) || LINKIT_SESSION_CAP_MIN}
                  min={LINKIT_SESSION_CAP_MIN}
                  max={LINKIT_SESSION_CAP_MAX}
                  onChange={(v) => setSessionCap(v)}
                  colorScheme="brand"
                  aria-label="Session cap slider"
                >
                  <SliderTrack bg="whiteAlpha.200">
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={5} />
                </Slider>
              </Stack>

              <FormHelperText color="gray.400">
                Linkit automatically stops connecting after reaching this value. Allowed
                range: {LINKIT_SESSION_CAP_MIN}–{LINKIT_SESSION_CAP_MAX}.
              </FormHelperText>
            </FormControl>

            <Divider my={6} borderColor="whiteAlpha.200" />

            <Flex justify="flex-end">
              <Button
                onClick={onSave}
                colorScheme="brand"
                size="md"
                isLoading={saving}
                isDisabled={!dirty}
              >
                {dirty ? 'Save changes' : 'Saved'}
              </Button>
            </Flex>
          </Box>

          <Text fontSize="xs" color="gray.500" mt={6} textAlign="center">
            LinkedIn enforces weekly invite limits (~80–100). Use modest caps.
          </Text>
        </Container>
      </Box>
    </ChakraProvider>
  );
}
