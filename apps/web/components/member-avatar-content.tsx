"use client";

import { useState } from "react";
import Image from "next/image";

export function MemberAvatarContent({ name, src, initialsLength = 2 }: { name?: string | null; src?: string | null; initialsLength?: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const label = name?.trim() || "Usuário";
  if (src && failedSrc !== src) {
    return (
      <Image
        src={src}
        alt={label}
        width={40}
        height={40}
        unoptimized
        className="h-full w-full object-cover"
        onError={() => setFailedSrc(src)}
      />
    );
  }
  return <span aria-label={label}>{label.slice(0, initialsLength).toUpperCase()}</span>;
}
