import { randomBytes } from 'node:crypto'
import { handleErrors } from './handleErrors'

interface Env {
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
}

export class Signaller {
  db: Db
  env: Env
  state: DurableObjectState
  last_cleaning: number

  constructor(state: any, env: Env) {
    this.db = new Db()
    this.env = env
    this.state = state

    this.last_cleaning = Date.now()
  }

  async fetch(request: Request) {
    const alarm = await this.state.storage.getAlarm()
    if (!alarm)
      this.state.storage.setAlarm(Date.now() + 7500)

    return await handleErrors(request, async () => {
      const webSocketPair = new WebSocketPair()
      const [client, socket] = Object.values(webSocketPair)

      socket.accept()
      socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data as string) as WebSocketMessage

        switch (message.type) {
          //
          //
          // HOST AND GUEST
          case 'PLAYER_SENT_HANDSHAKE': {
            let playerId = message.playerId

            if (!playerId)
              playerId = generateId(this.db)

            let sessionId = message.sessionId
            let enemySessionId: string | undefined

            if (sessionId) {
              const existingPlayer = getPlayer(sessionId, this.db, socket)
              if (!existingPlayer) {
                socketSend({
                  type: 'ERROR',
                  errorType: 'SOCKET_ERROR',
                }, socket)
                return
              }

              if (existingPlayer.enemySessionId) {
                enemySessionId = existingPlayer.enemySessionId

                if (!getPlayer(enemySessionId, this.db, socket)) {
                  socketSend({
                    type: 'ERROR',
                    errorType: 'SOCKET_ERROR',
                  }, socket)
                  return
                }
              }
            }
            else {
              sessionId = generateId(this.db)
            }

            console.log('PLAYER_SENT_HANDSHAKE', sessionId, this.db.data[sessionId], Object.keys(this.db.data))

            socket.userData = {
              sessionId,
            }

            this.db.insert({
              sessionId,
              socket,
              candidates: [],
              enemySessionId,
              sdp: undefined,
              last_visit: Date.now(),
            })

            // ICE SERVERS
            let iceServers: RTCIceServer[] = [
              {
                urls: 'stun:stun.l.google.com:19302',
              },
            ]

            const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.env.TWILIO_ACCOUNT_SID}/Tokens.json`

            const token = btoa(`${this.env.TWILIO_ACCOUNT_SID}:${this.env.TWILIO_AUTH_TOKEN}`)

            fetch(endpoint, {
              method: 'POST',
              headers: {
                Authorization: `Basic ${token}`,
              },
            }).then(r => r.json()).then((result: any) => {
              iceServers = result.ice_servers
            }).finally(() => {
              socketSend({
                type: 'SERVER_ANSWERED_HANDSHAKE',
                sessionId,
                iceServers,
                enemySessionId,
                playerId,
              }, socket)
            })

            break
          }

          case 'PLAYER_GENERATED_ICE_CANDIDATE': {
            const { sessionId, candidate } = message

            const player = getPlayer(sessionId, this.db, socket)
            if (!player)
              return

            player.candidates.push(candidate!)

            const enemy = this.db.find(player.enemySessionId!)
            if (enemy) {
              socketSend(
                {
                  type: 'SERVER_SENT_ENEMY_ICE_CANDIDATE',
                  candidate,
                },
                enemy.socket!,
              )
            }
            break
          }

          case 'CLOSE':
            socket.close()
            break

            //
            //
            // HOST
          case 'HOST_SENT_OFFER': {
            const { sessionId, offer } = message

            const player = getPlayer(sessionId, this.db, socket)
            if (!player)
              return

            const guest = getPlayer(player.enemySessionId, this.db, socket)
            if (!guest)
              return

            player.sdp = offer

            socketSend({
              type: 'SERVER_SENT_HOST_TO_GUEST',
              sdp: player.sdp,
              iceCandidates: player.candidates,
            }, guest.socket!)

            console.log('HOST_SENT_OFFER', sessionId, this.db.find(sessionId))

            break
          }

          //
          //
          // GUEST
          case 'GUEST_CHECKS_IF_GAME_EXISTS': {
            const host = getPlayer(message.hostSessionId, this.db, socket)

            if (host) {
              if (host.enemySessionId && host.enemySessionId !== message.guestSessionId) {
                socketSend(
                  {
                    type: 'ERROR',
                    errorType: 'ALREADY_BUSY',
                  },
                  socket,
                )
              }
              else {
                socketSend({
                  type: 'SERVER_CONFIRMED_GAME_EXISTS',
                  offer: host.sdp,
                  iceCandidates: host.candidates,
                }, socket)
              }
            }
            else {
              socketSend({
                type: 'SERVER_DID_NOT_CONFIRM_GAME_EXISTS',
              }, socket)
            }

            break
          }

          case 'GUEST_REQUESTS_TO_JOIN': {
            const host = getPlayer(message.hostSessionId, this.db, socket)
            const guest = getPlayer(message.guestSessionId, this.db, socket)

            console.log('GUEST_REQUESTS_TO_JOIN before')

            if (!guest || !host || !host.socket)
              return

            guest.enemySessionId = message.hostSessionId
            host.enemySessionId = message.guestSessionId

            console.log('GUEST_REQUESTS_TO_JOIN after')

            socketSend({
              type: 'SERVER_SENT_GUEST_REQUESTS_TO_JOIN',
              guestSessionId: guest.sessionId,
            }, host.socket)

            break
          }

          case 'GUEST_SENT_ANSWER': {
            const { hostSessionId, answer, sessionId } = message

            const host = this.db.find(hostSessionId)
            const guest = this.db.find(sessionId)

            if (!host || !host.socket || !guest) {
              socketSend(
                {
                  type: 'ERROR',
                  errorType: 'PLAYER_NOT_FOUND_IN_DB',
                },
                socket,
              )
              return
            }

            guest.sdp = answer

            console.log('GUEST_SENT_ANSWER', host, guest)

            socketSend(
              {
                type: 'SERVER_SENT_GUEST_TO_HOST',
                sdp: answer,
                iceCandidates: guest.candidates,
              },
              host.socket,
            )

            break
          }
        }
      })

      socket.addEventListener('close', () => {
        console.log('close', socket.userData?.sessionId, this.db.data[socket.userData?.sessionId], Object.keys(this.db.data))
      })

      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    })
  }

  async alarm() {
    // This hack of keeping DO instance alive results in additional 345600 requests per month, which is not a big deal with 10 million Cloudflare free requests.
    // I think having a consistent single instance worths it
    const now = Date.now()

    await this.state.storage.setAlarm(now + 7500)

    const millisecondsFromLastClean = now - this.last_cleaning
    const cleanTimeout = 60 * 60 * 1000

    if (millisecondsFromLastClean > cleanTimeout) {
      for (const sessionId in this.db.data) {
        const player = this.db.data[sessionId]

        if (now - player.last_visit > cleanTimeout)
          delete this.db.data[sessionId]
      }
      this.last_cleaning = now
    }
  }
}

class Db {
  data: {
    [id: string]: PlayerConnectionInfo
  } = {}

  insert(player: PlayerConnectionInfo) {
    this.data[player.sessionId] = player
  }

  find(id: string): PlayerConnectionInfo | undefined {
    return this.data[id] ?? undefined
  }

  delete(id: string) {
    if (this.data[id])
      delete this.data[id]
  }

  clear() {
    this.data = {}
  }
}

function socketSend(message: WebSocketMessage, socket: WebSocket) {
  socket.send(JSON.stringify(message))
}

function getPlayer(sessionId: string | null | undefined, db: Db, socket: WebSocket) {
  if (!sessionId)
    return false

  const player = db.find(sessionId)
  if (!player) {
    socketSend(
      {
        type: 'ERROR',
        errorType: 'PLAYER_NOT_FOUND_IN_DB',
      },
      socket,
    )
    return false
  }
  else {
    return player
  }
}

function generateId(db: Db) {
  const sessionId = randomBytes(6).toString('base64url')

  if (db.find(sessionId))
    generateId(db)

  return sessionId
}
