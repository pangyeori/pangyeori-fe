import { useId } from 'react';
import type { DiscoveryTopic } from './topicContent';

// Lightweight, code-native fallback while WebGL loads or is unavailable.
export function TopicPoster({ topic }: { topic: DiscoveryTopic }) {
  const id = useId();
  return <svg viewBox="0 0 320 320" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d8e7ff" /><stop offset="1" stopColor="#6e9ce9" /></linearGradient>
      <linearGradient id={`${id}-cream`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff5d5" /><stop offset="1" stopColor="#e9bd67" /></linearGradient>
      <radialGradient id={`${id}-shadow`}><stop stopColor="#233a5c" stopOpacity=".14" /><stop offset="1" stopColor="#233a5c" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="160" cy="284" rx="100" ry="16" fill={`url(#${id}-shadow)`} />
    {topic === 0 ? <g transform="rotate(-8 160 160)">
      <path d="M76 184v-47a84 84 0 0 1 168 0v47" fill="none" stroke="#b7c9df" strokeWidth="19" />
      <path d="M80 150v-13a80 80 0 0 1 160 0v13" fill="none" stroke="#edf3fb" strokeWidth="11" />
      <rect x="57" y="145" width="53" height="99" rx="24" fill={`url(#${id}-blue)`} />
      <rect x="210" y="145" width="53" height="99" rx="24" fill={`url(#${id}-blue)`} />
      <rect x="88" y="152" width="23" height="85" rx="11" fill="#344355" />
      <rect x="209" y="152" width="23" height="85" rx="11" fill="#344355" />
    </g> : topic === 1 ? <g strokeLinejoin="round">
      <path d="M74 137h151v119H74z" fill="#f6f0e6" />
      <path d="m225 137 28-17v116l-28 20z" fill="#e1d8ca" />
      <path d="m56 139 94-82 92 82z" fill="#dba68f" stroke="#dba68f" strokeWidth="10" />
      <path d="m150 57 28-14 91 78-27 18z" fill="#bf826d" />
      <rect x="97" y="159" width="40" height="40" rx="5" fill="#91adca" stroke="#fff" strokeWidth="7" />
      <path d="M117 160v38m-19-19h38" stroke="#fff" strokeWidth="4" />
      <rect x="169" y="185" width="34" height="71" rx="5" fill="#647c91" />
      <circle cx="195" cy="223" r="3" fill="#e6cc94" />
    </g> : <path d="M211 51C164 80 143 177 211 250C84 292 36 163 94 88C124 49 166 38 211 51Z" fill={`url(#${id}-cream)`} />}
  </svg>;
}
