import { useMemo, useRef } from 'react';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import type { Language } from '../languages';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

type Props = {
  value: string;
  language: Language;
  onChange: (value: string) => void;
  dark: boolean;
  onRun: () => void;
  onSubmit: () => void;
};

/** CodeMirror is the largest dependency, so this module is lazy-loaded by App. */
export default function Editor({ value, language, onChange, dark, onRun, onSubmit }: Props) {
  // Keep the latest handlers reachable from a keymap that is created once.
  const handlers = useRef({ onRun, onSubmit });
  handlers.current = { onRun, onSubmit };

  const extensions = useMemo(() => [
    language === 'python' ? python() : javascript(),
    Prec.highest(keymap.of([
      { key: 'Mod-Enter', run: () => { handlers.current.onSubmit(); return true; } },
      { key: "Mod-'", run: () => { handlers.current.onRun(); return true; } },
    ])),
  ], [language]);

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={dark ? oneDark : 'light'}
      extensions={extensions}
      onChange={onChange}
      aria-label={`${language} solution editor`}
      basicSetup={{ foldGutter: false, highlightActiveLine: true }}
    />
  );
}
