import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import RideChat from "@/components/RideChat";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  MapPin,
  Clock,
  Users,
  MessageSquare,
  UserPlus,
  LogIn,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { useMemo, useState, useCallback } from "react";
import { useI18n } from "@/contexts/I18nContext";

export default function RideDetail() {
  const params = useParams<{ id: string }>();
  const rideId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: ride, isLoading } = trpc.rides.getById.useQuery(
    { id: rideId },
    { enabled: rideId > 0, refetchInterval: 10000 }
  );

  const { data: passengers } = trpc.rides.passengers.useQuery(
    { rideId },
    { enabled: rideId > 0 && isAuthenticated, refetchInterval: 10000 }
  );

  const { data: myRides } = trpc.rides.myRides.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const isDriver = user?.id === ride?.driverId;
  const hasJoined = useMemo(() => {
    if (!myRides?.passengerRides) return false;
    return myRides.passengerRides.some((r) => r.rideId === rideId);
  }, [myRides?.passengerRides, rideId]);

  const isInRide = isDriver || hasJoined;

  const utils = trpc.useUtils();

  const joinRide = trpc.rides.join.useMutation({
    onSuccess: () => {
      toast.success(t("ride.joinedSuccess"));
      utils.rides.getById.invalidate({ id: rideId });
      utils.rides.passengers.invalidate({ rideId });
      utils.rides.myRides.invalidate();
      utils.rides.list.invalidate();
    },
    onError: (error) => toast.error(error.message || t("ride.joinFailed")),
  });

  const leaveRide = trpc.rides.leave.useMutation({
    onSuccess: () => {
      toast.success(t("ride.leftSuccess"));
      utils.rides.getById.invalidate({ id: rideId });
      utils.rides.passengers.invalidate({ rideId });
      utils.rides.myRides.invalidate();
      utils.rides.list.invalidate();
    },
    onError: (error) => toast.error(error.message || t("ride.leaveFailed")),
  });

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setLinkCopied(true);
    toast.success(t("createRide.linkCopied"));
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      if (!ride?.departureLat || !ride?.departureLng) return;
      const pos = { lat: Number(ride.departureLat), lng: Number(ride.departureLng) };
      map.setCenter(pos);
      map.setZoom(15);
      new google.maps.Marker({
        position: pos,
        map,
        title: ride.departureLocation,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#1a8a7d",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
    },
    [ride?.departureLat, ride?.departureLng, ride?.departureLocation]
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="w-6 h-6 text-ocean" />
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">{t("rides.rideNotFound")}</h2>
            <p className="text-muted-foreground mb-4">{t("rides.rideNotFoundDesc")}</p>
            <Button onClick={() => setLocation("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("rides.backToRides")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isFull = ride.seatsRemaining <= 0;
  const isPast = ride.departureTime < Date.now();
  const seatPercentage = (ride.seatsOccupied / ride.totalSeats) * 100;
  const hasCoords = ride.departureLat && ride.departureLng;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="container py-6 md:py-10 flex-1">
        {/* Back + Share row */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            {t("rides.backToRides")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5"
          >
            {linkCopied ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            {linkCopied ? t("createRide.linkCopied") : t("createRide.copyLink")}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Main content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Ride info card */}
            <div className="bg-card border border-border/60 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ocean/50 via-sage/30 to-transparent" />

              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 ring-2 ring-ocean/10">
                    <AvatarFallback className="bg-ocean/10 text-ocean text-sm font-semibold">
                      {getInitials(ride.driverName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-heading font-bold text-lg text-foreground">
                      {ride.driverName || t("common.driver")}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("rideDetail.driver")}</p>
                  </div>
                </div>
                {isPast ? (
                  <Badge variant="outline" className="text-muted-foreground">{t("ride.past")}</Badge>
                ) : ride.status === "cancelled" ? (
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive">{t("rideDetail.cancelled")}</Badge>
                ) : isFull ? (
                  <Badge variant="secondary" className="bg-terracotta/10 text-terracotta">{t("ride.full")}</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-sage-light text-sage">
                    {ride.seatsRemaining} {ride.seatsRemaining === 1 ? t("ride.seatLeft") : t("ride.seatsLeft")}
                  </Badge>
                )}
              </div>

              <div className="space-y-3 mb-5">
                {ride.eventTitle && (
                  <div className="flex items-start gap-3 text-sm">
                    <CalendarDays className="w-5 h-5 text-ocean mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{t("rideDetail.forEvent")}</p>
                      <p className="text-foreground font-medium">{ride.eventTitle}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-5 h-5 text-ocean mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{t("rideDetail.departure")}</p>
                    <p className="text-foreground font-medium">{ride.departureLocation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Clock className="w-5 h-5 text-ocean mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{t("rideDetail.dateTime")}</p>
                    <p className="text-foreground font-medium">
                      {formatDate(ride.departureTime)} {t("common.at")} {formatTime(ride.departureTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Users className="w-5 h-5 text-ocean mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{t("rideDetail.seats")}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-foreground font-medium">
                        {ride.seatsOccupied} / {ride.totalSeats} {t("rideDetail.filled")}
                      </p>
                      <Progress value={seatPercentage} className="h-2 flex-1 max-w-32 bg-muted" />
                    </div>
                  </div>
                </div>
              </div>

              {ride.notes && (
                <div className="flex items-start gap-3 bg-cream/60 rounded-lg p-4 mb-5">
                  <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{ride.notes}</p>
                </div>
              )}

              {/* Action buttons */}
              {!isPast && ride.status === "active" && !isDriver && (
                <div>
                  {hasJoined ? (
                    <Button
                      variant="outline"
                      onClick={() => leaveRide.mutate({ rideId })}
                      disabled={leaveRide.isPending}
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                    >
                      {leaveRide.isPending ? <Spinner className="w-4 h-4" /> : t("ride.leaveRide")}
                    </Button>
                  ) : isFull ? (
                    <Button variant="outline" disabled className="w-full">
                      {t("ride.noSeats")}
                    </Button>
                  ) : !isAuthenticated ? (
                    <Button
                      onClick={() => { window.location.href = getLoginUrl(); }}
                      className="w-full bg-ocean hover:bg-ocean/90 text-white"
                    >
                      <LogIn className="w-4 h-4 mr-1.5" />
                      {t("ride.signInToJoin")}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => joinRide.mutate({ rideId })}
                      disabled={joinRide.isPending}
                      className="w-full bg-ocean hover:bg-ocean/90 text-white"
                    >
                      {joinRide.isPending ? (
                        <Spinner className="w-4 h-4" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1.5" />
                          {t("ride.joinThisRide")}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Map card for pickup location */}
            {hasCoords && (
              <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-ocean" />
                  <h3 className="font-heading font-semibold text-foreground text-sm">
                    {t("map.pickupLocation")}
                  </h3>
                </div>
                <div className="h-64">
                  <MapView onMapReady={handleMapReady} />
                </div>
              </div>
            )}

            {/* Passengers list */}
            {isInRide && passengers && passengers.length > 0 && (
              <div className="bg-card border border-border/60 rounded-xl p-5">
                <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-ocean" />
                  {t("rideDetail.passengers")} ({passengers.length})
                </h3>
                <div className="space-y-2">
                  {passengers.map((p) => (
                    <div key={p.requestId} className="flex items-center gap-3 py-2">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-sage/10 text-sage text-xs font-semibold">
                          {getInitials(p.passengerName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.passengerName || t("common.passenger")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("rideDetail.joined")} {new Date(p.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat sidebar */}
          <div className="lg:col-span-2">
            {isInRide ? (
              <div className="lg:sticky lg:top-20">
                <RideChat rideId={rideId} />
              </div>
            ) : (
              <div className="bg-card border border-border/60 rounded-xl p-6 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("rideDetail.joinChat")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
