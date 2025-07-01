// src/types/react-to-print.d.ts
import 'react-to-print';

declare module 'react-to-print' {
  interface UseReactToPrintOptions {
    /** العنصر الذى سيتم طباعته */
    content?: () => HTMLElement | null;
    /** يُنفَّذ قبل الطباعة (يمكنه إرجاع Promise) */
    onBeforeGetContent?: () => Promise<void> | void;
  }
}

