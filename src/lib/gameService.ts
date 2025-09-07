import { supabase, Game, Room, Player } from "./supabaseClient";

export class GameService {
  //game
  static async listGames(): Promise<Game[]> {
    const { data, error } = await supabase.from("games").select("*");
    if (error) throw error;
    return data;
  }

  //players
  static async listPlayers(roomId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId);
    if (error) throw error;
    return data;
  }

  //room
  static async getRoom(roomId: string): Promise<Room | null> {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();
    if (error) throw error;
    return data;
  }

  static async createRoom(playerName: string): Promise<Room> {
    const { data: room, error: createRoomError } = await supabase
      .from("rooms")
      .insert({})
      .select()
      .single();
    if (createRoomError) throw createRoomError;

    const { data: player, error: createPlayerError } = await supabase
      .from("players")
      .insert([{ room_id: room.id, name: playerName, is_host: true }])
      .select()
      .single();

    if (createPlayerError) throw createPlayerError;

    sessionStorage.setItem("playerId", player.id);

    return room;
  }

  static async joinRoom(roomCode: string, playerName: string): Promise<string> {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", roomCode)
      .single();
    if (roomError) throw roomError;

    const { data: playerData, error } = await supabase
      .from("players")
      .insert([{ room_id: room.id, name: playerName, is_host: false }])
      .select()
      .single();
    if (error) throw error;

    sessionStorage.setItem("playerId", playerData.id);

    return room.id;
  }

  static async leaveRoom(roomId: string, playerId: string): Promise<string> {
    // Verify room exists
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .single();
    if (roomError) throw roomError;

    // Get current player to check if they're the host
    const { data: currentPlayer, error: playerError } = await supabase
      .from("players")
      .select("is_host")
      .eq("id", playerId)
      .eq("room_id", roomId)
      .single();
    if (playerError) throw playerError;

    // If the leaving player is the host, transfer host to another player
    if (currentPlayer.is_host) {
      // Get the next available player (excluding the current host)
      const { data: nextHost, error: nextHostError } = await supabase
        .from("players")
        .select("id")
        .eq("room_id", roomId)
        .neq("id", playerId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextHostError) throw nextHostError;

      // If there's another player, make them host
      if (nextHost) {
        const { error: updateHostError } = await supabase
          .from("players")
          .update({ is_host: true })
          .eq("id", nextHost.id);

        if (updateHostError) throw updateHostError;
      }
    }

    // Remove the player from the room
    const { error: deleteError } = await supabase
      .from("players")
      .delete()
      .eq("id", playerId);
    if (deleteError) throw deleteError;

    // Clear session storage
    sessionStorage.removeItem("playerId");

    return room.id;
  }

  static async updateRoomGame(roomId: string, gameId: string): Promise<string> {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .single();
    if (roomError) throw roomError;

    const { error } = await supabase
      .from("rooms")
      .update({ game_id: gameId })
      .eq("id", roomId);
    if (error) throw error;

    return room.id;
  }

  // Update room state (for game data)
  static async updateRoomState(roomId: string, state: any): Promise<void> {
    const { error } = await supabase
      .from("rooms")
      .update({ state })
      .eq("id", roomId);
    if (error) throw error;
  }

  // Update room status (for game data)
  static async updateRoomStatus(roomId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from("rooms")
      .update({ status: status })
      .eq("id", roomId);
    if (error) throw error;
  }

  // Update player turn status
  static async updatePlayerTurn(
    playerId: string,
    isTurn: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from("players")
      .update({ is_turn: isTurn })
      .eq("id", playerId);
    if (error) throw error;
  }

  // Set all players' turn status based on current player index
  static async setPlayerTurns(
    roomId: string,
    currentPlayerIndex: number
  ): Promise<void> {
    // Get all players in the room
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (playersError) throw playersError;

    // Update all players' turn status
    for (let i = 0; i < players.length; i++) {
      await this.updatePlayerTurn(players[i].id, i === currentPlayerIndex);
    }
  }

  //subscriptions
  static subscribeToRoom(roomId: string, callback: (room: Room) => void) {
    console.log("Subscribing to room:", roomId);
    return supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => callback(payload.new as Room)
      )
      .subscribe();
  }

  static subscribeToPlayers(
    roomId: string,
    callback: (players: Player[]) => void
  ) {
    console.log("Subscribing to players in room:", roomId);

    const refetchPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId);
      callback(data || []);
    };

    return supabase
      .channel(`players-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        refetchPlayers
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        refetchPlayers
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "players",
        },
        refetchPlayers
      )
      .subscribe();
  }
}
