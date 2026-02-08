import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeProvider({
  children,
  ...props
}: {
  children: React.ReactNode;
  attribute?: string;
  defaultTheme?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  return (
    <ThemeProviderPrimitive {...props}>
      {children}
    </ThemeProviderPrimitive>
  );
}

import { ThemeProvider as ThemeProviderPrimitive } from 'next-themes';

export function useThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const isDark = resolvedTheme === 'dark';

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    mounted,
  };
}
