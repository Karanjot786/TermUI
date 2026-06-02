export const caps = {
  color:   !process.env.NO_COLOR && process.env.TERM !== 'dumb',
  unicode: !process.env.NO_UNICODE && process.env.TERM !== 'dumb',
  motion:  !process.env.NO_MOTION && !process.env.CI,
  ci:      !!process.env.CI,
  get background(): 'light' | 'dark' {
    const colorfgbg = process.env.COLORFGBG;
    if (colorfgbg) {
      const parts = colorfgbg.split(';');
      const bg = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(bg)) return bg < 8 ? 'dark' : 'light';
    }

    if (process.env.TERM_BACKGROUND === 'light') return 'light';
    return 'dark';
  },
} as const;
