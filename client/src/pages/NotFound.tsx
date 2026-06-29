import { Button } from "@/components/ui/button";
import { Waves, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useI18n } from "@/contexts/I18nContext";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-ocean/5 blob-shape" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-sage/8 blob-shape-2" />

      <div className="text-center px-4 max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-ocean/10 flex items-center justify-center">
            <Waves className="w-8 h-8 text-ocean" />
          </div>
        </div>

        <h1 className="font-heading text-5xl font-bold text-foreground mb-2">404</h1>
        <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
          {t("notFound.title")}
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {t("notFound.description")}
        </p>

        <Button
          onClick={() => setLocation("/")}
          className="bg-ocean hover:bg-ocean/90 text-white"
        >
          <Home className="w-4 h-4 mr-2" />
          {t("notFound.backHome")}
        </Button>
      </div>
    </div>
  );
}
