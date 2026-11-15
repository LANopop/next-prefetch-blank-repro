"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * <Link prefetch={false}> plus prefetch-on-intent: router.prefetch(href) on
 * pointer enter and focus. (prefetch={false} also turns off hover prefetching
 * in the App Router, so this restores only the intent half.)
 */
export function IntentLink(props: Omit<ComponentProps<typeof Link>, "prefetch"> & { href: string }) {
  const router = useRouter();
  const prefetch = () => router.prefetch(props.href);
  return <Link {...props} prefetch={false} onPointerEnter={prefetch} onFocus={prefetch} />;
}
