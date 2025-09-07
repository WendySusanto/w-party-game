import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Crown, Users, Gamepad2, Play, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { GameService } from "@/lib/gameService";
import { Game, Player, Room } from "@/lib/supabaseClient";
import { debug } from "console";

const RoomLobby = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [listGame, setListGame] = useState<Game[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const currentUser = sessionStorage.getItem("playerId");

  useEffect(() => {
    // Subscribe to room updates
    const roomChannel = GameService.subscribeToRoom(
      roomId || "",
      (updatedRoom) => {
        console.log("Room updated:", updatedRoom);
        setRoom(updatedRoom);
      }
    );

    // Subscribe to players joining/leaving
    const playersChannel = GameService.subscribeToPlayers(
      roomId || "",
      (updatedPlayers) => {
        console.log("Players updated:", updatedPlayers);
        setPlayers(updatedPlayers);
      }
    );

    // Cleanup when component unmounts
    return () => {
      roomChannel.unsubscribe();
      playersChannel.unsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    const playerId = sessionStorage.getItem("playerId");

    const playersInRoom = GameService.listPlayers(roomId || "").then(
      (players) => {
        if (!players.find((p) => p.id === playerId)) {
          if (!playerId || !playersInRoom) {
            navigate("/");
          }
        }
      }
    );
  }, []);

  useEffect(() => {
    GameService.listGames().then((games) => {
      console.log(games);
      setListGame(games);
    });

    GameService.listPlayers(roomId || "").then((players) => {
      setPlayers(players);
    });

    GameService.getRoom(roomId || "").then((room) => {
      setRoom(room);
    });
  }, [roomId]);

  useEffect(() => {
    console.log("Game started:", room?.status);
    if (room?.status === "in_progress") {
      navigate(`/room/${roomId}/${room?.game_id}`);
    }
  }, [room?.status]);

  useEffect(() => {
    setSelectedGame(
      room?.game_id ? listGame.find((g) => g.id === room.game_id) || null : null
    );
  }, [room]);

  const isHost = players.find(
    (p) => p.is_host && p.id === sessionStorage.getItem("playerId")
  );

  const handleGameChanges = (game: Game) => {
    GameService.updateRoomGame(roomId || "", game.id).catch((error) => {
      console.error("Error updating room game:", error);
    });
    setSelectedGame(game);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room?.code || "");
    toast("Room code copied!", {
      description: "Share this code with your friends to join the room.",
    });
  };

  const startGame = () => {
    if (!room?.game_id) {
      toast.error("Please select a game before starting.");
      return;
    }
    if (room.status === "in_progress") {
      toast.error("The game has already started.");
      return;
    }
    if (!isHost) {
      toast.error("Only the host can start the game.");
      return;
    }
    if (players.length < (selectedGame?.min_players || 2)) {
      toast.error("Not enough players to start the game.");
      return;
    }

    GameService.updateRoomStatus(roomId || "", "in_progress").catch((error) => {
      console.error("Error starting game:", error);
      toast.error("Failed to start the game. Please try again.");
    });
  };

  const leaveRoom = () => {
    GameService.leaveRoom(roomId || "", currentUser || "").then(() => {
      setRoom(null);
      navigate("/");
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={leaveRoom} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Leave Room
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Room Lobby</h1>
            <div className="flex items-center gap-2 justify-center">
              <span className="text-muted-foreground">Room Code:</span>
              <Badge
                variant="outline"
                className="text-lg px-4 py-1 cursor-pointer"
                onClick={copyRoomCode}
              >
                {room?.code || "----"}
                <Copy className="w-4 h-4 ml-2" />
              </Badge>
            </div>
          </div>
          <div className="w-24"></div> {/* Spacer for layout */}
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Players Section */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Players ({players.length})
                </CardTitle>
                <CardDescription>
                  {room?.status === "in_progress"
                    ? "Game in progress"
                    : "Waiting for players to join..."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                        {player.name[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{player.name}</span>
                    </div>
                    <div className="gap-2 flex items-center">
                      {currentUser === player.id && (
                        <Badge variant="outline">You</Badge>
                      )}
                      {player.is_host && (
                        <Badge variant="secondary" className="gap-1">
                          <Crown className="w-3 h-3" />
                          Host
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty slots */}
                {Array.from({
                  length: Math.max(
                    0,
                    (selectedGame?.max_players ?? 6) - players.length
                  ),
                }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-muted opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Users className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-muted-foreground">
                      Waiting for player...
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Game Selection */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  Select Game
                </CardTitle>
                <CardDescription>
                  Choose which game to play with your friends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {listGame.map((game, index) => (
                  <div
                    key={game.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 animate-fade-in ${
                      room?.game_id === game.id
                        ? "border-primary bg-primary/10 glow-primary"
                        : "border-muted hover:border-accent hover:bg-accent/10"
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => handleGameChanges(game)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{game.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{game.name}</h3>
                          <Badge variant="outline">
                            {game.min_players}-{game.max_players} players
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {game.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Start Game Button */}
                {isHost && (
                  <Button
                    variant="gaming"
                    className="w-full h-12 mt-6"
                    onClick={startGame}
                    disabled={!selectedGame || players.length < 2}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Game
                  </Button>
                )}

                {!isHost && (
                  <div className="text-center p-4 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">
                      Waiting for the host to start the game...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;
