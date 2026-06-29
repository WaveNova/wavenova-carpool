import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, Users, FileText, CalendarCheck, Info, Copy, Check, Share2, ShieldAlert, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/contexts/I18nContext";
import LocationPicker from "./LocationPicker";

interface CreateRideDialogProps {
  eventId?: number;
}

export default function CreateRideDialog({ eventId: preselectedEventId }: CreateRideDialogProps = {}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "share" | "luma-blocked">("form");
  const [createdRideId, setCreatedRideId] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [lumaBlockUrl, setLumaBlockUrl] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string>(
    preselectedEventId ? String(preselectedEventId) : ""
  );
  const [departureLocation, setDepartureLocation] = useState("");
  const [departureLat, setDepartureLat] = useState<number | null>(null);
  const [departureLng, setDepartureLng] = useState<number | null>(null);
  const [departureDate, setDepartureDate] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [totalSeats, setTotalSeats] = useState("3");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  const { data: upcomingEvents } = trpc.events.upcoming.useQuery();

  const createRide = trpc.rides.create.useMutation({
    onSuccess: (data) => {
      toast.success(t("createRide.success"));
      setCreatedRideId(data.id);
      setStep("share");
      utils.rides.list.invalidate();
      utils.rides.myRides.invalidate();
    },
    onError: (error) => {
      // Check for the Luma not-registered sentinel
      if (error.message?.startsWith("LUMA_NOT_REGISTERED:")) {
        const lumaUrl = error.message.replace("LUMA_NOT_REGISTERED:", "").trim();
        setLumaBlockUrl(lumaUrl || null);
        setStep("luma-blocked");
        return;
      }
      toast.error(error.message || t("createRide.failed"));
    },
  });

  const resetForm = () => {
    if (!preselectedEventId) setSelectedEventId("");
    setDepartureLocation("");
    setDepartureLat(null);
    setDepartureLng(null);
    setDepartureDate("");
    setDepartureTime("");
    setTotalSeats("3");
    setNotes("");
    setStep("form");
    setCreatedRideId(null);
    setLinkCopied(false);
    setLumaBlockUrl(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  const selectedEvent = useMemo(() => {
    if (!selectedEventId || !upcomingEvents) return null;
    return upcomingEvents.find((e) => e.id === Number(selectedEventId)) ?? null;
  }, [selectedEventId, upcomingEvents]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const eventId = Number(selectedEventId);
    if (!eventId) {
      toast.error(t("createRide.errorEvent"));
      return;
    }
    if (!departureLocation.trim()) {
      toast.error(t("createRide.errorLocation"));
      return;
    }
    if (!departureDate || !departureTime) {
      toast.error(t("createRide.errorDateTime"));
      return;
    }

    const dateTime = new Date(`${departureDate}T${departureTime}`);
    if (dateTime.getTime() < Date.now()) {
      toast.error(t("createRide.errorFuture"));
      return;
    }
    if (selectedEvent && dateTime.getTime() >= selectedEvent.eventDate) {
      toast.error(t("createRide.errorTimeAfterEvent"));
      return;
    }

    const seats = parseInt(totalSeats);
    if (isNaN(seats) || seats < 1 || seats > 20) {
      toast.error(t("createRide.errorSeats"));
      return;
    }

    createRide.mutate({
      eventId,
      departureLocation: departureLocation.trim(),
      departureTime: dateTime.getTime(),
      totalSeats: seats,
      notes: notes.trim() || undefined,
      departureLat: departureLat ?? undefined,
      departureLng: departureLng ?? undefined,
    });
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const formatEventDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatEventTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Share helpers
  const rideUrl = createdRideId ? `${window.location.origin}/rides/${createdRideId}` : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(rideUrl);
      setLinkCopied(true);
      toast.success(t("createRide.linkCopied"));
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = rideUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setLinkCopied(true);
      toast.success(t("createRide.linkCopied"));
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const shareText = t("createRide.shareText");

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(rideUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(rideUrl)}`,
    line: `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(rideUrl)}&text=${encodeURIComponent(shareText)}`,
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-ocean hover:bg-ocean/90 text-white gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" />
          {t("createRide.title")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {step === "luma-blocked" ? (
          /* ─── Luma Not Registered Block ─── */
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl flex items-center gap-2 text-terracotta">
                <ShieldAlert className="w-5 h-5 text-terracotta" />
                {t("luma.notRegisteredTitle")}
              </DialogTitle>
              <DialogDescription className="text-base leading-relaxed pt-1">
                {t("luma.notRegisteredDesc")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Info box */}
              <div className="rounded-xl border border-terracotta/20 bg-terracotta/5 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-terracotta shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {t("luma.notRegisteredReason")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("luma.notRegisteredHint")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2.5">
                <p className="text-sm font-medium text-foreground">{t("luma.notRegisteredSteps")}</p>
                <ol className="space-y-2 text-sm text-muted-foreground list-none">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-ocean/10 text-ocean text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>{t("luma.step1")}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-ocean/10 text-ocean text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>{t("luma.step2")}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-ocean/10 text-ocean text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>{t("luma.step3")}</span>
                  </li>
                </ol>
              </div>

              {/* Verified badge preview */}
              <div className="rounded-lg border border-ocean/20 bg-ocean/5 p-3 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-ocean shrink-0" />
                <p className="text-sm text-ocean font-medium">{t("luma.verifiedBadgePreview")}</p>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {lumaBlockUrl && (
                <a
                  href={lumaBlockUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button className="w-full bg-ocean hover:bg-ocean/90 text-white gap-2">
                    <ExternalLink className="w-4 h-4" />
                    {t("luma.registerOnLuma")}
                  </Button>
                </a>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("form")}
                className="w-full"
              >
                {t("luma.tryAgain")}
              </Button>
            </DialogFooter>
          </>
        ) : step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl">{t("createRide.title")}</DialogTitle>
              <DialogDescription>{t("createRide.description")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Event Selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-ocean" />
                  {t("createRide.selectEvent")}
                </Label>
                <Select
                  value={selectedEventId}
                  onValueChange={setSelectedEventId}
                  disabled={!!preselectedEventId}
                >
                  <SelectTrigger className="bg-cream/50">
                    <SelectValue placeholder={t("createRide.selectEventPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {upcomingEvents && upcomingEvents.length > 0 ? (
                      upcomingEvents.map((event) => (
                        <SelectItem key={event.id} value={String(event.id)}>
                          {event.title} — {formatEventDate(event.eventDate)}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {t("createRide.noEvents")}
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {selectedEvent && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-ocean/5 rounded-md px-2.5 py-1.5">
                    <Info className="w-3 h-3 text-ocean shrink-0" />
                    {t("createRide.eventStarts")}: {formatEventDate(selectedEvent.eventDate)}{" "}
                    {formatEventTime(selectedEvent.eventDate)}
                  </div>
                )}
                {/* Luma registration notice */}
                {selectedEvent?.lumaEventUrl && (
                  <div className="flex items-start gap-1.5 text-xs bg-ocean/5 border border-ocean/15 rounded-md px-2.5 py-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-ocean shrink-0 mt-0.5" />
                    <span className="text-ocean/80">
                      {t("luma.registrationRequired")}{" "}
                      <a
                        href={selectedEvent.lumaEventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium hover:text-ocean"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("luma.registerHere")}
                      </a>
                    </span>
                  </div>
                )}
              </div>

              {/* Location with Map Picker */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 text-ocean inline-flex items-center justify-center">📍</span>
                  {t("createRide.departureLocation")}
                </Label>
                <LocationPicker
                  value={departureLocation}
                  onChange={setDepartureLocation}
                  lat={departureLat}
                  lng={departureLng}
                  onCoordsChange={(lat, lng) => {
                    setDepartureLat(lat);
                    setDepartureLng(lng);
                  }}
                  placeholder={t("createRide.departureLocationPlaceholder")}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="date" className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-ocean" />
                    {t("createRide.date")}
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    min={getMinDate()}
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="bg-cream/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">{t("createRide.time")}</Label>
                  <Input
                    id="time"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="bg-cream/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="seats" className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-ocean" />
                  {t("createRide.availableSeats")}
                </Label>
                <Input
                  id="seats"
                  type="number"
                  min="1"
                  max="20"
                  value={totalSeats}
                  onChange={(e) => setTotalSeats(e.target.value)}
                  className="bg-cream/50 w-24"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-ocean" />
                  {t("createRide.notes")}
                  <span className="text-muted-foreground font-normal">{t("createRide.notesOptional")}</span>
                </Label>
                <Textarea
                  id="notes"
                  placeholder={t("createRide.notesPlaceholder")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-cream/50 min-h-20"
                  maxLength={1000}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t("createRide.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createRide.isPending}
                  className="bg-ocean hover:bg-ocean/90 text-white"
                >
                  {createRide.isPending ? (
                    <>
                      <Spinner className="w-4 h-4" />
                      {t("createRide.creating")}
                    </>
                  ) : (
                    t("createRide.create")
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          /* ─── Share Step ─── */
          <>
            <DialogHeader>
              <DialogTitle className="font-heading text-xl flex items-center gap-2">
                <Share2 className="w-5 h-5 text-ocean" />
                {t("createRide.shareTitle")}
              </DialogTitle>
              <DialogDescription>{t("createRide.shareDesc")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Copy link */}
              <div className="flex items-center gap-2">
                <Input
                  value={rideUrl}
                  readOnly
                  className="bg-cream/50 text-sm font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {linkCopied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Social share buttons */}
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={shareLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  {t("createRide.shareOnTwitter")}
                </a>
                <a
                  href={shareLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  {t("createRide.shareOnFacebook")}
                </a>
                <a
                  href={shareLinks.line}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                  </svg>
                  {t("createRide.shareOnLine")}
                </a>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="bg-ocean hover:bg-ocean/90 text-white w-full"
              >
                {t("createRide.done")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
