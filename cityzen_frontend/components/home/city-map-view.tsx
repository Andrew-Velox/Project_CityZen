"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import { API_BASE_URL } from "@/config/api";
import { createReportComment, getReportComments } from "@/lib/api/report";
import { getAccessToken } from "@/lib/auth/token-store";
import type { Report, ReportComment } from "@/lib/api/types";
import ReportViewModal from "@/components/report/report-view-modal";
import { useLanguage } from "@/components/i18n/language-context";

const dhakaPosition: [number, number] = [23.8103, 90.4125];
function createCurrentLocationIcon() {
  return L.divIcon({
    html: `
      <div class="cityzen-current-location-marker">
        <span class="cityzen-current-location-marker__pulse"></span>
        <span class="cityzen-current-location-marker__dot"></span>
      </div>
    `,
    className: "cityzen-current-location-marker-icon bg-transparent border-none",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

// --- Custom Modern Marker Generator ---
function createCategoryIcon(category: Report["category"]) {
  const categoryMeta = {
    danger: { hex: "#ef4444", symbol: "!" },
    help: { hex: "#3b82f6", symbol: "?" },
    warning: { hex: "#f59e0b", symbol: "!" },
    healthy: { hex: "#10b981", symbol: "OK" },
  } as const;

  const meta = categoryMeta[category] || categoryMeta.warning;

  return L.divIcon({
    html: `
      <div class="cityzen-report-marker" style="--marker-color:${meta.hex};">
        <span class="cityzen-report-marker__pulse"></span>
        <span class="cityzen-report-marker__pulse cityzen-report-marker__pulse--delay"></span>
        <div class="cityzen-report-marker__pin">
          <span style="
            transform:rotate(45deg);
            color:#ffffff;
            font-size:${meta.symbol === "OK" ? "10px" : "14px"};
            font-weight:800;
            line-height:1;
          ">${meta.symbol}</span>
        </div>
      </div>
    `,
    className: "cityzen-report-marker-icon bg-transparent border-none",
    iconSize: [56, 68],
    iconAnchor: [28, 62],
    popupAnchor: [0, -54],
  });
}

// --- Map Camera Controller for Smooth/Fast Animations ---
function MapFocusController({ target, requestKey }: { target: [number, number] | null; requestKey: number }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;

    const targetLatLng = L.latLng(target[0], target[1]);
    const distance = map.getCenter().distanceTo(targetLatLng);
    const zoomTarget = Math.max(map.getZoom(), 15);

    map.stop(); // Immediate stop for high responsiveness
    map.closePopup();

    if (distance < 600) {
      // Very fast, buttery pan for nearby items
      map.panTo(targetLatLng, {
        animate: true,
        duration: 0.4,
        easeLinearity: 0.1,
      });
    } else {
      // Snappy, modern flight for long distances
      const flyDuration = distance < 4000 ? 0.7 : 1.0;
      map.flyTo(targetLatLng, zoomTarget, {
        animate: true,
        duration: flyDuration,
        easeLinearity: 0.1,
      });
    }
  }, [map, requestKey, target]);

  return null;
}

function LiveLocationFollowController({
  target,
  isTracking,
}: {
  target: [number, number] | null;
  isTracking: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!target || !isTracking) return;
    map.panTo(target, { animate: true, duration: 0.35, easeLinearity: 0.18 });
  }, [map, target, isTracking]);

  return null;
}

function ManualRecenterController({
  target,
  requestKey,
}: {
  target: [number, number] | null;
  requestKey: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!target || requestKey === 0) return;
    const zoomTarget = Math.max(map.getZoom(), 16);
    map.flyTo(target, zoomTarget, { animate: true, duration: 0.55, easeLinearity: 0.12 });
  }, [map, requestKey, target]);

  return null;
}

function MapViewportTracker({
  onViewportChange,
}: {
  onViewportChange: (center: [number, number], bounds: [[number, number], [number, number]]) => void;
}) {
  const map = useMapEvents({
    moveend: reportViewport,
    zoomend: reportViewport,
  });

  function reportViewport() {
    const center = map.getCenter();
    const bounds = map.getBounds();
    onViewportChange(
      [center.lat, center.lng],
      [
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()],
      ],
    );
  }

  useEffect(() => {
    reportViewport();
  }, [map]);

  return null;
}

// --- Map Click Handler ---
function MapClickPicker({
  onPick,
  onMapClick,
}: {
  onPick?: (lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onMapClick?.(event.latlng.lat, event.latlng.lng);
      if (!onPick) return;
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

// --- Custom Popup Close Button ---
function PopupCloseButton() {
  const map = useMap();
  return (
    <button
      type="button"
      onClick={() => map.closePopup()}
      aria-label="Close popup"
      className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100/80 text-slate-500 backdrop-blur-sm transition-all hover:bg-slate-200 hover:text-slate-800"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

// --- Utility Functions ---
function parseLocation(location: string): [number, number] | null {
  const parts = location.split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length !== 2) return null;
  if (Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return [parts[0], parts[1]];
}

type CityMapViewProps = {
  reports: Report[];
  isAuthenticated: boolean;
  onLocationPick?: (lat: number, lng: number) => void;
  onEditReport?: (report: Report) => void;
  focusLocation?: string | null;
  focusRequestKey?: number;
  onLiveLocationUpdate?: (lat: number, lng: number) => void;
};

type SearchPlace = {
  id: string;
  name: string;
  displayName: string;
  placeClass: string;
  placeType: string;
  address: string;
  lat: number;
  lon: number;
  city?: string;
  country?: string;
  source?: "nominatim" | "photon";
  confidence?: number;
  rankScore?: number;
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()\[\]"']/g, " ")
    .replace(/\b(ltd|limited|inc|corp|corporation|company)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchVariants(value: string) {
  const base = normalizeSearchText(value);
  if (base.length < 2) return [];

  const variants = new Set<string>([base, `${base} bangladesh`]);
  if (!/\bbangladesh\b/.test(base)) {
    variants.add(`${base} narsingdi`);
  }
  return Array.from(variants);
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function fuzzySimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return Math.max(0, 1 - levenshteinDistance(a, b) / maxLen);
}

function distanceInKm(from: [number, number], to: [number, number]) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to[0] - from[0]);
  const dLon = toRad(to[1] - from[1]);
  const lat1 = toRad(from[0]);
  const lat2 = toRad(to[0]);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function isInsideBounds(point: [number, number], bounds: [[number, number], [number, number]] | null) {
  if (!bounds) return false;
  const [[south, west], [north, east]] = bounds;
  return point[0] >= south && point[0] <= north && point[1] >= west && point[1] <= east;
}

// --- Main Component ---
export default function CityMapView({
  reports,
  isAuthenticated,
  onLocationPick,
  onEditReport,
  focusLocation,
  focusRequestKey = 0,
  onLiveLocationUpdate,
}: CityMapViewProps) {
  const { language } = useLanguage();
  const [selectedPosition, setSelectedPosition] = useState<[number, number]>(dhakaPosition);
  const [detailsReport, setDetailsReport] = useState<Report | null>(null);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const locationWatchRef = useRef<number | null>(null);
  const previousUserPointRef = useRef<L.LatLng | null>(null);
  const [isLocationTracking, setIsLocationTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [lastMovementMeters, setLastMovementMeters] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [isRecentering, setIsRecentering] = useState(false);
  const [recenterRequestKey, setRecenterRequestKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<SearchPlace[]>([]);
  const [searchResults, setSearchResults] = useState<SearchPlace[]>([]);
  const [activeSearchResultId, setActiveSearchResultId] = useState<string | null>(null);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTarget, setSearchTarget] = useState<[number, number] | null>(null);
  const [searchRequestKey, setSearchRequestKey] = useState(0);
  const [searchTriggerKey, setSearchTriggerKey] = useState(0);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(dhakaPosition);
  const [mapBounds, setMapBounds] = useState<[[number, number], [number, number]] | null>(null);
  const shouldZoomOnTrackStartRef = useRef(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const searchCacheRef = useRef<Map<string, SearchPlace[]>>(new Map());
  const forceImmediateSearchRef = useRef(false);
  const focusTarget = useMemo(() => (focusLocation ? parseLocation(focusLocation) : null), [focusLocation]);

  const text =
    language === "bn"
      ? {
          commentsLoadError: "এই রিপোর্টের মন্তব্য লোড করা যায়নি।",
          loginRequired: "মন্তব্য করতে আগে লগইন করুন।",
          commentPostError: "মন্তব্য পোস্ট করা যায়নি।",
          selectedLocation: "নির্বাচিত স্থান",
          category: "ক্যাটাগরি",
          area: "এলাকা",
          viewDetails: "বিস্তারিত দেখুন",
          edit: "সম্পাদনা",
          gpsHeading: "লাইভ জিপিএস",
          gpsStart: "আমার লোকেশন চালু করুন",
          gpsStop: "লোকেশন ট্র্যাকিং বন্ধ করুন",
          gpsWaiting: "লোকেশন অনুমতির জন্য অপেক্ষা করছে...",
          gpsActive: "রিয়েল-টাইম লোকেশন চালু আছে",
          gpsStopped: "লোকেশন ট্র্যাকিং বন্ধ করা হয়েছে",
          gpsDenied: "লোকেশন পারমিশন বাতিল করা হয়েছে। সেটিংস থেকে অনুমতি দিন।",
          gpsUnavailable: "ডিভাইস থেকে লোকেশন পাওয়া যাচ্ছে না।",
          gpsTimeout: "লোকেশন নিতে সময় শেষ হয়ে গেছে। আবার চেষ্টা করুন।",
          gpsUnsupported: "এই ব্রাউজারে জিপিএস সাপোর্ট নেই।",
          gpsAuthRequired: "রিয়েল-টাইম জিপিএস ব্যবহার করতে আগে লগইন করুন।",
          gpsRecenter: "আমার লোকেশনে নিন",
          gpsRecentering: "লোকেশন নেয়া হচ্ছে...",
          gpsCentered: "ম্যাপ আপনার লোকেশনে আনা হয়েছে",
          yourLocation: "আপনার বর্তমান লোকেশন",
          accuracy: "নির্ভুলতা",
          movement: "সর্বশেষ সরণ",
          liveUpdating: "লাইভ আপডেট হচ্ছে",
          notAvailable: "প্রযোজ্য নয়",
          searchPlaceholder: "লোকেশন, এলাকা বা কীওয়ার্ড লিখুন",
          searchHint: "কমপক্ষে ২ অক্ষর লিখুন",
          searchLoading: "সার্চ হচ্ছে...",
          searchNoResults: "কোনো স্থান পাওয়া যায়নি",
          searchError: "লোকেশন সার্চ করা যাচ্ছে না। আবার চেষ্টা করুন।",
          searchTimeout: "সার্চে বেশি সময় লাগছে। ইন্টারনেট চেক করে আবার চেষ্টা করুন।",
          searchNearMeNeedsPlace: "আপনার কাছে কী খুঁজবেন সেটি লিখুন (যেমন: hospital near me)",
          searchResultLabel: "সার্চ ফলাফল",
          searchTypeLabel: "ধরন",
          searchAddressLabel: "ঠিকানা",
          searchNoAddress: "ঠিকানা পাওয়া যায়নি",
          goToResult: "এখানে যান",
          mapLanguage: "bn",
        }
      : {
          commentsLoadError: "Failed to load comments for this report.",
          loginRequired: "Please log in before posting a comment.",
          commentPostError: "Failed to post comment.",
          selectedLocation: "Selected location",
          category: "Category",
          area: "Area",
          viewDetails: "View details",
          edit: "Edit",
          gpsHeading: "Live GPS",
          gpsStart: "Enable my location",
          gpsStop: "Stop location tracking",
          gpsWaiting: "Waiting for location permission...",
          gpsActive: "Real-time location is active",
          gpsStopped: "Location tracking stopped",
          gpsDenied: "Location permission was denied. Please allow it in browser settings.",
          gpsUnavailable: "Unable to detect device location.",
          gpsTimeout: "Location request timed out. Please try again.",
          gpsUnsupported: "Geolocation is not supported in this browser.",
          gpsAuthRequired: "Please log in to use real-time GPS.",
          gpsRecenter: "Re-center to me",
          gpsRecentering: "Finding location...",
          gpsCentered: "Map centered on your location",
          yourLocation: "Your current location",
          accuracy: "Accuracy",
          movement: "Latest movement",
          liveUpdating: "Live updates running",
          notAvailable: "N/A",
          searchPlaceholder: "Search locations, areas, or keywords",
          searchHint: "Type at least 2 characters",
          searchLoading: "Searching...",
          searchNoResults: "No places found",
          searchError: "Could not search locations. Please try again.",
          searchTimeout: "Search is taking too long. Please check connection and retry.",
          searchNearMeNeedsPlace: "Type what to search near you (e.g., hospital near me)",
          searchResultLabel: "Search result",
          searchTypeLabel: "Type",
          searchAddressLabel: "Address",
          searchNoAddress: "Address not available",
          goToResult: "Go to result",
          mapLanguage: "en",
        };

  useEffect(() => {
    try {
      delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl;
    } catch { }

    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  function resolveFileUrl(file: string | null) {
    if (!file) return null;
    if (file.startsWith("http://") || file.startsWith("https://")) return file;
    if (file.startsWith("/")) return `${API_BASE_URL}${file}`;
    return `${API_BASE_URL}/${file}`;
  }

  function isImageFile(path: string | null) {
    if (!path) return false;
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(path);
  }

  function getReportImageUrls(report: Report) {
    const imagePaths = report.images?.length ? report.images : report.file ? [report.file] : [];
    return imagePaths
      .map((path) => resolveFileUrl(path))
      .filter((path): path is string => Boolean(path) && isImageFile(path));
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? dateString : date.toLocaleString();
  }

  async function openReportDetails(report: Report) {
    setDetailsReport(report);
    setComments([]);
    setCommentsLoading(true);
    setCommentError(null);

    try {
      const data = await getReportComments(report.id);
      setComments(data);
    } catch {
      setCommentError(text.commentsLoadError);
    } finally {
      setCommentsLoading(false);
    }
  }

  function closeReportDetails() {
    setDetailsReport(null);
    setCommentInput("");
    setCommentError(null);
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detailsReport) return;

    const content = commentInput.trim();
    if (!content) return;

    const token = getAccessToken();
    if (!token) {
      setCommentError(text.loginRequired);
      return;
    }

    setCommentSubmitting(true);
    setCommentError(null);

    try {
      const created = await createReportComment(detailsReport.id, { content }, token);
      setComments((prev) => [...prev, created]);
      setCommentInput("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : text.commentPostError);
    } finally {
      setCommentSubmitting(false);
    }
  }

  function clearLocationWatch() {
    if (locationWatchRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
  }

  function resolveGeolocationError(error: GeolocationPositionError) {
    if (error.code === error.PERMISSION_DENIED) return text.gpsDenied;
    if (error.code === error.POSITION_UNAVAILABLE) return text.gpsUnavailable;
    if (error.code === error.TIMEOUT) return text.gpsTimeout;
    return error.message || text.gpsUnavailable;
  }

  async function startLocationTracking() {
    if (!isAuthenticated) {
      setLocationError(text.gpsAuthRequired);
      setLocationStatus(null);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError(text.gpsUnsupported);
      setLocationStatus(null);
      return;
    }

    setLocationError(null);
    setLocationStatus(text.gpsWaiting);

    if (navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        if (permission.state === "denied") {
          setLocationError(text.gpsDenied);
          setLocationStatus(null);
          return;
        }
      } catch {
        // Ignore Permissions API issues and proceed to geolocation prompt.
      }
    }

    clearLocationWatch();

    shouldZoomOnTrackStartRef.current = true;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const next: [number, number] = [position.coords.latitude, position.coords.longitude];
        const nextPoint = L.latLng(next[0], next[1]);

        if (previousUserPointRef.current) {
          setLastMovementMeters(previousUserPointRef.current.distanceTo(nextPoint));
        }

        previousUserPointRef.current = nextPoint;
        setUserLocation(next);
        setUserAccuracy(position.coords.accuracy);
        onLiveLocationUpdate?.(next[0], next[1]);
        setIsLocationTracking(true);
        setLocationError(null);
        setLocationStatus(text.gpsActive);
        if (shouldZoomOnTrackStartRef.current) {
          setRecenterRequestKey((prev) => prev + 1);
          shouldZoomOnTrackStartRef.current = false;
        }
      },
      (error) => {
        const message = resolveGeolocationError(error);
        setLocationError(message);
        setLocationStatus(null);
        setIsLocationTracking(false);
        shouldZoomOnTrackStartRef.current = false;
        clearLocationWatch();
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );

    locationWatchRef.current = watchId;
  }

  async function recenterToCurrentLocation() {
    if (!isAuthenticated) {
      setLocationError(text.gpsAuthRequired);
      setLocationStatus(null);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError(text.gpsUnsupported);
      setLocationStatus(null);
      return;
    }

    setLocationError(null);

    if (userLocation) {
      setRecenterRequestKey((prev) => prev + 1);
      setLocationStatus(text.gpsCentered);
      return;
    }

    setIsRecentering(true);
    setLocationStatus(text.gpsRecentering);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(next);
        setUserAccuracy(position.coords.accuracy);
        onLiveLocationUpdate?.(next[0], next[1]);
        previousUserPointRef.current = L.latLng(next[0], next[1]);
        setLastMovementMeters(null);
        setRecenterRequestKey((prev) => prev + 1);
        setLocationStatus(text.gpsCentered);
        setIsRecentering(false);
      },
      (error) => {
        setLocationError(resolveGeolocationError(error));
        setLocationStatus(null);
        setIsRecentering(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }

  useEffect(() => {
    if (isAuthenticated) {
      startLocationTracking();
    } else {
      clearLocationWatch();
      setIsLocationTracking(false);
      setLocationStatus(null);
    }

    return () => {
      clearLocationWatch();
    };
  }, [language, isAuthenticated]);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchSuggestions([]);
      setSearchResults([]);
      setSearchError(null);
      setIsSearchLoading(false);
      return;
    }

    const nearMePattern = /\b(near me|nearby)\b|আমার (কাছে|কাছাকাছি)/i;
    const isNearMeQuery = nearMePattern.test(query);
    const normalizedQuery = query.replace(nearMePattern, "").replace(/\s+/g, " ").trim();
    const queryBase = normalizedQuery || query;
    const normalizedKey = normalizeSearchText(queryBase);

    if (isNearMeQuery && normalizedQuery.length < 2) {
      setSearchSuggestions([]);
      setSearchResults([]);
      setSearchError(text.searchNearMeNeedsPlace);
      setIsSearchLoading(false);
      return;
    }

    const centerForSearch = userLocation ?? mapCenter;
    const cacheKey = `${normalizedKey}|${isNearMeQuery ? "near" : "global"}|${centerForSearch[0].toFixed(2)},${centerForSearch[1].toFixed(2)}`;
    const cached = searchCacheRef.current.get(cacheKey);
    if (cached && cached.length > 0) {
      setSearchResults(cached);
      setSearchSuggestions(cached.slice(0, 8));
      setSearchError(null);
      setIsSearchLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 9000);

    async function fetchNominatimPlaces(searchValue: string, useNearbyBounds: boolean, nearbyCenter: [number, number] | null) {
      const params = new URLSearchParams({
        format: "jsonv2",
        limit: "18",
        addressdetails: "1",
        dedupe: "1",
        extratags: "1",
        q: searchValue,
      });

      if (useNearbyBounds) {
        const source = nearbyCenter ?? userLocation ?? mapCenter;
        const latSpan = 0.12;
        const lonSpan = 0.12;
        const west = source[1] - lonSpan;
        const east = source[1] + lonSpan;
        const south = source[0] - latSpan;
        const north = source[0] + latSpan;
        params.set("viewbox", `${west},${north},${east},${south}`);
        params.set("bounded", "1");
      }

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          "Accept-Language": text.mapLanguage,
        },
      });

      if (!response.ok) {
        throw new Error("Search request failed");
      }

      const rows = (await response.json()) as Array<{
        place_id: number;
        name?: string;
        display_name: string;
        class?: string;
        type?: string;
        address?: Record<string, string>;
        importance?: number;
        lat: string;
        lon: string;
      }>;

      return rows
        .map((row) => ({
          id: String(row.place_id),
          name: row.name || row.display_name.split(",")[0] || row.display_name,
          displayName: row.display_name,
          placeClass: row.class || "place",
          placeType: row.type || "unknown",
          address:
            row.address && Object.values(row.address).length > 0
              ? Object.values(row.address).join(", ")
              : "",
          city:
            row.address?.city ||
            row.address?.town ||
            row.address?.county ||
            row.address?.state_district ||
            "",
          country: row.address?.country || "",
          source: "nominatim" as const,
          confidence: typeof row.importance === "number" ? row.importance : 0,
          lat: Number.parseFloat(row.lat),
          lon: Number.parseFloat(row.lon),
        }))
        .filter((row) => !Number.isNaN(row.lat) && !Number.isNaN(row.lon));
    }

    async function fetchPhotonPlaces(searchValue: string, nearbyCenter: [number, number] | null) {
      const params = new URLSearchParams({
        q: searchValue,
        limit: "18",
        lang: text.mapLanguage,
      });

      const source = nearbyCenter ?? centerForSearch;
      params.set("lat", String(source[0]));
      params.set("lon", String(source[1]));

      const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Photon request failed");
      }

      const payload = (await response.json()) as {
        features: Array<{
          geometry: { coordinates: [number, number] };
          properties: {
            osm_id?: number;
            name?: string;
            street?: string;
            city?: string;
            district?: string;
            country?: string;
            type?: string;
            osm_key?: string;
            osm_value?: string;
          };
        }>;
      };

      return payload.features
        .map((feature, index) => {
          const p = feature.properties || {};
          const [lon, lat] = feature.geometry?.coordinates || [NaN, NaN];
          const city = p.city || p.district || "";
          const name = p.name || p.street || "Unnamed place";
          const address = [p.street, city, p.country].filter(Boolean).join(", ");
          return {
            id: `photon-${p.osm_id ?? `${index}-${name}`}`,
            name,
            displayName: [name, city, p.country].filter(Boolean).join(", "),
            placeClass: p.osm_key || "place",
            placeType: p.osm_value || p.type || "unknown",
            address,
            city,
            country: p.country || "",
            source: "photon" as const,
            confidence: name ? 0.55 : 0.35,
            lat,
            lon,
          } satisfies SearchPlace;
        })
        .filter((row) => !Number.isNaN(row.lat) && !Number.isNaN(row.lon));
    }

    function dedupePlaces(places: SearchPlace[]) {
      const seen = new Set<string>();
      return places.filter((place) => {
        const key = `${normalizeSearchText(place.name)}|${place.lat.toFixed(4)}|${place.lon.toFixed(4)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function rankPlaces(places: SearchPlace[], needle: string) {
      const normalizedNeedle = normalizeSearchText(needle);
      const categoryWords = ["hospital", "mosque", "restaurant", "college", "tourist", "hotel", "school"];
      const requestedCategory = categoryWords.find((word) => normalizedNeedle.includes(word)) || null;

      return places
        .map((place) => {
          const normalizedName = normalizeSearchText(place.name || place.displayName);
          const normalizedDisplay = normalizeSearchText(place.displayName);
          const fuzzy = Math.max(
            fuzzySimilarity(normalizedNeedle, normalizedName),
            fuzzySimilarity(normalizedNeedle, normalizedDisplay),
          );

          let score = 0;
          if (normalizedName === normalizedNeedle) score += 1.25;
          if (normalizedName.startsWith(normalizedNeedle)) score += 0.65;
          if (normalizedDisplay.includes(normalizedNeedle)) score += 0.35;
          score += fuzzy * 0.55;

          if (requestedCategory) {
            const catText = `${place.placeClass} ${place.placeType}`.toLowerCase();
            if (catText.includes(requestedCategory)) score += 0.35;
          }

          const distKm = distanceInKm(centerForSearch, [place.lat, place.lon]);
          score += Math.max(0, 0.32 - Math.min(distKm, 40) * 0.008);
          if (isInsideBounds([place.lat, place.lon], mapBounds)) score += 0.14;

          score += (place.confidence || 0) * 0.25;

          return {
            ...place,
            rankScore: score,
          };
        })
        .sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
    }

    const delayMs = forceImmediateSearchRef.current ? 0 : 300;
    forceImmediateSearchRef.current = false;

    const timer = globalThis.setTimeout(async () => {
      setIsSearchLoading(true);
      setSearchError(null);

      try {
        let nearbyCenter: [number, number] | null = null;
        if (isNearMeQuery && navigator.geolocation) {
          try {
            nearbyCenter = await new Promise<[number, number]>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  resolve([position.coords.latitude, position.coords.longitude]);
                },
                reject,
                {
                  enableHighAccuracy: true,
                  timeout: 5500,
                  maximumAge: 30000,
                },
              );
            });
          } catch {
            nearbyCenter = null;
          }
        }

        const variants = buildSearchVariants(queryBase);
        let mapped: SearchPlace[] = [];

        for (const variant of variants) {
          mapped = await fetchNominatimPlaces(variant, isNearMeQuery, nearbyCenter);
          if (mapped.length > 0) {
            break;
          }
        }

        mapped = rankPlaces(dedupePlaces(mapped), queryBase);

        if ((mapped.length === 0 || (mapped[0]?.rankScore || 0) < 0.52) && isNearMeQuery) {
          for (const variant of variants) {
            mapped = await fetchNominatimPlaces(variant, false, nearbyCenter);
            if (mapped.length > 0) {
              break;
            }
          }
          mapped = rankPlaces(dedupePlaces(mapped), queryBase);
        }

        if (mapped.length === 0 || (mapped[0]?.rankScore || 0) < 0.48) {
          const photonMerged: SearchPlace[] = [];
          for (const variant of variants) {
            const photonItems = await fetchPhotonPlaces(variant, nearbyCenter);
            photonMerged.push(...photonItems);
          }
          if (photonMerged.length > 0) {
            mapped = rankPlaces(dedupePlaces([...mapped, ...photonMerged]), queryBase);
          }
        }

        setSearchResults(mapped);
        setSearchSuggestions(mapped.slice(0, 8));

        if (mapped.length > 0) {
          searchCacheRef.current.set(cacheKey, mapped);
          if (searchCacheRef.current.size > 80) {
            const oldest = searchCacheRef.current.keys().next().value;
            if (oldest) searchCacheRef.current.delete(oldest);
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setSearchError(text.searchTimeout);
          setSearchSuggestions([]);
          setSearchResults([]);
          return;
        }
        setSearchSuggestions([]);
        setSearchResults([]);
        setSearchError(text.searchError);
      } finally {
        setIsSearchLoading(false);
      }
    }, delayMs);

    return () => {
      globalThis.clearTimeout(timer);
      globalThis.clearTimeout(timeout);
      controller.abort();
    };
  }, [mapBounds, mapCenter, searchQuery, searchTriggerKey, text.mapLanguage, text.searchError, text.searchNearMeNeedsPlace, text.searchTimeout, userLocation]);

  useEffect(() => {
    if (searchSuggestions.length === 0) {
      setHighlightedSuggestionIndex(-1);
      return;
    }
    setHighlightedSuggestionIndex(0);
  }, [searchSuggestions]);

  function triggerSearchOnEnter() {
    const preferred =
      searchSuggestions[highlightedSuggestionIndex] ||
      searchSuggestions[0] ||
      searchResults[0] ||
      null;

    if (preferred) {
      chooseSearchSuggestion(preferred);
      return;
    }

    if (searchQuery.trim().length >= 2) {
      setIsSearchOpen(true);
      setSearchError(null);
      forceImmediateSearchRef.current = true;
      setSearchTriggerKey((prev) => prev + 1);
    }
  }

  function chooseSearchSuggestion(item: SearchPlace) {
    const next: [number, number] = [item.lat, item.lon];
    setSelectedPosition(next);
    setSelectedLabel(item.name);
    setActiveSearchResultId(item.id);
    setSearchTarget(next);
    setSearchRequestKey((prev) => prev + 1);
    setSearchQuery(item.displayName);
    setSearchSuggestions(searchResults.slice(0, 8));
    setHighlightedSuggestionIndex(-1);
    setIsSearchOpen(false);
  }

  const detailsImageUrls = detailsReport ? getReportImageUrls(detailsReport) : [];
  const detailsAttachmentUrl = detailsReport?.file ? (resolveFileUrl(detailsReport.file) as string) : null;

  return (
    <>
      <div className="relative z-0 h-full w-full overflow-hidden bg-transparent">
        <div
          className="absolute left-3 top-3 z-[3500] w-[min(26rem,calc(100vw-1.5rem))]"
          ref={searchBoxRef}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="rounded-2xl border border-[#d4def0] bg-white/95 p-2.5 shadow-[0_14px_30px_#0f172a1a] backdrop-blur-md">
            <label htmlFor="map-search-input" className="sr-only">{text.searchPlaceholder}</label>
            <div className="flex items-center gap-2 rounded-xl border border-[#d8e2f4] bg-white px-3">
              <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                id="map-search-input"
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setIsSearchOpen(true);
                  setSearchError(null);
                  setHighlightedSuggestionIndex(-1);
                }}
                onFocus={() => setIsSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    triggerSearchOnEnter();
                    return;
                  }

                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    event.stopPropagation();
                    if (searchSuggestions.length > 0) {
                      setIsSearchOpen(true);
                      setHighlightedSuggestionIndex((prev) =>
                        prev < 0 ? 0 : (prev + 1) % searchSuggestions.length,
                      );
                    }
                    return;
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    event.stopPropagation();
                    if (searchSuggestions.length > 0) {
                      setIsSearchOpen(true);
                      setHighlightedSuggestionIndex((prev) =>
                        prev <= 0 ? searchSuggestions.length - 1 : prev - 1,
                      );
                    }
                    return;
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    setIsSearchOpen(false);
                    setHighlightedSuggestionIndex(-1);
                  }
                  event.stopPropagation();
                }}
                placeholder={text.searchPlaceholder}
                className="h-11 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                autoComplete="off"
                spellCheck={false}
                aria-label={text.searchPlaceholder}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchSuggestions([]);
                    setSearchResults([]);
                    setSearchError(null);
                    setActiveSearchResultId(null);
                    setSelectedLabel(null);
                    setHighlightedSuggestionIndex(-1);
                    setIsSearchOpen(false);
                  }}
                  className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M6 18L18 6" />
                  </svg>
                </button>
              ) : null}
            </div>

            {isSearchOpen ? (
              <div className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#d8e2f4] bg-white py-1">
                {searchQuery.trim().length < 2 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">{text.searchHint}</p>
                ) : isSearchLoading ? (
                  <p className="px-3 py-2 text-xs font-medium text-slate-600">{text.searchLoading}</p>
                ) : searchError ? (
                  <p className="px-3 py-2 text-xs font-medium text-red-600">{searchError}</p>
                ) : searchSuggestions.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">{text.searchNoResults}</p>
                ) : (
                  searchSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => chooseSearchSuggestion(item)}
                      onMouseEnter={() => {
                        const index = searchSuggestions.findIndex((entry) => entry.id === item.id);
                        setHighlightedSuggestionIndex(index);
                      }}
                      className={`block w-full px-3 py-2 text-left transition hover:bg-[#f5f8ff] ${
                        searchSuggestions[highlightedSuggestionIndex]?.id === item.id ? "bg-[#f0f6ff]" : ""
                      }`}
                    >
                      <p className="line-clamp-1 text-sm font-semibold text-slate-700">{item.name}</p>
                      <p className="line-clamp-1 text-xs text-slate-500">{item.placeType.replaceAll("_", " ")}</p>
                      <p className="line-clamp-1 text-xs text-slate-400">{item.address || item.displayName}</p>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>

        {locationError ? (
          <div className="pointer-events-none absolute right-3 top-3 z-50">
            <p className="pointer-events-auto max-w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-[0_8px_20px_#0f172a1a]">
              {locationError}
            </p>
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-6 right-6 z-1200">
          <button
            type="button"
            className="pointer-events-auto inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#c5ddf5] bg-white/95 text-[#1f4fd7] shadow-[0_16px_36px_rgba(2,6,23,0.24)] backdrop-blur-md transition hover:bg-[#eef5ff]"
            onClick={recenterToCurrentLocation}
            aria-label={text.gpsRecenter}
            title={text.gpsRecenter}
            disabled={!isAuthenticated}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
          </button>
        </div>

        <MapContainer
          center={dhakaPosition}
          zoom={7.3}
          zoomControl={false}
          className="h-full w-full outline-none"
        >
          <MapClickPicker
            onPick={onLocationPick}
            onMapClick={(lat, lng) => setSelectedPosition([lat, lng])}
          />
          <MapFocusController target={focusTarget} requestKey={focusRequestKey} />
          <LiveLocationFollowController target={userLocation} isTracking={isLocationTracking} />
          <ManualRecenterController target={userLocation} requestKey={recenterRequestKey} />
          <ManualRecenterController target={searchTarget} requestKey={searchRequestKey} />
          <ZoomControl position="bottomleft" />

          <TileLayer
            attribution='&copy; Google'
            url={`https://{s}.google.com/vt/lyrs=m&hl=${text.mapLanguage}&x={x}&y={y}&z={z}`}
            subdomains={["mt0", "mt1", "mt2", "mt3"]}
          />

          {/* User Selection Marker */}
          <Marker position={selectedPosition}>
            <Popup closeButton={false}>
              <div className="relative overflow-hidden rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-md ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-200">
                <PopupCloseButton />
                <p className="pr-6 text-sm font-semibold text-slate-700">
                  {text.selectedLocation}: {selectedPosition[0].toFixed(4)}, {selectedPosition[1].toFixed(4)}
                </p>
                {selectedLabel ? (
                  <p className="mt-1 pr-6 text-xs font-medium text-slate-500">{text.searchResultLabel}: {selectedLabel}</p>
                ) : null}
              </div>
            </Popup>
          </Marker>

          {searchResults.map((place) => (
            <Marker
              key={`search-${place.id}`}
              position={[place.lat, place.lon]}
              eventHandlers={{
                click: () => {
                  setActiveSearchResultId(place.id);
                  setSelectedPosition([place.lat, place.lon]);
                  setSelectedLabel(place.name);
                },
              }}
            >
              <Popup closeButton={false}>
                <div className="relative min-w-[220px] overflow-hidden rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-md ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-200">
                  <PopupCloseButton />
                  <p className="pr-6 text-sm font-bold text-slate-800">{place.name}</p>
                  <p className="mt-1 text-xs font-medium capitalize text-slate-500">
                    {text.searchTypeLabel}: {place.placeType.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {text.searchAddressLabel}: {place.address || text.searchNoAddress}
                  </p>
                  <button
                    type="button"
                    className="mt-3 inline-flex rounded-lg bg-[#1f4fd7] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1a43b7]"
                    onClick={() => chooseSearchSuggestion(place)}
                  >
                    {text.goToResult}
                  </button>
                  {activeSearchResultId === place.id ? (
                    <p className="mt-2 text-[11px] font-semibold text-[#1f4fd7]">{text.searchResultLabel}</p>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}

          {userLocation ? (
            <>
              <Circle
                center={userLocation}
                radius={Math.min(Math.max(userAccuracy ?? 0, 12), 90)}
                pathOptions={{ color: "#2563eb", weight: 1, fillColor: "#60a5fa", fillOpacity: 0.2 }}
              />
              <Marker position={userLocation} icon={createCurrentLocationIcon()}>
                <Popup closeButton={false}>
                  <div className="relative overflow-hidden rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur-md ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-200">
                    <PopupCloseButton />
                    <p className="pr-6 text-sm font-bold text-slate-800">{text.yourLocation}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {text.accuracy}: {userAccuracy !== null ? `${Math.round(userAccuracy)} m` : text.notAvailable}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {text.movement}: {lastMovementMeters !== null ? `${lastMovementMeters.toFixed(1)} m` : text.notAvailable}
                    </p>
                  </div>
                </Popup>
              </Marker>
            </>
          ) : null}

          {/* Active Reports Markers */}
          {reports.map((report) => {
            const position = parseLocation(report.location);
            if (!position) return null;

            const imageUrls = getReportImageUrls(report);
            const hasImage = imageUrls.length > 0;

            return (
              <Marker key={report.id} position={position} icon={createCategoryIcon(report.category)}>
                <Popup closeButton={false} minWidth={280} maxWidth={320}>
                  <div className="-m-3 relative overflow-hidden rounded-2xl bg-white/95 p-5 shadow-2xl backdrop-blur-xl ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-200">
                    <PopupCloseButton />

                    <h4 className="mb-1 pr-6 text-[1.1rem] font-extrabold leading-tight tracking-tight text-slate-900">{report.title}</h4>
                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">{report.description}</p>

                    {hasImage && (
                      <div className="relative mb-4 overflow-hidden rounded-xl bg-slate-100 shadow-inner">
                        <img
                          src={imageUrls[0]}
                          alt={`${report.title} preview`}
                          className="h-32 w-full object-cover transition-transform duration-500 hover:scale-105"
                          loading="lazy"
                        />
                        {imageUrls.length > 1 && (
                          <div className="absolute bottom-2 right-2 rounded-lg bg-slate-900/70 px-2 py-1 text-[10px] font-bold tracking-wider text-white backdrop-blur-md">
                            +{imageUrls.length - 1} MORE
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mb-5 grid grid-cols-2 gap-y-3 border-t border-slate-100 pt-4 text-sm">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{text.category}</div>
                      <div>
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold capitalize shadow-sm ring-1 ring-inset ${report.category === "danger" ? "bg-red-50 text-red-700 ring-red-600/20"
                              : report.category === "help" ? "bg-blue-50 text-blue-700 ring-blue-600/20"
                                : report.category === "warning" ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                                  : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            }`}
                        >
                          {report.category}
                        </span>
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">{text.area}</div>
                      <div className="font-medium text-slate-900 truncate">{report.area}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex-1 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 px-3 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/20 transition-all hover:from-blue-600 hover:to-blue-700 active:scale-95"
                        onClick={() => openReportDetails(report)}
                      >
                        {text.viewDetails}
                      </button>
                      {onEditReport && (
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600 active:scale-95"
                          onClick={() => onEditReport(report)}
                        >
                          {text.edit}
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <ReportViewModal
        isOpen={Boolean(detailsReport)}
        report={detailsReport}
        comments={comments}
        commentsLoading={commentsLoading}
        commentError={commentError}
        commentInput={commentInput}
        commentSubmitting={commentSubmitting}
        imageUrls={detailsImageUrls}
        attachmentUrl={detailsAttachmentUrl}
        onClose={closeReportDetails}
        onEditReport={onEditReport}
        onCommentInputChange={setCommentInput}
        onSubmitComment={submitComment}
        formatDate={formatDate}
      />

      {/* Global CSS for Hardware Accelerated Smooth Animations & Map Tweaks */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .cityzen-report-marker {
          will-change: transform;
          position: relative;
          width: 56px;
          height: 68px;
          display: flex;
          justify-content: center;
          pointer-events: none;
        }
        .cityzen-report-marker__pulse {
          position: absolute;
          top: 10px;
          width: 36px;
          height: 36px;
          border-radius: 100%;
          border: 2px solid var(--marker-color);
          opacity: 0;
          /* Faster, snappier pulse curve */
          animation: marker-pulse 1.4s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        .cityzen-report-marker__pulse--delay {
          animation-delay: 0.7s;
        }
        .cityzen-report-marker__pin {
          width: 38px;
          height: 38px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: var(--marker-color);
          border: 2.5px solid #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cityzen-current-location-marker {
          position: relative;
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
        }
        .cityzen-current-location-marker__pulse {
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.22);
          animation: current-location-pulse 1.6s ease-out infinite;
        }
        .cityzen-current-location-marker__dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #2563eb;
          border: 2px solid #ffffff;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.25);
          z-index: 2;
        }
        @keyframes marker-pulse {
          0% { transform: scale(0.6); opacity: 0; }
          20% { opacity: 0.7; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes current-location-pulse {
          0% { transform: scale(0.45); opacity: 0.85; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        /* Fixes for Leaflet UI smoothness */
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-tip-container { display: none !important; }
        .leaflet-zoom-animated { transition-timing-function: cubic-bezier(0.2, 0, 0, 1) !important; }
      `}} />
    </>
  );
}