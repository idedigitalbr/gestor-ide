"use client";

import { useState } from "react";

export function MemberAvatarContent({ name, src, initialsLength = 2 }: { name?: string | null; src?: string | null; initialsLength?: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const label = name?.trim() || "Usuário";
  if (src && failedSrc !== src) {
    return <img src={src} alt={label} className="h-full w-full object-cover" onError={() => setFailedSrc(src)} />;
  }
  return <span aria-label={label}>{label.slice(0, initialsLength).toUpperCase()}</span>;
}
