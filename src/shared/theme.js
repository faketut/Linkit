import { extendTheme } from '@chakra-ui/react';

/**
 * Linkit design system — applies UI UX Pro Max guidelines
 * for a developer / productivity tool:
 *   • Modern minimalism with subtle depth (no glassmorphism, no neumorphism)
 *   • Refined dark slate base + vivid blue accent (LinkedIn-aligned)
 *   • Semantic foreground tokens for ≥4.5:1 contrast
 *   • Smooth ~180ms transitions + visible focus rings
 *   • Respects prefers-reduced-motion
 *   • SVG icons only, no AI purple/pink gradients
 */

// Inter via system stack — geometric, neutral, productivity-friendly.
const fontStack =
  "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, " +
  "'Helvetica Neue', Arial, sans-serif";

// Surface scale — graduated dark slate, slightly cooler than pure black.
const surface = {
  canvas: '#0B0F14',
  raised: '#11161D',
  elevated: '#161C25',
  overlay: '#1B2330',
};

// Foreground (text) scale — engineered for ≥4.5:1 contrast on canvas.
const fg = {
  primary: '#E7ECF3',
  secondary: '#B5BFCC',
  muted: '#8E99A8',
  disabled: '#5A6573',
};

// Border scale — alpha so it composes over any surface.
const border = {
  subtle: 'rgba(148, 163, 184, 0.10)',
  default: 'rgba(148, 163, 184, 0.18)',
  strong: 'rgba(148, 163, 184, 0.30)',
};

// Brand (vivid blue, LinkedIn-aligned but tuned for legibility on dark).
const brand = {
  50: '#EBF3FE',
  100: '#CFE0FC',
  200: '#A8C7F9',
  300: '#7BA9F4',
  400: '#4F8DEF',
  500: '#2680EB', // primary action
  600: '#1F6FCC',
  700: '#185BAA',
  800: '#134A8C',
  900: '#0E3B72',
};

export const tokens = { surface, fg, border, brand };

export const theme = extendTheme({
  config: {
    useSystemColorMode: false,
    initialColorMode: 'dark',
  },

  colors: {
    brand,
    surface,
    fg,
  },

  fonts: {
    heading: fontStack,
    body: fontStack,
  },

  radii: {
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '14px',
    '2xl': '18px',
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.30)',
    md: '0 4px 14px rgba(0, 0, 0, 0.35)',
    lg: '0 12px 28px rgba(0, 0, 0, 0.45)',
    'brand-glow': '0 0 0 3px rgba(38, 128, 235, 0.32)',
  },

  styles: {
    global: {
      'html, body, #root, #app': {
        backgroundColor: surface.canvas,
        color: fg.primary,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      // Subtle scrollbar.
      '*::-webkit-scrollbar': { width: '10px', height: '10px' },
      '*::-webkit-scrollbar-track': { background: 'transparent' },
      '*::-webkit-scrollbar-thumb': {
        background: border.default,
        borderRadius: '8px',
        border: `2px solid ${surface.canvas}`,
      },
      '*::-webkit-scrollbar-thumb:hover': { background: border.strong },

      // Keyboard focus ring (used for non-Chakra focusables too).
      '*:focus-visible': {
        outline: 'none',
        boxShadow: '0 0 0 3px rgba(38, 128, 235, 0.45)',
        borderRadius: '8px',
      },

      // Respect user motion preference.
      '@media (prefers-reduced-motion: reduce)': {
        '*, *::before, *::after': {
          animationDuration: '0.001ms !important',
          animationIterationCount: '1 !important',
          transitionDuration: '0.001ms !important',
          scrollBehavior: 'auto !important',
        },
      },
    },
  },

  components: {
    Button: {
      baseStyle: {
        borderRadius: 'lg',
        fontWeight: 600,
        letterSpacing: '-0.005em',
        cursor: 'pointer',
        transitionProperty:
          'background-color, color, box-shadow, transform, border-color',
        transitionDuration: '180ms',
        transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        _focusVisible: { boxShadow: 'brand-glow' },
        _disabled: { opacity: 0.5, cursor: 'not-allowed' },
      },
      sizes: {
        md: { h: '40px', px: 4, fontSize: 'sm' },
        lg: { h: '46px', px: 5, fontSize: 'md' },
      },
      variants: {
        solid: (props) => ({
          bg: props.colorScheme === 'brand' ? 'brand.500' : undefined,
          color: 'white',
          _hover: {
            bg: props.colorScheme === 'brand' ? 'brand.400' : undefined,
            transform: 'translateY(-1px)',
            boxShadow: 'md',
            _disabled: { transform: 'none', boxShadow: 'none' },
          },
          _active: {
            bg: props.colorScheme === 'brand' ? 'brand.600' : undefined,
            transform: 'translateY(0)',
          },
        }),
        outline: {
          bg: 'transparent',
          borderColor: border.default,
          color: fg.primary,
          _hover: {
            bg: surface.elevated,
            borderColor: border.strong,
            transform: 'translateY(-1px)',
          },
          _active: { bg: surface.overlay, transform: 'translateY(0)' },
        },
        ghost: {
          color: fg.secondary,
          _hover: { bg: surface.elevated, color: fg.primary },
          _active: { bg: surface.overlay },
        },
        subtle: {
          bg: surface.elevated,
          color: fg.primary,
          _hover: { bg: surface.overlay },
          _active: { bg: surface.raised },
        },
      },
      defaultProps: { colorScheme: 'brand' },
    },

    IconButton: {
      baseStyle: {
        cursor: 'pointer',
        transitionProperty: 'background-color, color, box-shadow, transform',
        transitionDuration: '180ms',
        _focusVisible: { boxShadow: 'brand-glow' },
      },
    },

    Heading: {
      baseStyle: {
        letterSpacing: '-0.018em',
        color: fg.primary,
      },
    },

    Text: { baseStyle: { color: fg.primary } },

    Input: {
      variants: {
        outline: {
          field: {
            bg: surface.elevated,
            borderColor: border.default,
            color: fg.primary,
            _hover: { borderColor: border.strong },
            _focusVisible: {
              borderColor: 'brand.500',
              boxShadow: 'brand-glow',
            },
            _placeholder: { color: fg.muted },
          },
        },
      },
      defaultProps: { variant: 'outline' },
    },

    NumberInput: {
      variants: {
        outline: {
          field: {
            bg: surface.elevated,
            borderColor: border.default,
            _hover: { borderColor: border.strong },
            _focusVisible: {
              borderColor: 'brand.500',
              boxShadow: 'brand-glow',
            },
          },
        },
      },
      defaultProps: { variant: 'outline' },
    },

    Slider: {
      baseStyle: {
        track: { bg: border.default },
        filledTrack: { bg: 'brand.500' },
        thumb: {
          bg: 'white',
          boxShadow: 'sm',
          _focusVisible: { boxShadow: 'brand-glow' },
        },
      },
    },

    Divider: {
      baseStyle: { borderColor: border.subtle, opacity: 1 },
    },

    Badge: {
      baseStyle: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: 0,
        borderRadius: 'md',
      },
    },

    Tooltip: {
      baseStyle: {
        bg: surface.overlay,
        color: fg.primary,
        borderRadius: 'md',
        boxShadow: 'md',
        fontSize: 'xs',
        px: 2,
        py: 1,
      },
    },

    FormLabel: {
      baseStyle: { color: fg.secondary, fontSize: 'sm', fontWeight: 600 },
    },
  },
});
