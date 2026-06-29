import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, User, Car, Shield, Globe } from "lucide-react";
import { useI18n, type Locale } from "@/contexts/I18nContext";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663255483325/3ZQfgBHGux5xQNTvCZcaYv/wavenova-logo-vertical_1309bc88.png";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, locale, setLocale } = useI18n();

  const handleLogout = async () => {
    await logout();
    setLocation("/");
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

  const toggleLocale = () => {
    setLocale(locale === "en" ? "zh-TW" : "en");
  };

  const localeLabel = locale === "en" ? "中文" : "EN";

  const navLinks = [
    { label: t("nav.rides"), href: "/", icon: Car },
    ...(isAuthenticated ? [{ label: t("nav.myRides"), href: "/profile", icon: User }] : []),
    ...(user?.role === "admin" ? [{ label: t("nav.admin"), href: "/admin/events", icon: Shield }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <img
            src={LOGO_URL}
            alt="WaveNova"
            className="h-9 w-9 object-contain rounded-lg"
          />
          <div className="flex flex-col">
            <span className="font-heading text-lg font-bold leading-tight tracking-tight text-foreground">
              WaveNova
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground leading-none">
              {t("nav.carpoolBoard")}
            </span>
          </div>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              onClick={() => setLocation(link.href)}
              className="text-muted-foreground hover:text-foreground"
            >
              <link.icon className="w-4 h-4 mr-1.5" />
              {link.label}
            </Button>
          ))}
        </nav>

        {/* Auth + Language area */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLocale}
            className="text-muted-foreground hover:text-foreground gap-1.5 px-2.5"
            title={locale === "en" ? "切換至中文" : "Switch to English"}
          >
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium">{localeLabel}</span>
          </Button>

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 pl-2 pr-3">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-sage text-white text-xs font-medium">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[120px] truncate">
                    {user?.name || t("common.user")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setLocation("/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  {t("nav.myRides")}
                </DropdownMenuItem>
                {user?.role === "admin" && (
                  <DropdownMenuItem onClick={() => setLocation("/admin/events")}>
                    <Shield className="w-4 h-4 mr-2" />
                    {t("nav.manageEvents")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                window.location.href = getLoginUrl();
              }}
              className="bg-ocean hover:bg-ocean/90 text-white"
            >
              {t("nav.signIn")}
            </Button>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src={LOGO_URL} alt="WaveNova" className="h-5 w-5 object-contain" />
                  WaveNova
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4 mt-4">
                {navLinks.map((link) => (
                  <Button
                    key={link.href}
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      setLocation(link.href);
                      setMobileOpen(false);
                    }}
                  >
                    <link.icon className="w-4 h-4 mr-2" />
                    {link.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={toggleLocale}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  {locale === "en" ? "繁體中文" : "English"}
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
