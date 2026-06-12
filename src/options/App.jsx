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
import { MdSpeed, MdTune, MdShield, MdCheckCircle, MdInfoOutline } from 'react-icons/md';

import { theme, tokens } from '../shared/theme.js';
import { LINKIT_SESSION_CAP_MAX, LINKIT_SESSION_CAP_MIN } from '../shared/constants.js';
import { loadSessionCap, saveSessionCap, sessionCapAtom } from '../shared/atoms.js';

/* ─────────────────────────────────────────────
   Reusable surface card
   ───────────────────────────────────────────── */

function Card({ children, ...rest }) {
  return (
    <Box
      bg={tokens.surface.raised}
      borderWidth="1px"
      borderColor={tokens.border.default}
      borderRadius="2xl"
      boxShadow="sm"
      {...rest}
    >
      {children}
    </Box>
  );
}

function StatCard({ icon, label, value, hint, accent = 'brand.300' }) {
  return (
    <Card flex="1" p={4}>
      <HStack spacing={2} color={accent}>
        <Icon as={icon} boxSize={4} />
        <Text
          fontSize="11px"
          fontWeight={700}
          textTransform="uppercase"
          letterSpacing="0.10em"
          color={tokens.fg.muted}
        >
          {label}
        </Text>
      </HStack>
      <Text fontSize="28px" fontWeight={700} mt={1.5} color={tokens.fg.primary}>
        {value}
      </Text>
      {hint ? (
        <Text fontSize="xs" color={tokens.fg.muted} mt={1}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

/* ─────────────────────────────────────────────
   Risk classification (visual cue for session cap)
   ───────────────────────────────────────────── */

function classifyRisk(cap) {
  const n = Number(cap) || 0;
  if (n <= 50)
    return { label: 'Conservative', tone: 'green', helper: 'Lowest risk of throttling.' };
  if (n <= 150)
    return { label: 'Balanced', tone: 'blue', helper: 'Reasonable for most accounts.' };
  if (n <= 300)
    return {
      label: 'Aggressive',
      tone: 'orange',
      helper: 'May trigger LinkedIn limits.',
    };
  return {
    label: 'High risk',
    tone: 'red',
    helper: 'LinkedIn caps invites at ~80–100/week.',
  };
}

/* ─────────────────────────────────────────────
   App
   ───────────────────────────────────────────── */

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
  const risk = classifyRisk(sessionCap);
  const version = chrome?.runtime?.getManifest?.()?.version ?? '';

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSessionCap(sessionCap);
      setInitialCap(Number(sessionCap));
      toast({
        position: 'top',
        title: 'Settings saved',
        description: `Session cap is now ${sessionCap}.`,
        status: 'success',
        duration: 2200,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    if (initialCap !== null) setSessionCap(initialCap);
  };

  return (
    <ChakraProvider theme={theme}>
      <Box minH="100vh" bg={tokens.surface.canvas} color={tokens.fg.primary} py={12}>
        <Container maxW="680px">
          {/* ── Header ─────────────────────────────────────────── */}
          <Flex align="center" justify="space-between" mb={8}>
            <HStack spacing={3} align="center">
              <Box
                w="40px"
                h="40px"
                borderRadius="xl"
                bgGradient="linear(135deg, brand.400, brand.600)"
                boxShadow="brand-glow"
              />
              <VStack align="start" spacing={0} lineHeight="1.15">
                <Heading as="h1" size="lg" color={tokens.fg.primary}>
                  Linkit
                </Heading>
                <Text fontSize="sm" color={tokens.fg.muted}>
                  Tune the auto-connect limits to stay safe.
                </Text>
              </VStack>
            </HStack>
            {version ? (
              <Badge
                variant="subtle"
                colorScheme="gray"
                px={2.5}
                py={1}
                fontFamily="mono"
                fontSize="11px"
                bg={tokens.surface.elevated}
                color={tokens.fg.secondary}
                borderWidth="1px"
                borderColor={tokens.border.default}
              >
                v{version}
              </Badge>
            ) : null}
          </Flex>

          {/* ── Stat row ───────────────────────────────────────── */}
          <Stack direction={{ base: 'column', sm: 'row' }} spacing={4} mb={6}>
            <StatCard
              icon={MdSpeed}
              label="Session cap"
              value={sessionCap}
              hint="Max auto-connections per popup session"
            />
            <StatCard
              icon={MdShield}
              label="Risk profile"
              value={risk.label}
              hint={risk.helper}
              accent={`${risk.tone}.300`}
            />
          </Stack>

          {/* ── Settings card ─────────────────────────────────── */}
          <Card p={6} mb={5}>
            <HStack mb={1} spacing={2.5} color="brand.300">
              <Icon as={MdTune} boxSize={5} />
              <Heading size="sm" color={tokens.fg.primary}>
                Auto-connect limits
              </Heading>
            </HStack>
            <Text fontSize="sm" color={tokens.fg.muted} mb={5}>
              Linkit stops automatically once this number is reached in a single popup
              session.
            </Text>

            <FormControl>
              <FormLabel htmlFor="cap-input">
                Maximum auto-connections per session
              </FormLabel>

              <Stack
                direction={{ base: 'column', md: 'row' }}
                spacing={5}
                align={{ base: 'stretch', md: 'center' }}
              >
                <NumberInput
                  id="cap-input"
                  value={sessionCap}
                  onChange={(v) => setSessionCap(v)}
                  min={LINKIT_SESSION_CAP_MIN}
                  max={LINKIT_SESSION_CAP_MAX}
                  width={{ base: 'full', md: '128px' }}
                  size="md"
                >
                  <NumberInputField borderRadius="lg" fontWeight={600} />
                  <NumberInputStepper>
                    <NumberIncrementStepper borderColor={tokens.border.default} />
                    <NumberDecrementStepper borderColor={tokens.border.default} />
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
                  focusThumbOnChange={false}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={5} />
                </Slider>
              </Stack>

              {/* Tick marks */}
              <Flex
                mt={2}
                ml={{ base: 0, md: '152px' }}
                justify="space-between"
                color={tokens.fg.muted}
                fontSize="11px"
                fontFamily="mono"
              >
                <span>{LINKIT_SESSION_CAP_MIN}</span>
                <span>50</span>
                <span>150</span>
                <span>300</span>
                <span>{LINKIT_SESSION_CAP_MAX}</span>
              </Flex>

              <FormHelperText color={tokens.fg.muted}>
                Allowed range: {LINKIT_SESSION_CAP_MIN}–{LINKIT_SESSION_CAP_MAX}.
              </FormHelperText>
            </FormControl>

            <Divider my={6} />

            {/* ── Actions ─────────────────────────────────────── */}
            <Flex
              justify="space-between"
              align="center"
              direction={{ base: 'column', sm: 'row' }}
              gap={3}
            >
              <HStack spacing={2} color={tokens.fg.muted} fontSize="xs">
                <Icon
                  as={dirty ? MdInfoOutline : MdCheckCircle}
                  color={dirty ? 'orange.300' : 'green.300'}
                />
                <Text>{dirty ? 'You have unsaved changes' : 'All changes saved'}</Text>
              </HStack>
              <HStack spacing={2}>
                <Button variant="ghost" size="md" onClick={onReset} isDisabled={!dirty}>
                  Reset
                </Button>
                <Button
                  onClick={onSave}
                  size="md"
                  isLoading={saving}
                  isDisabled={!dirty}
                  loadingText="Saving"
                >
                  Save changes
                </Button>
              </HStack>
            </Flex>
          </Card>

          {/* ── Safety guidance ───────────────────────────────── */}
          <Card p={5} bg={tokens.surface.raised}>
            <HStack spacing={2.5} mb={2} color="orange.300">
              <Icon as={MdShield} boxSize={5} />
              <Heading size="sm" color={tokens.fg.primary}>
                Stay within LinkedIn limits
              </Heading>
            </HStack>
            <VStack align="start" spacing={1.5} fontSize="sm" color={tokens.fg.secondary}>
              <Text>
                • LinkedIn enforces ~<strong>80–100 invites per week</strong>. Keep your
                weekly total well under this threshold.
              </Text>
              <Text>
                • Linkit waits a randomised <strong>3–8 seconds</strong> between clicks to
                mimic human pacing.
              </Text>
              <Text>
                • Per-day cap (<strong>40</strong>) is enforced separately and persists
                across sessions.
              </Text>
              <Text>
                • If the &ldquo;invite limit reached&rdquo; modal appears, Linkit stops
                automatically.
              </Text>
            </VStack>
          </Card>

          <Text
            fontSize="11px"
            color={tokens.fg.muted}
            mt={6}
            textAlign="center"
            letterSpacing="0.02em"
          >
            Use at your own risk. Lower the cap if unsure.
          </Text>
        </Container>
      </Box>
    </ChakraProvider>
  );
}
