import { useEffect, useRef, useState } from 'react';
import { useAtom } from 'jotai';
import {
  Box,
  Button,
  ChakraProvider,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Heading,
  List,
  ListItem,
  Spacer,
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

function Header() {
  return (
    <Flex
      paddingX={5}
      paddingY={2}
      backgroundColor="gray.700"
      align="center"
      width="260px"
    >
      <Box>
        <Heading size="sm">Linkit</Heading>
      </Box>
      <Spacer />
      <Box>
        <Button size="sm" onClick={openOptions} aria-label="Open options">
          <MdSettings />
        </Button>
      </Box>
    </Flex>
  );
}

function ActionList() {
  return (
    <List spacing={3}>
      <ListItem>
        <Button onClick={openMyNetwork} leftIcon={<MdGroups />} width="full">
          People You May Know
        </Button>
      </ListItem>
      <ListItem>
        <Button onClick={openSearchPeople} leftIcon={<MdPersonSearch />} width="full">
          Search People
        </Button>
      </ListItem>
      <ListItem>
        <Button onClick={requestDeleteSkills} leftIcon={<MdDelete />} width="full">
          Delete All Skills
        </Button>
      </ListItem>
    </List>
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
    // Optimistic — content script will echo back RunningStateUpdated.
    setIsRunning(!isRunning);
  };

  const percent = sessionCap > 0 ? (clickCount / Number(sessionCap)) * 100 : 0;

  return (
    <VStack spacing="3">
      <Box>
        <Text fontSize="18px">Invitations Sent</Text>
      </Box>
      <Box>
        <CircularProgress value={percent} color="green.400" size="100px">
          <CircularProgressLabel>{clickCount}</CircularProgressLabel>
        </CircularProgress>
      </Box>
      <Box>
        <Button colorScheme={isRunning ? 'red' : 'green'} onClick={onToggle} width="full">
          {isRunning ? 'STOP' : 'START'} CONNECTING
        </Button>
      </Box>
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

  // Show the connecting view once the content-script port reports back; until
  // then (e.g. non-LinkedIn tab, or content script not yet injected) show the
  // action list so the user can navigate to a supported page.
  return (
    <ChakraProvider theme={theme}>
      <Header />
      <Box padding="5">
        {isConnected ? <ConnectingView port={portRef.current} /> : <ActionList />}
      </Box>
    </ChakraProvider>
  );
}
