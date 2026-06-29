import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import CreateRideDialog from "@/components/CreateRideDialog";
import RideCard from "@/components/RideCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { MapPin, Calendar, ArrowLeft, Waves, Car } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useMemo } from "react";
import { useI18n } from "@/contexts/I18nContext";

const statusColors: Record<string, string> = {
  upcoming: "bg-ocean/10 text-ocean border-ocean/20",
  active: "bg-sage-light text-sage border-sage/20",
  completed: "bg-muted text-muted-foreground border-muted",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusI18nKeys: Record<string, string> = {
  upcoming: "event.statusUpcoming",
  active: "event.statusActive",
  completed: "event.statusCompleted",
  cancelled: "event.statusCancelled",
};

export default function EventDetail() {
  const params = useParams<{ id: string }>();
  const eventId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { t } = useI18n();

  const { data: event, isLoading: eventLoading } = trpc.events.getById.useQuery(
    { id: eventId },
    { enabled: eventId > 0 }
  );

  const { data: rides, isLoading: ridesLoading } = trpc.rides.list.useQuery(
    { eventId },
    { enabled: eventId > 0, refetchInterval: 15000 }
  );

  const { data: myRides } = trpc.rides.myRides.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const joinedRideIds = useMemo(() => {
    if (!myRides?.passengerRides) return new Set<number>();
    return new Set(myRides.passengerRides.map((r) => r.rideId));
  }, [myRides?.passengerRides]);

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

  if (eventLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Spinner className="w-6 h-6 text-ocean" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">{t("events.notFound")}</h2>
            <Button onClick={() => setLocation("/")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("events.backToEvents")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="container py-6 md:py-10 flex-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="mb-6 text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t("events.backToEvents")}
        </Button>

        {/* Event header */}
        <div className="relative overflow-hidden bg-card border border-border/60 rounded-2xl mb-8">
          {event.coverImage && (
            <div className="h-48 md:h-56 overflow-hidden">
              <img src={event.coverImage} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {!event.coverImage && (
            <>
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-ocean/5 blob-shape opacity-40" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-sage/5 blob-shape-2 opacity-30" />
            </>
          )}

          <div className="relative p-6 md:p-8">
            <Badge variant="secondary" className={`mb-3 ${statusColors[event.status] || ""}`}>
              {t((statusI18nKeys[event.status] || "event.statusUpcoming") as any)}
            </Badge>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-3">
              {event.title}
            </h1>
            {event.description && (
              <p className="text-muted-foreground leading-relaxed mb-4 max-w-2xl">
                {event.description}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-ocean" />
                <span className="text-foreground">{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-ocean" />
                <span className="text-foreground">
                  {formatDate(event.eventDate)} {t("common.at")} {formatTime(event.eventDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-sage" />
                <span className="text-muted-foreground">
                  {rides?.length ?? 0} {(rides?.length ?? 0) === 1 ? t("events.rideOffered") : t("events.ridesOffered")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Rides section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-xl font-bold text-foreground">
              {t("events.availableRides")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("events.availableRidesDesc")}
            </p>
          </div>
          {isAuthenticated && (event.status === "upcoming" || event.status === "active") && (
            <CreateRideDialog eventId={eventId} />
          )}
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
              <EmptyTitle>{t("events.noRidesYet")}</EmptyTitle>
              <EmptyDescription>
                {t("events.noRidesDesc")}
                {!isAuthenticated && ` ${t("events.noRidesDescSignin")}`}
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
    </div>
  );
}
