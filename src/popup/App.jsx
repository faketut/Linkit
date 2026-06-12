import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import {
  Badge,
  Box,
  Button,
  ChakraProvider,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Heading,
  IconButton,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Text,
  Tooltip,
  VStack,
  useToast,
} from '@chakra-ui/react';
import {
  MdGroups,
  MdPersonSearch,
  MdSettings,
  MdDelete,
  MdArrowForward,
  MdArrowBack,
  MdPause,
  MdPlayArrow,
} from 'react-icons/md';

import { theme, tokens } from '../shared/theme.js';
import {
  LINKIT_SESSION_CAP_MAX,
  LINKIT_SESSION_CAP_MIN,
  Links,
  MessageId,
} from '../shared/constants.js';
import {
  clickCountAtom,
  isRunningAtom,
  loadSessionCap,
  saveSessionCap,
  sessionCapAtom,
} from '../shared/atoms.js';
import {
  connectToActiveTab,
  openMyNetwork,
  openSearchPeople,
  requestDeleteSkills,
} from '../shared/actions.js';

const POPUP_WIDTH = '340px';

/* ─────────────────────────────────────────────
   Header — minimalist, status-first
   ───────────────────────────────────────────── */

function StatusDot({ tone }) {
  const palette = {
    ready: { bg: 'green.400', glow: 'rgba(72, 187, 120, 0.55)' },
    idle: { bg: tokens.fg.muted, glow: 'transparent' },
    busy: { bg: 'brand.400', glow: 'rgba(38, 128, 235, 0.55)' },
  };
  const c = palette[tone] || palette.idle;
  return (
    <Box
      w="8px"
      h="8px"
      borderRadius="full"
      bg={c.bg}
      boxShadow={`0 0 0 3px ${c.glow}`}
      transition="box-shadow 180ms ease, background 180ms ease"
    />
  );
}

function Header({ statusTone, statusLabel, settingsOpen, onToggleSettings }) {
  return (
    <Flex
      px={5}
      py={4}
      align="center"
      borderBottomWidth="1px"
      borderColor={tokens.border.subtle}
      bg={tokens.surface.raised}
      width={POPUP_WIDTH}
    >
      <HStack spacing={2.5} align="center">
        {/* Wordmark dot */}
        <Box
          w="22px"
          h="22px"
          borderRadius="md"
          bgGradient="linear(135deg, brand.400, brand.600)"
          boxShadow="brand-glow"
        />
        <VStack align="start" spacing={0} lineHeight="1.1">
          <Heading size="sm" color={tokens.fg.primary}>
            {settingsOpen ? 'Settings' : 'Linkit'}
          </Heading>
          <Text fontSize="11px" color={tokens.fg.muted} fontWeight={500}>
            {settingsOpen ? 'Tune the auto-connect limits' : 'LinkedIn auto-connect'}
          </Text>
        </VStack>
      </HStack>

      <Box flex="1" />

      <HStack spacing={1.5}>
        {!settingsOpen ? (
          <HStack
            spacing={1.5}
            px={2}
            py={1}
            borderRadius="full"
            bg={tokens.surface.elevated}
            borderWidth="1px"
            borderColor={tokens.border.default}
          >
            <StatusDot tone={statusTone} />
            <Text fontSize="11px" color={tokens.fg.secondary} fontWeight={600}>
              {statusLabel}
            </Text>
          </HStack>
        ) : null}
        <Tooltip
          label={settingsOpen ? 'Back' : 'Settings'}
          placement="bottom-end"
          openDelay={300}
        >
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={settingsOpen ? 'Back to actions' : 'Open settings'}
            aria-pressed={settingsOpen}
            icon={settingsOpen ? <MdArrowBack size={18} /> : <MdSettings size={18} />}
            onClick={onToggleSettings}
          />
        </Tooltip>
      </HStack>
    </Flex>
  );
}

/* ─────────────────────────────────────────────
   Action card — consistent, scannable affordance
   ───────────────────────────────────────────── */

function ActionCard({ icon: IconCmp, title, description, onClick, tone = 'default' }) {
  const danger = tone === 'danger';
  return (
    <Box
      as="button"
      onClick={onClick}
      type="button"
      width="full"
      textAlign="left"
      bg={tokens.surface.raised}
      borderWidth="1px"
      borderColor={tokens.border.default}
      borderRadius="xl"
      p={3}
      cursor="pointer"
      transition="background 180ms ease, border-color 180ms ease, transform 180ms ease"
      _hover={{
        bg: tokens.surface.elevated,
        borderColor: danger ? 'red.500' : 'brand.500',
        transform: 'translateY(-1px)',
      }}
      _active={{ transform: 'translateY(0)' }}
      _focusVisible={{
        boxShadow: danger
          ? '0 0 0 3px rgba(229, 62, 62, 0.40)'
          : '0 0 0 3px rgba(38, 128, 235, 0.40)',
        outline: 'none',
      }}
    >
      <HStack spacing={3} align="center">
        <Flex
          w="36px"
          h="36px"
          align="center"
          justify="center"
          borderRadius="lg"
          bg={danger ? 'rgba(229, 62, 62, 0.12)' : 'rgba(38, 128, 235, 0.12)'}
          color={danger ? 'red.300' : 'brand.300'}
          flexShrink={0}
        >
          <IconCmp size={18} />
        </Flex>
        <VStack align="start" spacing={0} flex="1" minW={0}>
          <Text
            fontSize="sm"
            fontWeight={600}
            color={tokens.fg.primary}
            lineHeight="1.25"
          >
            {title}
          </Text>
          <Text fontSize="11px" color={tokens.fg.muted} noOfLines={1}>
            {description}
          </Text>
        </VStack>
        <Box color={tokens.fg.muted} flexShrink={0}>
          <MdArrowForward size={16} />
        </Box>
      </HStack>
    </Box>
  );
}

/* ─────────────────────────────────────────────
   Idle state — pick a destination
   ───────────────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <Text
      fontSize="10px"
      color={tokens.fg.muted}
      fontWeight={700}
      textTransform="uppercase"
      letterSpacing="0.10em"
      mb={1.5}
    >
      {children}
    </Text>
  );
}

function ActionList() {
  return (
    <VStack spacing={4} align="stretch">
      <Box>
        <SectionLabel>Open a LinkedIn page</SectionLabel>
        <VStack spacing={2} align="stretch">
          <ActionCard
            icon={MdGroups}
            title="People You May Know"
            description="Auto-connect from your network feed"
            onClick={openMyNetwork}
          />
          <ActionCard
            icon={MdPersonSearch}
            title="Search People"
            description="Auto-connect from search results"
            onClick={openSearchPeople}
          />
        </VStack>
      </Box>

      <Box>
        <SectionLabel>Profile tools</SectionLabel>
        <ActionCard
          icon={MdDelete}
          title="Delete All Skills"
          description="Wipes your profile skills list"
          onClick={requestDeleteSkills}
          tone="danger"
        />
      </Box>
    </VStack>
  );
}

/* ─────────────────────────────────────────────
   Active state — progress & control
   ───────────────────────────────────────────── */

function ConnectingView({ port }) {
  const [isRunning, setIsRunning] = useAtom(isRunningAtom);
  const [clickCount] = useAtom(clickCountAtom);
  const [sessionCap] = useAtom(sessionCapAtom);

  const onToggle = () => {
    if (!port) return;
    port.postMessage({
      id: isRunning ? MessageId.StopAutoConnect : MessageId.StartAutoConnect,
    });
    setIsRunning(!isRunning);
  };

  const cap = Number(sessionCap) || 0;
  const percent = cap > 0 ? Math.min(100, (clickCount / cap) * 100) : 0;
  const remaining = Math.max(0, cap - clickCount);

  return (
    <VStack spacing={5} align="stretch">
      <VStack spacing={3}>
        <HStack
          spacing={2}
          px={2.5}
          py={1}
          borderRadius="full"
          bg={isRunning ? 'rgba(38, 128, 235, 0.12)' : 'rgba(148, 163, 184, 0.10)'}
          borderWidth="1px"
          borderColor={isRunning ? 'rgba(38, 128, 235, 0.35)' : tokens.border.default}
        >
          <Box
            w="6px"
            h="6px"
            borderRadius="full"
            bg={isRunning ? 'brand.300' : tokens.fg.muted}
            sx={
              isRunning
                ? {
                    animation: 'linkit-pulse 1.6s ease-in-out infinite',
                    '@keyframes linkit-pulse': {
                      '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                      '50%': { opacity: 0.55, transform: 'scale(1.4)' },
                    },
                  }
                : undefined
            }
          />
          <Text fontSize="11px" fontWeight={600} color={tokens.fg.secondary}>
            {isRunning ? 'Auto-connecting' : 'Paused'}
          </Text>
        </HStack>

        <CircularProgress
          value={percent}
          color={isRunning ? 'brand.400' : tokens.fg.muted}
          trackColor={tokens.border.default}
          size="124px"
          thickness="6px"
          capIsRound
        >
          <CircularProgressLabel>
            <VStack spacing={0} lineHeight="1">
              <Text fontSize="28px" fontWeight={700} color={tokens.fg.primary}>
                {clickCount}
              </Text>
              <Text fontSize="10px" color={tokens.fg.muted} fontWeight={600}>
                / {cap}
              </Text>
            </VStack>
          </CircularProgressLabel>
        </CircularProgress>

        <Text fontSize="xs" color={tokens.fg.muted}>
          {remaining > 0
            ? `${remaining} invitation${remaining === 1 ? '' : 's'} remaining`
            : 'Session cap reached'}
        </Text>
      </VStack>

      <Button
        onClick={onToggle}
        isDisabled={!port || remaining === 0}
        size="lg"
        width="full"
        colorScheme={isRunning ? 'red' : 'brand'}
        variant={isRunning ? 'subtle' : 'solid'}
        leftIcon={isRunning ? <MdPause size={18} /> : <MdPlayArrow size={20} />}
      >
        {!port
          ? 'Preparing connection…'
          : isRunning
            ? 'Pause'
            : remaining === 0
              ? 'Cap reached'
              : 'Start connecting'}
      </Button>
    </VStack>
  );
}

/* ─────────────────────────────────────────────
   Inline settings — replaces the standalone options page
   ───────────────────────────────────────────── */

function SettingsView({ onDone }) {
  const [sessionCap, setSessionCap] = useAtom(sessionCapAtom);
  const [initialCap, setInitialCap] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    loadSessionCap().then((cap) => {
      if (!cancelled) setInitialCap(cap);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = initialCap !== null && Number(sessionCap) !== Number(initialCap);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveSessionCap(sessionCap);
      setInitialCap(Number(sessionCap));
      toast({
        position: 'top',
        title: 'Saved',
        description: `Session cap is now ${sessionCap}.`,
        status: 'success',
        duration: 1800,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <Box
        bg={tokens.surface.raised}
        borderWidth="1px"
        borderColor={tokens.border.default}
        borderRadius="xl"
        p={4}
      >
        <FormControl>
          <FormLabel htmlFor="cap-input-inline" mb={2} fontSize="xs">
            Max auto-connections per session
          </FormLabel>

          <HStack spacing={3} align="center">
            <NumberInput
              id="cap-input-inline"
              value={sessionCap}
              onChange={(v) => setSessionCap(v)}
              min={LINKIT_SESSION_CAP_MIN}
              max={LINKIT_SESSION_CAP_MAX}
              width="86px"
              size="sm"
            >
              <NumberInputField borderRadius="md" fontWeight={600} />
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
              <SliderThumb boxSize={4} />
            </Slider>
          </HStack>

          <FormHelperText color={tokens.fg.muted} fontSize="11px" mt={2}>
            Range {LINKIT_SESSION_CAP_MIN}–{LINKIT_SESSION_CAP_MAX}. Linkit stops once
            this number is reached.
          </FormHelperText>
        </FormControl>
      </Box>

      <Box
        bg={tokens.surface.raised}
        borderWidth="1px"
        borderColor={tokens.border.default}
        borderRadius="xl"
        p={3.5}
      >
        <Text fontSize="11px" color={tokens.fg.muted} lineHeight="1.55">
          LinkedIn enforces <strong>~80–100 invites/week</strong>. Linkit also waits 3–8 s
          between clicks and caps at 40/day.
        </Text>
      </Box>

      <HStack spacing={2} justify="flex-end">
        <Button variant="ghost" size="sm" onClick={onDone}>
          Close
        </Button>
        <Button
          size="sm"
          onClick={onSave}
          isLoading={saving}
          isDisabled={!dirty}
          loadingText="Saving"
        >
          Save
        </Button>
      </HStack>
    </VStack>
  );
}

/* ─────────────────────────────────────────────
   Root
   ───────────────────────────────────────────── */

function canAutoConnectOnUrl(url = '') {
  return (
    url.includes(Links.PatternOfSearchPage) || url.includes(Links.PatternOfMyNetworkPage)
  );
}

export default function App() {
  const [, setIsRunning] = useAtom(isRunningAtom);
  const [, setClickCount] = useAtom(clickCountAtom);
  const [, setSessionCap] = useAtom(sessionCapAtom);
  const portRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [canAutoConnectPage, setCanAutoConnectPage] = useState(false);
  const [isRunning] = useAtom(isRunningAtom);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cap = await loadSessionCap();
      if (!cancelled) setSessionCap(cap);

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!cancelled) {
        setCanAutoConnectPage(canAutoConnectOnUrl(tab?.url || ''));
      }

      const port = await connectToActiveTab();
      if (cancelled || !port) return;
      portRef.current = port;
      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          console.debug(
            'Linkit: popup port disconnected:',
            chrome.runtime.lastError.message,
          );
        }
        setIsConnected(false);
      });
      port.onMessage.addListener((msg) => {
        switch (msg?.id) {
          case MessageId.ConnectionEstablished:
            setIsConnected(true);
            break;
          case MessageId.RunningStateUpdated:
            setIsRunning(Boolean(msg.content));
            break;
          case MessageId.ButtonClicksCountUpdated:
            setClickCount(Number(msg.content) || 0);
            break;
        }
      });
    })();
    return () => {
      cancelled = true;
      try {
        portRef.current?.disconnect();
      } catch {
        /* port already closed */
      }
    };
  }, [setIsRunning, setClickCount, setSessionCap]);

  const ready = canAutoConnectPage && isConnected;
  const statusTone = isRunning ? 'busy' : ready ? 'ready' : 'idle';
  const statusLabel = isRunning ? 'Running' : ready ? 'Ready' : 'Idle';

  return (
    <ChakraProvider theme={theme}>
      <Box width={POPUP_WIDTH} bg={tokens.surface.canvas} color={tokens.fg.primary}>
        <Header
          statusTone={statusTone}
          statusLabel={statusLabel}
          settingsOpen={showSettings}
          onToggleSettings={() => setShowSettings((s) => !s)}
        />
        <Box p={4}>
          {showSettings ? (
            <SettingsView onDone={() => setShowSettings(false)} />
          ) : canAutoConnectPage ? (
            <ConnectingView port={portRef.current} />
          ) : (
            <ActionList />
          )}
        </Box>
        <Box
          px={4}
          py={2.5}
          borderTopWidth="1px"
          borderColor={tokens.border.subtle}
          bg={tokens.surface.raised}
        >
          <Text fontSize="10px" color={tokens.fg.muted} textAlign="center">
            Tip: stay under{' '}
            <Badge variant="subtle" colorScheme="orange" fontSize="10px">
              ~80/week
            </Badge>{' '}
            to avoid LinkedIn limits
          </Text>
        </Box>
      </Box>
    </ChakraProvider>
  );
}
