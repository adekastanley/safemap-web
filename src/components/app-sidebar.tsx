"use client";

import * as React from "react";
import {
	AudioWaveform,
	BookOpen,
	Bot,
	Command,
	Frame,
	GalleryVerticalEnd,
	Map,
	PieChart,
	Settings2,
	SquareTerminal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

const defaultUser = {
  name: "Guest",
  email: "guest@local",
  avatar: "/avatars/shadcn.jpg",
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, isAdmin } = useAuth();

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: true,
      items: [
        { title: "Map", url: "/dashboard/map" },
        { title: "Alerts", url: "/dashboard/alerts" },
        ...(isAdmin ? [{ title: "Create Alert", url: "/dashboard/alerts/create" }] : []),
        ...(isAdmin ? [{ title: "Manage", url: "/dashboard/manage" }] : []),
        ...(isAdmin ? [{ title: "Notifications", url: "/dashboard/notifications" }] : []),
        ...(isAdmin ? [{ title: "Admin", url: "/dashboard/admin" }] : []),
        { title: "Settings", url: "/dashboard/settings" },
      ],
    },
  ];

  const teams = [
    { name: "SafeMap", logo: GalleryVerticalEnd, plan: isAdmin ? "Admin" : "User" },
  ];

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ name: user?.displayName || user?.email || defaultUser.name, email: user?.email || defaultUser.email, avatar: defaultUser.avatar }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
