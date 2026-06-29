import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { MapPin, Clock, Users, MessageSquare, UserPlus, LogIn, MessageCircle, ShieldCheck, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useLocation } from "wouter";
import { useI18n } from "@/contexts/I18nContext";

interface RideCardProps {
  ride: {
    id: number;
    driverId: number;
    departureLocation: string;
    departureTime: number;
    totalSeats: number;
    notes: string | null;
    status: string;
    driverName: string | null;
    driverEmail: string | null;
    seatsOccupied: number;
    seatsRemaining: number;
    isVerifiedAttendee?: number;
    eventTitle?: string | null;
    eventLumaUrl?: string | null;
  };
  hasJoined?: boolean;
  showLeave?: boolean;
}

export default function RideCard({ ride, hasJoined = false, showLeave = false }: RideCardProps) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const { t } = useI18n();

  const joinRide = trpc.rides.join.useMutation({
    onSuccess: () => {
      toast.success(t("ride.joinedSuccess"));
      utils.rides.list.invalidate();
      utils.rides.myRides.invalidate();
    },
    onError: (error) => {
      const msg = error.message || "";
      if (msg.startsWith("LUMA_NOT_REGISTERED:")) {
        const lumaUrl = msg.replace("LUMA_NOT_REGISTERED:", "");
        toast.error(t("luma.passengerNotRegistered"), {
          description: t("luma.passengerNotRegisteredDesc"),
          action: {
            label: t("luma.registerOnLuma"),
            onClick: () => window.open(lumaUrl, "_blank"),
          },
          duration: 8000,
        });
      } else {
        toast.error(msg || t("ride.joinFailed"));
      }
    },
  });

  const leaveRide = trpc.rides.leave.useMutation({
    onSuccess: () => {
      toast.success(t("ride.leftSuccess"));
      utils.rides.list.invalidate();
      utils.rides.myRides.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("ride.leaveFailed"));
    },
  });

  const isDriver = user?.id === ride.driverId;
  const isFull = ride.seatsRemaining <= 0;
  const isPast = ride.departureTime < Date.now();
  const seatPercentage = (ride.seatsOccupied / ride.totalSeats) * 100;
  const isInRide = isDriver || hasJoined;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    joinRide.mutate({ rideId: ride.id });
  };

  const handleLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    leaveRide.mutate({ rideId: ride.id });
  };

  return (
    <Card
      className="group relative overflow-hidden border-border/60 hover:border-ocean/30 transition-all duration-300 hover:shadow-md cursor-pointer"
      onClick={() => setLocation(`/rides/${ride.id}`)}
    >
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-ocean/40 via-sage/30 to-transparent" />

      <CardContent className="p-5">
        <div className="flex flex-col gap-4">
          {/* Header: Driver info + status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-ocean/10">
                <AvatarFallback className="bg-ocean/10 text-ocean text-sm font-semibold">
                  {getInitials(ride.driverName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-heading font-semibold text-foreground leading-tight">
                    {ride.driverName || t("common.driver")}
                  </p>
                  {ride.isVerifiedAttendee === 1 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <ShieldCheck className="w-4 h-4 text-ocean shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent>{t("luma.verifiedTooltip")}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {isDriver && (
                    <Badge variant="secondary" className="text-[10px] bg-sage-light text-sage">
                      {t("ride.yourRide")}
                    </Badge>
                  )}
                  {ride.isVerifiedAttendee === 1 && (
                    <Badge variant="secondary" className="text-[10px] bg-ocean/10 text-ocean border-ocean/20">
                      {t("luma.verifiedAttendee")}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {isInRide && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-7 h-7 rounded-full bg-ocean/10 flex items-center justify-center">
                      <MessageCircle className="w-3.5 h-3.5 text-ocean" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{t("ride.chatAvailable")}</TooltipContent>
                </Tooltip>
              )}
              {isPast ? (
                <Badge variant="outline" className="text-muted-foreground border-muted">
                  {t("ride.past")}
                </Badge>
              ) : isFull ? (
                <Badge variant="secondary" className="bg-terracotta/10 text-terracotta border-terracotta/20">
                  {t("ride.full")}
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-sage-light text-sage border-sage/20">
                  {ride.seatsRemaining} {ride.seatsRemaining === 1 ? t("ride.seatLeft") : t("ride.seatsLeft")}
                </Badge>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2.5">
            {ride.eventTitle && (
              <div className="flex items-center gap-2.5 text-sm">
                <CalendarDays className="w-4 h-4 text-ocean shrink-0" />
                <span className="text-foreground font-medium">{ride.eventTitle}</span>
              </div>
            )}
            <div className="flex items-start gap-2.5 text-sm">
              <MapPin className="w-4 h-4 text-ocean mt-0.5 shrink-0" />
              <span className="text-foreground">{ride.departureLocation}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Clock className="w-4 h-4 text-ocean shrink-0" />
              <span className="text-foreground">
                {formatDate(ride.departureTime)} {t("common.at")} {formatTime(ride.departureTime)}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Users className="w-4 h-4 text-ocean shrink-0" />
              <div className="flex items-center gap-2 flex-1">
                <span className="text-foreground">
                  {ride.seatsOccupied}/{ride.totalSeats} {t("ride.passengers")}
                </span>
                <Progress
                  value={seatPercentage}
                  className="h-1.5 flex-1 max-w-24 bg-muted"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          {ride.notes && (
            <div className="flex items-start gap-2.5 text-sm bg-cream/60 rounded-lg p-3">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-muted-foreground text-[13px] leading-relaxed line-clamp-2">{ride.notes}</p>
            </div>
          )}

          {/* Action */}
          {!isPast && !isDriver && (
            <div className="pt-1">
              {showLeave || hasJoined ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeave}
                  disabled={leaveRide.isPending}
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                >
                  {leaveRide.isPending ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    t("ride.leaveRide")
                  )}
                </Button>
              ) : isFull ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" disabled className="w-full">
                      {t("ride.noSeats")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("ride.noSeatsTooltip")}</TooltipContent>
                </Tooltip>
              ) : !isAuthenticated ? (
                <Button
                  size="sm"
                  onClick={handleJoin}
                  className="w-full bg-ocean hover:bg-ocean/90 text-white"
                >
                  <LogIn className="w-4 h-4 mr-1.5" />
                  {t("ride.signInToJoin")}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleJoin}
                  disabled={joinRide.isPending}
                  className="w-full bg-ocean hover:bg-ocean/90 text-white"
                >
                  {joinRide.isPending ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1.5" />
                      {t("ride.joinRide")}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
