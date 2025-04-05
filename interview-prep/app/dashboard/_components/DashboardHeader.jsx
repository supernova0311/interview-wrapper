"use client";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

function DashboardHeader() {
  const pathname = usePathname();
  const isDashboardRoute = pathname === "/app";

  // Condition to check whether we should show both the logo + name and the user button
  const showLogoAndName = !(isDashboardRoute && window.innerWidth >= 768); // Only hide logo on medium screen (md) on /dashboard route

  return (
    <div
      className={`w-full p-3 shadow-md flex items-center bg-gray-900 text-white ${
        showLogoAndName ? "justify-between" : "justify-end" // Adjust layout based on whether both are shown
      }`}
    >
      {/* Logo and Name - shown based on screen size and route */}
      {showLogoAndName && (
        <div className="flex items-center space-x-2">
          
          <Link href={"/app"}>
            <span className="text-xl md:text-2xl font-bold text-emerald-400">Interview-Wrapper</span>
          </Link>
        </div>
      )}

      {/* User Button */}
      <UserButton 
        appearance={{
          elements: {
            userButtonAvatarBox: "h-10 w-10 border-2 border-emerald-500/50",
            userButtonPopoverCard: "bg-gray-800 border border-gray-700",
            userButtonPopoverActionButtonText: "text-gray-200 hover:text-white",
            userButtonPopoverActionButton: "hover:bg-gray-700"
          }
        }}
      />
    </div>
  );
}

export default DashboardHeader;