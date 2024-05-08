export type MachineLobbyEvent =
  {
    type: 'Awake'
    myMode: PlayerModes
    locale: Locale
  } |
  {
    type: 'Sleep'
  } |
  {
    type: 'Socket connected'
  } |
  {
    type: 'Server answered handshake'
    mySessionId: string
    iceServers: RTCIceServer[]
    enemySessionId: string | undefined
    myId: string
  } |
  {
    type: 'Reconnect'
  } |
  {
    type: 'Server confirmed game exists'
    iceCandidates: RTCIceCandidate[]
    sdp?: RTCSessionDescriptionInit
  } |
  {
    type: 'Server did not confirm game exists'
  } |
  {
    type: 'Guest requested to join'
    enemySessionId: string
  } |
  {
    type: 'Host sent offer'
    iceCandidates: RTCIceCandidate[]
    sdp: RTCSessionDescriptionInit
  } |
  {
    type: 'RTCConnection established'
  } |
  { type: 'Found guest request' } |
  { type: 'Found host offer' } |
  { type: 'Enemy is ready' } |
  { type: 'I am ready' } |
  { type: 'Enemy initialized dictionary' } |
  { type: 'I initialized dictionary' } |
  { type: 'Both players ready' } |
  { type: 'I changed name', name: string } |
  { type: 'Enemy changed name', name: string } |
  { type: 'Enemy sent id', id: string }
