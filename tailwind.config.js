import  { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))',
  				grid: 'hsl(var(--chart-grid))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))',
  				dark: 'hsl(var(--sidebar-dark))',
  				'muted-foreground': 'hsl(var(--sidebar-muted-foreground))'
  			},

  			/* ------------------------------------------------------------------
  			 * PROTOCALL semantic tokens (theme-aware — follow light/dark).
  			 * Use these for trading semantics instead of Tailwind's generic
  			 * green/red/amber scales.
  			 * ---------------------------------------------------------------- */
  			buy: {
  				DEFAULT: 'hsl(var(--buy))',
  				foreground: 'hsl(var(--buy-foreground))',
  				muted: 'hsl(var(--buy-muted))',
  				'muted-foreground': 'hsl(var(--buy-muted-foreground))'
  			},
  			hold: {
  				DEFAULT: 'hsl(var(--hold))',
  				foreground: 'hsl(var(--hold-foreground))',
  				muted: 'hsl(var(--hold-muted))',
  				'muted-foreground': 'hsl(var(--hold-muted-foreground))'
  			},
  			sell: {
  				DEFAULT: 'hsl(var(--sell))',
  				foreground: 'hsl(var(--sell-foreground))',
  				muted: 'hsl(var(--loss-muted))',
  				'muted-foreground': 'hsl(var(--loss-muted-foreground))'
  			},
  			premium: {
  				DEFAULT: 'hsl(var(--premium))',
  				foreground: 'hsl(var(--premium-foreground))',
  				light: 'hsl(var(--premium-light))',
  				muted: 'hsl(var(--premium-muted))',
  				'muted-foreground': 'hsl(var(--premium-muted-foreground))'
  			},
  			brand: {
  				DEFAULT: 'hsl(var(--primary))',
  				blue: 'hsl(var(--brand-blue))',
  				deep: 'hsl(var(--brand-deep))',
  				light: 'hsl(var(--brand-light))',
  				ink: 'hsl(var(--brand-ink))'
  			},
  			surface: {
  				DEFAULT: 'hsl(var(--card))',
  				'2': 'hsl(var(--surface-2))'
  			},
  			divider: 'hsl(var(--divider))',
  			subtle: 'hsl(var(--subtle-foreground))',
  			positive: 'hsl(var(--positive-foreground))',

  			/* ------------------------------------------------------------------
  			 * Raw PROTOCALL palette — fixed hex, identical in light and dark.
  			 * Reach for these only where a value must NOT shift with the theme
  			 * (e.g. text sitting on the fixed brand gradient or on navy chrome).
  			 * Prefer the theme-aware tokens above everywhere else.
  			 * ---------------------------------------------------------------- */
  			protocall: {
  				/* Brand & primary */
  				grape: '#6D28D9',
  				blue: '#4737FF',
  				deep: '#3529BF',
  				light: '#ACA5FF',
  				ink: '#101018',
  				/* Page & cards */
  				page: '#FCF9ED',
  				card: '#FFFFFF',
  				surface: '#F7F8FC',
  				input: '#F5F6FB',
  				border: '#E5E2D7',
  				divider: '#E9EAF2',
  				chartGrid: '#E5E7F0',
  				/* Typography */
  				heading: '#202030',
  				text: '#202030',
  				muted: '#5E5E6A',
  				subtle: '#8B8D9A',
  				/* BUY / positive / growth / live / progress */
  				buy: '#D7FF00',
  				'buy-foreground': '#101018',
  				'buy-text': '#193B20',
  				/* HOLD / caution / pending */
  				hold: '#F75C03',
  				'hold-bg': '#FFF0E6',
  				'hold-text': '#9A3400',
  				/* SELL / loss / error */
  				sell: '#EF4444',
  				'sell-bg': '#FEECEC',
  				'sell-text': '#B91C1C',
  				/* Premium / special */
  				premium: '#4737FF',
  				'premium-light': '#D1CDFF',
  				'premium-bg': '#F1F0FF',
  				'premium-text': '#3529BF',
  				/* Sidebar & navigation */
  				'sidebar-bg': '#10162D',
  				'sidebar-dark': '#0B1024',
  				'sidebar-active': '#4737FF',
  				'sidebar-hover': '#3529BF',
  				'sidebar-divider': '#252D4A',
  				'sidebar-text': '#FFFFFF',
  				'sidebar-muted': '#A9B0C8'
  			}
  		},
  		backgroundImage: {
  			/* Brand gradient: #101018 -> #3529BF -> #4737FF -> #ACA5FF */
  			'brand-gradient':
  				'linear-gradient(100deg, #101018 0%, #3529BF 42%, #4737FF 70%, #ACA5FF 100%)',
  			/* VIP / premium variant — stays inside the purple family */
  			'premium-gradient':
  				'linear-gradient(100deg, #101018 0%, #6D28D9 38%, #3529BF 68%, #D1CDFF 100%)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
