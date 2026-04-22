"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Copy,
  Check,
  Users,
  Calendar,
  Wallet,
  ArrowRight,
  MapPin,
  Clock,
  Link2,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";

interface Member {
  id: string;
  displayName: string;
  role: "owner" | "member";
}

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budgetTotal: number | null;
  currency: string;
  members: Member[];
}

interface Props {
  trip: Trip;
  inviteUrl: string | null;
  userId: string;
}

const AVATAR_GRADIENTS = [
  "from-blue-400 to-indigo-500",
  "from-violet-400 to-purple-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-cyan-400 to-blue-500",
];

function getMemberGradient(id: string) {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

export function TripOverview({ trip, inviteUrl }: Props) {
  const [copied, setCopied] = useState(false);

  const nights = differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate));

  async function copyInviteLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  const quickLinks = [
    {
      label: "Itinerary",
      href: `/trips/${trip.id}/itinerary`,
      icon: MapPin,
      description: "View and edit the day-by-day plan",
      gradient: "from-blue-500 to-indigo-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      hoverBorder: "hover:border-blue-200 dark:hover:border-blue-800",
    },
    {
      label: "Votes",
      href: `/trips/${trip.id}/votes`,
      icon: Users,
      description: "Active decisions waiting for the group",
      gradient: "from-violet-500 to-purple-600",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      iconColor: "text-violet-600 dark:text-violet-400",
      hoverBorder: "hover:border-violet-200 dark:hover:border-violet-800",
    },
    {
      label: "Expenses",
      href: `/trips/${trip.id}/expenses`,
      icon: Wallet,
      description: "Track spending and who owes what",
      gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      hoverBorder: "hover:border-emerald-200 dark:hover:border-emerald-800",
    },
  ];

  const stats = [
    {
      label: "Destination",
      value: trip.destination,
      icon: MapPin,
      bg: "bg-blue-50 dark:bg-blue-950/30",
      iconColor: "text-blue-500",
    },
    {
      label: "Duration",
      value: `${nights} night${nights !== 1 ? "s" : ""}`,
      icon: Clock,
      bg: "bg-violet-50 dark:bg-violet-950/30",
      iconColor: "text-violet-500",
    },
    {
      label: "Travelers",
      value: `${trip.members.length} people`,
      icon: Users,
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      iconColor: "text-emerald-500",
    },
    {
      label: "Budget",
      value: trip.budgetTotal
        ? `${trip.currency} ${trip.budgetTotal.toLocaleString()}`
        : "Not set",
      icon: Wallet,
      bg: "bg-amber-50 dark:bg-amber-950/30",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/60 hover:border-border transition-colors">
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
                <p className="font-semibold text-sm truncate">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid sm:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className={`h-full hover:shadow-md transition-all cursor-pointer group border-border/60 ${link.hoverBorder}`}>
              <CardContent className="p-5 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${link.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <link.icon className={`w-4.5 h-4.5 ${link.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{link.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {link.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Members */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Members</CardTitle>
              <Link href={`/trips/${trip.id}/members`}>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/8">
                  Manage
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {trip.members.map((member) => (
              <div key={member.id} className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getMemberGradient(member.id)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {member.displayName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm flex-1 truncate font-medium">{member.displayName}</span>
                {member.role === "owner" && (
                  <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 hover:bg-amber-100">
                    Owner
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Invite */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link2 className="w-4 h-4 text-primary" />
              </div>
              <CardTitle className="text-base">Invite your crew</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Share this link to invite friends. They can join with just their
              name — no account needed.
            </p>
            {inviteUrl && (
              <div className="flex gap-2">
                <code className="flex-1 text-xs bg-muted/60 rounded-lg px-3 py-2 truncate border border-border/50">
                  {inviteUrl}
                </code>
                <Button
                  size="sm"
                  onClick={copyInviteLink}
                  className={`shrink-0 gap-1.5 transition-all ${copied ? "bg-emerald-600 hover:bg-emerald-600" : "bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 border-0"}`}
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dates */}
      <Card className="border-border/60">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-violet-400/15 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">
              {format(parseISO(trip.startDate), "EEEE, MMMM d, yyyy")} →{" "}
              {format(parseISO(trip.endDate), "EEEE, MMMM d, yyyy")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {nights} night{nights !== 1 ? "s" : ""} · {trip.destination}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
