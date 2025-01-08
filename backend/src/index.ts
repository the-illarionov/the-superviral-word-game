import { Signaller } from './Signaller'
import { handleErrors } from './handleErrors'

export interface Env {
  SIGNALLER: DurableObjectNamespace
  DEV: string | undefined
}

const allowedOrigins = [
  'https://the-superviral-word-game.com',
  'https://illarionov-school.ru',
]

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return await handleErrors(request, async () => {
      const origin = request.headers.get('Origin')

      if ((origin && allowedOrigins.includes(origin)) || env.DEV) {
        const upgradeHeader = request.headers.get('Upgrade')
        if (!upgradeHeader || upgradeHeader !== 'websocket')
          return new Response('Expected websocket', { status: 426 })

        const doId = env.SIGNALLER.idFromName('signaller')
        const stub = env.SIGNALLER.get(doId, { locationHint: 'eeur' })

        return await stub.fetch(request)
      }
      else {
        return new Response('Not allowed by CORS', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
          },
        })
      }
    })
  },
}

export { Signaller }
