import React, { useState, useEffect, useRef } from "react";
import { APIProvider, Map, useMap, useMapsLibrary, useApiLoadingStatus, APILoadingStatus } from "@vis.gl/react-google-maps";
import { Navigation, Route, Compass, Info, Loader2, Footprints, Car, Train, TreePine, ShieldCheck, HelpCircle } from "lucide-react";
import { RouteSuggestion } from "../types";

// Dynamic API Key Loading
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

interface EcoRouteProps {
  onAddLog: (log: any) => void;
  userId: string;
}

interface EcoRoutePlannerProps extends EcoRouteProps {
  mapAuthFailed: boolean;
}

export default function EcoRoute({ onAddLog, userId }: EcoRouteProps) {
  const [mapAuthFailed, setMapAuthFailed] = useState(false);

  useEffect(() => {
    // Capture global Google Maps auth/activation failures
    const originalAuthFailure = (window as any).gm_authFailure;
    const handleFailover = () => {
      console.warn("Custom gmaps_failover_triggered event received. Activating interactive Canvas Sandbox fallbacks...");
      setMapAuthFailed(true);
    };

    (window as any).gm_authFailure = () => {
      console.warn("Google Maps Auth/Activation Failure detected. Activating interactive Canvas Sandbox fallbacks...");
      setMapAuthFailed(true);
      if (originalAuthFailure) {
        try {
          originalAuthFailure();
        } catch (e) {}
      }
    };

    window.addEventListener("gmaps_failover_triggered", handleFailover);

    return () => {
      (window as any).gm_authFailure = originalAuthFailure;
      window.removeEventListener("gmaps_failover_triggered", handleFailover);
    };
  }, []);

  if (!hasValidKey) {
    return (
      <div id="maps_secret_splash" className="bg-bg-card border border-border-brand rounded-[32px] p-8 shadow-sm flex items-center justify-center min-h-[450px] theme-transition">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-brand-secondary rounded-full flex items-center justify-center text-brand-primary mx-auto">
            <Info className="w-8 h-8 font-extrabold" />
          </div>
          <h3 className="text-lg font-bold text-text-primary">
            Google Maps API Key Required
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            CarbonPilot AI harnesses the Google Maps Platform for advanced Eco-Routing direction analytics. Follow these steps to connect your developer seat:
          </p>
          <div className="bg-brand-bg p-4 rounded-2xl text-left text-xs text-text-primary space-y-2 border border-border-brand">
            <p><strong>Step 1:</strong> Get an API key from Google Cloud Console.</p>
            <p><strong>Step 2:</strong> Open <strong>Settings</strong> (⚙️ gear icon, top-right) inside AI Studio.</p>
            <p><strong>Step 3:</strong> Save a new <strong>Secret</strong> named <code>GOOGLE_MAPS_PLATFORM_KEY</code> paste your key, and save.</p>
          </div>
          <p className="text-2xs text-text-secondary/80 font-mono">
            The workspace will automatically re-compile soon after saving.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <EcoRoutePlanner onAddLog={onAddLog} userId={userId} mapAuthFailed={mapAuthFailed} />
    </APIProvider>
  );
}

const getSimulatedResultForMode = (origin: string, destination: string, mode: "DRIVING" | "TRANSIT" | "BICYCLING"): google.maps.DirectionsResult | null => {
  const mapsObj = (window as any).google?.maps;
  if (!mapsObj) return null;

  try {
    let distanceValue = 18500;
    let durationValue = 1500;
    let startLat = 37.7954;
    let startLng = -122.3936;
    let endLat = 37.4275;
    let endLng = -122.1697;

    if (mode === "TRANSIT") {
      distanceValue = 19100;
      durationValue = 2200;
    } else if (mode === "BICYCLING") {
      distanceValue = 21000;
      durationValue = 3800;
    }

    const startLoc = new mapsObj.LatLng(startLat, startLng);
    const endLoc = new mapsObj.LatLng(endLat, endLng);

    const points = [];
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      const curve = Math.sin(fraction * Math.PI) * 0.04;
      const lat = startLat + (endLat - startLat) * fraction + curve;
      const lng = startLng + (endLng - startLng) * fraction - curve;
      points.push(new mapsObj.LatLng(lat, lng));
    }

    return {
      routes: [
        {
          bounds: new mapsObj.LatLngBounds(startLoc, endLoc),
          copyrights: "Simulated Eco-Routing Engine",
          legs: [
            {
              distance: { text: `${(distanceValue / 1000).toFixed(1)} km`, value: distanceValue },
              duration: { text: `${Math.round(durationValue / 60)} mins`, value: durationValue },
              end_address: destination,
              end_location: endLoc,
              start_address: origin,
              start_location: startLoc,
              steps: [],
              via_waypoints: []
            }
          ],
          overview_path: points,
          overview_polyline: "",
          warnings: [],
          waypoint_order: []
        }
      ]
    } as unknown as google.maps.DirectionsResult;
  } catch (err) {
    console.error("Simulation generation error:", err);
    return null;
  }
};

// Internal map controller and router formulation
function EcoRoutePlanner({ onAddLog, userId, mapAuthFailed }: EcoRoutePlannerProps) {
  const [origin, setOrigin] = useState("San Francisco Ferry Building");
  const [destination, setDestination] = useState("Stanford University, Stanford, CA");
  const [computing, setComputing] = useState(false);
  const [suggestions, setSuggestions] = useState<RouteSuggestion[]>([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [cachedResults, setCachedResults] = useState<{ [key: number]: google.maps.DirectionsResult }>({});
  const [routeError, setRouteError] = useState<string | null>(null);

  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const apiStatus = useApiLoadingStatus();

  const isFailed =
    apiStatus === APILoadingStatus.FAILED ||
    apiStatus === APILoadingStatus.AUTH_FAILURE ||
    mapAuthFailed;

  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Setup/cleanup DirectionsRenderer
  useEffect(() => {
    if (!routesLib || !map) return;
    const renderer = new routesLib.DirectionsRenderer({
      map: map,
      suppressMarkers: false,
    });
    directionsRendererRef.current = renderer;
    return () => {
      renderer.setMap(null);
    };
  }, [routesLib, map]);

  // Calculate carbon of a route based on transit mode and distance
  const matchEmissions = (distanceM_: number, mode: "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT"): number => {
    const km = distanceM_ / 1000;
    if (mode === "DRIVING") return Number((km * 0.18).toFixed(1)); // 180g of CO2e per km
    if (mode === "TRANSIT") return Number((km * 0.05).toFixed(1)); // 50g of CO2e per km
    return 0.0; // zero emissions!
  };

  const handleComputeRoutes = async () => {
    if (!origin || !destination) return;
    setComputing(true);
    setRouteError(null);

    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] });
    }

    const travelModes: ("DRIVING" | "TRANSIT" | "BICYCLING")[] = ["DRIVING", "TRANSIT", "BICYCLING"];
    const routeResults: RouteSuggestion[] = [];
    const newCached: { [key: number]: google.maps.DirectionsResult } = {};
    let hasRealRoutesSucceeded = false;

    if (routesLib) {
      const ds = new routesLib.DirectionsService();
      let lastErrorStatus = "";

      for (const mode of travelModes) {
        try {
          const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
            ds.route(
              {
                origin,
                destination,
                travelMode: mode as google.maps.TravelMode,
              },
              (res, status) => {
                if (status === "OK" && res) {
                  resolve(res);
                } else {
                  lastErrorStatus = status || "ERROR";
                  reject(new Error(`Directions status not OK: ${status}`));
                }
              }
            );
          });

          if (result.routes && result.routes[0]) {
            const first = result.routes[0];
            const leg = first.legs[0];
            const distanceMeters = leg?.distance?.value || 0;
            const durationSeconds = leg?.duration?.value || 0;

            const distanceKm = distanceMeters / 1000;
            const durationMin = durationSeconds / 60;
            const co2eKg = matchEmissions(distanceMeters, mode);

            const idx = routeResults.push({
              name: mode === "DRIVING" ? "Standard Driving Route" : mode === "TRANSIT" ? "Subway/Bus Transit Plan" : "Lush Bicycle Track",
              distanceKm: Number(distanceKm.toFixed(1)),
              durationMin: Number(durationMin.toFixed(0)),
              co2eKg,
              isEcoFriendly: mode !== "DRIVING",
              transitType: mode,
            }) - 1;

            newCached[idx] = result;
            hasRealRoutesSucceeded = true;
          }
        } catch (e) {
          console.warn(`Real route query for ${mode} failed:`, e);
        }
      }

      if (!hasRealRoutesSucceeded) {
        if (lastErrorStatus === "REQUEST_DENIED") {
          setRouteError(
            "The Google Maps API Key is active, but the Directions API product might not be activated on it. Activate it in your Google Cloud Dashboard, or enjoy the Sandbox simulation below!"
          );
        } else if (lastErrorStatus) {
          setRouteError(`Google Maps API status: ${lastErrorStatus}. Reverted to simulated Sandbox routing.`);
        }
      }
    }

    // Interactive fallback construct when live Directions service is not active
    if (!hasRealRoutesSucceeded) {
      if (!routeError) {
        setRouteError("Simulated Sandbox Mode loaded to evaluate emissions and test navigation overlays.");
      }
      for (const mode of travelModes) {
        const simRes = getSimulatedResultForMode(origin, destination, mode);
        if (simRes && simRes.routes && simRes.routes[0]) {
          const first = simRes.routes[0];
          const leg = first.legs[0];
          const distanceMeters = leg?.distance?.value || 0;
          const durationSeconds = leg?.duration?.value || 0;

          const distanceKm = distanceMeters / 1000;
          const durationMin = durationSeconds / 60;
          const co2eKg = matchEmissions(distanceMeters, mode);

          const idx = routeResults.push({
            name: mode === "DRIVING" ? "Standard Driving Route (Simulated)" : mode === "TRANSIT" ? "Subway/Bus Transit Plan (Simulated)" : "Lush Bicycle Track (Simulated)",
            distanceKm: Number(distanceKm.toFixed(1)),
            durationMin: Number(durationMin.toFixed(0)),
            co2eKg,
            isEcoFriendly: mode !== "DRIVING",
            transitType: mode,
          }) - 1;

          newCached[idx] = simRes;
        }
      }
    }

    setSuggestions(routeResults);
    setCachedResults(newCached);
    setActiveRouteIndex(0);
    setComputing(false);
  };

  // Auto-calculate on mount once API loads or triggers fallback
  const computedOnce = useRef(false);
  useEffect(() => {
    if (!computedOnce.current) {
      handleComputeRoutes();
      computedOnce.current = true;
    }
  }, [routesLib, map]);

  // Redraw route whenever active index or cached results swap
  useEffect(() => {
    if (directionsRendererRef.current && cachedResults[activeRouteIndex]) {
      const mode = suggestions[activeRouteIndex]?.transitType;
      directionsRendererRef.current.setOptions({
        polylineOptions: {
          strokeColor: mode === "DRIVING" ? "#EF4444" : "#10B981",
          strokeOpacity: 0.8,
          strokeWeight: 5,
        },
      });
      directionsRendererRef.current.setDirections(cachedResults[activeRouteIndex]);
    }
  }, [activeRouteIndex, cachedResults, suggestions]);

  return (
    <div id="eco_route_tab" className="bg-bg-card rounded-[32px] overflow-hidden shadow-sm border border-border-brand grid grid-cols-1 lg:grid-cols-12 gap-0 theme-transition">
      
      {/* Route Inputs Side Panel */}
      <div className="lg:col-span-5 p-6 border-r border-border-brand flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-brand-secondary text-brand-dark rounded-xl">
              <Route className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">
                Eco Route Planner
              </h3>
              <p className="text-xs text-text-secondary">
                Compare multi-transit paths and select standard zero-exhaust options.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-2xs uppercase tracking-wider font-semibold text-text-secondary mb-1">
                Departure (Origin)
              </label>
              <input
                id="origin_input"
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Origin location address..."
                className="w-full bg-brand-bg border border-border-brand rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-brand-primary outline-none text-text-primary"
              />
            </div>

            <div>
              <label className="block text-2xs uppercase tracking-wider font-semibold text-text-secondary mb-1">
                Arrival (Destination)
              </label>
              <input
                id="destination_input"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destination address..."
                className="w-full bg-brand-bg border border-border-brand rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-brand-primary outline-none text-text-primary"
              />
            </div>

            <button
              id="maps_compute_btn"
              onClick={handleComputeRoutes}
              disabled={computing || !origin || !destination}
              className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {computing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mapping and Calculating Emissions...
                </>
              ) : (
                <>
                  <Compass className="w-4 h-4" />
                  Analyze Eco directions
                </>
              )}
            </button>

            {routeError && (
              <div id="route_error_box" className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20 text-2xs space-y-1 leading-relaxed">
                <p className="font-semibold flex items-center gap-1 text-amber-700 dark:text-amber-300">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" /> Note on Google Maps API
                </p>
                <p>{routeError}</p>
                <a
                  href="https://console.cloud.google.com/google/maps-apis/api-list"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline hover:text-amber-700 dark:hover:text-amber-300 block mt-1"
                >
                  Enable Directions API product in console ↗
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Directions suggestions listing */}
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] pr-1">
          <span className="block text-2xs font-bold uppercase tracking-wider text-text-secondary">
            Route Carbon Comparisons
          </span>

          {suggestions.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-border-brand text-center text-xs text-text-secondary">
              Enter target addresses above to draw emissions metrics.
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveRouteIndex(idx)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all block cursor-pointer ${
                    activeRouteIndex === idx
                      ? "bg-brand-secondary/40 border-brand-primary"
                      : "bg-brand-bg hover:bg-brand-secondary/20 border-border-brand"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      {s.transitType === "DRIVING" && <Car className="w-3.5 h-3.5 text-rose-500" />}
                      {s.transitType === "TRANSIT" && <Train className="w-3.5 h-3.5 text-indigo-500" />}
                      {s.transitType === "BICYCLING" && <TreePine className="w-3.5 h-3.5 text-brand-primary" />}
                      {s.name}
                    </span>
                    <span className={`text-2xs px-2 py-0.5 rounded-full font-bold ${
                      s.isEcoFriendly ? "bg-brand-secondary text-brand-dark" : "bg-red-100 text-red-600"
                    }`}>
                      {s.co2eKg === 0 ? "Zero Footprint" : `${s.co2eKg} kg CO₂`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-2xs text-text-secondary">
                    <span>{s.distanceKm} km</span>
                    <span>•</span>
                    <span>{s.durationMin} mins duration</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Legend block saving option */}
        {suggestions.length > 0 && (
          <div className="p-3 bg-brand-bg rounded-xl border border-border-brand text-2xs text-text-secondary space-y-2">
            <span className="font-bold text-brand-primary flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Eco recommendation:
            </span>
            <span>
              By choosing the <strong>{suggestions.find(s => s.transitType !== "DRIVING")?.name || "Bicycle Path"}</strong> instead of driving, you prevent up to{" "}
              <strong>{((suggestions.find(s => s.transitType === "DRIVING")?.co2eKg || 0) - (suggestions.find(s => s.isEcoFriendly)?.co2eKg || 0)).toFixed(1)} kg</strong> of greenhouse gas exhausts.
            </span>
          </div>
        )}
      </div>

      {/* Visual Map Canvas (Dual-Mode: Live Google Map or High-Fidelity Interactive Simulated GIS Sandbox) */}
      <div className="lg:col-span-7 h-[450px] lg:h-auto min-h-[380px] relative overflow-hidden bg-brand-bg rounded-r-3xl border-l border-border-brand">
        {(!isFailed && !routeError) ? (
          <>
            <Map
              defaultCenter={{ lat: 37.42, lng: -122.08 }}
              defaultZoom={10}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
              style={{ width: "100%", height: "100%" }}
              className="rounded-r-3xl"
            />
            <div className="absolute top-3 left-3 bg-bg-card/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border-brand text-2xs font-bold shadow-md text-brand-primary flex items-center gap-1.5 theme-transition">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Live GIS Map Active
            </div>
          </>
        ) : (
          <div className="w-full h-full relative bg-brand-bg select-none p-4 flex flex-col justify-between" id="simulated_map_canvas">
            {/* Ambient Background Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
            
            {/* Interactive Vector Terrain/Coastline Simulation */}
            <svg viewBox="0 0 500 400" className="w-full h-full max-h-[380px] my-auto relative z-10">
              {/* Landmass and Bay Coastline contours */}
              <path d="M 50,0 Q 130,120 180,180 T 260,350 L 500,400 L 500,0 Z" fill="var(--bg-card)" className="opacity-40" />
              <path d="M 270,400 C 230,280 280,210 330,140 Q 420,80 500,50" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-brand-secondary/30" strokeDasharray="6 4" />
              
              {/* Regional Bridges and Caltrain Linkages */}
              <line x1="220" y1="210" x2="330" y2="190" stroke="currentColor" strokeWidth="1.5" className="text-text-secondary/25" strokeDasharray="3 3" />
              <text x="270" y="185" className="text-[7px] fill-text-secondary/50 font-sans tracking-wide text-center">San Mateo Bridge</text>
              
              {/* Plot Inactive Static Route Traces as subtle guides */}
              <path d="M 150 60 C 200 120, 250 180, 300 240 S 320 300, 350 320" fill="none" stroke="#EF4444" strokeWidth="2" className="opacity-20" />
              <path d="M 150 60 L 180 110 L 220 170 L 270 230 L 310 280 L 350 320" fill="none" stroke="#3B82F6" strokeWidth="2" className="opacity-20" />
              <path d="M 150 60 C 110 90, 130 160, 170 210 S 260 270, 350 320" fill="none" stroke="#10B981" strokeWidth="2" className="opacity-20" />

              {/* Dynamic Highlighted Selected Route Path */}
              <path
                id="active_sim_trail"
                d={
                  suggestions[activeRouteIndex]?.transitType === "TRANSIT"
                    ? "M 150 60 L 180 110 L 220 170 L 270 230 L 310 280 L 350 320"
                    : suggestions[activeRouteIndex]?.transitType === "BICYCLING"
                    ? "M 150 60 C 110 90, 130 160, 170 210 S 260 270, 350 320"
                    : "M 150 60 C 200 120, 250 180, 300 240 S 320 300, 350 320"
                }
                fill="none"
                stroke={
                  suggestions[activeRouteIndex]?.transitType === "TRANSIT"
                    ? "#3B82F6"
                    : suggestions[activeRouteIndex]?.transitType === "BICYCLING"
                    ? "#10B981"
                    : "#EF4444"
                }
                strokeWidth="4"
                strokeLinecap="round"
                className="transition-all duration-300"
              />

              {/* Glowing Pulse Path Companion for Animation Feedback */}
              <path
                d={
                  suggestions[activeRouteIndex]?.transitType === "TRANSIT"
                    ? "M 150 60 L 180 110 L 220 170 L 270 230 L 310 280 L 350 320"
                    : suggestions[activeRouteIndex]?.transitType === "BICYCLING"
                    ? "M 150 60 C 110 90, 130 160, 170 210 S 260 270, 350 320"
                    : "M 150 60 C 200 120, 250 180, 300 240 S 320 300, 350 320"
                }
                fill="none"
                stroke={
                  suggestions[activeRouteIndex]?.transitType === "TRANSIT"
                    ? "#3B82F6"
                    : suggestions[activeRouteIndex]?.transitType === "BICYCLING"
                    ? "#10B981"
                    : "#EF4444"
                }
                strokeWidth="8"
                strokeLinecap="round"
                className="opacity-20 blur-sm"
              />

              {/* Key Terminal Waypoints */}
              {/* Origin node SF */}
              <circle cx="150" cy="60" r="6" fill="var(--bg-card)" stroke="#EF4444" strokeWidth="3" className="animate-pulse" />
              <text x="135" y="48" className="text-[8px] font-bold fill-text-primary">Bay Terminal (SF)</text>

              {/* Intermediate points labels */}
              <circle cx="220" cy="170" r="3" className="fill-text-secondary/40" />
              <text x="230" y="173" className="text-[6px] fill-text-secondary/60 font-mono">San Mateo</text>

              <circle cx="270" cy="230" r="3" className="fill-text-secondary/40" />
              <text x="280" y="233" className="text-[6px] fill-text-secondary/60 font-mono">Palo Alto Node</text>

              {/* Destination node Stanford */}
              <circle cx="350" cy="320" r="6" fill="var(--bg-card)" stroke="#10B981" strokeWidth="3" />
              <text x="360" y="325" className="text-[8px] font-bold fill-text-primary">Stanford Center</text>

              {/* Real-time Animated Transit Vehicle flowing along active path */}
              <g>
                <circle r="7" fill={
                  suggestions[activeRouteIndex]?.transitType === "TRANSIT"
                    ? "#3B82F6"
                    : suggestions[activeRouteIndex]?.transitType === "BICYCLING"
                    ? "#10B981"
                    : "#EF4444"
                } className="shadow-lg filter drop-shadow-md" />
                <circle r="12" fill="none" stroke={
                  suggestions[activeRouteIndex]?.transitType === "TRANSIT"
                    ? "#3B82F6"
                    : suggestions[activeRouteIndex]?.transitType === "BICYCLING"
                    ? "#10B981"
                    : "#EF4444"
                } strokeWidth="1.5" className="animate-ping opacity-60" style={{ animationDuration: "2.5s" }} />
                
                <animateMotion
                  dur="7s"
                  repeatCount="indefinite"
                  rotate="auto"
                  path={
                    suggestions[activeRouteIndex]?.transitType === "TRANSIT"
                      ? "M 150 60 L 180 110 L 220 170 L 270 230 L 310 280 L 350 320"
                      : suggestions[activeRouteIndex]?.transitType === "BICYCLING"
                      ? "M 150 60 C 110 90, 130 160, 170 210 S 260 270, 350 320"
                      : "M 150 60 C 200 120, 250 180, 300 240 S 320 300, 350 320"
                  }
                />
              </g>
            </svg>

            {/* Simulated Map Header Indicator */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
              <div className="bg-bg-card/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border-brand text-2xs font-bold shadow-md text-amber-600 dark:text-amber-400 flex items-center gap-1.5 theme-transition">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Interactive Sandbox Mode Active
              </div>
              <div className="bg-bg-card/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border-brand text-3xs font-mono text-text-secondary shadow-md theme-transition">
                Visual Scale: 1:15,000
              </div>
            </div>

            {/* Bottom Info HUD overlay */}
            <div className="bg-bg-card/95 backdrop-blur-md p-3 rounded-2xl border border-border-brand shadow-lg relative z-20 flex items-center justify-between theme-transition">
              <div className="space-y-0.5">
                <span className="block text-3xs uppercase tracking-wider font-extrabold text-text-secondary">Selected Route Profile</span>
                <span className="text-2xs font-bold text-text-primary">
                  {suggestions[activeRouteIndex]?.name || "Pending..."}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-3xs font-mono text-text-secondary">Emissions Impact</span>
                <span className={`text-2xs font-extrabold ${suggestions[activeRouteIndex]?.isEcoFriendly ? "text-brand-primary" : "text-rose-500"}`}>
                  {suggestions[activeRouteIndex]?.co2eKg === 0 ? "CO₂ Free Path" : `${suggestions[activeRouteIndex]?.co2eKg} kg CO₂e`}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
export { API_KEY };
