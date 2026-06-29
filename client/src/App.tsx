import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import EventDetail from "./pages/EventDetail";
import RideDetail from "./pages/RideDetail";
import AdminEvents from "./pages/AdminEvents";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/events/:id"} component={EventDetail} />
      <Route path={"/rides/:id"} component={RideDetail} />
      <Route path={"/admin/events"} component={AdminEvents} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <I18nProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
