import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import CreateRideDialog from "@/components/CreateRideDialog";
import RideCard from "@/components/RideCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Waves, Car, Users, Leaf, MapPin, Calendar, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { useI18n } from "@/contexts/I18nContext";

const statusColors: Record<string, string> = {
  upcoming: "bg-ocean/10 text-ocean border-ocean/20",
  active: "bg-sage-light text-sage border-sage/20",
  completed: "bg-muted text-muted-foreground border-muted",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useI18n();

  const { data: upcomingEvents, isLoading: eventsLoading } = trpc.events.upcoming.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const { data: rides, isLoading: ridesLoading } = trpc.rides.list.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const { data: myRides } = trpc.rides.myRides.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const joinedRideIds = useMemo(() => {
    if (!myRides?.passengerRides) return new Set<number>();
    return new Set(myRides.passengerRides.map((r) => r.rideId));
  }, [myRides?.passengerRides]);

  // Group rides by event
  const ridesByEvent = useMemo(() => {
    if (!rides) return new Map<number | null, typeof rides>();
    const map = new Map<number | null, typeof rides>();
    for (const ride of rides) {
      const key = ride.eventId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ride);
    }
    return map;
  }, [rides]);

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
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  const totalRides = rides?.length ?? 0;
  const totalPassengers = rides?.reduce((sum, r) => sum + r.seatsOccupied, 0) ?? 0;

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      upcoming: t("event.statusUpcoming"),
      active: t("event.statusActive"),
      completed: t("event.statusCompleted"),
      cancelled: t("event.statusCancelled"),
    };
    return map[status] || status;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-ocean/5 blob-shape opacity-60" />
        <div className="absolute -bottom-10 -left-16 w-64 h-64 bg-sage/8 blob-shape-2 opacity-50" />
        <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-ochre/5 blob-shape-3 opacity-40" />

        <div className="container relative py-16 md:py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ocean mb-4">
              {t("home.subtitle")}
            </p>
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground leading-[1.1] mb-4">
              {t("home.titlePart1")}{" "}
              <span className="text-ocean">{t("home.titlePart2")}</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mb-8">
              {t("home.description")}
            </p>

            <div className="flex flex-wrap gap-6 mb-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-ocean/10 flex items-center justify-center">
                  <Car className="w-4 h-4 text-ocean" />
                </div>
                <span>
                  <strong className="text-foreground">{totalRides}</strong> {t("home.activeRides")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-sage/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-sage" />
                </div>
                <span>
                  <strong className="text-foreground">{totalPassengers}</strong> {t("home.passengersJoined")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-8 h-8 rounded-lg bg-terracotta/10 flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-terracotta" />
                </div>
                <span>{t("home.fewerCars")}</span>
              </div>
            </div>

            {isAuthenticated && <CreateRideDialog />}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="pb-8">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                {t("home.upcomingEvents")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("home.upcomingEventsDesc")}
              </p>
            </div>
          </div>

          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-6 h-6 text-ocean" />
            </div>
          ) : !upcomingEvents || upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t("home.noEvents")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => {
                const eventRides = ridesByEvent.get(event.id) || [];
                return (
                  <Card
                    key={event.id}
                    className="group relative overflow-hidden border-border/60 hover:border-ocean/30 transition-all duration-300 hover:shadow-md cursor-pointer"
                    onClick={() => setLocation(`/events/${event.id}`)}
                  >
                    {event.coverImage ? (
                      <div className="overflow-hidden rounded-t-[inherit] bg-muted/20">
                        <img src={event.coverImage} alt="" className="w-full object-contain group-hover:scale-[1.02] transition-transform duration-500" style={{ maxHeight: '220px' }} />
                      </div>
                    ) : (
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ocean/50 via-sage/30 to-transparent" />
                    )}
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <Badge variant="secondary" className={statusColors[event.status] || ""}>
                            {statusLabel(event.status)}
                          </Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-ocean transition-colors" />
                        </div>
                        <h3 className="font-heading font-semibold text-lg text-foreground leading-tight">
                          {event.title}
                        </h3>
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                        )}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-ocean shrink-0" />
                            <span className="text-foreground">{event.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-ocean shrink-0" />
                            <span className="text-foreground">
                              {formatDate(event.eventDate)} {t("common.at")} {formatTime(event.eventDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Car className="w-4 h-4 text-sage shrink-0" />
                            <span className="text-muted-foreground">
                              {eventRides.length} {eventRides.length === 1 ? t("home.rideAvailable") : t("home.ridesAvailable")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* All Available Rides */}
      <section className="flex-1 pb-16">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">
                {t("home.allRides")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("home.allRidesDesc")}
              </p>
            </div>
          </div>

          {ridesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner className="w-6 h-6 text-ocean" />
            </div>
          ) : !rides || rides.length === 0 ? (
            <Empty className="py-16 border border-dashed border-border/60 rounded-2xl bg-card/50">
              <EmptyHeader>
                <EmptyMedia>
                  <div className="w-16 h-16 rounded-2xl bg-ocean/10 flex items-center justify-center">
                    <Waves className="w-8 h-8 text-ocean" />
                  </div>
                </EmptyMedia>
                <EmptyTitle>{t("home.noRidesTitle")}</EmptyTitle>
                <EmptyDescription>
                  {t("home.noRidesDesc")}
                  {!isAuthenticated && ` ${t("home.signInToStart")}`}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rides.map((ride) => (
                <RideCard
                  key={ride.id}
                  ride={ride}
                  hasJoined={joinedRideIds.has(ride.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50">
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663255483325/3ZQfgBHGux5xQNTvCZcaYv/wavenova-logo-vertical_1309bc88.png" alt="WaveNova" className="h-5 w-5 object-contain" />
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
