import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import RoomLobby from "./pages/RoomLobby";
import BombNumberGame from "./pages/BombNumberGame";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/room/:roomId" element={<RoomLobby />} />
            <Route path="/room/:roomId/:gameId" element={<BombNumberGame />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </>
  );
}

export default App;
