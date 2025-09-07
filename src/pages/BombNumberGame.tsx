import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Bomb, Target, Users, Timer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { GameService } from "@/lib/gameService";
import { Player, Room } from "@/lib/supabaseClient";

interface GameState {
  minRange: number;
  maxRange: number;
  bombNumber: number;
  currentPlayerIndex: number;
  gameHistory: Array<{
    player: string;
    playerId: string;
    guess: number;
    result: string;
    timestamp: string;
  }>;
  gameOver: boolean;
  winner: string | null;
  gameStarted: boolean;
}

const BombNumberGame = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const INITIAL_STATE: GameState = {
    minRange: 1,
    maxRange: 100,
    bombNumber: Math.floor(Math.random() * 100) + 1,
    currentPlayerIndex: 0,
    gameHistory: [],
    gameOver: false,
    winner: null,
    gameStarted: false,
  };

  // Supabase state
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

  // Input state
  const [currentGuess, setCurrentGuess] = useState("");
  const [loading, setLoading] = useState(false);

  const currentPlayerId = sessionStorage.getItem("playerId");
  const currentPlayer = players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentPlayerId;

  // Initialize game data
  useEffect(() => {
    const initializeGame = async () => {
      try {
        // Load room and players
        const [roomData, playersData] = await Promise.all([
          GameService.getRoom(roomId || ""),
          GameService.listPlayers(roomId || ""),
        ]);

        setRoom(roomData);
        setPlayers(playersData);

        if (roomData?.state && Object.keys(roomData.state).length > 0) {
          setGameState(roomData.state);
        } else {
          setGameState(INITIAL_STATE);
          await updateGameState(INITIAL_STATE);

          // Set all players' turn status
          await updatePlayerTurns(playersData, 0);
        }
      } catch (error) {
        console.error("Error initializing game:", error);
        toast.error("Failed to load game data");
      }
    };

    initializeGame();
  }, [roomId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!roomId) return;

    // Subscribe to room updates (game state changes)
    const roomChannel = GameService.subscribeToRoom(roomId, (updatedRoom) => {
      setRoom(updatedRoom);
      if (updatedRoom.state) {
        setGameState(updatedRoom.state);
      }
    });

    // Subscribe to player updates
    const playersChannel = GameService.subscribeToPlayers(
      roomId,
      (updatedPlayers) => {
        setPlayers(updatedPlayers);
      }
    );

    return () => {
      roomChannel.unsubscribe();
      playersChannel.unsubscribe();
    };
  }, [roomId]);

  useEffect(() => {
    if (room?.status === "waiting") {
      navigate(`/room/${roomId}`);
    }
  }, [room?.status]);

  // Helper function to update game state in Supabase
  const updateGameState = async (newState: GameState) => {
    if (!roomId) return;

    try {
      await GameService.updateRoomState(roomId, newState);
    } catch (error) {
      console.error("Error updating game state:", error);
    }
  };

  const submitGuess = async () => {
    if (!currentPlayer || !isMyTurn || loading) return;

    const guess = parseInt(currentGuess);

    if (
      isNaN(guess) ||
      guess < gameState.minRange ||
      guess > gameState.maxRange
    ) {
      toast.error("Invalid guess", {
        description: `Please enter a number between ${gameState.minRange} and ${gameState.maxRange}`,
      });
      return;
    }

    setLoading(true);

    try {
      let result = "";
      let newGameState = { ...gameState };

      if (guess === gameState.bombNumber) {
        // Player loses - hit the bomb
        result = "💥 BOMB!";
        newGameState.gameOver = true;

        // Find winner (anyone except current player)
        const otherPlayers = players.filter(
          (_, i) => i !== gameState.currentPlayerIndex
        );
        newGameState.winner =
          otherPlayers.map((player) => player.name).join(", ") || "Others";

        toast.error("BOOM!", {
          description: `${currentPlayer.name} hit the bomb number ${gameState.bombNumber}!`,
        });
      } else if (guess < gameState.bombNumber) {
        // Increase minimum range
        newGameState.minRange = guess + 1;
        result = `New range: ${guess + 1}-${gameState.maxRange}`;
      } else {
        // Decrease maximum range
        newGameState.maxRange = guess - 1;
        result = `New range: ${gameState.minRange}-${guess - 1}`;
      }

      // Add to history
      const historyEntry = {
        player: currentPlayer.name,
        playerId: currentPlayer.id,
        guess,
        result,
        timestamp: new Date().toISOString(),
      };
      newGameState.gameHistory = [...gameState.gameHistory, historyEntry];

      // Next player's turn (if game not over)
      if (!newGameState.gameOver) {
        newGameState.currentPlayerIndex =
          (gameState.currentPlayerIndex + 1) % players.length;
        await updatePlayerTurns(players, newGameState.currentPlayerIndex);
      }

      // Update game state
      setGameState(newGameState);
      await updateGameState(newGameState);

      setCurrentGuess("");
    } catch (error) {
      console.error("Error submitting guess:", error);
      toast.error("Failed to submit guess");
    } finally {
      setLoading(false);
    }
  };

  const leaveGame = () => {
    updateGameState(INITIAL_STATE).catch((error) => {
      console.error("Error leaving game:", error);
      toast.error("Failed to leave the game. Please try again.");
    });

    GameService.updateRoomStatus(roomId || "", "waiting").catch((error) => {
      console.error("Error leaving game:", error);
      toast.error("Failed to leave the game. Please try again.");
    });
  };

  const playAgain = async () => {
    if (!roomId) return;

    try {
      setGameState(INITIAL_STATE);
      await updateGameState(INITIAL_STATE);
      await updatePlayerTurns(players, 0);

      toast.success("New game started!");
    } catch (error) {
      console.error("Error starting new game:", error);
      toast.error("Failed to start new game");
    }
  };

  if (!room || players.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading game...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to update player turns
  const updatePlayerTurns = async (
    playersList: Player[],
    currentIndex: number
  ) => {
    if (!roomId) return;

    try {
      // Update all players' turn status
      for (let i = 0; i < playersList.length; i++) {
        await GameService.updatePlayerTurn(
          playersList[i].id,
          i === currentIndex
        );
      }
    } catch (error) {
      console.error("Error updating player turns:", error);
    }
  };

  console.log("Current Game State:", gameState);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-items-start md:justify-between mb-8">
          <Button variant="ghost" onClick={leaveGame} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden md:inline">Back to Lobby</span>
          </Button>

          <div className="md:text-center ml-5 md:ml-0">
            <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 justify-center">
              <Bomb className="w-8 h-8 text-destructive" />
              Bomb Number
            </h1>
            <Badge variant="outline" className="text-lg px-4 py-1">
              Room: {room.code}
            </Badge>
          </div>

          <div className="md:w-24"></div>
        </div>

        {!gameState.gameOver ? (
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Game Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Current Range */}
                <Card className="animate-slide-up">
                  <CardHeader className="text-center">
                    <CardTitle className="text-4xl font-bold text-primary">
                      {gameState.minRange} - {gameState.maxRange}
                    </CardTitle>
                    <CardDescription>
                      The bomb number is hidden somewhere in this range
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress
                      value={
                        ((gameState.maxRange - gameState.minRange) / 99) * 100
                      }
                      className="h-4"
                    />
                    <p className="text-center mt-2 text-sm text-muted-foreground">
                      Range size: {gameState.maxRange - gameState.minRange + 1}{" "}
                      numbers
                    </p>
                  </CardContent>
                </Card>

                {/* Current Turn */}
                <Card className="animate-slide-up">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      {isMyTurn ? "Your Turn" : `${currentPlayer?.name}'s Turn`}
                    </CardTitle>
                    <CardDescription>
                      {isMyTurn
                        ? "Choose a number carefully - it might be the bomb!"
                        : "Waiting for the current player to make their guess..."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isMyTurn ? (
                      <div className="flex gap-4">
                        <Input
                          type="number"
                          placeholder={`Enter ${gameState.minRange}-${gameState.maxRange}`}
                          value={currentGuess}
                          onChange={(e) => setCurrentGuess(e.target.value)}
                          min={gameState.minRange}
                          max={gameState.maxRange}
                          className="text-center text-xl font-bold"
                          disabled={loading}
                        />
                        <Button
                          variant="gaming"
                          onClick={submitGuess}
                          disabled={!currentGuess}
                          className="px-8"
                        >
                          Guess
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center p-8 rounded-lg bg-muted/50">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                          {currentPlayer?.name[0].toUpperCase()}
                        </div>
                        <p className="text-lg font-medium">
                          {currentPlayer?.name} is thinking...
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Game History */}
                {gameState &&
                  gameState.gameHistory &&
                  gameState.gameHistory.length > 0 && (
                    <Card className="animate-fade-in">
                      <CardHeader>
                        <CardTitle>Game History</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                        {gameState.gameHistory
                          .slice()
                          .reverse()
                          .map((entry, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <Badge variant="outline">{entry.player}</Badge>
                                <span className="font-bold text-lg">
                                  {entry.guess}
                                </span>
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {entry.result}
                              </span>
                            </div>
                          ))}
                      </CardContent>
                    </Card>
                  )}
              </div>

              {/* Players Sidebar */}
              <div className="space-y-6">
                <Card className="animate-slide-up">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Players
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {players.map((player, index) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          index === gameState.currentPlayerIndex
                            ? "bg-primary/20 border border-primary glow-primary"
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                          {player.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{player.name}</span>
                            <div className="flex gap-1">
                              {player.id === currentPlayerId && (
                                <Badge variant="outline" className="text-xs">
                                  You
                                </Badge>
                              )}
                              {player.is_host && (
                                <Badge variant="secondary" className="text-xs">
                                  Host
                                </Badge>
                              )}
                              {index === gameState.currentPlayerIndex && (
                                <Badge variant="default" className="text-xs">
                                  <Timer className="w-3 h-3 mr-1" />
                                  Turn
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          /* Game Over Screen */
          <div className="max-w-2xl mx-auto text-center animate-slide-up">
            <Card>
              <CardHeader>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full gradient-danger flex items-center justify-center animate-bounce-subtle">
                  <Bomb className="w-10 h-10 text-destructive-foreground" />
                </div>
                <CardTitle className="text-4xl mb-4">BOOM!</CardTitle>
                <CardDescription className="text-xl">
                  The bomb number was{" "}
                  <span className="font-bold text-destructive">
                    {gameState.bombNumber}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 rounded-lg gradient-accent">
                  <h3 className="text-2xl font-bold text-accent-foreground mb-2">
                    � Winner: {gameState.winner}
                  </h3>
                  <p className="text-accent-foreground/80">
                    Congratulations on avoiding the bomb!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={leaveGame}
                    className="h-12"
                  >
                    Back to Lobby
                  </Button>
                  <Button onClick={playAgain} className="gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Play Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default BombNumberGame;
