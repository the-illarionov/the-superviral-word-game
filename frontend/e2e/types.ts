/// <reference types="../../.common/types" />

export type MachineUserFlowEvent =
  { type: 'Clicks "Start game"' } |
  { type: 'Goes to unexisting id' } |
  { type: 'Close critical error modal' } |
  { type: 'Goes to lobby with timeout' } |
  { type: 'Goes to game from menu' } |
  { type: 'Tries to join with invalid locale' } |
  { type: 'Reconnection' } |
  { type: 'Host created game' } |
  { type: 'Sent invite to guest' } |
  { type: 'Both players ready' } |
  { type: 'Host goes to menu' } |
  { type: 'Host closes window' } |
  { type: 'Guest goes to menu' } |
  { type: 'Guest closes window' } |
  { type: 'Host wins' } |
  { type: 'Rematch, guest wins' } |
  { type: 'Host presses Home' } |
  { type: 'Unsupported' } |
  { type: 'Clicks to "Scores"' } |
  { type: 'Clicks to "Scores" with scores' }
