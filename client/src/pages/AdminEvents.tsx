import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Calendar,
  MapPin,
  Car,
  Trash2,
  Pencil,
  Shield,
  Waves,
  ImagePlus,
  X,
  Link2,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { useI18n } from "@/contexts/I18nContext";
import type { TranslationKey } from "@/contexts/I18nContext";

const statusColors: Record<string, string> = {
  upcoming: "bg-ocean/10 text-ocean border-ocean/20",
  active: "bg-sage-light text-sage border-sage/20",
  completed: "bg-muted text-muted-foreground border-muted",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusI18nKeys: Record<string, TranslationKey> = {
  upcoming: "event.statusUpcoming",
  active: "event.statusActive",
  completed: "event.statusCompleted",
  cancelled: "event.statusCancelled",
};

function CoverImageUpload({ eventId, currentUrl }: { eventId: number; currentUrl?: string | null }) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const uploadCover = trpc.events.uploadCover.useMutation({
    onSuccess: () => {
      toast.success(t("admin.coverUploaded"));
      utils.events.list.invalidate();
      utils.events.upcoming.invalidate();
    },
    onError: () => {
      toast.error(t("admin.coverUploadFailed"));
    },
  });

  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => {
      utils.events.list.invalidate();
      utils.events.upcoming.invalidate();
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadCover.mutate({
        eventId,
        imageBase64: base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemove = () => {
    updateEvent.mutate({ id: eventId, coverImage: null });
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5 text-xs">
        <ImagePlus className="w-3.5 h-3.5 text-ocean" />
        {t("admin.coverImage")}
      </Label>
      {currentUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-border/60 bg-muted/30">
          <img src={currentUrl} alt="Cover" className="w-full object-contain" style={{ maxHeight: '180px' }} />
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="absolute top-1.5 right-1.5 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={handleRemove}
            disabled={updateEvent.isPending}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploadCover.isPending}
          className="w-full h-20 border-2 border-dashed border-border/60 rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-ocean/40 hover:text-ocean transition-colors cursor-pointer"
        >
          {uploadCover.isPending ? (
            <><Spinner className="w-4 h-4" /> {t("admin.coverUploading")}</>
          ) : (
            <><ImagePlus className="w-4 h-4" /> {t("admin.uploadCover")}</>
          )}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function CreateEventDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("09:00");
  const [lumaEventUrl, setLumaEventUrl] = useState("");
  const { t } = useI18n();

  const utils = trpc.useUtils();

  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success(t("admin.eventCreated"));
      setOpen(false);
      resetForm();
      utils.events.list.invalidate();
      utils.events.upcoming.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("admin.eventCreateFailed"));
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setEventDate("");
    setEventTime("09:00");
    setLumaEventUrl("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error(t("admin.eventTitle")); return; }
    if (!location.trim()) { toast.error(t("admin.beachLocation")); return; }
    if (!eventDate) { toast.error(t("admin.date")); return; }

    const dateTime = new Date(`${eventDate}T${eventTime}`);
    createEvent.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim(),
      eventDate: dateTime.getTime(),
      lumaEventUrl: lumaEventUrl.trim() || undefined,
    });
  };

  const getMinDate = () => new Date().toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-ocean hover:bg-ocean/90 text-white gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          {t("admin.createEvent")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{t("admin.createEventTitle")}</DialogTitle>
          <DialogDescription>{t("admin.createEventDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="event-title" className="flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-ocean" />
              {t("admin.eventTitle")}
            </Label>
            <Input
              id="event-title"
              placeholder={t("admin.eventTitlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-cream/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location" className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-ocean" />
              {t("admin.beachLocation")}
            </Label>
            <Input
              id="event-location"
              placeholder={t("admin.beachLocationPlaceholder")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-cream/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="event-date" className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-ocean" />
                {t("admin.date")}
              </Label>
              <Input
                id="event-date"
                type="date"
                min={getMinDate()}
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="bg-cream/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">{t("admin.startTime")}</Label>
              <Input
                id="event-time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="bg-cream/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-desc" className="flex items-center gap-1.5">
              {t("admin.description")}
              <span className="text-muted-foreground font-normal">{t("admin.descriptionOptional")}</span>
            </Label>
            <Textarea
              id="event-desc"
              placeholder={t("admin.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-cream/50 min-h-20"
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="luma-url" className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-ocean" />
              {t("admin.lumaEventUrl")}
              <span className="text-muted-foreground font-normal">{t("admin.descriptionOptional")}</span>
            </Label>
            <Input
              id="luma-url"
              placeholder={t("admin.lumaEventUrlPlaceholder")}
              value={lumaEventUrl}
              onChange={(e) => setLumaEventUrl(e.target.value)}
              className="bg-cream/50"
            />
            <p className="text-[11px] text-muted-foreground">{t("admin.lumaEventUrlHint")}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("admin.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createEvent.isPending}
              className="bg-ocean hover:bg-ocean/90 text-white"
            >
              {createEvent.isPending ? (
                <><Spinner className="w-4 h-4" /> {t("admin.creating")}</>
              ) : (
                t("admin.createEventBtn")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEventDialog({ event, onClose }: { event: any; onClose: () => void }) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || "");
  const [location, setLocation] = useState(event.location);
  const [status, setStatus] = useState(event.status);
  const [lumaEventUrl, setLumaEventUrl] = useState(event.lumaEventUrl || "");
  const { t } = useI18n();

  const utils = trpc.useUtils();

  const updateEvent = trpc.events.update.useMutation({
    onSuccess: () => {
      toast.success(t("admin.eventUpdated"));
      onClose();
      utils.events.list.invalidate();
      utils.events.upcoming.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("admin.eventUpdateFailed"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEvent.mutate({
      id: event.id,
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim(),
      status,
      lumaEventUrl: lumaEventUrl.trim() || null,
    });
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">{t("admin.editEvent")}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label>{t("admin.title")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-cream/50" />
        </div>
        <div className="space-y-2">
          <Label>{t("admin.location")}</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} className="bg-cream/50" />
        </div>
        <div className="space-y-2">
          <Label>{t("admin.description")}</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="bg-cream/50 min-h-20" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-ocean" />
            {t("admin.lumaEventUrl")}
          </Label>
          <Input
            placeholder={t("admin.lumaEventUrlPlaceholder")}
            value={lumaEventUrl}
            onChange={(e) => setLumaEventUrl(e.target.value)}
            className="bg-cream/50"
          />
          <p className="text-[11px] text-muted-foreground">{t("admin.lumaEventUrlHint")}</p>
        </div>
        <div className="space-y-2">
          <Label>{t("admin.status")}</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-cream/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">{t("admin.statusUpcoming")}</SelectItem>
              <SelectItem value="active">{t("admin.statusActive")}</SelectItem>
              <SelectItem value="completed">{t("admin.statusCompleted")}</SelectItem>
              <SelectItem value="cancelled">{t("admin.statusCancelled")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{t("admin.cancel")}</Button>
          <Button type="submit" disabled={updateEvent.isPending} className="bg-ocean hover:bg-ocean/90 text-white">
            {updateEvent.isPending ? <><Spinner className="w-4 h-4" /> {t("admin.saving")}</> : t("admin.saveChanges")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export default function AdminEvents() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { data: eventsList, isLoading } = trpc.events.list.useQuery();
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const { t } = useI18n();

  const utils = trpc.useUtils();

  const cancelEvent = trpc.events.cancel.useMutation({
    onSuccess: () => {
      toast.success(t("admin.eventCancelled"));
      utils.events.list.invalidate();
      utils.events.upcoming.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("admin.eventCancelFailed"));
    },
  });

  const deleteEvent = trpc.events.delete.useMutation({
    onSuccess: () => {
      toast.success(t("admin.eventDeleted"));
      utils.events.list.invalidate();
      utils.events.upcoming.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || t("admin.eventDeleteFailed"));
    },
  });

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

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">{t("admin.accessRequired")}</h2>
            <p className="text-muted-foreground">{t("admin.accessRequiredDesc")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="container py-8 md:py-12 flex-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-ocean" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ocean">{t("admin.panel")}</p>
            </div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground">
              {t("admin.manageEvents")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("admin.manageEventsDesc")}
            </p>
          </div>
          <CreateEventDialog />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-6 h-6 text-ocean" />
          </div>
        ) : !eventsList || eventsList.length === 0 ? (
          <Empty className="py-16 border border-dashed border-border/60 rounded-2xl bg-card/50">
            <EmptyHeader>
              <EmptyMedia>
                <div className="w-16 h-16 rounded-2xl bg-ocean/10 flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-ocean" />
                </div>
              </EmptyMedia>
              <EmptyTitle>{t("admin.noEvents")}</EmptyTitle>
              <EmptyDescription>{t("admin.noEventsDesc")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventsList.map((event) => (
              <Card key={event.id} className="relative overflow-hidden border-border/60 hover:border-ocean/30 transition-all duration-300">
                {!event.coverImage && (
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-ocean/40 via-sage/30 to-transparent" />
                )}
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="secondary" className={statusColors[event.status] || ""}>
                        {t(statusI18nKeys[event.status] || "event.statusUpcoming")}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Dialog open={editingEvent?.id === event.id} onOpenChange={(open) => !open && setEditingEvent(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-ocean"
                              onClick={() => setEditingEvent(event)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          {editingEvent?.id === event.id && (
                            <EditEventDialog event={editingEvent} onClose={() => setEditingEvent(null)} />
                          )}
                        </Dialog>
                        {event.status !== "cancelled" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-amber-600"
                                title={t("admin.cancelEventBtn")}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("admin.cancelEvent")}</AlertDialogTitle>
                                <AlertDialogDescription>{t("admin.cancelEventDesc")}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("admin.keepEventOpen")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelEvent.mutate({ id: event.id })}
                                  className="bg-amber-600 text-white hover:bg-amber-700"
                                >
                                  {t("admin.cancelEventBtn")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("admin.deleteEvent")}</AlertDialogTitle>
                              <AlertDialogDescription>{t("admin.deleteEventDesc")}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("admin.keepEvent")}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteEvent.mutate({ id: event.id })}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                {t("admin.deleteEventBtn")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-heading font-semibold text-foreground text-lg leading-tight">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>

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
                          {event.rideCount} {event.rideCount === 1 ? t("events.rideOffered") : t("events.ridesOffered")}
                        </span>
                      </div>
                      {event.lumaEventUrl && (
                        <div className="flex items-center gap-2 text-sm">
                          <Link2 className="w-4 h-4 text-ocean shrink-0" />
                          <a
                            href={event.lumaEventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ocean hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Luma Event
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Cover image upload */}
                    <CoverImageUpload eventId={event.id} currentUrl={event.coverImage} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
