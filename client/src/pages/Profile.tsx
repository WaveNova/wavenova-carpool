import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import CreateRideDialog from "@/components/CreateRideDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Car, Users, MapPin, Clock, MessageSquare, Trash2, Waves } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

export default function Profile() {
  const { user, loading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const { t } = useI18n();

  const { data: myRides, isLoading } = trpc.rides.myRides.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 15000,
  });

  const utils = trpc.useUtils();

  const cancelRide = trpc.rides.cancel.useMutation({
    onSuccess: () => {
      toast.success(t("profile.rideCancelled"));
      utils.rides.myRides.invalidate();
      utils.rides.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("profile.cancelFailed"));
    },
  });

  const leaveRide = trpc.rides.leave.useMutation({
    onSuccess: () => {
      toast.success(t("profile.leftRide"));
      utils.rides.myRides.invalidate();
      utils.rides.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("profile.leaveFailed"));
    },
  });

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

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="w-6 h-6 text-ocean" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="container py-8 md:py-12 flex-1">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="w-14 h-14 ring-2 ring-ocean/10">
              <AvatarFallback className="bg-ocean/10 text-ocean text-lg font-bold">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-heading text-2xl font-bold text-foreground">
                {user.name || t("common.user")}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <CreateRideDialog />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="driving" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="driving" className="gap-1.5">
              <Car className="w-4 h-4" />
              {t("profile.driving")} ({myRides?.driverRides?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="passenger" className="gap-1.5">
              <Users className="w-4 h-4" />
              {t("profile.passenger")} ({myRides?.passengerRides?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          {/* Driver Rides */}
          <TabsContent value="driving">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Spinner className="w-6 h-6 text-ocean" />
              </div>
            ) : !myRides?.driverRides?.length ? (
              <Empty className="py-16 border border-dashed border-border/60 rounded-2xl bg-card/50">
                <EmptyHeader>
                  <EmptyMedia>
                    <div className="w-14 h-14 rounded-2xl bg-ocean/10 flex items-center justify-center">
                      <Car className="w-7 h-7 text-ocean" />
                    </div>
                  </EmptyMedia>
                  <EmptyTitle>{t("profile.noRidesOffered")}</EmptyTitle>
                  <EmptyDescription>
                    {t("profile.noRidesOfferedDesc")}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myRides.driverRides.map((ride) => {
                  const isPast = ride.departureTime < Date.now();
                  const seatPercentage = (ride.seatsOccupied / ride.totalSeats) * 100;

                  return (
                    <Card key={ride.id} className="relative overflow-hidden border-border/60">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-sage/40 via-ocean/30 to-transparent" />
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="secondary"
                              className={
                                ride.status === "cancelled"
                                  ? "bg-destructive/10 text-destructive"
                                  : isPast
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-sage-light text-sage"
                              }
                            >
                              {ride.status === "cancelled" ? t("profile.cancelled") : isPast ? t("ride.past") : t("profile.active")}
                            </Badge>
                            {ride.status === "active" && !isPast && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t("profile.cancelRide")}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("profile.cancelRideDesc")}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t("profile.keepRide")}</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => cancelRide.mutate({ rideId: ride.id })}
                                      className="bg-destructive text-white hover:bg-destructive/90"
                                    >
                                      {t("profile.cancelRideBtn")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-ocean mt-0.5 shrink-0" />
                              <span>{ride.departureLocation}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-ocean shrink-0" />
                              <span>
                                {formatDate(ride.departureTime)} {t("common.at")} {formatTime(ride.departureTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-ocean shrink-0" />
                              <span>
                                {ride.seatsOccupied}/{ride.totalSeats} {t("ride.passengers")}
                              </span>
                              <Progress value={seatPercentage} className="h-1.5 flex-1 max-w-20 bg-muted" />
                            </div>
                          </div>

                          {ride.notes && (
                            <div className="flex items-start gap-2 text-sm bg-cream/60 rounded-lg p-2.5">
                              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-muted-foreground text-xs leading-relaxed">{ride.notes}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Passenger Rides */}
          <TabsContent value="passenger">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Spinner className="w-6 h-6 text-ocean" />
              </div>
            ) : !myRides?.passengerRides?.length ? (
              <Empty className="py-16 border border-dashed border-border/60 rounded-2xl bg-card/50">
                <EmptyHeader>
                  <EmptyMedia>
                    <div className="w-14 h-14 rounded-2xl bg-sage/10 flex items-center justify-center">
                      <Users className="w-7 h-7 text-sage" />
                    </div>
                  </EmptyMedia>
                  <EmptyTitle>{t("profile.noRidesJoined")}</EmptyTitle>
                  <EmptyDescription>
                    {t("profile.noRidesJoinedDesc")}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myRides.passengerRides.map((ride) => {
                  const isPast = ride.departureTime < Date.now();
                  const seatPercentage = (ride.seatsOccupied / ride.totalSeats) * 100;

                  return (
                    <Card key={ride.requestId} className="relative overflow-hidden border-border/60">
                      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-ocean/40 via-sage/30 to-transparent" />
                      <CardContent className="p-5">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7">
                                <AvatarFallback className="bg-ocean/10 text-ocean text-xs font-semibold">
                                  {getInitials(ride.driverName)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium text-sm">{ride.driverName || t("common.driver")}</span>
                            </div>
                            <Badge
                              variant="secondary"
                              className={isPast ? "bg-muted text-muted-foreground" : "bg-ocean/10 text-ocean"}
                            >
                              {isPast ? t("ride.past") : t("profile.confirmed")}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-start gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-ocean mt-0.5 shrink-0" />
                              <span>{ride.departureLocation}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="w-4 h-4 text-ocean shrink-0" />
                              <span>
                                {formatDate(ride.departureTime)} {t("common.at")} {formatTime(ride.departureTime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-ocean shrink-0" />
                              <span>
                                {ride.seatsOccupied}/{ride.totalSeats} {t("ride.passengers")}
                              </span>
                              <Progress value={seatPercentage} className="h-1.5 flex-1 max-w-20 bg-muted" />
                            </div>
                          </div>

                          {ride.notes && (
                            <div className="flex items-start gap-2 text-sm bg-cream/60 rounded-lg p-2.5">
                              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <p className="text-muted-foreground text-xs leading-relaxed">{ride.notes}</p>
                            </div>
                          )}

                          {!isPast && ride.rideStatus === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => leaveRide.mutate({ rideId: ride.rideId })}
                              disabled={leaveRide.isPending}
                              className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
                            >
                              {leaveRide.isPending ? <Spinner className="w-4 h-4" /> : t("ride.leaveRide")}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Waves className="w-4 h-4 text-ocean" />
            <span>WaveNova {t("nav.carpoolBoard")}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("home.footerTagline")}
          </p>
        </div>
      </footer>
    </div>
  );
}
