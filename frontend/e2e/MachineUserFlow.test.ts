import { test as base, expect } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'
import { setup } from 'xstate'
import { createTestModel } from '@xstate/test'
import { useFindPossibleWords } from '../src/composables/useFindPossibleWords'
import type { MachineUserFlowEvent } from './types'

const MachineUserFlow = setup({
  types: {} as {
    events: MachineUserFlowEvent
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QFkCGBjAFgSwHZgFVYwAnAMQBsB7AdwDo08ACAWzFwFcBiAYQu3QBrWEwA6IAMoAXVCSlMoqNuIDaABgC6iUAAcqsbFOxVc2kAA9EARgAcAdjoA2AEwBWADQgAnohuO6rgC+gZ5oWHiExOTU9Iy4rOzcAOJUcExSVEwc+ObYsEa4UEzYEOpaSCB6BkYmZpYItlZ0ACyOagCcAMx2Ht6IzlbOwaEYOPhEpJS0DKjMbJxcKWkZTNQARmteTDSGmOnYbFQcUmVmVYbGphX1tq5Obp4+CJ1qasMgYWORkzEzc4mLVIiFaKNhMABmJCoLASnFOFXONSuoBu7WcdDUNlcXR6j0QzTUjnenwiE2i0zisO4ABUSNhlpkAFZUZg7KR7PAAN1Q-Agqyo6B5YHhun0F1q12sWPuvSerkxxNGpKiU1is3i824ACUwOgTPh0EiRZUxUi6lK7i5ZYg2lZFeFxirfpTNVwCLhYBwdHo5JBjYjLuaGtKrXiEI47J06O0YzHHLcXs47PavmTVXQAOqzApFcFUEgKDhweQrPW4A1SLgSdjyLmGMDpTJQIv5f2mwOShA2KwObqdAYRuw9V7tMN+Fqx9ouNTNdr2CMp5U-aYAURIUJICCYmH0UgAknzcFR5HnshBeNRiEx0HSjIKKExSBvWFQIDy29UOyibY4bNHurOSbODYzidGBYYDFGbiLo6y70EkLbyGWFaQFwABCx57DoFCoF4pAiCQYCoBAXgfuKyIWNYnRWO0GKOK4nQgfK3ZYo4Y4OMOrxuFYVgdEONgwd85LwYh176rqUioQAEru16XmkOy4BAtBkWanZWNRzR0NRrgEoxzQDLpbF9M8Nh-j0jiWTGzTNDxzSuEEIQfEqsHCXQCHFmJ5YSahHn5HJ+gKXgyk0KpX6UQ01H+GoPTNHY7S2Zio4mfRDi6R0mmgZZ2KCWmvx+Uh4mGtJslQECjZUmFErfpFVh3K48aON0c6OO0GnJU8oF3DZAx2G0rSOLZyZOSSrnpgVXkoeeE1lQylWaGc7bVRFGm2HQgx2GZ8q-r+zjNGGum0VYbQgcd9HOISRIjS5QnjUoDb5LIknnjJ-mKbAVUUTcQ5aTZagaa4NhxW17F0HYs5zq4x1qC88pDNdDq3b8r3yO97hMLAO6KUUhEsKgUhYFwOp4wTmDo82nnvZ9QbOHtvavH4zjxpigxjn+k7tB0ZmpXVuVOtMKPbHgsDo5jtB4DjYAk4TguzcCmSatTnYXcdYPxu0kaYkzm3OBBnTdQZ0MOc4aKAwJCOpvzar-AsfACMIFXiBIeqEbAqgLQiS1fdYXTaSB8WtQxzR+ISY6gWDNic9lgMJfZfNwX8GoAnbQjy2Ikgu3A4hC+yGOZx9Huip+y2olGg2Ry8nSNa0ajWggnNqAENHYjZIFqKB8NOUeEBwGYo1I7Qi3F97CBqGGAC0TSvNPJs0VYwdxxbS5uS6iRD+RQbB2O-iOSMiN5dMWYXIUEL5oWnmlkVUjr2pNU2Q4oYmeOu-OfvVt0GuG5bju+QHkwR4niOEpG+4V6j3wnLGICIEwKdH2iZAY8M96WwTp-fMW48AXB5NgAAXvjS4+xDjHBASXfE8oMSbR4kOYCoEwJwKeC8N4S8xq-B4LeAQPJHzrjPiwV8HD0DyQgMQkeCV-A4kAnYahMCIIaToNBJhA96CoM3EwbCuF8JMFkA2ABxRcCYP4NgyAQjN4OQgTGUCdhCS1zimGAkV0kHL3TEo9BuBuS8n5PeMARjOw11MWiboljdJ2AOgqeRB96A6mQj5QRnth6b3jL48xATrEpX+vHNyTisgei9D6Z6Xi75tASf4togSwwRijBzeMWJEzDXscw6YE1InFWiUXDe6k7J0HsBpGyLg2rUSCU-Di8ouJQ14hrTaaS7pgker6ZpJpYnqQcrRJMrgei2CZlXXEAywZDPbnOLaKyamv2QW5CaT40GPnwCwLYEA8iNNyTE1pNU6rxPng1CMMVaazhsHrA2vV+qWSGhM5GskznKPYFLa5tyr6GIebfFaDUH4wxsH0yMKtjJylnOtE6A5zqXSBQLWSaMMZYwlkwXG+MsB5JWnOLS2J4qDGRfRAaoNwYxixNDWG+KRKU2FlS+oe17BN0GNRNEkcujfK2ayyGHLa7ty5XQAAcpkWA+c+X4ksh0uKZ1uzgxWXXaBEco70RjjZF+-cwl0AkFjPO+Ze6wtAeqv8hssRVIarOOhiAG5N3aIsoZnQ2rNGCMEIAA */
  id: 'MachineUserFlow',

  states: {
    'Main menu': {
      on: {
        'Clicks "Start game"': 'Waiting for guest to connect',
        'Goes to unexisting id': 'Error: hostId not found',
        'Goes to lobby with timeout': 'Error: initialization timeout',
        'Goes to game from menu': 'Error: players are not initialized',
        'Tries to join with invalid locale': 'Error: invalid locale',
        'Reconnection': 'Reconnected',
        'Unsupported': 'Error: unsupported',
        'Clicks to "Scores"': 'No scores',
        'Clicks to "Scores" with scores': 'Show scores',
      },
    },

    'Waiting for guest to connect': {
      on: {
        'Sent invite to guest': 'Guest connected',
      },
    },

    'Error: hostId not found': {
      on: {
        'Close critical error modal': 'Critical error modal closed',
      },
    },

    'Error: initialization timeout': {},
    'Critical error modal closed': {},
    'Error: players are not initialized': {},
    'Error: invalid locale': {},
    'Reconnected': {},
    'Error: unsupported': {},

    'Guest connected': {
      on: {
        'Both players ready': 'Game started',
        'Host closes window': {
          target: 'Guest error: enemy disconnected',
          reenter: true,
        },

        'Guest closes window': 'Host error: enemy disconnected',

        'Host goes to menu': 'Guest error: enemy disconnected',
        'Guest goes to menu': 'Host error: enemy disconnected',
      },
    },

    'Game started': {
      on: {
        'Host wins': 'Host wins, showing rematch',
      },
    },

    'Guest error: enemy disconnected': {},
    'Host error: enemy disconnected': {},

    'Host wins, showing rematch': {
      on: {
        'Rematch, guest wins': 'Guest wins',
        'Host goes to menu': {
          target: 'Guest error: enemy disconnected',
          reenter: true,
        },
      },
    },

    'Guest wins': {},
    'No scores': {},
    'Show scores': {},
  },

  initial: 'Main menu',
})

const modelUserFlow = createTestModel(MachineUserFlow)

const testPaths = modelUserFlow.getShortestPaths()

type Pages = {
  hostPage: Page
  guestPage: Page
  baseURL: string
  browser: Browser
}

const test = base.extend<Pages>({
  hostPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
  guestPage: async ({ browser }, use) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

let invitationLink = ''

testPaths.forEach((path) => {
  test(path.description, async ({ hostPage, guestPage, baseURL, browser }) => {
    await path.test({
      states: {
        'Main menu': async () => {
          await hostPage.goto('/')
          await hostPage.evaluate(() => window.___e2e.isPlaywright = true)
          await expect(hostPage.getByTestId('link-to-lobby')).toBeVisible()
        },

        'Waiting for guest to connect': async () => {
          await expect(hostPage.url()).toContain('/lobby')
          await expect(hostPage.getByTestId('loading')).toBeVisible()
          await expect(hostPage.getByTestId('loading')).toBeHidden()
          await hostPage.getByTestId('copy-invitation').click()

          // check clipboards
          const clipboardText = await hostPage.evaluate(() => navigator.clipboard.readText())

          invitationLink = await hostPage.evaluate(() => window.___e2e.generateUrljoinGame({
            hostId: window.___e2e.sessionId,
            locale: window.___e2e.locale,
            mode: 'guest',
          }),
          )

          const lobbyMessages = await hostPage.evaluate(() => window.___e2e.messages.lobby)

          const invitationText = lobbyMessages.en['invitation-text']

          await hostPage.getByTestId('host-name-input').fill('Host')

          await expect(hostPage.getByTestId('host-name-value')).toContainText('Host')

          await expect(clipboardText).toEqual(`${invitationText} ${invitationLink}`)
        },

        'Error: hostId not found': async () => {
          await expect(hostPage.getByTestId('PLAYER_NOT_FOUND_IN_DB')).toBeVisible()
        },

        'Critical error modal closed': async () => {
          await expect(hostPage.getByTestId('PLAYER_NOT_FOUND_IN_DB')).not.toBeVisible()
          await expect(hostPage.url()).toBe(`${baseURL}/`)
        },

        'Error: initialization timeout': async () => {
          await expect(hostPage.getByTestId('INITIALIZATION_TIMEOUT')).toBeVisible()
        },

        'Error: players are not initialized': async () => {
          await expect(hostPage.getByTestId('PLAYERS_ARE_NOT_INITIALIZED')).toBeVisible()
        },

        'Error: invalid locale': async () => {
          await expect(hostPage.getByTestId('INVALID_LOCALE')).toBeVisible()
        },

        'Guest connected': async () => {
          await expect(hostPage.getByTestId('connection-established')).toBeVisible()
          await expect(guestPage.getByTestId('connection-established')).toBeVisible()

          await expect(guestPage.getByTestId('host-name-value')).toContainText('Host')

          await guestPage.getByTestId('guest-name-input').fill('Guest')
          await expect(guestPage.getByTestId('guest-name-value')).toContainText('Guest')
          await expect(hostPage.getByTestId('guest-name-value')).toContainText('Guest')

          // checking "relay" ice candidates
          /* const iceCandidates: RTCIceCandidate[] = await hostPage.evaluate(() => {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve(window.___e2e.iceCandidates)
              }, 1000)
            })
          })

          const hasRelay = iceCandidates.some((item) => {
            return item ? 'relayProtocol' in item : false
          })

          expect(hasRelay).toBe(true) */
        },

        'Game started': async () => {
          await expect(hostPage.url()).toContain('/game')
          await expect(guestPage.url()).toContain('/game')
          await expect(hostPage.getByTestId('countdown')).toBeVisible()
          await expect(guestPage.getByTestId('countdown')).toBeVisible()

          await expect(hostPage.getByTestId('countdown')).toBeHidden()
          await expect(guestPage.getByTestId('countdown')).toBeHidden()

          await expect(hostPage.locator('css=.test-main-word-letter').first()).toBeVisible()
          await expect(guestPage.locator('css=.test-main-word-letter').first()).toBeVisible()
        },

        'Guest error: enemy disconnected': async () => {
          await expect(guestPage.getByTestId('ENEMY_DISCONNECTED')).toBeVisible()
        },

        'Host error: enemy disconnected': async () => {
          await expect(hostPage.getByTestId('ENEMY_DISCONNECTED')).toBeVisible()
        },

        'Host wins, showing rematch': async () => {
          await expect(hostPage.getByTestId('rematch')).toBeVisible()
          await expect(guestPage.getByTestId('rematch')).toBeVisible()

          await expect(hostPage.getByTestId('you-win')).toBeVisible()
          await expect(guestPage.getByTestId('you-lose')).toBeVisible()

          await expect(await hostPage.getByTestId('player-scores-wins').textContent()).toBe('1')
          await expect(await hostPage.getByTestId('player-scores-loses').textContent()).toBe('0')

          await expect(await guestPage.getByTestId('player-scores-wins').textContent()).toBe('0')
          await expect(await guestPage.getByTestId('player-scores-loses').textContent()).toBe('1')
        },

        'Guest wins': async () => {
          await expect(hostPage.getByTestId('rematch')).toBeVisible()
          await expect(guestPage.getByTestId('rematch')).toBeVisible()

          await expect(hostPage.getByTestId('you-lose')).toBeVisible()
          await expect(guestPage.getByTestId('you-win')).toBeVisible()

          await expect(await hostPage.getByTestId('player-scores-wins').textContent()).toBe('1')
          await expect(await hostPage.getByTestId('player-scores-loses').textContent()).toBe('1')

          await expect(await guestPage.getByTestId('player-scores-wins').textContent()).toBe('1')
          await expect(await guestPage.getByTestId('player-scores-loses').textContent()).toBe('1')
        },

        'No scores': async () => {
          await expect(hostPage.getByTestId('no-scores')).toBeVisible()
        },

        'Show scores': async () => {
          const rows = await hostPage.locator('tbody tr')
          await expect(rows.nth(0)).toHaveAttribute('data-test', 'scores-high-id')
          await expect(await rows.nth(0).locator('.name').textContent()).toBe('high')
          await expect(await rows.nth(0).locator('.wins').textContent()).toBe('5')
          await expect(await rows.nth(0).locator('.loses').textContent()).toBe('0')

          await expect(rows.nth(1)).toHaveAttribute('data-test', 'scores-mid-id')
          await expect(await rows.nth(1).locator('.name').textContent()).toBe('mid')
          await expect(await rows.nth(1).locator('.wins').textContent()).toBe('3')
          await expect(await rows.nth(1).locator('.loses').textContent()).toBe('3')

          await expect(rows.nth(2)).toHaveAttribute('data-test', 'scores-low-id')
          await expect(await rows.nth(2).locator('.name').textContent()).toBe('low')
          await expect(await rows.nth(2).locator('.wins').textContent()).toBe('0')
          await expect(await rows.nth(2).locator('.loses').textContent()).toBe('5')
        },
      },
      events: {
        'Clicks "Start game"': async () => {
          await hostPage.getByTestId('link-to-lobby').click()
        },

        'Goes to unexisting id': async () => {
          await hostPage.goto('/lobby?h=foo&l=e&m=g')
        },

        'Close critical error modal': async () => {
          await expect(hostPage.getByTestId('loading')).toBeHidden()
          await hostPage.getByTestId('modal-close').click()
        },

        'Goes to lobby with timeout': async () => {
          await hostPage.goto('/lobby?&m=h&timeout=0')
        },

        'Goes to game from menu': async () => {
          await hostPage.goto('/game')
        },

        'Tries to join with invalid locale': async () => {
          await hostPage.goto('/lobby?m=g&h=foo&l=bar')
        },

        'Reconnection': async () => {
          let context = await browser.newContext()
          let hostPage = await context.newPage()
          await hostPage.goto('/lobby?m=h')
          await expect(hostPage.getByTestId('copy-invitation')).toBeVisible()
          const url = new URL(hostPage.url())
          url.searchParams.set('m', 'g')
          let guestUrl = url.toString()
          await context.close()

          context = await browser.newContext()
          guestPage = await context.newPage()
          await guestPage.goto(guestUrl)
          await expect(guestPage.getByTestId('waiting-for-host')).toBeVisible()
          await guestPage.waitForLoadState('networkidle')
          await expect(guestPage.url()).toContain('&g=')
          guestUrl = await guestPage.url()
          await context.close()

          context = await browser.newContext()
          hostPage = await context.newPage()
          url.searchParams.set('m', 'h')
          const hostUrl = url.toString()
          await hostPage.goto(hostUrl)

          context = await browser.newContext()
          guestPage = await context.newPage()
          await guestPage.goto(guestUrl)

          await expect(hostPage.getByTestId('connection-established')).toBeVisible()
          await expect(guestPage.getByTestId('connection-established')).toBeVisible()

          await context.close()
        },

        'Unsupported': async () => {
          const context = await browser.newContext()
          const hostPage = await context.newPage()

          await hostPage.addInitScript(() => {
            // @ts-expect-error undefined
            window.RTCPeerConnection = undefined
          })

          await hostPage.goto('/lobby?m=h')

          await expect(hostPage.getByTestId('UNSUPPORTED')).toBeVisible()
        },

        'Sent invite to guest': async () => {
          await guestPage.goto(invitationLink)
          await guestPage.evaluate(() => window.___e2e.isPlaywright = true)
        },

        'Both players ready': async () => {
          await guestPage.getByTestId('i-am-ready').click()
          await hostPage.getByTestId('i-am-ready').click()
        },

        'Host goes to menu': async () => {
          await hostPage.goto('/')
        },

        'Host closes window': async () => {
          await hostPage.close()
        },

        'Guest goes to menu': async () => {
          await guestPage.goto('/')
        },

        'Guest closes window': async () => {
          await guestPage.close()
        },

        'Host wins': async () => {
          const words = await hostPage.evaluate(() => window.___e2e.dictionaries.en)

          const mainWord = await hostPage.evaluate(() => window.___e2e.mainWord)

          const possibleWords = useFindPossibleWords(mainWord!, words)

          let guestGuesses = 0

          for (const word of possibleWords) {
            if (guestGuesses === 3)
              break

            for (const letter of word)
              await guestPage.getByTestId(`main-word-letter-${letter}`).first().click()

            await guestPage.getByTestId('current-word-submit').click()
            guestGuesses++
          }

          await guestPage.locator('css=.test-main-word-letter').first().click()
          await guestPage.getByTestId('current-word-submit').click()
          await expect(guestPage.getByTestId('too-short')).toBeVisible()

          await guestPage.locator('css=.test-main-word-letter').first().click()
          await guestPage.locator('css=.test-main-word-letter').first().click()
          await guestPage.locator('css=.test-main-word-letter').first().click()
          await guestPage.getByTestId('current-word-submit').click()
          await expect(guestPage.getByTestId('not-present')).toBeVisible()

          const wordCounts = {
            low: 0,
            mid: 0,
            high: 0,
          }

          let mode: keyof typeof wordCounts = 'low'

          for (let i = 0; i < possibleWords.length; i++) {
            const word = possibleWords[i]

            if (await hostPage.getByTestId('rematch').isVisible())
              break

            if (mode === 'low') {
              wordCounts.low++

              if (wordCounts.low === 2)
                await expect(hostPage.getByTestId('already-guessed')).toBeVisible()

              if (wordCounts.low === 6) {
                mode = 'mid'
                const _word = possibleWords.find(_w => _w.length > 4)!
                i = possibleWords.indexOf(_word)
              }
            }
            else if (mode === 'mid') {
              wordCounts.mid++

              if (wordCounts.mid === 3) {
                mode = 'high'
                const _word = possibleWords.find(_w => _w.length > 6)!
                i = possibleWords.indexOf(_word)
              }
            }

            for (const letter of word)
              await hostPage.getByTestId(`main-word-letter-${letter}`).first().click()

            await hostPage.getByTestId('current-word-submit').click()
          }
        },

        'Rematch, guest wins': async () => {
          await guestPage.getByTestId('i-am-ready').click()
          await hostPage.getByTestId('i-am-ready').click()

          await expect(hostPage.getByTestId('countdown')).toBeVisible()
          await expect(guestPage.getByTestId('countdown')).toBeVisible()

          await expect(hostPage.getByTestId('countdown')).toBeHidden()
          await expect(guestPage.getByTestId('countdown')).toBeHidden()

          const words = await hostPage.evaluate(() => window.___e2e.dictionaries.en)

          const mainWord = await hostPage.evaluate(() => window.___e2e.mainWord)

          const possibleWords = useFindPossibleWords(mainWord!, words)

          const wordCounts = {
            low: 0,
            mid: 0,
            high: 0,
          }

          let mode: keyof typeof wordCounts = 'low'

          for (let i = 0; i < possibleWords.length; i++) {
            const word = possibleWords[i]

            if (await guestPage.getByTestId('rematch').isVisible())
              break

            if (mode === 'low') {
              wordCounts.low++

              if (wordCounts.low === 3) {
                mode = 'mid'
                const _word = possibleWords.find(_w => _w.length > 4)!
                i = possibleWords.indexOf(_word)
              }
            }
            else if (mode === 'mid') {
              wordCounts.mid++

              if (wordCounts.mid === 3) {
                mode = 'high'
                const _word = possibleWords.find(_w => _w.length > 6)!
                i = possibleWords.indexOf(_word)
              }
            }

            for (const letter of word)
              await guestPage.getByTestId(`main-word-letter-${letter}`).first().click()

            await guestPage.getByTestId('current-word-submit').click()
          }
        },
        'Clicks to "Scores"': async () => {
          await hostPage.getByTestId('link-to-scores').click()
        },
        'Clicks to "Scores" with scores': async () => {
          await hostPage.evaluate(() => {
            localStorage.setItem('scores', '{"low-id":[0,5,"low"],"mid-id":[3,3,"mid"],"high-id":[5,0,"high"]}')
          })

          await hostPage.getByTestId('link-to-scores').click()
        },
      },
    })
  })
})
