import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Callback } from "./pages/Callback";
import { Home } from "./pages/Home";
import { Landing } from "./pages/Landing";
import { TrackPage } from "./pages/TrackPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/home" element={<Home />} />
        <Route path="/track/:trackId" element={<TrackPage />} />
      </Routes>
    </BrowserRouter>
  );
}
