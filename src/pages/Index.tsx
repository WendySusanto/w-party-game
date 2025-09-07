import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gamepad2, Users, Zap } from "lucide-react";
import gamingHero from "@/assets/bomb.png";
import { GameService } from "@/lib/gameService";

const Index = () => {
  const [playerName, setPlayerName] = useState("");
  const [partyCode, setPartyCode] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    console.log("Creating room for:", playerName);

    // Call the GameService to create a room
    GameService.createRoom(playerName)
      .then((room) => {
        console.log("Room created:", room);
        navigate(`/room/${room.id}`);
      })
      .catch((error) => {
        console.error("Error creating room:", error);
      });
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !partyCode.trim()) return;

    GameService.joinRoom(partyCode, playerName)
      .then((roomId) => {
        console.log("Joined room as player:", playerName);
        navigate(`/room/${roomId}`);
      })
      .catch((error) => {
        console.error("Error joining room:", error);
      });

    console.log("Joining room:", partyCode, "as:", playerName);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-10"></div>
        <div className="container mx-auto px-4 py-16 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 animate-slide-up">
                <h1 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  W-Party Game
                </h1>
                <p className="text-xl text-muted-foreground mb-8 max-w-lg">
                  Quick multiplayer minigames for you and your friends. No
                  accounts needed - just jump in and play!
                </p>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  <div className="flex items-center gap-2 text-accent">
                    <Users className="w-5 h-5" />
                    <span className="text-sm">Multiplayer Fun</span>
                  </div>
                  <div className="flex items-center gap-2 text-accent">
                    <Zap className="w-5 h-5" />
                    <span className="text-sm">Instant Play</span>
                  </div>
                  <div className="flex items-center gap-2 text-accent">
                    <Gamepad2 className="w-5 h-5" />
                    <span className="text-sm">No Downloads</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 animate-fade-in">
                <img
                  src={gamingHero}
                  alt="Gaming controller with neon effects"
                  className="w-full max-w-md mx-auto rounded-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Actions */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Get Started</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Create Room Card */}
            <Card className="animate-slide-up">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Create a Room</CardTitle>
                <CardDescription>
                  Start a new game room and invite friends to join
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Your Name</Label>
                  <Input
                    id="create-name"
                    placeholder="Enter your display name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </div>
                <Button
                  variant="gaming"
                  className="w-full h-12"
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim()}
                >
                  Create Room
                </Button>
              </CardContent>
            </Card>

            {/* Join Room Card */}
            <Card className="animate-slide-up">
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-accent flex items-center justify-center">
                  <Gamepad2 className="w-8 h-8 text-accent-foreground" />
                </div>
                <CardTitle className="text-2xl">Join a Room</CardTitle>
                <CardDescription>
                  Use a party code to join an existing room
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="join-name">Your Name</Label>
                  <Input
                    id="join-name"
                    placeholder="Enter your display name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="party-code">Party Code</Label>
                  <Input
                    id="party-code"
                    placeholder="Enter party code"
                    value={partyCode}
                    onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
                    maxLength={4}
                  />
                </div>
                <Button
                  variant="accent"
                  className="w-full h-12"
                  onClick={handleJoinRoom}
                  disabled={!playerName.trim() || !partyCode.trim()}
                >
                  Join Room
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Featured Games */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Featured Games
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center animate-fade-in">
              <CardHeader>
                <div className="w-12 h-12 mx-auto mb-4 rounded-full gradient-danger flex items-center justify-center">
                  <Zap className="w-6 h-6 text-destructive-foreground" />
                </div>
                <CardTitle>Bomb Number</CardTitle>
                <CardDescription>
                  Avoid the hidden bomb number in this tense guessing game
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center animate-fade-in opacity-60">
              <CardHeader>
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <CardTitle className="text-muted-foreground">
                  Coming Soon
                </CardTitle>
                <CardDescription>
                  More exciting games in development
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center animate-fade-in opacity-60">
              <CardHeader>
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-2xl">🎲</span>
                </div>
                <CardTitle className="text-muted-foreground">
                  Coming Soon
                </CardTitle>
                <CardDescription>
                  Even more w-party games on the way
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
