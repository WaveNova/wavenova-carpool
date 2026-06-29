import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Send, MessageCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

interface RideChatProps {
  rideId: number;
  className?: string;
}

export default function RideChat({ rideId, className }: RideChatProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const { data: messages, isLoading } = trpc.chat.messages.useQuery(
    { rideId },
    { refetchInterval: 5000 }
  );

  const utils = trpc.useUtils();

  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: () => {
      setMessage("");
      utils.chat.messages.invalidate({ rideId });
      inputRef.current?.focus();
    },
    onError: (error) => {
      toast.error(error.message || t("chat.sendFailed"));
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLDivElement;
      if (viewport) {
        requestAnimationFrame(() => {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
        });
      }
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate({ rideId, message: trimmed });
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

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return t("chat.today");
    if (d.toDateString() === yesterday.toDateString()) return t("chat.yesterday");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const groupedMessages: { date: string; messages: NonNullable<typeof messages> }[] = [];
  if (messages) {
    let currentDate = "";
    for (const msg of messages) {
      const dateStr = formatDate(msg.createdAt);
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groupedMessages.push({ date: dateStr, messages: [msg] });
      } else {
        groupedMessages[groupedMessages.length - 1].messages.push(msg);
      }
    }
  }

  return (
    <div className={`flex flex-col bg-card border border-border/60 rounded-xl overflow-hidden ${className || ""}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-cream/30">
        <MessageCircle className="w-4 h-4 text-ocean" />
        <span className="font-heading font-semibold text-sm text-foreground">{t("chat.title")}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {messages?.length ?? 0} {t("chat.messages")}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0">
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="w-5 h-5 text-ocean" />
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{t("chat.noMessages")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {t("chat.startConversation")}
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-border/50" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2">
                      {group.date}
                    </span>
                    <div className="flex-1 h-px bg-border/50" />
                  </div>
                  <div className="space-y-2">
                    {group.messages.map((msg) => {
                      const isMe = msg.userId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                        >
                          {!isMe && (
                            <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                              <AvatarFallback className="bg-ocean/10 text-ocean text-[10px] font-semibold">
                                {getInitials(msg.userName)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                            {!isMe && (
                              <p className="text-[10px] font-medium text-muted-foreground mb-0.5 px-1">
                                {msg.userName || t("common.user")}
                              </p>
                            )}
                            <div
                              className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                                isMe
                                  ? "bg-ocean text-white rounded-br-md"
                                  : "bg-cream/80 text-foreground rounded-bl-md"
                              }`}
                            >
                              {msg.message}
                            </div>
                            <p className={`text-[10px] text-muted-foreground/50 mt-0.5 px-1 ${isMe ? "text-right" : ""}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-border/50 bg-background/50">
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("chat.placeholder")}
          className="flex-1 bg-cream/30 border-border/40 text-sm h-9"
          maxLength={2000}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || sendMessage.isPending}
          className="bg-ocean hover:bg-ocean/90 text-white h-9 w-9 shrink-0"
        >
          {sendMessage.isPending ? (
            <Spinner className="w-4 h-4" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
