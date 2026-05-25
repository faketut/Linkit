import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import {
  Badge,
  Box,
  Button,
  ChakraProvider,
  CircularProgress,
  CircularProgressLabel,
  Divider,
  Flex,
  HStack,
  Heading,
  IconButton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { MdGroups, MdPersonSearch, MdSettings, MdDelete } from 'react-icons/md';

import { theme } from '../shared/theme.js';
import { MessageId } from '../shared/constants.js';
import {
  clickCountAtom,
  isRunningAtom,
  loadSessionCap,
  sessionCapAtom,
} from '../shared/atoms.js';
import {
  connectToActiveTab,
  openMyNetwork,
  openOptions,
  openSearchPeople,
  requestDeleteSkills,
} from '../shared/actions.js';

const POPUP_WIDTH = '320px';

function Header({ connected }) {
  return (
    <Flex
      px={5}
      py={3}
      align="center"
      bgGradient="linear(to-r, brand.700, brand.500)"
      width={POPUP_WIDTH}
    >
      <VStack align="start" spacing={0}>
        <Heading size="md" color="white">
          Linkit
        </Heading>
        <Text fontSize="xs" color="whiteAlpha.800">
          LinkedIn auto-connect
        </Text>
      </VStack>
      <Box flex="1" />
      <HStack spacing={2}>
        <Badge
          variant="subtle"
          colorScheme={connected ? 'green' : 'gray'}
          borderRadius="full"
          px={2}
        >
          {connected ? 'Ready' : 'Idle'}
        </Badge>
        <IconButton
          size="sm"
          variant="ghost"
          color="white"
          _hover={{ bg: 'whiteAlpha.300' }}
          aria-label="Open options"
          icon={<MdSettings size={18} />}
          onClick={openOptions}
        />
      </HStack>
    </Flex>
  );
}

function ActionList() {
  return (
    <VStack spacing={2} align="stretch">
      <Text fontSize="xs" color="gray.400" textTransform="uppercase" letterSpacing="wider">
        Open a LinkedIn page
      </Text>
      <Button
        onClick={openMyNetwork}
        leftIcon={<MdGroups size={18} />}
        justifyContent="flex-start"
        size="md"
        variant="solid"
      >
        People You May Know
      </Button>
      <Button
        onClick={openSearchPeople}
        leftIcon={<MdPersonSearch size={18} />}
        justifyContent="flex-start"
        size="md"
        variant="outline"
      >
        Search People
      </Button>
      <Divider my={1} borderColor="whiteAlpha.200" />
      <Text fontSize="xs" color="gray.400" textTransform="uppercase" letterSpacing="wider">
        Profile tools
      </Text>
      <Button
        onClick={requestDeleteSkills}
        leftIcon={<MdDelete size={18} />}
        justifyContent="flex-start"
        size="md"
        variant="ghost"
        colorScheme="red"
      >
        Delete All Skills
      </Button>
    </VStack>
  );
}

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

  return (
    <VStack spacing={4} align="stretch">
      <VStack spacing={1}>
        <Text fontSize="sm" color="gray.400" textTransform="uppercase" letterSpacing="wider">
          Invitations sent
        </Text>
        <CircularProgress
          value={percent}
          color={isRunning ? 'brand.400' : 'gray.500'}
          trackColor="whiteAlpha.200"
          size="120px"
          thickness="8px"
          capIsRound
        >
          <CircularProgressLabel fontSize="2xl" fontWeight="bold">
            {clickCount}
          </CircularProgressLabel>
        </CircularProgress>
        <Text fontSize="xs" color="gray.500">
          Session cap: {cap}
        </Text>
      </VStack>
      <Button
        colorScheme={isRunning ? 'red' : 'brand'}
        onClick={onToggle}
        size="lg"
        width="full"
      >
        {isRunning ? 'Stop' : 'Start'} connecting
      </Button>
    </VStack>
  );
}

export default function App() {
  const [, setIsRunning] = useAtom(isRunningAtom);
  const [, setClickCount] = useAtom(clickCountAtom);
  const [, setSessionCap] = useAtom(sessionCapAtom);
  const portRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cap = await loadSessionCap();
      if (!cancelled) setSessionCap(cap);

      const port = await connectToActiveTab();
      if (cancelled || !port) return;
      portRef.current = port;
      port.onDisconnect.addListener(() => setIsConnected(false));
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

  return (
    <ChakraProvider theme={theme}>
      <Box width={POPUP_WIDTH} bg="#0f1419" color="white">
        <Header connected={isConnected} />
        <Box p={5}>
          {isConnected ? <ConnectingView port={portRef.current} /> : <ActionList />}
        </Box>
      </Box>
    </ChakraProvider>
  );
}
