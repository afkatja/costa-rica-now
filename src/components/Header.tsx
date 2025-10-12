import React from "react"
import Image from "next/image"
import Link from "next/link"
import { Navigation } from "./Navigation"
import User from "./User"

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Link href="/" prefetch>
            <Image
              src="/logo-crn.avif"
              alt="costa rica now logo"
              height={50}
              width={100}
            />
          </Link>
          <h1 className="font-bold">{title}</h1>
        </div>
        <Navigation />
        <User />
      </div>
    </header>
  )
}
