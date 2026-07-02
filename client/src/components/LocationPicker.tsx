import { useState, useRef, useCallback } from "react";
import { MapView } from "@/components/Map";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, X } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

interface LocationPickerProps {
  value: string;
  onChange: (location: string) => void;
  lat?: number | null;
  lng?: number | null;
  onCoordsChange?: (lat: number | null, lng: number | null) => void;
  placeholder?: string;
}

export default function LocationPicker({
  value,
  onChange,
  lat,
  lng,
  onCoordsChange,
  placeholder,
}: LocationPickerProps) {
  const { t } = useI18n();
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);

  const lazyGeocoder = () => {
    if (!geocoderRef.current && window.google?.maps) {
      geocoderRef.current = new google.maps.Geocoder();
    }
    return geocoderRef.current;
  };

  const lazyAutocomplete = () => {
    if (!autocompleteRef.current && window.google?.maps?.places) {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
    }
    return autocompleteRef.current;
  };

  const placeMarker = useCallback(
    (position: google.maps.LatLngLiteral, address?: string) => {
      if (!mapRef.current) return;

      if (markerRef.current) {
        markerRef.current.position = position;
      } else {
        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map: mapRef.current,
          position,
          gmpDraggable: true,
        });

        markerRef.current.addListener("dragend", () => {
          const pos = markerRef.current?.position;
          if (pos) {
            const latVal = typeof pos.lat === "function" ? (pos as any).lat() : (pos as google.maps.LatLngLiteral).lat;
            const lngVal = typeof pos.lng === "function" ? (pos as any).lng() : (pos as google.maps.LatLngLiteral).lng;
            onCoordsChange?.(latVal, lngVal);
            lazyGeocoder()?.geocode({ location: { lat: latVal, lng: lngVal } }, (results, status) => {
              if (status === "OK" && results?.[0]) {
                onChange(results[0].formatted_address);
              }
            });
          }
        });
      }

      onCoordsChange?.(position.lat, position.lng);
      if (address) onChange(address);
      mapRef.current.panTo(position);
      mapRef.current.setZoom(15);
    },
    [onChange, onCoordsChange]
  );

  const handleMapReady = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      geocoderRef.current = new google.maps.Geocoder();
      autocompleteRef.current = new google.maps.places.AutocompleteService();

      if (lat && lng) {
        placeMarker({ lat, lng });
      }

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const position = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          placeMarker(position);
          geocoderRef.current?.geocode({ location: position }, (results, status) => {
            if (status === "OK" && results?.[0]) {
              onChange(results[0].formatted_address);
            }
          });
        }
      });
    },
    [lat, lng, placeMarker, onChange]
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    lazyAutocomplete()?.getPlacePredictions({ input: query }, (predictions, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        setSuggestions(predictions);
      } else {
        setSuggestions([]);
      }
    });
  }, []);

  const handleSuggestionSelect = useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      setSearchQuery(prediction.description);
      setSuggestions([]);
      lazyGeocoder()?.geocode({ placeId: prediction.place_id }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          placeMarker({ lat: loc.lat(), lng: loc.lng() }, results[0].formatted_address);
        }
      });
    },
    [placeMarker]
  );

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    setSuggestions([]);
    lazyGeocoder()?.geocode({ address: searchQuery }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        placeMarker({ lat: loc.lat(), lng: loc.lng() }, results[0].formatted_address);
      }
    });
  }, [searchQuery, placeMarker]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || t("createRide.departureLocationPlaceholder")}
          className="bg-cream/50 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShowMap(!showMap)}
          className={showMap ? "bg-ocean/10 border-ocean/30 text-ocean" : ""}
          title={t("createRide.pickOnMap")}
        >
          <MapPin className="w-4 h-4" />
        </Button>
      </div>

      {lat && lng && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
      )}

      {showMap && (
        <div className="rounded-lg overflow-hidden border border-border/60 space-y-0">
          <div className="flex gap-2 p-2 bg-muted/30">
            <div className="relative flex-1">
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t("createRide.searchLocation")}
                className="bg-white text-sm h-8"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-lg max-h-48 overflow-y-auto text-sm">
                  {suggestions.map((s) => (
                    <li
                      key={s.place_id}
                      className="px-3 py-2 hover:bg-muted cursor-pointer"
                      onMouseDown={() => handleSuggestionSelect(s)}
                    >
                      <span className="font-medium">{s.structured_formatting.main_text}</span>
                      {s.structured_formatting.secondary_text && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          {s.structured_formatting.secondary_text}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleSearch} className="h-8 px-2">
              <Search className="w-3.5 h-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowMap(false)} className="h-8 px-2">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <MapView
            className="h-[250px]"
            initialCenter={lat && lng ? { lat, lng } : { lat: 25.034, lng: 121.5645 }}
            initialZoom={lat && lng ? 15 : 11}
            onMapReady={handleMapReady}
          />
          <p className="text-xs text-muted-foreground p-2 bg-muted/30">
            {t("createRide.mapHint")}
          </p>
        </div>
      )}
    </div>
  );
}
