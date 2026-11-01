'use client';

import { useState } from 'react';

const SRC = process.env.NEXT_PUBLIC_LOGO_URL || 'https://lebbas.com/logo.png';

export default function Logo({ size = 44 }: { size?: number }) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-white shadow-md ring-2 ring-leaf-500"
      style={{ width: size, height: size }}
    >
      {failed ? (
        <span className="font-black text-brand-700" style={{ fontSize: size * 0.5 }}>
          س
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={SRC} alt="Lebas" className="h-[78%] w-[78%] object-contain" onError={() => setFailed(true)} />
      )}
    </span>
  );
}
